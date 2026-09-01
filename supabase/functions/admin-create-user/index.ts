import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Content-Type": "application/json" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!; const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const auth = req.headers.get("Authorization") || "";
  const session = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } }); const { data: { user } } = await session.auth.getUser(); if (!user) return reply({ error: "Não autenticado" }, 401);
  const db = createClient(url, service); const { data: caller } = await db.from("profiles").select("role").eq("id", user.id).single(); if (caller?.role !== "ADMIN") return reply({ error: "Sem permissão" }, 403);
  const { name, pin, password, role } = await req.json(); const cleanName = String(name || "").trim(); const cleanPin = String(pin || ""); if (cleanName.length < 2 || !/^[1-9][0-9]{0,5}$/.test(cleanPin)) return reply({ error: "Informe nome e PIN válidos." }, 400); if (String(password || "").length < 8) return reply({ error: "A senha deve ter ao menos 8 caracteres." }, 400);
  const { data: exists } = await db.from("profiles").select("id").eq("login_pin", cleanPin).maybeSingle(); if (exists) return reply({ error: "Este PIN já está em uso." }, 409);
  const { data, error } = await db.auth.admin.createUser({ email: `pin-${cleanPin}@agroverde.local`, password, email_confirm: true, user_metadata: { full_name: cleanName } }); if (error || !data.user) return reply({ error: error?.message || "Não foi possível criar o usuário." }, 400);
  const { error: profileError } = await db.from("profiles").update({ full_name: cleanName, login_pin: cleanPin, role: role === "ADMIN" ? "ADMIN" : "OPERACIONAL", must_change_password: false }).eq("id", data.user.id); if (profileError) { await db.auth.admin.deleteUser(data.user.id); return reply({ error: "Não foi possível concluir o perfil do usuário." }, 400); }
  return reply({ ok: true });
});
