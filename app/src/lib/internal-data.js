import { supabase } from "./supabase";

const required = (result) => { if (result.error) throw result.error; return result.data || []; };

const mapClient = (row) => ({
  id: row.id,
  name: row.name,
  propertyName: row.property_name || "",
  phone: row.phone || "",
  whatsapp: row.whatsapp || "",
  brandPreferences: row.brand_preferences || "",
  characteristics: row.characteristics || "",
  createdBy: row.created_by,
  createdAt: row.created_at,
});

const mapContact = (row) => ({
  id: row.id,
  clientId: row.client_id,
  employeeId: row.employee_id,
  plannedDate: row.planned_date,
  contactedAt: row.contacted_at,
  status: row.status,
  contactType: row.contact_type,
  summary: row.summary || "",
  negotiationTypes: row.negotiation_types || [],
  quoteProduct: row.quote_product || "",
  quoteReturnDate: row.quote_return_date || "",
  quoteOutcome: row.quote_outcome || "",
  notClosedReason: row.not_closed_reason || "",
  sourceContactId: row.source_contact_id,
  createdBy: row.created_by,
});

export async function loadInternalData() {
  const [clientsResult, contactsResult, profilesResult] = await Promise.all([
    supabase.from("internal_clients").select("*").order("name"),
    supabase.from("internal_contacts").select("*").order("planned_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role").in("role", ["INTERNO", "ADMIN"]).order("full_name"),
  ]);
  return {
    clients: required(clientsResult).map(mapClient),
    contacts: required(contactsResult).map(mapContact),
    users: required(profilesResult).map((row) => ({ id: row.id, name: row.full_name, role: row.role })),
  };
}

export async function createInternalClient(input, userId) {
  const { data, error } = await supabase.from("internal_clients").insert({
    name: input.name,
    property_name: input.propertyName || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    brand_preferences: input.brandPreferences || null,
    characteristics: input.characteristics || null,
    created_by: userId,
  }).select().single();
  if (error) throw error;
  return mapClient(data);
}

export async function updateInternalClient(id, input) {
  const { error } = await supabase.from("internal_clients").update({
    name: input.name,
    property_name: input.propertyName || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    brand_preferences: input.brandPreferences || null,
    characteristics: input.characteristics || null,
  }).eq("id", id);
  if (error) throw error;
}

export async function createInternalContact(input, userId) {
  const { data, error } = await supabase.from("internal_contacts").insert({
    client_id: input.clientId,
    employee_id: input.employeeId,
    planned_date: input.plannedDate,
    contacted_at: input.status === "COMPLETED" ? new Date().toISOString() : null,
    status: input.status,
    contact_type: input.contactType,
    summary: input.summary || null,
    negotiation_types: input.negotiationTypes || [],
    quote_product: input.quoteProduct || null,
    quote_return_date: input.quoteReturnDate || null,
    quote_outcome: input.quoteOutcome || null,
    not_closed_reason: input.notClosedReason || null,
    created_by: userId,
  }).select().single();
  if (error) throw error;
  return mapContact(data);
}

export async function completeInternalContact(id, input) {
  const { error } = await supabase.from("internal_contacts").update({
    client_id: input.clientId,
    employee_id: input.employeeId,
    planned_date: input.plannedDate,
    contacted_at: new Date().toISOString(),
    status: "COMPLETED",
    contact_type: input.contactType,
    summary: input.summary || null,
    negotiation_types: input.negotiationTypes || [],
    quote_product: input.quoteProduct || null,
    quote_return_date: input.quoteReturnDate || null,
    quote_outcome: input.quoteOutcome || null,
    not_closed_reason: input.notClosedReason || null,
  }).eq("id", id);
  if (error) throw error;
}

export async function cancelInternalContact(id) {
  const { error } = await supabase.from("internal_contacts").update({ status: "CANCELED" }).eq("id", id);
  if (error) throw error;
}
