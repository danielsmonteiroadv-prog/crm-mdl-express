# CRM MDL Express

Aplicação web inicial para o CRM comercial da MDL Express.

## O que já vem pronto

- Login por e-mail e senha via Supabase Auth
- Banco de dados Supabase/PostgreSQL
- Cadastro de farmácias/leads
- Temperatura: Frio, Morno, Quente
- Etapas do funil comercial
- Valor estimado mensal por oportunidade
- Meta mensal
- Dashboard com pipeline estimado, oportunidades abertas, propostas/negociações, contratos fechados e percentual do pipeline sobre a meta

## Ferramentas gratuitas sugeridas

- Supabase: banco de dados e autenticação
- Vercel: hospedagem
- Domínio gratuito inicial: subdomínio `.vercel.app`
- Domínio MDL futuro: `crm.logisticamdl.com.br`, se houver acesso ao DNS

## Instalação local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Configuração Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Execute o arquivo `supabase/schema.sql`.
4. Vá em Authentication > Users.
5. Crie os usuários do CRM.
6. Copie Project URL e anon public key para `.env.local`.

## Publicação na Vercel

1. Suba este projeto para o GitHub.
2. Importe na Vercel.
3. Cadastre as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Faça deploy.
5. O CRM ficará acessível em uma URL gratuita `.vercel.app`.

## Cultura MDL

Movimento: cadastrar oportunidades e agir.
Disciplina: controlar etapas e próximas ações.
Lógica: medir pipeline, meta e fechamento.
