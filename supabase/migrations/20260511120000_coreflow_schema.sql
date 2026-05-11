create extension if not exists pgcrypto;

create schema if not exists private;

create type public.perfil_usuario as enum ('admin', 'gerente', 'operador', 'estoquista', 'visualizador');
create type public.status_fiscal as enum ('NAO_EMITIDA', 'ENVIANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'CONTINGENCIA');
create type public.status_venda as enum ('ABERTA', 'FINALIZADA', 'CANCELADA');
create type public.forma_pagamento as enum ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'OUTROS');
create type public.tipo_movimentacao_estoque as enum ('ENTRADA_MANUAL', 'VENDA', 'CANCELAMENTO_VENDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO');
create type public.ambiente_fiscal as enum ('homologacao', 'producao');

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null unique,
  inscricao_estadual text,
  regime_tributario text not null,
  uf char(2) not null,
  municipio text not null,
  endereco jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  perfil public.perfil_usuario not null default 'operador',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, empresa_id)
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  codigo_barras text,
  descricao text not null,
  categoria text,
  marca text,
  preco_custo numeric(12,2) not null default 0 check (preco_custo >= 0),
  preco_venda numeric(12,2) not null check (preco_venda > 0),
  margem numeric(8,2) generated always as (
    case when preco_custo > 0 then round(((preco_venda - preco_custo) / preco_custo) * 100, 2) else 0 end
  ) stored,
  estoque_atual numeric(12,3) not null default 0 check (estoque_atual >= 0),
  estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  unidade text not null default 'UN',
  ncm text,
  cest text,
  cfop text,
  origem text,
  csosn text,
  cst text,
  aliquota_icms numeric(5,2),
  unidade_comercial_fiscal text not null default 'UN',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  endereco jsonb,
  observacoes text,
  created_at timestamptz not null default now()
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  usuario_id uuid not null references auth.users(id),
  cliente_id uuid references public.clientes(id),
  cliente_cpf text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  desconto_total numeric(12,2) not null default 0 check (desconto_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  forma_pagamento public.forma_pagamento not null,
  status_venda public.status_venda not null default 'FINALIZADA',
  status_fiscal public.status_fiscal not null default 'NAO_EMITIDA',
  estoque_baixado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (desconto_total <= subtotal),
  check (total = subtotal - desconto_total)
);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  produto_id uuid references public.produtos(id) on delete restrict,
  codigo text not null,
  codigo_barras text,
  descricao text not null,
  quantidade numeric(12,3) not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null check (valor_unitario > 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  total numeric(12,2) not null check (total >= 0),
  ncm text,
  cfop text,
  csosn text,
  cst text,
  created_at timestamptz not null default now(),
  check (desconto <= quantidade * valor_unitario)
);

create table public.documentos_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  venda_id uuid not null references public.vendas(id) on delete cascade,
  modelo text not null default '65',
  serie text,
  numero text,
  chave_acesso text,
  protocolo text,
  status public.status_fiscal not null default 'NAO_EMITIDA',
  motivo_rejeicao text,
  qr_code text,
  xml_path text,
  danfe_path text,
  autorizado_em timestamptz,
  cancelado_em timestamptz,
  protocolo_cancelamento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, venda_id, modelo)
);

create table public.configuracoes_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade unique,
  ambiente public.ambiente_fiscal not null default 'homologacao',
  serie_nfce text not null default '1',
  proximo_numero_nfce integer not null default 1 check (proximo_numero_nfce > 0),
  csc_token text,
  csc_id text,
  certificado_path text,
  certificado_configurado boolean not null default false,
  csc_configurado boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  venda_id uuid references public.vendas(id) on delete set null,
  tipo public.tipo_movimentacao_estoque not null,
  quantidade numeric(12,3) not null check (quantidade > 0),
  estoque_anterior numeric(12,3) not null,
  estoque_posterior numeric(12,3) not null,
  observacao text,
  usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index produtos_empresa_idx on public.produtos (empresa_id);
create index clientes_empresa_idx on public.clientes (empresa_id);
create index vendas_empresa_created_idx on public.vendas (empresa_id, created_at desc);
create index venda_itens_venda_idx on public.venda_itens (venda_id);
create index documentos_empresa_status_idx on public.documentos_fiscais (empresa_id, status, created_at desc);
create index movimentacoes_empresa_produto_idx on public.movimentacoes_estoque (empresa_id, produto_id, created_at desc);

create or replace function private.usuario_tem_empresa(target_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.usuarios_empresas ue
    where ue.user_id = auth.uid()
      and ue.empresa_id = target_empresa_id
      and ue.ativo = true
  );
$$;

create or replace function private.usuario_tem_perfil(target_empresa_id uuid, perfis public.perfil_usuario[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.usuarios_empresas ue
    where ue.user_id = auth.uid()
      and ue.empresa_id = target_empresa_id
      and ue.ativo = true
      and ue.perfil = any(perfis)
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger produtos_touch_updated_at before update on public.produtos
for each row execute function public.touch_updated_at();

create trigger vendas_touch_updated_at before update on public.vendas
for each row execute function public.touch_updated_at();

create trigger documentos_touch_updated_at before update on public.documentos_fiscais
for each row execute function public.touch_updated_at();

create trigger configuracoes_touch_updated_at before update on public.configuracoes_fiscais
for each row execute function public.touch_updated_at();

alter table public.empresas enable row level security;
alter table public.usuarios_empresas enable row level security;
alter table public.produtos enable row level security;
alter table public.clientes enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.documentos_fiscais enable row level security;
alter table public.configuracoes_fiscais enable row level security;
alter table public.movimentacoes_estoque enable row level security;

create policy "empresas_select_membros" on public.empresas
for select to authenticated
using (private.usuario_tem_empresa(id));

create policy "usuarios_empresas_select_proprio_contexto" on public.usuarios_empresas
for select to authenticated
using (user_id = auth.uid() or private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario]));

create policy "usuarios_empresas_admin_write" on public.usuarios_empresas
for all to authenticated
using (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario]))
with check (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario]));

create policy "produtos_select_empresa" on public.produtos
for select to authenticated
using (private.usuario_tem_empresa(empresa_id));

create policy "produtos_write_perfis" on public.produtos
for all to authenticated
using (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario]))
with check (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario]));

create policy "clientes_empresa" on public.clientes
for all to authenticated
using (private.usuario_tem_empresa(empresa_id))
with check (private.usuario_tem_empresa(empresa_id));

create policy "vendas_select_empresa" on public.vendas
for select to authenticated
using (private.usuario_tem_empresa(empresa_id));

create policy "vendas_insert_operacao" on public.vendas
for insert to authenticated
with check (
  usuario_id = auth.uid()
  and private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario])
);

create policy "vendas_update_gestao" on public.vendas
for update to authenticated
using (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]))
with check (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]));

create policy "venda_itens_empresa" on public.venda_itens
for all to authenticated
using (private.usuario_tem_empresa(empresa_id))
with check (private.usuario_tem_empresa(empresa_id));

create policy "documentos_select_empresa" on public.documentos_fiscais
for select to authenticated
using (private.usuario_tem_empresa(empresa_id));

create policy "documentos_update_fiscal" on public.documentos_fiscais
for update to authenticated
using (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]))
with check (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario]));

create policy "configuracoes_select_empresa" on public.configuracoes_fiscais
for select to authenticated
using (private.usuario_tem_empresa(empresa_id));

create policy "configuracoes_update_admin" on public.configuracoes_fiscais
for update to authenticated
using (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario]))
with check (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario]));

create policy "movimentacoes_select_empresa" on public.movimentacoes_estoque
for select to authenticated
using (private.usuario_tem_empresa(empresa_id));

create policy "movimentacoes_insert_perfis" on public.movimentacoes_estoque
for insert to authenticated
with check (private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'estoquista'::public.perfil_usuario, 'operador'::public.perfil_usuario]));

revoke all on public.configuracoes_fiscais from anon, authenticated;
grant select (
  id,
  empresa_id,
  ambiente,
  serie_nfce,
  proximo_numero_nfce,
  certificado_configurado,
  csc_configurado,
  ativo,
  created_at,
  updated_at
) on public.configuracoes_fiscais to authenticated;
grant update (
  ambiente,
  serie_nfce,
  proximo_numero_nfce,
  certificado_configurado,
  csc_configurado,
  ativo,
  updated_at
) on public.configuracoes_fiscais to authenticated;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.usuario_tem_empresa(uuid) to authenticated;
grant execute on function private.usuario_tem_perfil(uuid, public.perfil_usuario[]) to authenticated;
grant select, insert, update on public.empresas to authenticated;
grant select, insert, update on public.usuarios_empresas to authenticated;
grant select, insert, update on public.produtos to authenticated;
grant select, insert, update on public.clientes to authenticated;
grant select, insert, update on public.vendas to authenticated;
grant select, insert, update on public.venda_itens to authenticated;
grant select, insert, update on public.documentos_fiscais to authenticated;
grant select, insert on public.movimentacoes_estoque to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-fiscais',
  'documentos-fiscais',
  false,
  10485760,
  array['application/xml', 'text/xml', 'application/pdf', 'image/png']::text[]
)
on conflict (id) do nothing;

create policy "storage_documentos_read_empresa" on storage.objects
for select to authenticated
using (
  bucket_id = 'documentos-fiscais'
  and private.usuario_tem_empresa((storage.foldername(name))[1]::uuid)
);

create policy "storage_documentos_insert_empresa" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documentos-fiscais'
  and private.usuario_tem_perfil((storage.foldername(name))[1]::uuid, array['admin'::public.perfil_usuario, 'gerente'::public.perfil_usuario, 'operador'::public.perfil_usuario])
);
