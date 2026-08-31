-- AgroVerde: autenticação, dados operacionais e Row Level Security (RLS).
-- Execute este arquivo no Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create type public.user_role as enum ('ADMIN', 'OPERACIONAL');
create type public.plan_status as enum ('PLANNED', 'COMPLETED', 'NOT_DONE');
create type public.visit_type as enum ('RELATIONSHIP', 'PROSPECTING', 'CLOSING');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  role public.user_role not null default 'OPERACIONAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 180),
  phone text,
  whatsapp text,
  city text,
  state char(2),
  main_activity text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 180),
  client_id uuid references public.clients(id) on delete set null,
  city text,
  state char(2),
  main_activity text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles(id),
  client_id uuid not null references public.clients(id),
  farm_id uuid references public.farms(id) on delete set null,
  scheduled_date date not null,
  status public.plan_status not null default 'PLANNED',
  not_done_reason text,
  not_done_note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint not_done_reason_when_required check (
    (status <> 'NOT_DONE') or nullif(trim(not_done_reason), '') is not null
  )
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles(id),
  plan_id uuid unique references public.weekly_plans(id) on delete set null,
  client_id uuid not null references public.clients(id),
  farm_id uuid references public.farms(id) on delete set null,
  visited_at timestamptz not null,
  developed text not null check (char_length(trim(developed)) > 0),
  types public.visit_type[] not null check (cardinality(types) > 0),
  business_type text,
  sale_value numeric(14,2) not null default 0 check (sale_value >= 0),
  next_action text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_only_for_closing check (
    ('CLOSING' = any(types)) or (business_type is null and sale_value = 0)
  )
);

create index weekly_plans_consultant_date_idx on public.weekly_plans (consultant_id, scheduled_date);
create index visits_consultant_date_idx on public.visits (consultant_id, visited_at desc);
create index visits_date_idx on public.visits (visited_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger farms_updated_at before update on public.farms for each row execute function public.set_updated_at();
create trigger weekly_plans_updated_at before update on public.weekly_plans for each row execute function public.set_updated_at();
create trigger visits_updated_at before update on public.visits for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN');
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.farms enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.visits enable row level security;

create policy "profiles: authenticated read" on public.profiles for select to authenticated using (true);
create policy "profiles: admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "clients: authenticated read" on public.clients for select to authenticated using (true);
create policy "clients: authenticated create" on public.clients for insert to authenticated with check (created_by = auth.uid());
create policy "clients: creator or admin update" on public.clients for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy "clients: creator or admin delete" on public.clients for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "farms: authenticated read" on public.farms for select to authenticated using (true);
create policy "farms: authenticated create" on public.farms for insert to authenticated with check (created_by = auth.uid());
create policy "farms: creator or admin update" on public.farms for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy "farms: creator or admin delete" on public.farms for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "plans: own or admin read" on public.weekly_plans for select to authenticated using (consultant_id = auth.uid() or public.is_admin());
create policy "plans: own or admin create" on public.weekly_plans for insert to authenticated with check ((consultant_id = auth.uid() and created_by = auth.uid()) or public.is_admin());
create policy "plans: own or admin update" on public.weekly_plans for update to authenticated using (consultant_id = auth.uid() or public.is_admin()) with check ((consultant_id = auth.uid() and created_by = auth.uid()) or public.is_admin());
create policy "plans: own or admin delete" on public.weekly_plans for delete to authenticated using (consultant_id = auth.uid() or public.is_admin());

create policy "visits: own or admin read" on public.visits for select to authenticated using (consultant_id = auth.uid() or public.is_admin());
create policy "visits: own or admin create" on public.visits for insert to authenticated with check ((consultant_id = auth.uid() and created_by = auth.uid()) or public.is_admin());
create policy "visits: own or admin update" on public.visits for update to authenticated using (consultant_id = auth.uid() or public.is_admin()) with check ((consultant_id = auth.uid() and created_by = auth.uid()) or public.is_admin());
create policy "visits: own or admin delete" on public.visits for delete to authenticated using (consultant_id = auth.uid() or public.is_admin());

-- Depois de criar Emily em Authentication > Users, execute uma única vez:
-- update public.profiles set role = 'ADMIN' where id = 'UUID-DA-EMILY';
