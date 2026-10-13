# FAST INVESTIMENTOS — starter de aplicação

Interface responsiva em React/Vite com autenticação Supabase, painel de cliente, consulta administrativa protegida por RLS e estrutura SQL inicial. Este pacote é uma **base executável**, não uma plataforma financeira já certificada ou pronta para captar dinheiro.

## Requisitos
- Node.js 20 ou superior (recomendado)
- Conta Supabase
- Git (opcional)

## Rodar localmente
1. Extraia o ZIP e entre na pasta `fast-investimentos`.
2. Instale dependências: `npm install`
3. Crie um projeto em https://supabase.com/
4. No painel Supabase, abra SQL Editor e execute `supabase/schema.sql`.
5. Em Authentication → URL Configuration, configure a URL local `http://localhost:5173` e os redirects necessários.
6. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do painel Supabase (Project URL e publishable/anon key).
7. Execute `npm run dev` e abra `http://localhost:5173`.
8. Valide o cadastro, confirme e-mail (se ativado) e faça login.

## Criar o primeiro administrador
1. Cadastre sua própria conta pelo formulário.
2. No Supabase SQL Editor, confira seu ID em Authentication → Users.
3. Execute, substituindo pelo UUID real da sua conta:
   ```sql
   update public.profiles set role = 'admin' where id = 'SEU-UUID-AQUI';
   ```
4. Saia e entre novamente. A navegação administrativa aparecerá para esse usuário.
5. Nunca permita que um cliente escolha sua própria role. O trigger e as políticas protegem essa alteração.

## Publicar online
- Faça deploy do projeto em um host estático compatível com Vite (por exemplo, Vercel ou Netlify).
- Configure no ambiente de produção `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Cadastre o domínio de produção em Supabase Authentication → URL Configuration, incluindo Site URL e Redirect URLs.
- Ative HTTPS, confirmação de e-mail, proteção contra abuso e MFA para a conta administrativa.
- Não publique `.env`; não inclua service-role key no frontend.
- Rode `npm run build` antes do deploy e corrija qualquer falha de build.
- Configure domínio, monitoramento, backups e política de privacidade/termos oficiais.

## O que está incluído
- Landing page premium refinada para conversão responsável, com paleta grafite `#1C1E21`, esmeralda e menta, CTAs claros, cartões sofisticados e responsividade mobile-first.
- Formulários de cadastro/login e solicitação de recuperação de senha via Supabase Auth.
- Painel de cliente que lê seus próprios registros.
- Área administrativa que consulta perfis, pagamentos, investimentos, resgates e logs conforme permissões do banco.
- Grupos de referência GR 50, 100, 200, 250, 300, 400, 500, 700, 800 e 1000, todos desativados por padrão.
- SQL inicial com RLS, helper de autorização e trilha de auditoria básica.

## Limitações e itens obrigatórios antes de operar com dinheiro real
- **Senhas:** não são acessíveis ao administrador. Supabase Auth gerencia as credenciais; use recuperação/reset seguro. Não existe leitura de senha em texto puro.
- **Pagamentos:** ainda não há integração de provedor, PIX, checkout, assinatura de webhook ou reconciliação. Nenhum pagamento é confirmado por esta base.
- **Operações financeiras:** não há motor de ledger, cálculo de rendimento, liquidação nem execução real de resgate. O botão de resgate registra somente um pedido para análise.
- **Cadastro:** o formulário coleta nome, CPF, telefone e e-mail; validação de CPF, verificação de telefone e endereço completo precisam ser adicionadas antes do uso real.
- **Admin:** consulta e atualização administrativa dependem das políticas do banco. Aprovação/execução de pagamento e edição de saldo não foram implementadas.
- **LGPD e regulação:** providencie termos, política de privacidade, base legal, retenção, controles de acesso e avaliação jurídica/regulatória do produto. Não aceite recursos até concluir essas etapas.
- **Auditoria:** a tabela está criada, mas os eventos ainda precisam ser escritos por backend confiável para cada ação administrativa/financeira.
- **Testes:** execute testes reais de integração, segurança, responsividade e recuperação antes de produção. O pacote não declara testes como aprovados.

## Segurança
A chave `anon`/publishable é destinada ao cliente e depende de RLS corretamente configurado. Nunca coloque service-role key, senha de banco ou tokens privados em variáveis `VITE_*`. O administrador não deve consultar senhas, documentos desnecessários ou dados de pagamento completos. Use privilégios mínimos e autenticação multifator.

## Scripts
- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run preview` — pré-visualizar o build

## Suporte
Configure o WhatsApp oficial e os canais de suporte antes de publicar. Não invente número, autorização regulatória, clientes, rentabilidade ou parceria.
