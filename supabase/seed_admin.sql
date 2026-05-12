do $$
declare
  v_user_id uuid;
  v_empresa_id uuid;
  v_email text := 'admin@strategiccore.systems';
  v_password text := 'demo123';
begin
  select id into v_user_id
  from auth.users
  where email = v_email;

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
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin Strategic Core"}'::jsonb,
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
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
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
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider)
  do update set
    identity_data = excluded.identity_data,
    updated_at = now();

  select id into v_empresa_id
  from public.empresas
  where cnpj = '00000000000100';

  if v_empresa_id is null then
    insert into public.empresas (
      razao_social,
      nome_fantasia,
      cnpj,
      inscricao_estadual,
      regime_tributario,
      uf,
      municipio,
      endereco,
      ativo
    )
    values (
      'Strategic Core Systems Demo LTDA',
      'Strategic Core Demo',
      '00000000000100',
      'ISENTO',
      'simples_nacional',
      'CE',
      'Fortaleza',
      '{"logradouro":"Avenida Demo","numero":"100","bairro":"Centro"}'::jsonb,
      true
    )
    returning id into v_empresa_id;
  end if;

  insert into public.usuarios_empresas (
    user_id,
    empresa_id,
    perfil,
    ativo
  )
  values (
    v_user_id,
    v_empresa_id,
    'admin',
    true
  )
  on conflict (user_id, empresa_id)
  do update set
    perfil = 'admin',
    ativo = true;
end $$;
