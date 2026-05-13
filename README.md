# CoreFlow PDV

Sistema SaaS premium para revendedores e pequenos varejos, criado para a Strategic Core Systems.

## Stack

- React + Vite para o frontend
- Supabase Auth, Postgres, Storage, RLS e Edge Functions
- Cloudflare Pages para deploy do frontend
- API fiscal externa via Edge Functions para NFC-e modelo 65

## Rodando localmente

```bash
npm install
npm run dev
```

Configure o arquivo `.env` com as variáveis públicas do Supabase:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

Nunca coloque `service_role`, certificado A1, senha, CSC/token NFC-e ou chave da API fiscal no frontend.

## Deploy Cloudflare Pages

Conforme a documentação atual do Cloudflare Pages para Vite, use:

- Build command: `npm run build`
- Build output directory: `dist`

## Supabase

1. Aplique a migração em `supabase/migrations/20260511120000_coreflow_schema.sql`.
2. Crie o bucket privado `documentos-fiscais` ou aplique o SQL da migração.
3. Configure secrets das Edge Functions:

```bash
supabase secrets set FISCAL_API_URL=https://api-fiscal.example.com
supabase secrets set FISCAL_API_KEY=...
supabase secrets set FISCAL_PROVIDER_NAME=generic
```

Secrets opcionais para adaptar o contrato ao provedor escolhido:

```bash
supabase secrets set FISCAL_API_AUTH_HEADER=Authorization
supabase secrets set FISCAL_API_AUTH_SCHEME=Bearer
supabase secrets set FISCAL_API_EMITIR_PATH=/nfce/emitir
supabase secrets set FISCAL_API_CANCELAR_PATH=/nfce/cancelar
supabase secrets set FISCAL_API_CONSULTAR_PATH=/nfce/consultar
supabase secrets set FISCAL_API_TIMEOUT_MS=30000
supabase secrets set FISCAL_API_HEALTH_PATH=/health
```

4. Faça deploy das funções:

```bash
supabase functions deploy emitir-nfce
supabase functions deploy cancelar-nfce
supabase functions deploy consultar-nfce
supabase functions deploy reenviar-nfce
supabase functions deploy fiscal-provider-status
supabase functions deploy fiscal-document-files
```

As funções entregues são uma base segura e idempotente para integrar a API fiscal externa real. Elas não geram cupom fiscal falso e não expõem segredos no cliente.
