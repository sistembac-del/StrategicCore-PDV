# CoreFlow PDV - Status do Projeto

Atualizado em: 2026-05-14

## Como usar este arquivo

Este arquivo deve ser atualizado ao final de cada rodada de trabalho. Ele serve como resumo para continuar o projeto em uma nova conversa sem perder contexto.

## Links

- App principal: https://coreflow-pdv.pages.dev
- Ultimo preview publicado: https://f504618f.coreflow-pdv.pages.dev
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
- PDV agora nao lista produtos automaticamente ao abrir; produtos aparecem apenas apos busca/digitacao/bipagem, Enter adiciona quando houver um unico resultado e a busca limpa apos adicionar.
- PDV agora gera comprovante/cupom de venda para impressao ao finalizar, com aviso de documento nao fiscal quando nao houver NFC-e autorizada, e reimpressao pelo Historico de Vendas.
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
- Baixa manual de estoque para vendas finalizadas com estoque pendente, com RPC `baixar_estoque_venda`, historico em `movimentacoes_estoque`, bloqueio contra baixa duplicada e permissao por cargo.
- Importacao de XML/PDF no modulo Produtos para criar produtos novos a partir da nota, usando quantidade como estoque inicial e evitando duplicar produtos ja cadastrados.
- Modulo Estoque simplificado: removidos os blocos de Movimentacoes recentes e Importar XML/PDF da tela.
- Modulo Estoque simplificado no formulario manual: removidos campo Observacao e opcoes de Ajuste positivo/negativo.
- Modulo Estoque agora ficou apenas para consulta do estoque atual; removido o formulario manual de entrada/saida e quantidade.
- Menu lateral renomeado de Produtos para Entrada de Notas.
- Entrada de Notas simplificada: removido importador CSV, removida listagem lateral de cadastro e Novo produto agora abre em modal.
- Entrada de Notas agora solicita valor de venda imediatamente apos importar XML/PDF; produtos novos sao criados com estoque inicial e produtos ja cadastrados atualizam preco de custo/venda e recebem entrada de estoque pela nota.
- Modulo Clientes melhorado com botao "Criar cliente", modal de cadastro, busca por nome/CPF/telefone/e-mail e listagem mais limpa.
- Correcao inicial de textos do menu com acentos quebrados.
- Arquivo de acompanhamento `PROJECT_STATUS.md` criado para continuidade entre conversas.

## Falta fazer

- Escolher/contratar API fiscal real e configurar secrets de homologacao.
- Ajustar payload fiscal ao contrato exato da API escolhida.
- Testar emissao NFC-e em homologacao com retorno real da SEFAZ/API.
- Criar fluxo visual de teste fiscal de homologacao.
- Criar preferencias de impressao e comportamento de impressao de DANFE.
- Criar filtros funcionais em Produtos, Clientes e Cupons NFC-e.
- Melhorar relatorios com dados agrupados reais por dia/operador.
- Criar testes automatizados de regras criticas.
- Revisar todos os textos do app para remover qualquer acento quebrado remanescente.

## Observacoes tecnicas

- Nunca expor `service_role`, certificado A1, senha, CSC/token ou chave da API fiscal no frontend.
- Emissao, consulta, cancelamento e reenvio de NFC-e devem passar por Supabase Edge Functions.
- Reenvio de NFC-e nao pode duplicar baixa de estoque.
- Venda cancelada com NFC-e autorizada deve passar pelo fluxo fiscal antes de estornar estoque.
