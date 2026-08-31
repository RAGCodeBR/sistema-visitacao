import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const resetPasswords = process.argv.includes("--reset-passwords");

if (!url || !secret) {
  throw new Error("Defina VITE_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SECRET_KEY antes de executar este script.");
}

const users = [
  { pin: "1", name: "Emily", role: "ADMIN" },
  { pin: "2", name: "Consultor 1", role: "OPERACIONAL" },
  { pin: "3", name: "Consultor 2", role: "OPERACIONAL" },
  { pin: "4", name: "Consultor 3", role: "OPERACIONAL" },
  { pin: "5", name: "Consultor 4", role: "OPERACIONAL" },
  { pin: "6", name: "Assistente", role: "OPERACIONAL" },
  { pin: "7", name: "LA Business", role: "ADMIN" },
];

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const temporaryPassword = () => `Agro#${randomBytes(12).toString("base64url")}9`;

for (const person of users) {
  const email = `pin-${person.pin}@agroverde.local`;
  const { data: existing, error: lookupError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (lookupError) throw lookupError;
  let account = existing.users.find((item) => item.email === email);
  let password = null;

  if (!account) {
    password = temporaryPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: person.name },
    });
    if (error) throw error;
    account = data.user;
  } else if (resetPasswords) {
    password = temporaryPassword();
    const { error } = await admin.auth.admin.updateUserById(account.id, { password });
    if (error) throw error;
  }

  const { error: profileError } = await admin.from("profiles").update({
    full_name: person.name,
    role: person.role,
    login_pin: person.pin,
    must_change_password: true,
  }).eq("id", account.id);
  if (profileError) throw profileError;

  console.log(`${person.name} | PIN: ${person.pin} | ${password ? `senha temporária: ${password}` : "conta já existia; senha não foi alterada"}`);
}

console.log("\nGuarde as senhas temporárias e entregue cada uma somente ao respectivo usuário.");
