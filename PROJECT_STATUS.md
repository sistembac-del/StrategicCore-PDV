# CoreFlow PDV - Status do Projeto

Atualizado em: 2026-05-13

## Como usar este arquivo

Este arquivo deve ser atualizado ao final de cada rodada de trabalho. Ele serve como resumo para continuar o projeto em uma nova conversa sem perder contexto.

## Links

- App principal: https://coreflow-pdv.pages.dev
- Ultimo preview publicado: https://f4bf58b7.coreflow-pdv.pages.dev
- Supabase project ref: `mubggmlkvbucneqtwvsw`
- Cloudflare Pages project: `coreflow-pdv`

## Contas de acesso criadas

- Super admin: `galileu@strategiccore.systems`
- Super admin: `filipe@strategiccore.systems`
- Demo admin: `admin@strategiccore.systems`

Observacao: senhas e tokens nao devem ser registrados neste arquivo.

## Feito

- Frontend React/Vite com identidade Strategic Core Systems e CoreFlow PDV.
- Deploy no Cloudflare Pages.
- Supabase conectado com Auth, Postgres, Storage, Edge Functions e RLS.
- Estrutura multiempresa com `empresas` e `usuarios_empresas`.
- Super Admin/Core Admin para criar revendedores, usuarios, dominios, licencas e cobrancas.
- Login, dashboard, PDV, produtos, estoque, clientes, vendas, NFC-e, relatorios, fiscal, empresa, usuarios e configuracoes gerais.
- PDV com finalizacao de venda, baixa de estoque e opcao de emissao NFC-e via Edge Function.
- Historico de vendas real com filtros, detalhe da venda, cancelamento e estorno de estoque.
- RPC `cancelar_venda` com validacao fiscal, auditoria e movimentacao `CANCELAMENTO_VENDA`.
- Importacao de produtos via CSV.
- Exportacao CSV de vendas, NFC-e e estoque baixo.
- Configuracoes fiscais com CSC/certificado tratados somente no backend.
- Bucket privado `documentos-fiscais`.
- Links assinados temporarios para XML/DANFE via Edge Function.
- Adaptador fiscal configuravel por secrets no Supabase.
- Painel de status da API fiscal externa.
- Modulo Empresa funcional com edicao por admin e consulta de plano/dominios.
- Configuracoes Gerais agora persistidas no Supabase por empresa, com RLS, tela editavel por admin e status de producao.
- Regras de Configuracoes Gerais aplicadas no PDV e no Postgres: estoque negativo, baixa de estoque na venda, estorno no cancelamento, CPF obrigatorio por valor e modo compacto.
- Correcao inicial de textos do menu com acentos quebrados.
- Arquivo de acompanhamento `PROJECT_STATUS.md` criado para continuidade entre conversas.

## Falta fazer

- Escolher/contratar API fiscal real e configurar secrets de homologacao.
- Ajustar payload fiscal ao contrato exato da API escolhida.
- Testar emissao NFC-e em homologacao com retorno real da SEFAZ/API.
- Criar fluxo visual de teste fiscal de homologacao.
- Criar preferencias de impressao e comportamento de impressao de DANFE.
- Criar fluxo de baixa manual de estoque para vendas finalizadas quando a baixa automatica estiver desativada.
- Criar filtros funcionais em Produtos, Clientes e Cupons NFC-e.
- Melhorar relatorios com dados agrupados reais por dia/operador.
- Criar testes automatizados de regras criticas.
- Revisar todos os textos do app para remover qualquer acento quebrado remanescente.

## Observacoes tecnicas

- Nunca expor `service_role`, certificado A1, senha, CSC/token ou chave da API fiscal no frontend.
- Emissao, consulta, cancelamento e reenvio de NFC-e devem passar por Supabase Edge Functions.
- Reenvio de NFC-e nao pode duplicar baixa de estoque.
- Venda cancelada com NFC-e autorizada deve passar pelo fluxo fiscal antes de estornar estoque.
