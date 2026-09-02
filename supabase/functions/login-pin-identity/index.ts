import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const cleanPin = String(pin || "");
  if (!/^[1-9][0-9]{0,5}$/.test(cleanPin)) return new Response(JSON.stringify({ name: null }), { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.from("profiles").select("full_name").eq("login_pin", cleanPin).maybeSingle();
  return new Response(JSON.stringify({ name: data?.full_name || null }), { headers: cors });
});
