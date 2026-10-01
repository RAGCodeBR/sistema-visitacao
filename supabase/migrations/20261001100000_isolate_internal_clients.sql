-- Isola clientes e atendimentos internos por responsavel, como na operacao de campo.

drop policy if exists "internal clients: team or admin read" on public.internal_clients;
drop policy if exists "internal clients: team or admin create" on public.internal_clients;
drop policy if exists "internal clients: team or admin update" on public.internal_clients;
drop policy if exists "internal clients: team or admin delete" on public.internal_clients;

create policy "internal clients: owner or admin read" on public.internal_clients
  for select to authenticated
  using (public.is_admin() or (public.is_internal_user() and created_by = auth.uid()));

create policy "internal clients: owner or admin create" on public.internal_clients
  for insert to authenticated
  with check (public.is_admin() or (public.is_internal_user() and created_by = auth.uid()));

create policy "internal clients: owner or admin update" on public.internal_clients
  for update to authenticated
  using (public.is_admin() or (public.is_internal_user() and created_by = auth.uid()))
  with check (public.is_admin() or (public.is_internal_user() and created_by = auth.uid()));

create policy "internal clients: owner or admin delete" on public.internal_clients
  for delete to authenticated
  using (public.is_admin() or (public.is_internal_user() and created_by = auth.uid()));

drop policy if exists "internal contacts: team or admin read" on public.internal_contacts;
drop policy if exists "internal contacts: own or admin create" on public.internal_contacts;
drop policy if exists "internal contacts: assigned or admin update" on public.internal_contacts;
drop policy if exists "internal contacts: assigned or admin delete" on public.internal_contacts;

create policy "internal contacts: assigned or admin read" on public.internal_contacts
  for select to authenticated
  using (public.is_admin() or (public.is_internal_user() and employee_id = auth.uid()));

create policy "internal contacts: assigned or admin create" on public.internal_contacts
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_internal_user()
      and employee_id = auth.uid()
      and created_by = auth.uid()
      and exists (
        select 1 from public.internal_clients
        where id = client_id and created_by = auth.uid()
      )
    )
  );

create policy "internal contacts: assigned or admin update" on public.internal_contacts
  for update to authenticated
  using (public.is_admin() or (public.is_internal_user() and employee_id = auth.uid()))
  with check (
    public.is_admin()
    or (
      public.is_internal_user()
      and employee_id = auth.uid()
      and exists (
        select 1 from public.internal_clients
        where id = client_id and created_by = auth.uid()
      )
    )
  );

create policy "internal contacts: assigned or admin delete" on public.internal_contacts
  for delete to authenticated
  using (public.is_admin() or (public.is_internal_user() and employee_id = auth.uid()));

create or replace function public.reassign_internal_client(
  p_client_id uuid,
  p_employee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem transferir clientes internos.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_employee_id and role = 'INTERNO'
  ) then
    raise exception 'Responsavel interno invalido.';
  end if;

  update public.internal_clients
  set created_by = p_employee_id
  where id = p_client_id;

  if not found then
    raise exception 'Cliente interno nao encontrado.';
  end if;

  update public.internal_contacts
  set employee_id = p_employee_id
  where client_id = p_client_id;
end;
$$;

revoke all on function public.reassign_internal_client(uuid, uuid) from public;
grant execute on function public.reassign_internal_client(uuid, uuid) to authenticated;
