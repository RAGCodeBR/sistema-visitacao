import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "app",
  // As variáveis públicas do Supabase ficam no diretório raiz, fora de app/.
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  build: {
    outDir: "../dist-source",
    emptyOutDir: true,
  },
});
