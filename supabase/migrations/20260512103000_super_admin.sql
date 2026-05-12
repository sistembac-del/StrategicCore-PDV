create type public.super_admin_role as enum ('owner', 'admin', 'support', 'auditor');

create table public.super_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  nome text not null,
  cargo text not null,
  role public.super_admin_role not null default 'admin',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.empresa_dominios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  dominio text not null unique,
  status text not null default 'pendente',
  observacao text,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.usuario_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.super_admins sa
    where sa.user_id = auth.uid()
      and sa.ativo = true
  );
$$;

create or replace function private.usuario_super_admin_role(roles public.super_admin_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.super_admins sa
    where sa.user_id = auth.uid()
      and sa.ativo = true
      and sa.role = any(roles)
  );
$$;

create trigger super_admins_touch_updated_at before update on public.super_admins
for each row execute function public.touch_updated_at();

create trigger empresa_dominios_touch_updated_at before update on public.empresa_dominios
for each row execute function public.touch_updated_at();

alter table public.super_admins enable row level security;
alter table public.empresa_dominios enable row level security;

create policy "super_admins_select_super_admin" on public.super_admins
for select to authenticated
using (private.usuario_super_admin());

create policy "super_admins_write_owner" on public.super_admins
for all to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role]));

create policy "empresa_dominios_select_super_admin_ou_empresa" on public.empresa_dominios
for select to authenticated
using (private.usuario_super_admin() or private.usuario_tem_empresa(empresa_id));

create policy "empresa_dominios_write_super_admin" on public.empresa_dominios
for all to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]));

create policy "empresas_select_super_admin" on public.empresas
for select to authenticated
using (private.usuario_super_admin());

create policy "empresas_update_super_admin" on public.empresas
for update to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]));

create policy "usuarios_empresas_select_super_admin" on public.usuarios_empresas
for select to authenticated
using (private.usuario_super_admin());

create policy "usuarios_empresas_write_super_admin" on public.usuarios_empresas
for all to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]));

create or replace view public.super_admin_empresas_resumo
with (security_invoker = true)
as
select
  e.id,
  e.razao_social,
  e.nome_fantasia,
  e.cnpj,
  e.uf,
  e.municipio,
  e.ativo,
  e.created_at,
  count(distinct ue.user_id) as total_usuarios,
  count(distinct p.id) as total_produtos,
  count(distinct v.id) as total_vendas,
  coalesce(sum(v.total), 0)::numeric(12,2) as faturamento_total,
  count(distinct df.id) filter (where df.status = 'AUTORIZADA') as nfce_autorizadas,
  count(distinct df.id) filter (where df.status = 'REJEITADA') as nfce_rejeitadas
from public.empresas e
left join public.usuarios_empresas ue on ue.empresa_id = e.id and ue.ativo = true
left join public.produtos p on p.empresa_id = e.id
left join public.vendas v on v.empresa_id = e.id
left join public.documentos_fiscais df on df.empresa_id = e.id
group by e.id;

grant usage on schema public to authenticated;
grant execute on function private.usuario_super_admin() to authenticated;
grant execute on function private.usuario_super_admin_role(public.super_admin_role[]) to authenticated;
grant select, insert, update on public.super_admins to authenticated;
grant select, insert, update, delete on public.empresa_dominios to authenticated;
grant select on public.super_admin_empresas_resumo to authenticated;
