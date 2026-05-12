create or replace function private.empresa_licenca_operacional(target_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.licencas_empresas le
    where le.empresa_id = target_empresa_id
      and (
        (le.status = 'ativo' and (le.vencimento is null or le.vencimento >= current_date))
        or (le.status = 'teste' and (le.fim_teste is null or le.fim_teste >= current_date))
      )
  );
$$;

create or replace function private.empresa_pode_criar_produto(target_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select private.empresa_licenca_operacional(target_empresa_id)
    and exists (
      select 1
      from public.licencas_empresas le
      where le.empresa_id = target_empresa_id
        and (
          select count(*)
          from public.produtos p
          where p.empresa_id = target_empresa_id
            and p.ativo = true
        ) < le.limite_produtos
    );
$$;

create or replace function private.empresa_pode_criar_usuario(target_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select private.empresa_licenca_operacional(target_empresa_id)
    and exists (
      select 1
      from public.licencas_empresas le
      where le.empresa_id = target_empresa_id
        and (
          select count(*)
          from public.usuarios_empresas ue
          where ue.empresa_id = target_empresa_id
            and ue.ativo = true
        ) < le.limite_usuarios
    );
$$;

create or replace function private.criar_licenca_padrao_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano_id uuid;
  v_limite_usuarios integer;
  v_limite_produtos integer;
begin
  select id, limite_usuarios, limite_produtos
  into v_plano_id, v_limite_usuarios, v_limite_produtos
  from public.planos_saas
  where codigo = 'profissional'
  limit 1;

  if v_plano_id is null then
    return new;
  end if;

  insert into public.licencas_empresas (
    empresa_id,
    plano_id,
    status,
    inicio_teste,
    fim_teste,
    vencimento,
    limite_usuarios,
    limite_produtos,
    observacao
  )
  values (
    new.id,
    v_plano_id,
    'teste',
    current_date,
    current_date + 14,
    current_date + 14,
    v_limite_usuarios,
    v_limite_produtos,
    'Licença criada automaticamente no cadastro da empresa.'
  )
  on conflict (empresa_id) do nothing;

  return new;
end;
$$;

drop trigger if exists empresas_criar_licenca_padrao on public.empresas;
create trigger empresas_criar_licenca_padrao
after insert on public.empresas
for each row execute function private.criar_licenca_padrao_empresa();

create or replace function private.validar_limite_produtos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ativo = true and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.ativo = false)) then
    if not private.empresa_pode_criar_produto(new.empresa_id) then
      raise exception 'Limite de produtos atingido ou licença sem operação ativa.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists produtos_validar_limite_saas on public.produtos;
create trigger produtos_validar_limite_saas
before insert or update of ativo on public.produtos
for each row execute function private.validar_limite_produtos();

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
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not private.empresa_licenca_operacional(p_empresa_id) then
    raise exception 'Venda bloqueada: licença vencida, bloqueada ou sem período ativo.';
  end if;

  if not private.usuario_tem_perfil(
    p_empresa_id,
    array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]
  ) then
    raise exception 'Usuário sem permissão para vender nesta empresa.';
  end if;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Venda sem itens.';
  end if;

  if p_desconto_total < 0 then
    raise exception 'Desconto total inválido.';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_quantidade := (v_item->>'quantidade')::numeric;
    v_desconto := coalesce((v_item->>'desconto')::numeric, 0);

    if v_quantidade <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select *
    into v_produto
    from public.produtos
    where id = (v_item->>'produto_id')::uuid
      and empresa_id = p_empresa_id
      and ativo = true
    for update;

    if not found then
      raise exception 'Produto não encontrado ou inativo.';
    end if;

    if v_produto.preco_venda <= 0 then
      raise exception 'Produto % sem preço válido.', v_produto.descricao;
    end if;

    if v_produto.estoque_atual < v_quantidade then
      raise exception 'Estoque insuficiente para %.', v_produto.descricao;
    end if;

    if v_desconto < 0 or v_desconto > (v_produto.preco_venda * v_quantidade) then
      raise exception 'Desconto inválido para %.', v_produto.descricao;
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
    true
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
      'Baixa automática na finalização da venda',
      v_user_id
    );

    update public.produtos
    set estoque_atual = estoque_atual - v_quantidade
    where id = v_produto.id;
  end loop;

  return v_venda_id;
end;
$$;

drop policy if exists "produtos_write_perfis" on public.produtos;
create policy "produtos_insert_perfis_licenca" on public.produtos
for insert to authenticated
with check (
  private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario])
  and private.empresa_pode_criar_produto(empresa_id)
);

create policy "produtos_update_perfis_licenca" on public.produtos
for update to authenticated
using (
  private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario])
  and private.empresa_licenca_operacional(empresa_id)
)
with check (
  private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario])
  and private.empresa_licenca_operacional(empresa_id)
);

drop policy if exists "clientes_empresa" on public.clientes;
create policy "clientes_select_empresa" on public.clientes
for select to authenticated
using (private.usuario_tem_empresa(empresa_id));

create policy "clientes_write_empresa_licenca" on public.clientes
for all to authenticated
using (private.usuario_tem_empresa(empresa_id) and private.empresa_licenca_operacional(empresa_id))
with check (private.usuario_tem_empresa(empresa_id) and private.empresa_licenca_operacional(empresa_id));

drop policy if exists "vendas_insert_operacao" on public.vendas;
create policy "vendas_insert_operacao" on public.vendas
for insert to authenticated
with check (
  usuario_id = auth.uid()
  and private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario])
  and private.empresa_licenca_operacional(empresa_id)
);

drop policy if exists "movimentacoes_insert_perfis" on public.movimentacoes_estoque;
create policy "movimentacoes_insert_perfis" on public.movimentacoes_estoque
for insert to authenticated
with check (
  private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario, 'operador'::public.perfil_usuario])
  and private.empresa_licenca_operacional(empresa_id)
);

create or replace view public.empresa_licenca_atual
with (security_invoker = true)
as
select
  le.id,
  le.empresa_id,
  ps.nome as plano_nome,
  ps.codigo as plano_codigo,
  le.status,
  le.fim_teste,
  le.vencimento,
  le.limite_usuarios,
  le.limite_produtos,
  le.bloqueio_motivo,
  le.observacao,
  private.empresa_licenca_operacional(le.empresa_id) as operacional,
  (
    select count(*)
    from public.usuarios_empresas ue
    where ue.empresa_id = le.empresa_id
      and ue.ativo = true
  ) as usuarios_ativos,
  (
    select count(*)
    from public.produtos p
    where p.empresa_id = le.empresa_id
      and p.ativo = true
  ) as produtos_ativos
from public.licencas_empresas le
join public.planos_saas ps on ps.id = le.plano_id
where private.usuario_tem_empresa(le.empresa_id) or private.usuario_super_admin();

grant execute on function private.empresa_licenca_operacional(uuid) to authenticated;
grant execute on function private.empresa_pode_criar_produto(uuid) to authenticated;
grant execute on function private.empresa_pode_criar_usuario(uuid) to authenticated;
grant select on public.empresa_licenca_atual to authenticated;
