import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Content-Type": "application/json" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user: callerUser }, error: authError } = await db.auth.getUser(token);
  if (authError || !callerUser) return reply({ error: "Não autenticado" }, 401);
  const { data: caller } = await db.from("profiles").select("role").eq("id", callerUser.id).single();
  if (caller?.role !== "ADMIN") return reply({ error: "Sem permissão" }, 403);

  const { userId } = await req.json();
  const { data: target } = await db.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  if (!target) return reply({ error: "Usuário não encontrado." }, 404);
  if (target.role !== "OPERACIONAL") return reply({ error: "Somente usuários operacionais podem ser excluídos." }, 403);

  const checks = await Promise.all([
    db.from("clients").select("id", { count: "exact", head: true }).eq("created_by", userId),
    db.from("farms").select("id", { count: "exact", head: true }).eq("created_by", userId),
    db.from("weekly_plans").select("id", { count: "exact", head: true }).or(`consultant_id.eq.${userId},created_by.eq.${userId}`),
    db.from("visits").select("id", { count: "exact", head: true }).or(`consultant_id.eq.${userId},created_by.eq.${userId}`),
  ]);
  if (checks.some(({ count, error }) => error || (count || 0) > 0)) return reply({ error: "Este usuário possui registros vinculados e não pode ser excluído." }, 409);

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return reply({ error: error.message || "Não foi possível excluir o usuário." }, 400);
  return reply({ ok: true });
});
