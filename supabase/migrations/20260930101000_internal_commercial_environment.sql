-- Ambiente comercial interno, separado da operação de visitas em campo.

alter table public.profiles
  drop constraint if exists profiles_login_pin_format;

alter table public.profiles
  add constraint profiles_login_pin_format
  check (login_pin is null or login_pin ~ '^[1-9][0-9]{0,5}$');

create type public.internal_contact_type as enum (
  'RELATIONSHIP',
  'PROSPECTING',
  'CLOSING',
  'QUOTE_RETURN'
);

create type public.internal_contact_status as enum ('PLANNED', 'COMPLETED', 'CANCELED');
create type public.internal_quote_outcome as enum ('CLOSED', 'NOT_CLOSED');
create type public.internal_business_line as enum (
  'SANIDADE',
  'NUTRICAO_ANIMAL',
  'HERBICIDAS',
  'INSETICIDAS',
  'FERTILIZANTES',
  'SEMENTES_PASTAGEM',
  'OUTROS'
);

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'INTERNO'
  );
$$;

create or replace function public.is_field_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'OPERACIONAL'
  );
$$;

revoke all on function public.is_internal_user() from public;
revoke all on function public.is_field_user() from public;
grant execute on function public.is_internal_user() to authenticated;
grant execute on function public.is_field_user() to authenticated;

create table public.internal_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 180),
  property_name text,
  phone text,
  whatsapp text,
  brand_preferences text,
  characteristics text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.internal_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.internal_clients(id) on delete restrict,
  employee_id uuid not null references public.profiles(id) on delete restrict,
  planned_date date not null,
  contacted_at timestamptz,
  status public.internal_contact_status not null default 'PLANNED',
  contact_type public.internal_contact_type not null,
  summary text,
  negotiation_types public.internal_business_line[] not null default '{}',
  quote_product text,
  quote_return_date date,
  quote_outcome public.internal_quote_outcome,
  not_closed_reason text,
  source_contact_id uuid unique references public.internal_contacts(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_contact_completed_summary check (
    status <> 'COMPLETED' or nullif(trim(summary), '') is not null
  ),
  constraint internal_contact_closing_categories check (
    contact_type <> 'CLOSING' or status <> 'COMPLETED' or cardinality(negotiation_types) > 0
  ),
  constraint internal_contact_quote_fields check (
    contact_type = 'QUOTE_RETURN'
    or (quote_product is null and quote_return_date is null)
    or (nullif(trim(quote_product), '') is not null and quote_return_date is not null)
  ),
  constraint internal_quote_return_outcome check (
    contact_type <> 'QUOTE_RETURN' or status <> 'COMPLETED' or quote_outcome is not null
  ),
  constraint internal_quote_not_closed_reason check (
    quote_outcome <> 'NOT_CLOSED' or nullif(trim(not_closed_reason), '') is not null
  )
);

create index internal_clients_name_idx on public.internal_clients (name);
create index internal_contacts_employee_date_idx on public.internal_contacts (employee_id, planned_date);
create index internal_contacts_client_date_idx on public.internal_contacts (client_id, planned_date desc);
create index internal_contacts_status_date_idx on public.internal_contacts (status, planned_date);

create trigger internal_clients_updated_at
before update on public.internal_clients
for each row execute function public.set_updated_at();

create trigger internal_contacts_updated_at
before update on public.internal_contacts
for each row execute function public.set_updated_at();

create or replace function public.sync_internal_quote_followup()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.contact_type <> 'QUOTE_RETURN'
     and new.status = 'COMPLETED'
     and nullif(trim(new.quote_product), '') is not null
     and new.quote_return_date is not null then
    insert into public.internal_contacts (
      client_id, employee_id, planned_date, status, contact_type,
      quote_product, source_contact_id, created_by
    ) values (
      new.client_id, new.employee_id, new.quote_return_date, 'PLANNED', 'QUOTE_RETURN',
      new.quote_product, new.id, new.created_by
    )
    on conflict (source_contact_id) do update set
      client_id = excluded.client_id,
      employee_id = excluded.employee_id,
      planned_date = excluded.planned_date,
      quote_product = excluded.quote_product
    where internal_contacts.status = 'PLANNED';
  elsif new.contact_type <> 'QUOTE_RETURN' then
    delete from public.internal_contacts
    where source_contact_id = new.id and status = 'PLANNED';
  end if;
  return new;
end;
$$;

create trigger sync_internal_quote_followup
after insert or update of status, quote_product, quote_return_date, employee_id, client_id
on public.internal_contacts
for each row execute function public.sync_internal_quote_followup();

alter table public.internal_clients enable row level security;
alter table public.internal_contacts enable row level security;

create policy "internal clients: team or admin read" on public.internal_clients
  for select to authenticated using (public.is_internal_user() or public.is_admin());
create policy "internal clients: team or admin create" on public.internal_clients
  for insert to authenticated with check (
    public.is_admin() or (public.is_internal_user() and created_by = auth.uid())
  );
create policy "internal clients: team or admin update" on public.internal_clients
  for update to authenticated using (public.is_internal_user() or public.is_admin())
  with check (public.is_internal_user() or public.is_admin());
create policy "internal clients: team or admin delete" on public.internal_clients
  for delete to authenticated using (public.is_internal_user() or public.is_admin());

create policy "internal contacts: team or admin read" on public.internal_contacts
  for select to authenticated using (public.is_internal_user() or public.is_admin());
create policy "internal contacts: own or admin create" on public.internal_contacts
  for insert to authenticated with check (
    public.is_admin()
    or (public.is_internal_user() and employee_id = auth.uid() and created_by = auth.uid())
  );
create policy "internal contacts: assigned or admin update" on public.internal_contacts
  for update to authenticated using (employee_id = auth.uid() or public.is_admin())
  with check (employee_id = auth.uid() or public.is_admin());
create policy "internal contacts: assigned or admin delete" on public.internal_contacts
  for delete to authenticated using (employee_id = auth.uid() or public.is_admin());

-- Internos não podem consultar nem gravar dados da operação em campo.
drop policy if exists "clients: owner or admin read" on public.clients;
drop policy if exists "clients: owner or admin create" on public.clients;
drop policy if exists "clients: owner or admin update" on public.clients;
drop policy if exists "clients: owner or admin delete" on public.clients;

create policy "clients: field owner or admin read" on public.clients
  for select to authenticated using (public.is_admin() or (public.is_field_user() and created_by = auth.uid()));
create policy "clients: field owner or admin create" on public.clients
  for insert to authenticated with check (public.is_admin() or (public.is_field_user() and created_by = auth.uid()));
create policy "clients: field owner or admin update" on public.clients
  for update to authenticated using (public.is_admin() or (public.is_field_user() and created_by = auth.uid()))
  with check (public.is_admin() or (public.is_field_user() and created_by = auth.uid()));
create policy "clients: field owner or admin delete" on public.clients
  for delete to authenticated using (public.is_admin() or (public.is_field_user() and created_by = auth.uid()));

drop policy if exists "farms: owner or admin read" on public.farms;
drop policy if exists "farms: owner or admin create" on public.farms;
drop policy if exists "farms: owner or admin update" on public.farms;
drop policy if exists "farms: owner or admin delete" on public.farms;

create policy "farms: field owner or admin read" on public.farms
  for select to authenticated using (public.is_admin() or (public.is_field_user() and created_by = auth.uid()));
create policy "farms: field owner or admin create" on public.farms
  for insert to authenticated with check (
    public.is_admin() or (
      public.is_field_user() and created_by = auth.uid()
      and (client_id is null or exists (
        select 1 from public.clients where id = client_id and created_by = auth.uid()
      ))
    )
  );
create policy "farms: field owner or admin update" on public.farms
  for update to authenticated using (public.is_admin() or (public.is_field_user() and created_by = auth.uid()))
  with check (
    public.is_admin() or (
      public.is_field_user() and created_by = auth.uid()
      and (client_id is null or exists (
        select 1 from public.clients where id = client_id and created_by = auth.uid()
      ))
    )
  );
create policy "farms: field owner or admin delete" on public.farms
  for delete to authenticated using (public.is_admin() or (public.is_field_user() and created_by = auth.uid()));

drop policy if exists "plans: own or admin read" on public.weekly_plans;
drop policy if exists "plans: own records and own contacts" on public.weekly_plans;
drop policy if exists "plans: update own records and contacts" on public.weekly_plans;
drop policy if exists "plans: own or admin delete" on public.weekly_plans;

create policy "plans: field own or admin read" on public.weekly_plans
  for select to authenticated using (public.is_admin() or (public.is_field_user() and consultant_id = auth.uid()));
create policy "plans: field own records and contacts" on public.weekly_plans
  for insert to authenticated with check (
    public.is_admin() or (
      public.is_field_user() and consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
create policy "plans: field update own records and contacts" on public.weekly_plans
  for update to authenticated using (public.is_admin() or (public.is_field_user() and consultant_id = auth.uid()))
  with check (
    public.is_admin() or (
      public.is_field_user() and consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
create policy "plans: field own or admin delete" on public.weekly_plans
  for delete to authenticated using (public.is_admin() or (public.is_field_user() and consultant_id = auth.uid()));

drop policy if exists "visits: own or admin read" on public.visits;
drop policy if exists "visits: own records and own contacts" on public.visits;
drop policy if exists "visits: update own records and contacts" on public.visits;
drop policy if exists "visits: own or admin delete" on public.visits;

create policy "visits: field own or admin read" on public.visits
  for select to authenticated using (public.is_admin() or (public.is_field_user() and consultant_id = auth.uid()));
create policy "visits: field own records and contacts" on public.visits
  for insert to authenticated with check (
    public.is_admin() or (
      public.is_field_user() and consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
create policy "visits: field update own records and contacts" on public.visits
  for update to authenticated using (public.is_admin() or (public.is_field_user() and consultant_id = auth.uid()))
  with check (
    public.is_admin() or (
      public.is_field_user() and consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
create policy "visits: field own or admin delete" on public.visits
  for delete to authenticated using (public.is_admin() or (public.is_field_user() and consultant_id = auth.uid()));
