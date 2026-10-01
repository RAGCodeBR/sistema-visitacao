-- O retorno automatico deve pertencer a quem concluiu o atendimento.
-- Isso tambem permite que um colaborador conclua um contato agendado por um admin.

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
      new.quote_product, new.id, auth.uid()
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
