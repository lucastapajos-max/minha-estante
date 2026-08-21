/* Marco 2 — ligar no Supabase (sincronização entre dispositivos).
   1. Copie este arquivo para "config.js" (sem o .example).
   2. Cole as suas 2 chaves do painel do Supabase (Settings → API).
   A chave "anon" é pública de propósito — quem protege os dados é o
   RLS (regras em db/schema.sql travam tudo no seu login).
   NUNCA use aqui a chave "service_role". */
window.SUPABASE_CONFIG = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "COLE_AQUI_A_ANON_KEY",
};
