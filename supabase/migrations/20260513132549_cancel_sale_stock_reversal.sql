alter table public.vendas
  add column if not exists cancelado_em timestamptz,
  add column if not exists cancelado_por uuid references auth.users(id),
  add column if not exists motivo_cancelamento text;

create or replace function private.cancelar_venda_com_estorno(
  p_venda_id uuid,
  p_motivo text,
  p_estornar_estoque boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_venda public.vendas%rowtype;
  v_item public.venda_itens%rowtype;
  v_estoque_anterior numeric(12,3);
  v_estoque_posterior numeric(12,3);
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_motivo is null or length(trim(p_motivo)) < 10 then
    raise exception 'Informe um motivo de cancelamento com pelo menos 10 caracteres.';
  end if;

  select *
  into v_venda
  from public.vendas
  where id = p_venda_id
  for update;

  if not found then
    raise exception 'Venda nao encontrada.';
  end if;

  if not private.usuario_tem_perfil(
    v_venda.empresa_id,
    array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]
  ) then
    raise exception 'Usuario sem permissao para cancelar esta venda.';
  end if;

  if v_venda.status_venda = 'CANCELADA' then
    raise exception 'Venda ja cancelada.';
  end if;

  if v_venda.status_fiscal in ('AUTORIZADA', 'ENVIANDO', 'CONTINGENCIA') then
    raise exception 'Venda com NFC-e %, regularize o fluxo fiscal antes do estorno.', v_venda.status_fiscal;
  end if;

  if exists (
    select 1
    from public.documentos_fiscais df
    where df.venda_id = v_venda.id
      and df.status in ('AUTORIZADA', 'ENVIANDO', 'CONTINGENCIA')
  ) then
    raise exception 'Existe documento fiscal pendente/autorizado para esta venda. Cancele ou consulte a NFC-e antes do estorno.';
  end if;

  if p_estornar_estoque and v_venda.estoque_baixado then
    for v_item in
      select *
      from public.venda_itens
      where venda_id = v_venda.id
      order by created_at, id
    loop
      if v_item.produto_id is not null then
        select estoque_atual
        into v_estoque_anterior
        from public.produtos
        where id = v_item.produto_id
          and empresa_id = v_venda.empresa_id
        for update;

        if not found then
          raise exception 'Produto da venda nao encontrado para estorno: %.', v_item.descricao;
        end if;

        v_estoque_posterior := v_estoque_anterior + v_item.quantidade;

        update public.produtos
        set estoque_atual = v_estoque_posterior
        where id = v_item.produto_id
          and empresa_id = v_venda.empresa_id;

        insert into public.movimentacoes_estoque (
          empresa_id,
          produto_id,
          venda_id,
          tipo,
          quantidade,
          estoque_anterior,
          estoque_posterior,
          observacao,
          usuario_id
        )
        values (
          v_venda.empresa_id,
          v_item.produto_id,
          v_venda.id,
          'CANCELAMENTO_VENDA',
          v_item.quantidade,
          v_estoque_anterior,
          v_estoque_posterior,
          concat('Estorno por cancelamento da venda. Motivo: ', trim(p_motivo)),
          v_user_id
        );
      end if;
    end loop;
  end if;

  update public.vendas
  set
    status_venda = 'CANCELADA',
    estoque_baixado = case when p_estornar_estoque then false else estoque_baixado end,
    motivo_cancelamento = trim(p_motivo),
    cancelado_por = v_user_id,
    cancelado_em = now()
  where id = v_venda.id;

  return jsonb_build_object(
    'venda_id', v_venda.id,
    'status_venda', 'CANCELADA',
    'estoque_estornado', p_estornar_estoque and v_venda.estoque_baixado
  );
end;
$$;

create or replace function public.cancelar_venda(
  p_venda_id uuid,
  p_motivo text,
  p_estornar_estoque boolean default true
)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.cancelar_venda_com_estorno(p_venda_id, p_motivo, p_estornar_estoque);
$$;

grant execute on function public.cancelar_venda(uuid, text, boolean) to authenticated;
grant execute on function private.cancelar_venda_com_estorno(uuid, text, boolean) to authenticated;
