# Ativação do Supabase — AgroVerde

## 1. Aplicar a estrutura segura do banco

No painel do Supabase, abra **SQL Editor** > **New query**. Copie todo o conteúdo de:

`supabase/migrations/20260831_initial_schema.sql`

Execute a consulta uma única vez. Ela cria tabelas, gatilhos, índices e políticas RLS.

## 2. Criar os seis acessos

Abra **Authentication** > **Users** > **Add user** > **Create new user**.

Crie uma conta para cada pessoa, com e-mail e senha temporária forte:

- Emily
- Consultor 1
- Consultor 2
- Consultor 3
- Consultor 4
- Assistente

Ao criar cada conta, preencha `full_name` em **User metadata**. O gatilho cria o perfil operacional automaticamente.

## 3. Tornar Emily administradora

Após criar a conta de Emily, copie o UUID dela em **Authentication** > **Users**. Depois execute no SQL Editor:

```sql
update public.profiles
set role = 'ADMIN'
where id = 'UUID-DA-EMILY';
```

## 4. Configurações de autenticação

Em **Authentication** > **Providers** > **Email**, mantenha login por e-mail e senha ativo.

Em **Authentication** > **URL Configuration**, adicione os endereços reais da aplicação a **Site URL** e **Redirect URLs** antes de publicar a versão com login.

## Segurança

- A chave `sb_publishable` é usada somente no frontend e está em `.env.local`, que não entra no Git.
- Nunca use, cole no código ou envie a chave `service_role`.
- As políticas RLS impedem que usuários operacionais leiam visitas/programações de outros consultores.
- Clientes e fazendas são compartilhados para todos os usuários autenticados, conforme a decisão atual.
