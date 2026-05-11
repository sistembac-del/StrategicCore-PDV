import { callFiscalApi, makeFiscalStoragePath, validateFiscalItems } from "./fiscal.ts";
import { assertCompanyRole, createServiceClient } from "./supabase.ts";
import type { User } from "https://esm.sh/@supabase/supabase-js@2.102.0";

export async function emitNfceForSale(service: ReturnType<typeof createServiceClient>, user: User, vendaId: string) {
  const { data: venda, error: vendaError } = await service
    .from("vendas")
    .select("*, empresas(*), clientes(*)")
    .eq("id", vendaId)
    .maybeSingle();

  if (vendaError) throw vendaError;
  if (!venda) throw new Error("Venda não encontrada.");

  await assertCompanyRole(service, user.id, venda.empresa_id, ["admin", "gerente", "operador"]);

  const { data: itens, error: itensError } = await service.from("venda_itens").select("*").eq("venda_id", vendaId);
  if (itensError) throw itensError;
  if (!itens?.length) throw new Error("Venda sem itens.");
  validateFiscalItems(itens);

  const { data: config, error: configError } = await service
    .from("configuracoes_fiscais")
    .select("*")
    .eq("empresa_id", venda.empresa_id)
    .eq("ativo", true)
    .maybeSingle();

  if (configError) throw configError;
  if (!config?.certificado_configurado || !config?.csc_configurado) {
    throw new Error("Configuração fiscal incompleta para emissão NFC-e.");
  }

  const { data: existingDocument } = await service
    .from("documentos_fiscais")
    .select("*")
    .eq("venda_id", vendaId)
    .eq("modelo", "65")
    .maybeSingle();

  if (existingDocument?.status === "AUTORIZADA") {
    return { document: existingDocument, idempotent: true };
  }

  const { data: document, error: documentError } = await service
    .from("documentos_fiscais")
    .upsert(
      {
        empresa_id: venda.empresa_id,
        venda_id: vendaId,
        modelo: "65",
        status: "ENVIANDO",
        motivo_rejeicao: null
      },
      { onConflict: "empresa_id,venda_id,modelo" }
    )
    .select()
    .single();

  if (documentError) throw documentError;

  const result = await callFiscalApi("/nfce/emitir", {
    venda,
    itens,
    empresa: venda.empresas,
    cliente: venda.clientes,
    configuracao_fiscal: {
      ambiente: config.ambiente,
      serie_nfce: config.serie_nfce,
      proximo_numero_nfce: config.proximo_numero_nfce,
      csc_id: config.csc_id
    }
  });

  let xmlPath: string | null = null;
  let danfePath: string | null = null;

  if (result.xml) {
    xmlPath = makeFiscalStoragePath(venda.empresa_id, vendaId, "nfce.xml");
    await service.storage.from("documentos-fiscais").upload(xmlPath, result.xml, {
      contentType: "application/xml",
      upsert: true
    });
  }

  if (result.danfe_pdf_base64) {
    danfePath = makeFiscalStoragePath(venda.empresa_id, vendaId, "danfe.pdf");
    const bytes = Uint8Array.from(atob(result.danfe_pdf_base64), (char) => char.charCodeAt(0));
    await service.storage.from("documentos-fiscais").upload(danfePath, bytes, {
      contentType: "application/pdf",
      upsert: true
    });
  }

  const { data: updatedDocument, error: updateError } = await service
    .from("documentos_fiscais")
    .update({
      status: result.status,
      numero: result.numero ?? null,
      serie: result.serie ?? config.serie_nfce,
      chave_acesso: result.chave_acesso ?? null,
      protocolo: result.protocolo ?? null,
      motivo_rejeicao: result.motivo_rejeicao ?? null,
      qr_code: result.qr_code ?? null,
      xml_path: xmlPath,
      danfe_path: danfePath,
      autorizado_em: result.status === "AUTORIZADA" ? (result.autorizado_em ?? new Date().toISOString()) : null
    })
    .eq("id", document.id)
    .select()
    .single();

  if (updateError) throw updateError;

  await service.from("vendas").update({ status_fiscal: result.status }).eq("id", vendaId);

  return { document: updatedDocument, idempotent: false };
}
