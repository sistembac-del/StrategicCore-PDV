alter table public.produtos
  drop constraint if exists produtos_estoque_atual_check;

create or replace function private.validar_estoque_produto()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_permitir_estoque_negativo boolean := false;
begin
  if new.estoque_atual >= 0 then
    return new;
  end if;

  select coalesce(cg.permitir_estoque_negativo, false)
  into v_permitir_estoque_negativo
  from public.configuracoes_gerais cg
  where cg.empresa_id = new.empresa_id;

  if not coalesce(v_permitir_estoque_negativo, false) then
    raise exception 'Estoque negativo nao permitido para esta empresa.';
  end if;

  return new;
end;
$$;

drop trigger if exists produtos_validar_estoque_negativo on public.produtos;
create trigger produtos_validar_estoque_negativo
before insert or update of estoque_atual, empresa_id on public.produtos
for each row execute function private.validar_estoque_produto();

create or replace function private.baixar_estoque_venda(
  p_venda_id uuid
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
  v_produto public.produtos%rowtype;
  v_estoque_posterior numeric(12,3);
  v_permitir_estoque_negativo boolean := false;
  v_itens_baixados integer := 0;
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
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
    array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario]
  ) then
    raise exception 'Usuario sem permissao para baixar estoque desta venda.';
  end if;

  if v_venda.status_venda = 'CANCELADA' then
    raise exception 'Venda cancelada nao permite baixa de estoque.';
  end if;

  if v_venda.estoque_baixado then
    raise exception 'Estoque desta venda ja foi baixado.';
  end if;

  select coalesce(cg.permitir_estoque_negativo, false)
  into v_permitir_estoque_negativo
  from public.configuracoes_gerais cg
  where cg.empresa_id = v_venda.empresa_id;

  v_permitir_estoque_negativo := coalesce(v_permitir_estoque_negativo, false);

  for v_item in
    select *
    from public.venda_itens
    where venda_id = v_venda.id
    order by created_at, id
  loop
    if v_item.produto_id is null then
      raise exception 'Item da venda sem produto vinculado: %.', v_item.descricao;
    end if;

    select *
    into v_produto
    from public.produtos
    where id = v_item.produto_id
      and empresa_id = v_venda.empresa_id
    for update;

    if not found then
      raise exception 'Produto da venda nao encontrado: %.', v_item.descricao;
    end if;

    v_estoque_posterior := v_produto.estoque_atual - v_item.quantidade;

    if not v_permitir_estoque_negativo and v_estoque_posterior < 0 then
      raise exception 'Estoque insuficiente para baixar %.', v_item.descricao;
    end if;

    update public.produtos
    set estoque_atual = v_estoque_posterior
    where id = v_produto.id;

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
      v_produto.id,
      v_venda.id,
      'VENDA',
      v_item.quantidade,
      v_produto.estoque_atual,
      v_estoque_posterior,
      'Baixa manual de estoque de venda finalizada',
      v_user_id
    );

    v_itens_baixados := v_itens_baixados + 1;
  end loop;

  if v_itens_baixados = 0 then
    raise exception 'Venda sem itens para baixar estoque.';
  end if;

  update public.vendas
  set
    estoque_baixado = true,
    updated_at = now()
  where id = v_venda.id;

  return jsonb_build_object(
    'venda_id', v_venda.id,
    'estoque_baixado', true,
    'itens_baixados', v_itens_baixados
  );
end;
$$;

create or replace function public.baixar_estoque_venda(
  p_venda_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public, private
as $$
  select private.baixar_estoque_venda(p_venda_id);
$$;

grant execute on function public.baixar_estoque_venda(uuid) to authenticated;
grant execute on function private.baixar_estoque_venda(uuid) to authenticated;
