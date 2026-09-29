import { supabase } from "./supabase";

const required = (result) => { if (result.error) throw result.error; return result.data || []; };
const DUPLICATE_PLAN_MESSAGE = "Já existe uma programação idêntica para este consultor, cliente, fazenda e data.";
const DUPLICATE_VISIT_MESSAGE = "Já existe uma visita registrada para este consultor, cliente, fazenda e data.";

const withFarm = (query, farmId) => farmId ? query.eq("farm_id", farmId) : query.is("farm_id", null);

export async function ensurePlanIsUnique(input) {
  let query = supabase.from("weekly_plans").select("id").eq("consultant_id", input.userId).eq("client_id", input.clientId).eq("scheduled_date", input.scheduledDate).limit(1);
  query = withFarm(query, input.farmId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (data) throw new Error(DUPLICATE_PLAN_MESSAGE);
}

async function assertVisitIsUnique(input) {
  const date = String(input.visitedAt).slice(0, 10);
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  let query = supabase.from("visits").select("id").eq("consultant_id", input.userId).eq("client_id", input.clientId).gte("visited_at", `${date}T00:00:00.000Z`).lt("visited_at", nextDate.toISOString()).limit(1);
  query = withFarm(query, input.farmId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (data) throw new Error(DUPLICATE_VISIT_MESSAGE);
}

export async function loadOperationalData() {
  const [clientsResult, farmsResult, plansResult, visitsResult, profilesResult] = await Promise.all([
    supabase.from("clients").select("*").order("created_at"),
    supabase.from("farms").select("*").order("created_at"),
    supabase.from("weekly_plans").select("*").order("scheduled_date"),
    supabase.from("visits").select("*").order("visited_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);
  const clients = required(clientsResult).map((row) => ({ id: row.id, name: row.name, phone: row.phone || "", whatsapp: row.whatsapp || "", city: row.city || "", state: row.state || "", mainActivity: row.main_activity || "", notes: row.notes || "", createdBy: row.created_by }));
  const farms = required(farmsResult).map((row) => ({ id: row.id, name: row.name, clientId: row.client_id, city: row.city || "", state: row.state || "", mainActivity: row.main_activity || "", notes: row.notes || "", createdBy: row.created_by }));
  const plans = required(plansResult).map((row) => ({ id: row.id, userId: row.consultant_id, clientId: row.client_id, farmId: row.farm_id, scheduledDate: row.scheduled_date, status: row.status, notDoneReason: row.not_done_reason || "", notDoneNote: row.not_done_note || "", createdBy: row.created_by }));
  const visits = required(visitsResult).map((row) => ({ id: row.id, userId: row.consultant_id, planId: row.plan_id, clientId: row.client_id, farmId: row.farm_id, visitedAt: row.visited_at, developed: row.developed, types: row.types, businessType: row.business_type || "", saleValue: Number(row.sale_value) || 0, nextAction: row.next_action || "", createdBy: row.created_by }));
  const users = required(profilesResult).map((row) => ({ id: row.id, name: row.full_name, role: row.role }));
  return { clients, farms, plans, visits, users };
}

export async function createClient(input, userId) { const { data, error } = await supabase.from("clients").insert({ name: input.name, phone: input.phone || null, whatsapp: input.whatsapp || null, city: input.city || null, state: input.state || null, main_activity: input.mainActivity || null, notes: input.notes || null, created_by: userId }).select().single(); if (error) throw error; return data; }
export async function updateClient(id, input) { const { error } = await supabase.from("clients").update({ name: input.name, phone: input.phone || null, whatsapp: input.whatsapp || null, city: input.city || null, state: input.state || null, main_activity: input.mainActivity || null, notes: input.notes || null }).eq("id", id); if (error) throw error; }
export async function deleteClient(id) { const { error } = await supabase.from("clients").delete().eq("id", id); if (error) throw error; }
export async function createFarm(input, userId) { const { data, error } = await supabase.from("farms").insert({ name: input.name, client_id: input.clientId || null, city: input.city || null, state: input.state || null, main_activity: input.mainActivity || null, notes: input.notes || null, created_by: userId }).select().single(); if (error) throw error; return data; }
export async function updateFarm(id, input) { const { error } = await supabase.from("farms").update({ name: input.name, client_id: input.clientId || null, city: input.city || null, state: input.state || null, main_activity: input.mainActivity || null, notes: input.notes || null }).eq("id", id); if (error) throw error; }
export async function deleteFarm(id) { const { error } = await supabase.from("farms").delete().eq("id", id); if (error) throw error; }

export async function createPlan(input, userId) {
  await ensurePlanIsUnique(input);
  const { data, error } = await supabase.from("weekly_plans").insert({
    consultant_id: input.userId,
    client_id: input.clientId,
    farm_id: input.farmId || null,
    scheduled_date: input.scheduledDate,
    status: "PLANNED",
    created_by: userId,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function markPlanNotDone(id, reason, note = "") {
  const { error } = await supabase.from("weekly_plans").update({
    status: "NOT_DONE",
    not_done_reason: reason,
    not_done_note: reason === "Outro" ? note || null : null,
  }).eq("id", id);
  if (error) throw error;
}

export async function createVisit(input, userId) {
  await assertVisitIsUnique(input);
  const { data, error } = await supabase.from("visits").insert({
    consultant_id: input.userId,
    plan_id: input.planId || null,
    client_id: input.clientId,
    farm_id: input.farmId || null,
    visited_at: input.visitedAt,
    developed: input.developed,
    types: input.types,
    business_type: input.businessType || null,
    sale_value: input.saleValue || 0,
    next_action: input.nextAction || null,
    created_by: userId,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function markPlanCompleted(id) {
  if (!id) return;
  const { error } = await supabase.from("weekly_plans").update({
    status: "COMPLETED",
    not_done_reason: null,
    not_done_note: null,
  }).eq("id", id);
  if (error) throw error;
}
