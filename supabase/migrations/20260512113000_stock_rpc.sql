alter type public.tipo_movimentacao_estoque add value if not exists 'SAIDA_MANUAL' after 'ENTRADA_MANUAL';

create or replace function public.movimentar_estoque(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_tipo public.tipo_movimentacao_estoque,
  p_quantidade numeric,
  p_observacao text default null
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
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not private.usuario_tem_perfil(
    p_empresa_id,
    array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario]
  ) then
    raise exception 'Usuário sem permissão para movimentar estoque.';
  end if;

  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  select *
  into v_produto
  from public.produtos
  where id = p_produto_id
    and empresa_id = p_empresa_id
    and ativo = true
  for update;

  if not found then
    raise exception 'Produto não encontrado ou inativo.';
  end if;

  v_delta := case
    when p_tipo in ('ENTRADA_MANUAL', 'AJUSTE_POSITIVO', 'CANCELAMENTO_VENDA') then p_quantidade
    when p_tipo in ('AJUSTE_NEGATIVO', 'SAIDA_MANUAL') then -p_quantidade
    else -p_quantidade
  end;

  if v_produto.estoque_atual + v_delta < 0 then
    raise exception 'Movimentação deixaria estoque negativo.';
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
    usuario_id
  )
  values (
    p_empresa_id,
    p_produto_id,
    p_tipo,
    p_quantidade,
    v_produto.estoque_atual,
    v_produto.estoque_atual + v_delta,
    p_observacao,
    v_user_id
  )
  returning * into v_mov;

  return v_mov;
end;
$$;

grant execute on function public.movimentar_estoque(uuid, uuid, public.tipo_movimentacao_estoque, numeric, text) to authenticated;
