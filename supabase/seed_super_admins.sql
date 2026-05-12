create extension if not exists pgcrypto;

create or replace function public.seed_super_admin_user(
  p_email text,
  p_password text,
  p_nome text,
  p_cargo text,
  p_role public.super_admin_role
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = p_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      reauthentication_token,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_nome),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      false,
      false
    );
  else
    update auth.users
    set
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('name', p_nome),
      updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider)
  do update set
    identity_data = excluded.identity_data,
    updated_at = now();

  insert into public.super_admins (
    user_id,
    nome,
    cargo,
    role,
    ativo
  )
  values (
    v_user_id,
    p_nome,
    p_cargo,
    p_role,
    true
  )
  on conflict (user_id)
  do update set
    nome = excluded.nome,
    cargo = excluded.cargo,
    role = excluded.role,
    ativo = true,
    updated_at = now();

  return v_user_id;
end;
$$;

select public.seed_super_admin_user(
  'galileu@strategiccore.systems',
  'CoreFlow@2026',
  'Galileu Neto',
  'Super Admin Master',
  'owner'
);

select public.seed_super_admin_user(
  'filipe@strategiccore.systems',
  'CoreFlow@2026',
  'Filipe',
  'Super Admin Operacional',
  'admin'
);

drop function public.seed_super_admin_user(text, text, text, text, public.super_admin_role);
