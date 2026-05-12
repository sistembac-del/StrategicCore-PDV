create table public.cobrancas_saas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  licenca_id uuid not null references public.licencas_empresas(id) on delete cascade,
  plano_id uuid references public.planos_saas(id) on delete set null,
  competencia text not null,
  valor numeric(12,2) not null check (valor >= 0),
  vencimento date not null,
  pago_em date,
  status text not null default 'aberta' check (status in ('aberta', 'paga', 'vencida', 'cancelada', 'estornada')),
  forma_pagamento text,
  referencia_externa text,
  observacao text,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cobrancas_saas_empresa_idx on public.cobrancas_saas (empresa_id, vencimento desc);
create index cobrancas_saas_status_idx on public.cobrancas_saas (status, vencimento);

create trigger cobrancas_saas_touch_updated_at before update on public.cobrancas_saas
for each row execute function public.touch_updated_at();

alter table public.cobrancas_saas enable row level security;

create policy "cobrancas_select_super_admin_ou_empresa" on public.cobrancas_saas
for select to authenticated
using (private.usuario_super_admin() or private.usuario_tem_empresa(empresa_id));

create policy "cobrancas_write_super_admin" on public.cobrancas_saas
for all to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]));

create or replace function private.marcar_cobrancas_vencidas()
returns void
language sql
security definer
set search_path = public
as $$
  update public.cobrancas_saas
  set status = 'vencida',
      updated_at = now()
  where status = 'aberta'
    and vencimento < current_date;
$$;

create or replace view public.super_admin_cobrancas_resumo
with (security_invoker = true)
as
select
  c.id,
  c.empresa_id,
  e.nome_fantasia as empresa_nome,
  e.cnpj,
  c.licenca_id,
  c.plano_id,
  ps.nome as plano_nome,
  c.competencia,
  c.valor,
  c.vencimento,
  c.pago_em,
  case
    when c.status = 'aberta' and c.vencimento < current_date then 'vencida'
    else c.status
  end as status,
  c.forma_pagamento,
  c.referencia_externa,
  c.observacao,
  c.created_at,
  c.updated_at
from public.cobrancas_saas c
join public.empresas e on e.id = c.empresa_id
left join public.planos_saas ps on ps.id = c.plano_id;

insert into public.cobrancas_saas (
  empresa_id,
  licenca_id,
  plano_id,
  competencia,
  valor,
  vencimento,
  status,
  observacao
)
select
  le.empresa_id,
  le.id,
  le.plano_id,
  to_char(current_date, 'YYYY-MM'),
  ps.preco_mensal,
  coalesce(le.vencimento, current_date + 14),
  'aberta',
  'Cobrança inicial gerada automaticamente.'
from public.licencas_empresas le
join public.planos_saas ps on ps.id = le.plano_id
where not exists (
  select 1
  from public.cobrancas_saas c
  where c.licenca_id = le.id
);

grant select, insert, update on public.cobrancas_saas to authenticated;
grant select on public.super_admin_cobrancas_resumo to authenticated;
grant execute on function private.marcar_cobrancas_vencidas() to authenticated;
