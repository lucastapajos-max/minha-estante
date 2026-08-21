/* ============================================================
   store.js — camada de dados (LOCAL ou NUVEM)
   ------------------------------------------------------------
   Escolhe sozinho o backend:
   - Se config.js tiver chaves reais do Supabase  -> NUVEM (sync + login)
   - Senão                                        -> LOCAL (localStorage)

   A API pública é a MESMA nos dois (list, get, add, update, remove,
   addSession, sessionsOf, stats) — o resto do app não sabe nem se importa
   com qual backend está rodando. Tudo assíncrono (Promise).
   ============================================================ */
const Store = (() => {
  const CFG = window.SUPABASE_CONFIG || {};
  const temNuvem = !!(CFG.url && CFG.anonKey && !/SEU-PROJETO/.test(CFG.url) && window.supabase);

  const _agora = () => new Date().toISOString();
  const _uid = () =>
    (crypto.randomUUID && crypto.randomUUID()) ||
    "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // valores padrão de um item (usado nos dois backends)
  function novoItem(item) {
    return {
      kind: item.kind,
      title: item.title || "Sem título",
      authors: item.authors || "",
      cover_url: item.cover_url || "",
      synopsis: item.synopsis || "",
      status: item.status || "quero_ler",
      total_pages: item.total_pages ?? null,
      current_page: item.current_page ?? 0,
      total_chapters: item.total_chapters ?? null,
      current_chapter: item.current_chapter ?? 0,
      total_volumes: item.total_volumes ?? null,
      current_volume: item.current_volume ?? 0,
      rating: item.rating ?? null,
      review: item.review || "",
      notes: item.notes || "",
      genres: item.genres || [],
      source: item.source || "manual",
      external_id: item.external_id || "",
      notify: item.notify ?? false,
      mangadex_id: item.mangadex_id || "",
      last_notified_chapter: item.last_notified_chapter ?? null,
      started_at: item.started_at ?? null,
      finished_at: item.finished_at ?? null,
      format: item.format ?? null,          // 'fisico' | 'digital' | null
      collection_id: item.collection_id ?? null,
    };
  }

  // números vêm como string do PostgREST às vezes → normaliza
  function normaliza(row) {
    if (!row) return row;
    if (row.rating != null) row.rating = Number(row.rating);
    if (!Array.isArray(row.genres)) row.genres = row.genres || [];
    return row;
  }

  /* ==========================================================
     BACKEND LOCAL (localStorage)
     ========================================================== */
  const Local = (() => {
    const CHAVE = "estante:v1";
    let cache = null;
    function _ler() {
      if (cache) return cache;
      try { cache = JSON.parse(localStorage.getItem(CHAVE)) || { items: [], sessions: [] }; }
      catch { cache = { items: [], sessions: [] }; }
      cache.items = cache.items || []; cache.sessions = cache.sessions || [];
      cache.collections = cache.collections || [];
      cache.goals = cache.goals || {};        // { "2026": 20, ... }
      return cache;
    }
    const _salvar = () => localStorage.setItem(CHAVE, JSON.stringify(cache));

    return {
      mode: "local",
      async session() { return { user: { id: "local" } }; },  // sempre "logado"
      async list(kind) {
        let it = _ler().items.slice();
        if (kind) it = it.filter((i) => i.kind === kind);
        return it.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      },
      async get(id) { return _ler().items.find((i) => i.id === id) || null; },
      async add(item) {
        const db = _ler();
        const novo = { id: _uid(), ...novoItem(item), created_at: _agora(), updated_at: _agora() };
        db.items.push(novo); _salvar(); return novo;
      },
      async update(id, patch) {
        const db = _ler();
        const it = db.items.find((i) => i.id === id);
        if (!it) return null;
        Object.assign(it, patch, { updated_at: _agora() }); _salvar(); return it;
      },
      async remove(id) {
        const db = _ler();
        db.items = db.items.filter((i) => i.id !== id);
        db.sessions = db.sessions.filter((s) => s.item_id !== id);
        _salvar(); return true;
      },
      async addSession(itemId, s) {
        const db = _ler();
        const reg = { id: _uid(), item_id: itemId, date: _agora(), amount: s.amount || 0, unit: s.unit || "paginas", note: s.note || "" };
        db.sessions.push(reg); _salvar(); return reg;
      },
      async sessionsOf(itemId) {
        return _ler().sessions.filter((s) => s.item_id === itemId).sort((a, b) => b.date.localeCompare(a.date));
      },
      async listCollections() {
        return _ler().collections.slice().sort((a, b) => a.name.localeCompare(b.name));
      },
      async addCollection(name, kind) {
        const db = _ler();
        const c = { id: _uid(), name, kind: kind || null, created_at: _agora() };
        db.collections.push(c); _salvar(); return c;
      },
      async removeCollection(id) {
        const db = _ler();
        db.collections = db.collections.filter((c) => c.id !== id);
        db.items.forEach((i) => { if (i.collection_id === id) i.collection_id = null; });
        _salvar(); return true;
      },
      async getGoal(year) { return _ler().goals[year] || 0; },
      async setGoal(year, target) { const db = _ler(); db.goals[year] = target; _salvar(); return target; },
    };
  })();

  /* ==========================================================
     BACKEND NUVEM (Supabase)
     ========================================================== */
  const Cloud = (() => {
    const sb = temNuvem ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;
    let SESSION = null;

    async function uid() {
      if (SESSION) return SESSION.user.id;
      const { data } = await sb.auth.getSession();
      SESSION = data.session;
      return SESSION ? SESSION.user.id : null;
    }

    return {
      mode: "cloud",
      _sb: sb,
      async session() {
        const { data } = await sb.auth.getSession();
        SESSION = data.session;
        return SESSION;
      },
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        SESSION = data.session; return data.session;
      },
      async signOut() { await sb.auth.signOut(); SESSION = null; },
      onAuthChange(cb) { sb.auth.onAuthStateChange((_e, s) => { SESSION = s; cb(s); }); },

      async list(kind) {
        let q = sb.from("items").select("*").order("updated_at", { ascending: false });
        if (kind) q = q.eq("kind", kind);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []).map(normaliza);
      },
      async get(id) {
        const { data, error } = await sb.from("items").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return normaliza(data);
      },
      async add(item) {
        const row = { ...novoItem(item), user_id: await uid() };
        const { data, error } = await sb.from("items").insert(row).select().single();
        if (error) throw error;
        return normaliza(data);
      },
      async update(id, patch) {
        const { data, error } = await sb.from("items")
          .update({ ...patch, updated_at: _agora() }).eq("id", id).select().single();
        if (error) throw error;
        return normaliza(data);
      },
      async remove(id) {
        const { error } = await sb.from("items").delete().eq("id", id);
        if (error) throw error;
        return true;
      },
      async addSession(itemId, s) {
        const row = { item_id: itemId, amount: s.amount || 0, unit: s.unit || "paginas", note: s.note || "", user_id: await uid() };
        const { data, error } = await sb.from("reading_sessions").insert(row).select().single();
        if (error) throw error;
        return data;
      },
      async sessionsOf(itemId) {
        const { data, error } = await sb.from("reading_sessions").select("*").eq("item_id", itemId).order("date", { ascending: false });
        if (error) throw error;
        return data || [];
      },

      // ---- coleções (Onda C) ----
      async listCollections() {
        const { data, error } = await sb.from("collections").select("*").order("name");
        if (error) throw error;
        return data || [];
      },
      async addCollection(name, kind) {
        const row = { name, kind: kind || null, user_id: await uid() };
        const { data, error } = await sb.from("collections").insert(row).select().single();
        if (error) throw error;
        return data;
      },
      async removeCollection(id) {
        await sb.from("items").update({ collection_id: null }).eq("collection_id", id);
        const { error } = await sb.from("collections").delete().eq("id", id);
        if (error) throw error;
        return true;
      },
      async getGoal(year) {
        const { data, error } = await sb.from("goals").select("target").eq("year", year).maybeSingle();
        if (error) throw error;
        return data ? data.target : 0;
      },
      async setGoal(year, target) {
        const { error } = await sb.from("goals")
          .upsert({ user_id: await uid(), year, target }, { onConflict: "user_id,year" });
        if (error) throw error;
        return target;
      },

      // ---- push (Fase 3) ----
      async salvarInscricaoPush(sub) {
        const j = sub.toJSON();
        const row = {
          user_id: await uid(),
          endpoint: j.endpoint,
          p256dh: j.keys.p256dh,
          auth: j.keys.auth,
          user_agent: navigator.userAgent,
        };
        const { error } = await sb.from("push_subscriptions").upsert(row, { onConflict: "user_id,endpoint" });
        if (error) throw error;
      },
    };
  })();

  /* ========================================================== */
  const backend = temNuvem ? Cloud : Local;

  // estatísticas (comum aos dois — usa list)
  async function stats() {
    const itens = await backend.list();
    const anoAtual = new Date().getFullYear();
    const lidosAno = itens.filter(
      (i) => i.status === "lido" && new Date(i.updated_at).getFullYear() === anoAtual
    ).length;
    return { total: itens.length, lidosAno };
  }

  return {
    mode: backend.mode,
    cloud: temNuvem,
    // auth (só faz algo na nuvem; no local é no-op amigável)
    session: () => backend.session(),
    signIn: (e, p) => (backend.signIn ? backend.signIn(e, p) : Promise.resolve()),
    signOut: () => (backend.signOut ? backend.signOut() : Promise.resolve()),
    onAuthChange: (cb) => backend.onAuthChange && backend.onAuthChange(cb),
    // dados
    list: (k) => backend.list(k),
    get: (id) => backend.get(id),
    add: (i) => backend.add(i),
    update: (id, p) => backend.update(id, p),
    remove: (id) => backend.remove(id),
    addSession: (id, s) => backend.addSession(id, s),
    sessionsOf: (id) => backend.sessionsOf(id),
    // coleções
    listCollections: () => backend.listCollections(),
    addCollection: (name, kind) => backend.addCollection(name, kind),
    removeCollection: (id) => backend.removeCollection(id),
    getGoal: (y) => backend.getGoal(y),
    setGoal: (y, t) => backend.setGoal(y, t),
    stats,
    // push
    salvarInscricaoPush: (sub) => backend.salvarInscricaoPush && backend.salvarInscricaoPush(sub),
    _sb: backend._sb || null,
  };
})();
