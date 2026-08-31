# Acessos por PIN — AgroVerde

PINs definidos:

- `1` — Emily (admin)
- `2` — Consultor 1
- `3` — Consultor 2
- `4` — Consultor 3
- `5` — Consultor 4
- `6` — Assistente
- `7` — LA Business (admin de teste)

## 1. Aplicar a migration

No terminal, com o projeto Supabase já vinculado, execute:

```powershell
npx supabase db push
```

## 2. Criar os acessos

O navegador usa somente a chave publicável. A criação de usuários exige uma chave secreta e, por segurança, ela não deve ser enviada por chat, salva no projeto ou usada no frontend.

Em **Supabase Dashboard > Settings > API**, copie a chave secreta e execute apenas no seu terminal:

```powershell
$env:SUPABASE_URL = "https://vcmsojwywfpzaxjfrkjn.supabase.co"
$env:SUPABASE_SECRET_KEY = "sua_chave_secreta_aqui"
node scripts/create-pin-users.mjs
Remove-Item Env:SUPABASE_SECRET_KEY
```

O comando cria as seis identidades internas, confirma os e-mails técnicos automaticamente e mostra uma senha temporária forte para cada conta nova. Entregue cada senha somente ao respectivo usuário.

No primeiro acesso, a aplicação pede uma nova senha antes de liberar o sistema.

## Redefinir todas as senhas temporárias

Para gerar uma nova senha para cada um dos seis PINs, mantenha as variáveis de ambiente acima e execute:

```powershell
node scripts/create-pin-users.mjs --reset-passwords
```

As senhas aparecem apenas nessa saída do terminal e cada perfil volta a exigir alteração de senha no próximo acesso.
