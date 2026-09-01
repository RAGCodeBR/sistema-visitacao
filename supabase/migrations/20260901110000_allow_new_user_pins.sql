alter table public.profiles drop constraint if exists profiles_login_pin_format;
alter table public.profiles add constraint profiles_login_pin_format check (login_pin is null or login_pin ~ '^[1-9][0-9]{0,5}$');
