-- Acesso por PIN visível + senha. O PIN não é uma credencial secreta.
-- A senha é verificada exclusivamente pelo Supabase Auth.

alter table public.profiles
  add column if not exists login_pin text,
  add column if not exists must_change_password boolean not null default true;

create unique index if not exists profiles_login_pin_unique
  on public.profiles (login_pin)
  where login_pin is not null;

alter table public.profiles
  drop constraint if exists profiles_login_pin_format;

alter table public.profiles
  add constraint profiles_login_pin_format
  check (login_pin is null or login_pin ~ '^[1-6]$');

-- O usuário autenticado só pode concluir a própria troca inicial de senha.
-- Não há permissão para alterar papel, PIN ou nome por esta função.
create or replace function public.complete_first_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set must_change_password = false
  where id = auth.uid();
end;
$$;

revoke all on function public.complete_first_password_change() from public;
grant execute on function public.complete_first_password_change() to authenticated;
