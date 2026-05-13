create or replace function public.finalizar_venda(
  p_empresa_id uuid,
  p_cliente_cpf text,
  p_forma_pagamento public.forma_pagamento,
  p_desconto_total numeric,
  p_itens jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_venda_id uuid;
  v_item jsonb;
  v_produto public.produtos%rowtype;
  v_quantidade numeric(12,3);
  v_desconto numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_permitir_estoque_negativo boolean := false;
  v_baixar_estoque boolean := true;
begin
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select
    coalesce(cg.permitir_estoque_negativo, false),
    coalesce(cg.baixa_estoque_ao_finalizar, true)
  into v_permitir_estoque_negativo, v_baixar_estoque
  from public.configuracoes_gerais cg
  where cg.empresa_id = p_empresa_id;

  v_permitir_estoque_negativo := coalesce(v_permitir_estoque_negativo, false);
  v_baixar_estoque := coalesce(v_baixar_estoque, true);

  if not private.empresa_licenca_operacional(p_empresa_id) then
    raise exception 'Venda bloqueada: licenca vencida, bloqueada ou sem periodo ativo.';
  end if;

  if not private.usuario_tem_perfil(
    p_empresa_id,
    array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]
  ) then
    raise exception 'Usuario sem permissao para vender nesta empresa.';
  end if;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Venda sem itens.';
  end if;

  if p_desconto_total < 0 then
    raise exception 'Desconto total invalido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_quantidade := (v_item->>'quantidade')::numeric;
    v_desconto := coalesce((v_item->>'desconto')::numeric, 0);

    if v_quantidade <= 0 then
      raise exception 'Quantidade invalida.';
    end if;

    select *
    into v_produto
    from public.produtos
    where id = (v_item->>'produto_id')::uuid
      and empresa_id = p_empresa_id
      and ativo = true
    for update;

    if not found then
      raise exception 'Produto nao encontrado ou inativo.';
    end if;

    if v_produto.preco_venda <= 0 then
      raise exception 'Produto % sem preco valido.', v_produto.descricao;
    end if;

    if not v_permitir_estoque_negativo and v_produto.estoque_atual < v_quantidade then
      raise exception 'Estoque insuficiente para %.', v_produto.descricao;
    end if;

    if v_desconto < 0 or v_desconto > (v_produto.preco_venda * v_quantidade) then
      raise exception 'Desconto invalido para %.', v_produto.descricao;
    end if;

    v_subtotal := v_subtotal + ((v_produto.preco_venda * v_quantidade) - v_desconto);
  end loop;

  if p_desconto_total > v_subtotal then
    raise exception 'Desconto maior que o total.';
  end if;

  v_total := v_subtotal - p_desconto_total;

  insert into public.vendas (
    empresa_id,
    usuario_id,
    cliente_cpf,
    subtotal,
    desconto_total,
    total,
    forma_pagamento,
    status_venda,
    status_fiscal,
    estoque_baixado
  )
  values (
    p_empresa_id,
    v_user_id,
    nullif(p_cliente_cpf, ''),
    v_subtotal,
    p_desconto_total,
    v_total,
    p_forma_pagamento,
    'FINALIZADA',
    'NAO_EMITIDA',
    v_baixar_estoque
  )
  returning id into v_venda_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_quantidade := (v_item->>'quantidade')::numeric;
    v_desconto := coalesce((v_item->>'desconto')::numeric, 0);

    select *
    into v_produto
    from public.produtos
    where id = (v_item->>'produto_id')::uuid
      and empresa_id = p_empresa_id
      and ativo = true
    for update;

    insert into public.venda_itens (
      venda_id,
      empresa_id,
      produto_id,
      codigo,
      codigo_barras,
      descricao,
      quantidade,
      valor_unitario,
      desconto,
      total,
      ncm,
      cfop,
      csosn,
      cst
    )
    values (
      v_venda_id,
      p_empresa_id,
      v_produto.id,
      v_produto.codigo,
      v_produto.codigo_barras,
      v_produto.descricao,
      v_quantidade,
      v_produto.preco_venda,
      v_desconto,
      (v_produto.preco_venda * v_quantidade) - v_desconto,
      v_produto.ncm,
      v_produto.cfop,
      v_produto.csosn,
      v_produto.cst
    );

    if v_baixar_estoque then
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
        p_empresa_id,
        v_produto.id,
        v_venda_id,
        'VENDA',
        v_quantidade,
        v_produto.estoque_atual,
        v_produto.estoque_atual - v_quantidade,
        'Baixa automatica na finalizacao da venda',
        v_user_id
      );

      update public.produtos
      set estoque_atual = estoque_atual - v_quantidade
      where id = v_produto.id;
    end if;
  end loop;

  return v_venda_id;
end;
$$;

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
