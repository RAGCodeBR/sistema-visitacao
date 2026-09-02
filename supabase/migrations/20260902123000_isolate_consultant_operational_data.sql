-- Separa os dados operacionais por consultor e preserva todos os usuários.
-- Limpeza autorizada dos dados operacionais de teste. Perfis e usuários são preservados.
delete from public.visits;
delete from public.weekly_plans;
delete from public.farms;
delete from public.clients;

-- Clientes e fazendas deixam de ser compartilhados entre operacionais.
drop policy if exists "clients: authenticated read" on public.clients;
drop policy if exists "clients: authenticated create" on public.clients;
drop policy if exists "clients: creator or admin update" on public.clients;
drop policy if exists "clients: creator or admin delete" on public.clients;
drop policy if exists "farms: authenticated read" on public.farms;
drop policy if exists "farms: authenticated create" on public.farms;
drop policy if exists "farms: creator or admin update" on public.farms;
drop policy if exists "farms: creator or admin delete" on public.farms;

create policy "clients: owner or admin read" on public.clients
  for select to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "clients: owner or admin create" on public.clients
  for insert to authenticated with check (created_by = auth.uid() or public.is_admin());
create policy "clients: owner or admin update" on public.clients
  for update to authenticated using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy "clients: owner or admin delete" on public.clients
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "farms: owner or admin read" on public.farms
  for select to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "farms: owner or admin create" on public.farms
  for insert to authenticated with check (
    (created_by = auth.uid() and (client_id is null or exists (select 1 from public.clients where id = client_id and created_by = auth.uid())))
    or public.is_admin()
  );
create policy "farms: owner or admin update" on public.farms
  for update to authenticated using (created_by = auth.uid() or public.is_admin())
  with check (
    (created_by = auth.uid() and (client_id is null or exists (select 1 from public.clients where id = client_id and created_by = auth.uid())))
    or public.is_admin()
  );
create policy "farms: owner or admin delete" on public.farms
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- Programações e visitas exigem vínculos pertencentes ao consultor operacional.
drop policy if exists "plans: own or admin create" on public.weekly_plans;
drop policy if exists "plans: own or admin update" on public.weekly_plans;
drop policy if exists "visits: own or admin create" on public.visits;
drop policy if exists "visits: own or admin update" on public.visits;

create policy "plans: own records and own contacts" on public.weekly_plans
  for insert to authenticated with check (
    public.is_admin() or (
      consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
create policy "plans: update own records and contacts" on public.weekly_plans
  for update to authenticated using (consultant_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin() or (
      consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );

create policy "visits: own records and own contacts" on public.visits
  for insert to authenticated with check (
    public.is_admin() or (
      consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
create policy "visits: update own records and contacts" on public.visits
  for update to authenticated using (consultant_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin() or (
      consultant_id = auth.uid() and created_by = auth.uid()
      and exists (select 1 from public.clients where id = client_id and created_by = auth.uid())
      and (farm_id is null or exists (select 1 from public.farms where id = farm_id and created_by = auth.uid()))
    )
  );
