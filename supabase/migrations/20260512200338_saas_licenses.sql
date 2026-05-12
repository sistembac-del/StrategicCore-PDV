create table public.planos_saas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  preco_mensal numeric(12,2) not null default 0,
  limite_usuarios integer not null default 3 check (limite_usuarios > 0),
  limite_produtos integer not null default 500 check (limite_produtos > 0),
  limite_empresas integer not null default 1 check (limite_empresas > 0),
  recursos jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.licencas_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade unique,
  plano_id uuid not null references public.planos_saas(id) on delete restrict,
  status text not null default 'teste' check (status in ('teste', 'ativo', 'vencido', 'bloqueado', 'cancelado')),
  inicio_teste date not null default current_date,
  fim_teste date,
  vencimento date,
  limite_usuarios integer not null default 3 check (limite_usuarios > 0),
  limite_produtos integer not null default 500 check (limite_produtos > 0),
  observacao text,
  bloqueio_motivo text,
  atualizado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger planos_saas_touch_updated_at before update on public.planos_saas
for each row execute function public.touch_updated_at();

create trigger licencas_empresas_touch_updated_at before update on public.licencas_empresas
for each row execute function public.touch_updated_at();

alter table public.planos_saas enable row level security;
alter table public.licencas_empresas enable row level security;

create policy "planos_saas_select_ativos_ou_super_admin" on public.planos_saas
for select to authenticated
using (ativo = true or private.usuario_super_admin());

create policy "planos_saas_write_super_admin" on public.planos_saas
for all to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]));

create policy "licencas_select_super_admin_ou_empresa" on public.licencas_empresas
for select to authenticated
using (private.usuario_super_admin() or private.usuario_tem_empresa(empresa_id));

create policy "licencas_write_super_admin" on public.licencas_empresas
for all to authenticated
using (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]))
with check (private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role]));

insert into public.planos_saas (
  codigo,
  nome,
  descricao,
  preco_mensal,
  limite_usuarios,
  limite_produtos,
  limite_empresas,
  recursos
) values
  (
    'starter',
    'Starter',
    'Plano inicial para pequenos varejos em implantação.',
    97,
    3,
    500,
    1,
    '{"pdv": true, "produtos": true, "estoque": true, "nfce": false, "relatorios": "basico"}'::jsonb
  ),
  (
    'profissional',
    'Profissional',
    'Plano principal para revendedores com operação completa.',
    197,
    8,
    5000,
    1,
    '{"pdv": true, "produtos": true, "estoque": true, "nfce": true, "relatorios": "gerencial", "usuarios": true}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'Plano avançado para redes, franquias e operações maiores.',
    397,
    25,
    25000,
    5,
    '{"pdv": true, "produtos": true, "estoque": true, "nfce": true, "relatorios": "avancado", "usuarios": true, "multiempresa": true}'::jsonb
  )
on conflict (codigo) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco_mensal = excluded.preco_mensal,
  limite_usuarios = excluded.limite_usuarios,
  limite_produtos = excluded.limite_produtos,
  limite_empresas = excluded.limite_empresas,
  recursos = excluded.recursos,
  ativo = true;

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
select
  e.id,
  p.id,
  'teste',
  current_date,
  current_date + 14,
  current_date + 14,
  p.limite_usuarios,
  p.limite_produtos,
  'Licença criada automaticamente para implantação SaaS.'
from public.empresas e
cross join lateral (
  select id, limite_usuarios, limite_produtos
  from public.planos_saas
  where codigo = 'profissional'
  limit 1
) p
on conflict (empresa_id) do nothing;

create or replace view public.super_admin_licencas_resumo
with (security_invoker = true)
as
select
  le.id,
  le.empresa_id,
  e.nome_fantasia as empresa_nome,
  e.cnpj,
  le.plano_id,
  ps.nome as plano_nome,
  ps.codigo as plano_codigo,
  ps.preco_mensal,
  le.status,
  le.inicio_teste,
  le.fim_teste,
  le.vencimento,
  le.limite_usuarios,
  le.limite_produtos,
  le.observacao,
  le.bloqueio_motivo,
  le.updated_at,
  count(distinct ue.user_id) filter (where ue.ativo = true) as usuarios_ativos,
  count(distinct p.id) filter (where p.ativo = true) as produtos_ativos
from public.licencas_empresas le
join public.empresas e on e.id = le.empresa_id
join public.planos_saas ps on ps.id = le.plano_id
left join public.usuarios_empresas ue on ue.empresa_id = le.empresa_id
left join public.produtos p on p.empresa_id = le.empresa_id
group by le.id, e.id, ps.id;

grant select, insert, update on public.planos_saas to authenticated;
grant select, insert, update on public.licencas_empresas to authenticated;
grant select on public.super_admin_licencas_resumo to authenticated;
