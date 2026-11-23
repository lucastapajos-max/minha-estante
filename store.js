/* ============================================================
   store.js — camada de dados (LOCAL ou NUVEM)
   ------------------------------------------------------------
   Escolhe sozinho o backend:
   - Se config.js tiver chaves reais do Supabase  -> NUVEM (sync + login)
   - Senão                                        -> LOCAL (localStorage)
   - Com ?demo no endereço -> LOCAL com a estante de exemplo de demo.js,
     numa chave própria: não mexe nos dados de ninguém nem no Supabase.

   A API pública é a MESMA nos dois (list, get, add, update, remove,
   sessões, coleções, metas, push) — o resto do app não sabe nem se importa
   com qual backend está rodando. Tudo assíncrono (Promise).
   ============================================================ */
const Store = (() => {
  const CFG = window.SUPABASE_CONFIG || {};
  const DEMO = new URLSearchParams(location.search).has("demo");
  const temNuvem = !DEMO && !!(CFG.url && CFG.anonKey && !/SEU-PROJETO/.test(CFG.url) && window.supabase);

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
      pos_atual: item.pos_atual ?? null,          // livro por "posição" do Kindle
      pos_total: item.pos_total ?? null,          // total de posições; nulo = por página
      // posição na fila "Próxima leitura"; só vai quando existe (novo item = fim da fila)
      ...(item.fila_ordem != null && { fila_ordem: item.fila_ordem }),
      total_chapters: item.total_chapters ?? null,
      current_chapter: item.current_chapter ?? 0,
      total_volumes: item.total_volumes ?? null,
      current_volume: item.current_volume ?? 0,
      rating: item.rating ?? null,
      review: item.review || "",
      genres: item.genres || [],
      source: item.source || "manual",
      external_id: item.external_id || "",
      notify: item.notify ?? false,
      mangabaka_id: item.mangabaka_id || "",
      ...(item.release_status && { release_status: item.release_status }),   // situação na MangaBaka
      ...(item.isbn && { isbn: item.isbn }),                // ISBN da edição
      last_notified_chapter: item.last_notified_chapter ?? null,
      started_at: item.started_at ?? null,
      finished_at: item.finished_at ?? null,
      format: item.format ?? null,          // 'fisico' | 'digital' | null
      collection_id: item.collection_id ?? null,
      ...(item.collection_pos != null && { collection_pos: item.collection_pos }),   // nº na série (migration_v12)
    };
  }

  // números vêm como string do PostgREST às vezes → normaliza
  // gênero uniforme: sem underscore, Cada Palavra Capitalizada (fontes divergem:
  // Jikan manda "Comedy", MangaBaka manda "comedy"/"school_life")
  const _capGenero = (g) => String(g).replace(/_/g, " ").replace(/\s+/g, " ").trim()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

  // tags em português: as fontes mandam em inglês, em minúsculas ou com grafias diferentes.
  // A chave ignora maiúsculas, acentos, "_" e "-". Shounen, Seinen, Ecchi etc. são nomes próprios do gênero.
  // shortcut: só traduz o que está na lista; termo novo em inglês passa direto, é só acrescentar aqui
  const GENEROS_PT = {
    "action": "Ação", "adventure": "Aventura", "comedy": "Comédia", "humor": "Comédia", "humour": "Comédia",
    "fantasy": "Fantasia", "fantasy fiction": "Fantasia", "urban fantasy": "Fantasia urbana", "dark fantasy": "Fantasia sombria",
    "fantasia dark": "Fantasia sombria", "fantasia contemporanea": "Fantasia contemporânea", "horror": "Terror",
    "mystery": "Mistério", "murder mystery": "Policial", "detective and mystery stories": "Policial", "crime": "Policial",
    "thriller": "Suspense", "thrillers": "Suspense", "psychological": "Psicológico", "supernatural": "Sobrenatural",
    "historical": "Histórico", "historical fiction": "Ficção histórica", "tragedy": "Tragédia", "sports": "Esporte", "sport": "Esporte",
    "school life": "Vida escolar", "slice of life": "Cotidiano", "award winning": "Premiado", "mature": "Adulto", "adult": "Adulto",
    "martial arts": "Artes marciais", "music": "Música", "gourmet": "Culinária", "cooking": "Culinária", "harem": "Harém",
    "science fiction": "Ficção científica", "sci fi": "Ficção científica", "ficcao cientifica": "Ficção científica",
    "fiction": "Ficção", "juvenile fiction": "Ficção juvenil", "young adult fiction": "Jovem adulto", "young adult": "Jovem adulto",
    "biography": "Biografia", "biography & autobiography": "Biografia", "history": "História", "poetry": "Poesia",
    "self help": "Autoajuda", "philosophy": "Filosofia", "psychology": "Psicologia", "religion": "Religião", "science": "Ciência",
    "business & economics": "Negócios", "literary criticism": "Crítica literária", "literature": "Literatura",
    "comics & graphic novels": "Quadrinhos", "social science": "Ciências sociais", "classics": "Clássico", "short stories": "Conto",
    "dystopia": "Distopia", "dystopian": "Distopia", "love stories": "Romance", "war": "Guerra", "family": "Família", "magic": "Magia",
    "vampires": "Vampiros", "dragons": "Dragões", "space": "Espaço", "assassins": "Assassinos", "game": "Jogos", "games": "Jogos",
    "dark": "Sombrio", "dark academia": "Dark Academia", "disputa de poder": "Disputa de poder", "literatura americana": "Literatura americana",
    "literatura nacional": "Literatura nacional", "literatura inglesa (inclui literatura do canada)": "Literatura inglesa", "realismo magico": "Realismo mágico", "rpg": "RPG", "litrpg": "LitRPG",
  };
  const _chaveGenero = (g) => g.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
  // "Fiction, Fantasy, General" vira Ficção + Fantasia; "General" não diz nada e sai
  const _generosPT = (lista) => [...new Set(lista.flatMap((g) => (typeof g === "string" ? g.split(",") : [g]))
    .filter((g) => typeof g !== "string" || (g.trim() && _chaveGenero(g) !== "general"))
    .map((g) => (typeof g === "string" ? GENEROS_PT[_chaveGenero(g)] || _capGenero(g) : g)))];

  console.assert(_generosPT(["Comedy", "comedy", "Fiction, Fantasy, General", "Ficção-Científica", "Shounen"]).join() === "Comédia,Ficção,Fantasia,Ficção científica,Shounen", "generosPT");

  function normaliza(row) {
    if (!row) return row;
    if (row.rating != null) row.rating = Number(row.rating);
    if (!Array.isArray(row.genres)) row.genres = row.genres || [];
    row.genres = _generosPT(row.genres);
    return row;
  }

  /* ==========================================================
     BACKEND LOCAL (localStorage)
     ========================================================== */
  const Local = (() => {
    const CHAVE = DEMO ? "estante:demo" : "estante:v1";
    let cache = null;
    function _ler() {
      if (cache) return cache;
      const vazio = () => (DEMO && window.ESTANTE_DEMO ? structuredClone(window.ESTANTE_DEMO) : { items: [], sessions: [] });
      try { cache = JSON.parse(localStorage.getItem(CHAVE)) || vazio(); }
      catch { cache = vazio(); }
      cache.items = cache.items || []; cache.sessions = cache.sessions || [];
      cache.collections = cache.collections || [];
      cache.goals = cache.goals || {};        // { "2026": 20, ... }
      return cache;
    }
    const _salvar = () => localStorage.setItem(CHAVE, JSON.stringify(cache));

    return {
      async session() { return { user: { id: "local" } }; },  // sempre "logado"
      async list(kind) {
        let it = _ler().items.slice();
        if (kind) it = it.filter((i) => i.kind === kind);
        return it.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).map(normaliza);
      },
      async get(id) { return normaliza(_ler().items.find((i) => i.id === id)) || null; },
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
        const reg = { id: _uid(), item_id: itemId, date: s.date || _agora(), amount: s.amount || 0, unit: s.unit || "paginas", to_pos: s.to_pos ?? null, note: s.note || "" };
        db.sessions.push(reg); _salvar(); return reg;
      },
      async listAllSessions(limit = 200) {
        const db = _ler();
        return db.sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
          .map((s) => { const it = db.items.find((i) => i.id === s.item_id) || {};
            return { ...s, item: { title: it.title, cover_url: it.cover_url, kind: it.kind } }; });
      },
      async removeSession(id) {
        const db = _ler(); db.sessions = db.sessions.filter((s) => s.id !== id); _salvar(); return true;
      },
      async updateSession(id, patch) {
        const db = _ler(); const s = db.sessions.find((x) => x.id === id);
        if (s) Object.assign(s, patch); _salvar(); return s;
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
      async listGoals() {
        return Object.entries(_ler().goals).map(([year, target]) => ({ year: Number(year), target }));
      },
    };
  })();

  /* ==========================================================
     BACKEND NUVEM (Supabase)
     ========================================================== */
  const Cloud = (() => {
    const sb = temNuvem ? window.supabase.createClient(CFG.url, CFG.anonKey) : null;
    let SESSION = null;

    // ---- sem internet: último retrato da estante (pra abrir e ler offline) + fila de escritas ----
    // shortcut: só progresso, nota, status e sessões entram na fila (o que se faz logo depois de ler);
    // adicionar, remover e coleções continuam precisando de internet
    const K_RETRATO = "estante:retrato", K_FILA = "estante:fila";
    const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
    const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    const retrato = () => ler(K_RETRATO, { items: [], collections: [], sessions: [], goals: {} });
    const mudarRetrato = (fn) => { const r = retrato(); fn(r); gravar(K_RETRATO, r); };
    // falha de rede (sem sinal, servidor fora), não erro nos dados
    const semRede = (e) => !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(String((e && e.message) || e));
    const enfileirar = (op) => gravar(K_FILA, [...ler(K_FILA, []), op]);
    async function inserirSessao(itemId, s) {
      const row = { item_id: itemId, amount: s.amount || 0, unit: s.unit || "paginas", to_pos: s.to_pos ?? null, note: s.note || "", user_id: await uid(),
        ...(s.date && { date: s.date }) };
      const { data, error } = await sb.from("reading_sessions").insert(row).select().single();
      if (error) throw error;
      return data;
    }
    let sincronizando = null;   // uma sincronização por vez (abrir o app e voltar a internet podem coincidir)

    async function uid() {
      if (SESSION) return SESSION.user.id;
      const { data } = await sb.auth.getSession();
      SESSION = data.session;
      return SESSION ? SESSION.user.id : null;
    }

    return {
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
      // sair apaga o retrato e a fila: outra pessoa no mesmo aparelho não pode ver nem herdar
      async signOut() { await sb.auth.signOut(); SESSION = null; localStorage.removeItem(K_RETRATO); localStorage.removeItem(K_FILA); },
      onAuthChange(cb) { sb.auth.onAuthStateChange((_e, s) => { SESSION = s; cb(s); }); },

      async list(kind) {
        let q = sb.from("items").select("*").order("updated_at", { ascending: false });
        if (kind) q = q.eq("kind", kind);
        const { data, error } = await q;
        if (error) {
          if (!semRede(error)) throw error;
          return retrato().items.filter((i) => !kind || i.kind === kind).map(normaliza);
        }
        mudarRetrato((r) => { r.items = r.items.filter((i) => kind && i.kind !== kind).concat(data || []); });
        return (data || []).map(normaliza);
      },
      async get(id) {
        const { data, error } = await sb.from("items").select("*").eq("id", id).maybeSingle();
        if (error) {
          if (!semRede(error)) throw error;
          return normaliza(retrato().items.find((i) => i.id === id) || null);
        }
        return normaliza(data);
      },
      async add(item) {
        const row = { ...novoItem(item), user_id: await uid() };
        const { data, error } = await sb.from("items").insert(row).select().single();
        if (error) throw error;
        return normaliza(data);
      },
      async update(id, patch) {
        const em = _agora();
        const { data, error } = await sb.from("items")
          .update({ ...patch, updated_at: em }).eq("id", id).select().single();
        if (error && !semRede(error)) throw error;
        if (error) enfileirar({ t: "update", id, patch, em });   // sem internet: vai quando voltar
        let novo = data;
        mudarRetrato((r) => {
          const i = r.items.findIndex((x) => x.id === id);
          if (i >= 0) { r.items[i] = data || { ...r.items[i], ...patch, updated_at: em }; novo = r.items[i]; }
        });
        return normaliza({ ...(novo || { id, ...patch }) });
      },
      async remove(id) {
        const { error } = await sb.from("items").delete().eq("id", id);
        if (error) throw error;
        return true;
      },
      async addSession(itemId, s) {
        try { return await inserirSessao(itemId, s); }
        catch (e) {
          if (!semRede(e)) throw e;
          const reg = { ...s, item_id: itemId, date: s.date || _agora() };   // guarda a hora em que você leu
          enfileirar({ t: "sessao", itemId, s: reg });
          mudarRetrato((r) => { const it = r.items.find((x) => x.id === itemId) || {};
            r.sessions.unshift({ ...reg, id: _uid(), item: { title: it.title, cover_url: it.cover_url, kind: it.kind } }); });
          return reg;
        }
      },
      // manda o que ficou na fila, em ordem; para no primeiro erro de rede (tenta de novo depois)
      sincronizar() {
        if (sincronizando) return sincronizando;
        sincronizando = (async () => {
          let fila = ler(K_FILA, []), feitas = 0;
          while (fila.length) {
            const op = fila[0];
            try {
              if (op.t === "update") {
                const { error } = await sb.from("items").update({ ...op.patch, updated_at: op.em }).eq("id", op.id);
                if (error) throw error;
              } else if (op.t === "sessao") await inserirSessao(op.itemId, op.s);
              feitas++;
            } catch (e) {
              if (semRede(e)) break;
              console.warn("Alteração feita sem internet foi descartada:", op, e);   // ex.: obra apagada em outro aparelho
            }
            fila = fila.slice(1); gravar(K_FILA, fila);
          }
          return feitas;
        })().finally(() => { sincronizando = null; });
        return sincronizando;
      },
      async listAllSessions(limit = 200) {
        const todas = [];
        while (todas.length < limit) {   // o Supabase devolve no máximo 1000 linhas por consulta
          const tam = Math.min(1000, limit - todas.length);
          const { data, error } = await sb.from("reading_sessions")
            .select("*, item:items(title, cover_url, kind)")
            .order("date", { ascending: false }).order("id")
            .range(todas.length, todas.length + tam - 1);
          if (error) {
            if (!semRede(error)) throw error;
            return retrato().sessions.slice(0, limit);
          }
          todas.push(...(data || []));
          if (!data || data.length < tam) break;
        }
        mudarRetrato((r) => { if (todas.length >= r.sessions.length || limit >= 1000) r.sessions = todas; });
        return todas;
      },
      async removeSession(id) {
        const { error } = await sb.from("reading_sessions").delete().eq("id", id);
        if (error) throw error; return true;
      },
      async updateSession(id, patch) {
        const { data, error } = await sb.from("reading_sessions").update(patch).eq("id", id).select().single();
        if (error) throw error; return data;
      },

      // ---- coleções (Onda C) ----
      async listCollections() {
        const { data, error } = await sb.from("collections").select("*").order("name");
        if (error) {
          if (!semRede(error)) throw error;
          return retrato().collections;
        }
        mudarRetrato((r) => { r.collections = data || []; });
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
        if (error) {
          if (!semRede(error)) throw error;
          return (retrato().goals || {})[year] || 0;
        }
        mudarRetrato((r) => { r.goals = { ...(r.goals || {}), [year]: data ? data.target : 0 }; });
        return data ? data.target : 0;
      },
      async setGoal(year, target) {
        const { error } = await sb.from("goals")
          .upsert({ user_id: await uid(), year, target }, { onConflict: "user_id,year" });
        if (error) throw error;
        return target;
      },
      async listGoals() {
        const { data, error } = await sb.from("goals").select("year, target");
        if (error) throw error;
        return data || [];
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

  return {
    cloud: temNuvem,
    demo: DEMO,
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
    listAllSessions: (n) => backend.listAllSessions(n),
    removeSession: (id) => backend.removeSession(id),
    updateSession: (id, p) => backend.updateSession(id, p),
    // coleções
    listCollections: () => backend.listCollections(),
    addCollection: (name, kind) => backend.addCollection(name, kind),
    removeCollection: (id) => backend.removeCollection(id),
    getGoal: (y) => backend.getGoal(y),
    setGoal: (y, t) => backend.setGoal(y, t),
    listGoals: () => backend.listGoals(),
    // sem internet: envia o que ficou guardado (no modo local não há o que enviar)
    sincronizar: () => (backend.sincronizar ? backend.sincronizar() : Promise.resolve(0)),
    // push
    salvarInscricaoPush: (sub) => backend.salvarInscricaoPush && backend.salvarInscricaoPush(sub),
  };
})();
