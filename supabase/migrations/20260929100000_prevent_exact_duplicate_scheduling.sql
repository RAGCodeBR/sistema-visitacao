-- Impede novas programações e visitas exatamente duplicadas sem alterar o histórico existente.
-- Uma duplicata exata possui o mesmo consultor, cliente, fazenda (inclusive nula) e data.

create or replace function public.prevent_exact_duplicate_weekly_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', new.consultant_id::text, new.client_id::text, coalesce(new.farm_id::text, 'none'), new.scheduled_date::text),
    0
  ));

  if exists (
    select 1
    from public.weekly_plans existing
    where existing.consultant_id = new.consultant_id
      and existing.client_id = new.client_id
      and existing.farm_id is not distinct from new.farm_id
      and existing.scheduled_date = new.scheduled_date
      and existing.id <> new.id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Já existe uma programação idêntica para este consultor, cliente, fazenda e data.';
  end if;

  return new;
end;
$$;

drop trigger if exists weekly_plans_prevent_exact_duplicate_insert on public.weekly_plans;
create trigger weekly_plans_prevent_exact_duplicate_insert
before insert on public.weekly_plans
for each row execute function public.prevent_exact_duplicate_weekly_plan();

drop trigger if exists weekly_plans_prevent_exact_duplicate_update on public.weekly_plans;
create trigger weekly_plans_prevent_exact_duplicate_update
before update of consultant_id, client_id, farm_id, scheduled_date on public.weekly_plans
for each row execute function public.prevent_exact_duplicate_weekly_plan();

create or replace function public.prevent_exact_duplicate_visit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  visit_date date := (new.visited_at at time zone 'UTC')::date;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', new.consultant_id::text, new.client_id::text, coalesce(new.farm_id::text, 'none'), visit_date::text),
    0
  ));

  if exists (
    select 1
    from public.visits existing
    where existing.consultant_id = new.consultant_id
      and existing.client_id = new.client_id
      and existing.farm_id is not distinct from new.farm_id
      and (existing.visited_at at time zone 'UTC')::date = visit_date
      and existing.id <> new.id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Já existe uma visita registrada para este consultor, cliente, fazenda e data.';
  end if;

  return new;
end;
$$;

drop trigger if exists visits_prevent_exact_duplicate_insert on public.visits;
create trigger visits_prevent_exact_duplicate_insert
before insert on public.visits
for each row execute function public.prevent_exact_duplicate_visit();

drop trigger if exists visits_prevent_exact_duplicate_update on public.visits;
create trigger visits_prevent_exact_duplicate_update
before update of consultant_id, client_id, farm_id, visited_at on public.visits
for each row execute function public.prevent_exact_duplicate_visit();
