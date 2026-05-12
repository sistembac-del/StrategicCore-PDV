import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireSuperAdmin } from "../_shared/admin.ts";

function addMonths(dateText: string, months: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const { service, user } = await requireSuperAdmin(request, ["owner", "admin"]);
    const body = await request.json();

    const cobrancaId = body.cobranca_id;
    const paidAt = body.pago_em || new Date().toISOString().slice(0, 10);
    const months = Math.max(1, Number(body.meses_renovacao ?? 1));

    if (!cobrancaId) return jsonResponse({ error: "cobranca_id é obrigatório." }, 400);

    const { data: invoice, error: invoiceError } = await service
      .from("cobrancas_saas")
      .select("id, empresa_id, licenca_id, plano_id, valor, vencimento, status")
      .eq("id", cobrancaId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Cobrança não encontrada.");
    if (invoice.status === "cancelada" || invoice.status === "estornada") {
      return jsonResponse({ error: "Cobrança cancelada/estornada não pode ser paga." }, 400);
    }

    const newDueDate = addMonths(
      invoice.vencimento && invoice.vencimento >= paidAt ? invoice.vencimento : paidAt,
      months
    );

    const { error: updateInvoiceError } = await service
      .from("cobrancas_saas")
      .update({
        status: "paga",
        pago_em: paidAt,
        forma_pagamento: body.forma_pagamento ?? "manual",
        referencia_externa: body.referencia_externa ?? null,
        observacao: body.observacao ?? null,
        criado_por: user.id
      })
      .eq("id", cobrancaId);

    if (updateInvoiceError) throw updateInvoiceError;

    const { error: updateLicenseError } = await service
      .from("licencas_empresas")
      .update({
        status: "ativo",
        vencimento: newDueDate,
        bloqueio_motivo: null,
        atualizado_por: user.id
      })
      .eq("id", invoice.licenca_id);

    if (updateLicenseError) throw updateLicenseError;

    const nextDueDate = addMonths(newDueDate, 1);
    const nextCompetence = nextDueDate.slice(0, 7);

    const { data: existingNext, error: existingError } = await service
      .from("cobrancas_saas")
      .select("id")
      .eq("licenca_id", invoice.licenca_id)
      .eq("competencia", nextCompetence)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existingNext) {
      const { error: nextError } = await service.from("cobrancas_saas").insert({
        empresa_id: invoice.empresa_id,
        licenca_id: invoice.licenca_id,
        plano_id: invoice.plano_id,
        competencia: nextCompetence,
        valor: invoice.valor,
        vencimento: nextDueDate,
        status: "aberta",
        observacao: "Cobrança gerada automaticamente após renovação.",
        criado_por: user.id
      });

      if (nextError) throw nextError;
    }

    return jsonResponse({ data: { paid: true, new_due_date: newDueDate, next_due_date: nextDueDate } });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
