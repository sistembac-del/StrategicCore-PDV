create table if not exists public.configuracoes_gerais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade unique,
  permitir_estoque_negativo boolean not null default false,
  casas_decimais_quantidade integer not null default 3 check (casas_decimais_quantidade between 0 and 4),
  impressao_automatica_nfce boolean not null default false,
  reimpressao_danfe_auditada boolean not null default true,
  baixa_estoque_ao_finalizar boolean not null default true,
  cancelamento_estorna_estoque boolean not null default true,
  exigir_cpf_acima_de numeric(12,2) check (exigir_cpf_acima_de is null or exigir_cpf_acima_de >= 0),
  pdv_modo_compacto boolean not null default false,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists configuracoes_gerais_empresa_idx on public.configuracoes_gerais (empresa_id);

drop trigger if exists configuracoes_gerais_touch_updated_at on public.configuracoes_gerais;
create trigger configuracoes_gerais_touch_updated_at before update on public.configuracoes_gerais
for each row execute function public.touch_updated_at();

alter table public.configuracoes_gerais enable row level security;

drop policy if exists "configuracoes_gerais_select_empresa" on public.configuracoes_gerais;
create policy "configuracoes_gerais_select_empresa" on public.configuracoes_gerais
for select to authenticated
using (private.usuario_tem_empresa(empresa_id) or private.usuario_super_admin());

drop policy if exists "configuracoes_gerais_write_admin" on public.configuracoes_gerais;
create policy "configuracoes_gerais_write_admin" on public.configuracoes_gerais
for all to authenticated
using (
  private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario])
  or private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role])
)
with check (
  private.usuario_tem_perfil(empresa_id, array['admin'::public.perfil_usuario])
  or private.usuario_super_admin_role(array['owner'::public.super_admin_role, 'admin'::public.super_admin_role])
);

insert into public.configuracoes_gerais (empresa_id)
select e.id
from public.empresas e
where not exists (
  select 1
  from public.configuracoes_gerais cg
  where cg.empresa_id = e.id
);

create or replace function private.criar_configuracoes_gerais_padrao()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.configuracoes_gerais (empresa_id)
  values (new.id)
  on conflict (empresa_id) do nothing;

  return new;
end;
$$;

drop trigger if exists empresas_criar_configuracoes_gerais_padrao on public.empresas;
create trigger empresas_criar_configuracoes_gerais_padrao
after insert on public.empresas
for each row execute function private.criar_configuracoes_gerais_padrao();

grant select, insert, update on public.configuracoes_gerais to authenticated;
grant execute on function private.criar_configuracoes_gerais_padrao() to authenticated;
