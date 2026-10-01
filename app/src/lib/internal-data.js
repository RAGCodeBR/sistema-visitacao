import { supabase } from "./supabase";

const required = (result) => { if (result.error) throw result.error; return result.data || []; };
const DATABASE_PAGE_SIZE = 1000;

const loadAllRows = async (table, orderBy, ascending = true) => {
  const rows = [];
  for (let from = 0; ; from += DATABASE_PAGE_SIZE) {
    const result = await supabase.from(table).select("*").order(orderBy, { ascending }).order("id").range(from, from + DATABASE_PAGE_SIZE - 1);
    const page = required(result);
    rows.push(...page);
    if (page.length < DATABASE_PAGE_SIZE) return rows;
  }
};

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
  const [clientRows, contactRows, profilesResult] = await Promise.all([
    loadAllRows("internal_clients", "name"),
    loadAllRows("internal_contacts", "planned_date", false),
    supabase.from("profiles").select("id, full_name, role").in("role", ["INTERNO", "ADMIN"]).order("full_name"),
  ]);
  return {
    clients: clientRows.map(mapClient),
    contacts: contactRows.map(mapContact),
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
    created_by: input.ownerId || userId,
  }).select().single();
  if (error) throw error;
  return mapClient(data);
}

export async function updateInternalClient(id, input, currentOwnerId) {
  if (input.ownerId && input.ownerId !== currentOwnerId) {
    const { error: ownerError } = await supabase.rpc("reassign_internal_client", {
      p_client_id: id,
      p_employee_id: input.ownerId,
    });
    if (ownerError) throw ownerError;
  }
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
