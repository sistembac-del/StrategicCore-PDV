alter table public.movimentacoes_estoque
  add column if not exists valor_unitario numeric(12,2),
  add column if not exists valor_total numeric(12,2),
  add column if not exists documento_origem text;

create index if not exists movimentacoes_documento_origem_idx
on public.movimentacoes_estoque (empresa_id, documento_origem)
where documento_origem is not null;

create or replace function public.movimentar_estoque(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_tipo public.tipo_movimentacao_estoque,
  p_quantidade numeric,
  p_observacao text default null,
  p_valor_unitario numeric default null,
  p_valor_total numeric default null,
  p_documento_origem text default null
)
returns public.movimentacoes_estoque
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_produto public.produtos%rowtype;
  v_delta numeric(12,3);
  v_mov public.movimentacoes_estoque%rowtype;
  v_permitir_estoque_negativo boolean := false;
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not private.usuario_tem_perfil(
    p_empresa_id,
    array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario]
  ) then
    raise exception 'Usuario sem permissao para movimentar estoque.';
  end if;

  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  if p_valor_unitario is not null and p_valor_unitario < 0 then
    raise exception 'Valor unitario invalido.';
  end if;

  if p_valor_total is not null and p_valor_total < 0 then
    raise exception 'Valor total invalido.';
  end if;

  select *
  into v_produto
  from public.produtos
  where id = p_produto_id
    and empresa_id = p_empresa_id
    and ativo = true
  for update;

  if not found then
    raise exception 'Produto nao encontrado ou inativo.';
  end if;

  select coalesce(cg.permitir_estoque_negativo, false)
  into v_permitir_estoque_negativo
  from public.configuracoes_gerais cg
  where cg.empresa_id = p_empresa_id;

  v_permitir_estoque_negativo := coalesce(v_permitir_estoque_negativo, false);

  v_delta := case
    when p_tipo in ('ENTRADA_MANUAL', 'AJUSTE_POSITIVO', 'CANCELAMENTO_VENDA') then p_quantidade
    when p_tipo in ('AJUSTE_NEGATIVO', 'SAIDA_MANUAL') then -p_quantidade
    else -p_quantidade
  end;

  if not v_permitir_estoque_negativo and v_produto.estoque_atual + v_delta < 0 then
    raise exception 'Movimentacao deixaria estoque negativo.';
  end if;

  update public.produtos
  set estoque_atual = estoque_atual + v_delta
  where id = p_produto_id;

  insert into public.movimentacoes_estoque (
    empresa_id,
    produto_id,
    tipo,
    quantidade,
    estoque_anterior,
    estoque_posterior,
    observacao,
    usuario_id,
    valor_unitario,
    valor_total,
    documento_origem
  )
  values (
    p_empresa_id,
    p_produto_id,
    p_tipo,
    p_quantidade,
    v_produto.estoque_atual,
    v_produto.estoque_atual + v_delta,
    p_observacao,
    v_user_id,
    p_valor_unitario,
    coalesce(p_valor_total, case when p_valor_unitario is null then null else p_valor_unitario * p_quantidade end),
    nullif(trim(p_documento_origem), '')
  )
  returning * into v_mov;

  return v_mov;
end;
$$;

grant execute on function public.movimentar_estoque(uuid, uuid, public.tipo_movimentacao_estoque, numeric, text, numeric, numeric, text) to authenticated;
