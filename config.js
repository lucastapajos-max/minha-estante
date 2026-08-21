/* Chaves do Supabase.
   A anon/publishable key é PÚBLICA por design (o RLS protege os dados).
   NUNCA coloque aqui a chave service_role / secret. */
window.SUPABASE_CONFIG = {
  url: "https://mtiknwxmnhlguspaazgh.supabase.co",
  anonKey: "sb_publishable_U6HT-ijLuhzXuSTlkOsmAA_S2e9XK62",
};

/* Chave PÚBLICA do push (VAPID / applicationServerKey).
   Gere o par de chaves (ver SETUP-PUSH.md) e cole aqui só a PÚBLICA.
   A privada NUNCA vem pra cá — vai só como segredo do GitHub (robô). */
window.VAPID_PUBLIC_KEY = "BMkTMk0u4nKsU4ATbrm3oVheBbyJMptf2XS0Eh7oqPFf0WjsyvOQnZpTBXFLoYX7hqRMf2Gq-7Ve5QzZXOOmVTg";
