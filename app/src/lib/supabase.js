import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("Variáveis do Supabase não configuradas. Verifique o arquivo .env.local.");
}

// Chave publicável: segura para uso no navegador quando as políticas RLS estão ativas.
// Nunca use uma service_role key no frontend.
export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
