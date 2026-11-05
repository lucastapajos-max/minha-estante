/* ============================================================
   app.js — lógica da interface da Estante
   ============================================================ */
(() => {
  "use strict";

  // ---------- rótulos e cores ----------
  const STATUS = {
    quero_ler:  { label: "Quero ler",  cor: "var(--st-quero_ler)" },
    lendo:      { label: "Lendo",      cor: "var(--st-lendo)" },
    lido:       { label: "Lido",       cor: "var(--st-lido)" },
    pausado:    { label: "Pausado",    cor: "var(--st-pausado)" },
    abandonado: { label: "Abandonado", cor: "var(--st-abandonado)" },
  };
  const KIND = {
    livro:     { label: "Livro" },
    quadrinho: { label: "Quadrinho" },
    manga:     { label: "Mangá" },
  };

  // gêneros comuns por categoria (sugestões clicáveis)
  const GENEROS_COMUNS = {
    livro: ["Fantasia", "Ficção científica", "Romance", "Suspense", "Terror", "Aventura", "Drama", "Mistério", "Biografia", "História", "Autoajuda", "Poesia", "Clássico", "Distopia", "Conto"],
    quadrinho: ["Super-heróis", "Ação", "Aventura", "Ficção científica", "Fantasia", "Terror", "Humor", "Drama", "Graphic Novel"],
    manga: ["Shounen", "Shoujo", "Seinen", "Josei", "Ação", "Aventura", "Comédia", "Romance", "Terror", "Slice of Life", "Fantasia", "Ficção científica", "Esporte", "Sobrenatural", "Mistério", "Drama"],
  };
  const generosConhecidos = new Set();   // gêneros que já aparecem na estante
  let colecoesCache = [];                 // coleções (id → nome) pro render e filtros

  // ---------- estado da tela ----------
  const ui = { kind: "livro", status: "lendo", view: "grid", filtro: "", ordem: "recentes",
    adv: { genero: "", formato: "", ano: "", autor: "", colecao: "" } };

  // ordenadores da biblioteca (livros sem data de conclusão vão sempre por último)
  const porConclusao = (asc) => (a, b) => {
    if (!a.finished_at && !b.finished_at) return 0;
    if (!a.finished_at) return 1;
    if (!b.finished_at) return -1;
    return asc ? a.finished_at.localeCompare(b.finished_at) : b.finished_at.localeCompare(a.finished_at);
  };
  const ORDENADORES = {
    recentes: (a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""),
    az: (a, b) => a.title.localeCompare(b.title, "pt", { sensitivity: "base" }),
    za: (a, b) => b.title.localeCompare(a.title, "pt", { sensitivity: "base" }),
    conclusao_desc: porConclusao(false),
    conclusao_asc: porConclusao(true),
  };

  // ---------- ícones flat (SVG inline, monocromáticos, herdam a cor) ----------
  const ICON_PATHS = {
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    bookopen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    arrowup: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    arrowdown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  };
  const KIND_ICON = { livro: "book", quadrinho: "zap", manga: "bookmark" };
  function ico(name, size = 18) {
    return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ""}</svg>`;
  }
  // pinta os ícones estáticos do HTML (marcados com data-ico)
  function pintarIcones() {
    document.querySelectorAll("[data-ico]").forEach((el) => {
      el.innerHTML = ico(el.dataset.ico, Number(el.dataset.size) || 18);
    });
  }

  // ---------- temas (V2: escuro padrão + claro) ----------
  const TEMAS = [
    { id: "dark",  nome: "Escuro", claro: false, meta: "#121316", sw: "#121316", ac: "#c4384e" },
    { id: "light", nome: "Claro",  claro: true,  meta: "#f4f5f7", sw: "#f4f5f7", ac: "#b32e44" },
  ];
  const infoTema = (id) => TEMAS.find((t) => t.id === id) || TEMAS[0];
  const temaAtual = () => {
    const t = document.documentElement.getAttribute("data-theme");
    return TEMAS.some((x) => x.id === t) ? t : "dark";
  };
  function atualizarBotaoTema() {
    const btn = document.getElementById("btn-tema");
    if (btn) btn.innerHTML = ico(infoTema(temaAtual()).claro ? "sun" : "moon", 18);
  }
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("tema", t); } catch {}
    const meta = document.getElementById("meta-theme");
    if (meta) meta.content = infoTema(t).meta;
    atualizarBotaoTema();
  }

  // ---------- seletor de tema (popover) ----------
  function fecharMenuTema() {
    const m = document.getElementById("tema-menu");
    if (m) m.remove();
    document.removeEventListener("click", fecharTemaFora);
    document.removeEventListener("keydown", escFecharTema);
  }
  function fecharTemaFora(e) {
    if (!e.target.closest("#tema-menu") && !e.target.closest("#btn-tema")) fecharMenuTema();
  }
  function escFecharTema(e) { if (e.key === "Escape") fecharMenuTema(); }
  function abrirMenuTema() {
    if (document.getElementById("tema-menu")) { fecharMenuTema(); return; }
    const btn = document.getElementById("btn-tema");
    const atual = temaAtual();
    const menu = document.createElement("div");
    menu.className = "tema-menu"; menu.id = "tema-menu";
    menu.innerHTML = TEMAS.map((t) => `
      <button class="tema-op${t.id === atual ? " is-active" : ""}" data-tema="${t.id}">
        <span class="tema-sw" style="background:${t.sw};border-color:${t.ac}"></span>
        <span class="tema-nome">${t.nome}</span>
        ${t.id === atual ? ico("check", 15) : ""}
      </button>`).join("");
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 8) + "px";
    menu.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    menu.querySelectorAll(".tema-op").forEach((op) =>
      op.addEventListener("click", () => { aplicarTema(op.dataset.tema); fecharMenuTema(); }));
    setTimeout(() => {
      document.addEventListener("click", fecharTemaFora);
      document.addEventListener("keydown", escFecharTema);
    }, 0);
  }

  // ---------- atalhos ----------
  const $ = (id) => document.getElementById(id);
  const hojeISO = () => {
    const d = new Date(); const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  // status de lançamento da obra (vindo da MangaBaka/Jikan/AniList) → badge
  function statusObra(raw) {
    const s = String(raw || "").toLowerCase();
    if (!s) return null;
    if (/(releasing|publishing|ongoing|current)/.test(s)) return { label: "Em lançamento", cls: "releasing" };
    if (/(completed|finished)/.test(s))                    return { label: "Concluído", cls: "finished" };
    if (/hiatus/.test(s))                                  return { label: "Em hiato", cls: "hiatus" };
    if (/(cancel|discontin)/.test(s))                      return { label: "Cancelado", cls: "cancelled" };
    if (/(not[_ ]?yet|upcoming|não lançad)/.test(s))       return { label: "Não lançado", cls: "upcoming" };
    return null;
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // nota sempre 0..5 (evita repeat() negativo e dados fora da faixa)
  const clampNota = (n) => { n = Number(n); return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : null; };

  function toast(msg) {
    const t = $("toast");
    t.hidden = false; t.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2200);
  }

  // fecha TODOS os modais — usado antes de abrir qualquer um
  // (garante que nunca fiquem empilhados/travados)
  function fecharModais() {
    ["modal-add", "modal-manual", "modal-ficha", "modal-rapido", "modal-sessao", "modal-import"].forEach((id) => {
      const m = $(id); if (m) m.hidden = true;
    });
  }

  // ============================================================
  //  MARCO 3 — ESTATÍSTICAS E METAS
  // ============================================================
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MESES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  let statsPeriodo = "mes";   // 'semana' | 'mes' | 'ano'

  async function renderStats() {
    const todos = await Store.list();                 // todos os tipos
    const sessoes = await Store.listAllSessions(1000).catch(() => []);
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();                  // 0..11
    // classifica pelo fim da leitura (com fallback pra updated_at)
    const quando = (i) => (i.finished_at || i.updated_at || "");
    const lidos = todos.filter((i) => i.status === "lido");
    const lidosAno = lidos.filter((i) => quando(i).slice(0, 4) === String(ano));
    const lidosMes = lidosAno.filter((i) => Number(quando(i).slice(5, 7)) === mesAtual + 1);

    // por mês (12)
    const porMes = Array(12).fill(0);
    lidosAno.forEach((i) => { const m = Number(quando(i).slice(5, 7)); if (m >= 1 && m <= 12) porMes[m - 1]++; });
    const maxMes = Math.max(1, ...porMes);

    // gêneros mais lidos (entre os lidos)
    const cont = {};
    lidos.forEach((i) => (i.genres || []).forEach((g) => { if (g) cont[g] = (cont[g] || 0) + 1; }));
    const topGen = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxGen = Math.max(1, ...topGen.map(([, n]) => n));

    // por categoria
    const porTipo = { livro: 0, quadrinho: 0, manga: 0 };
    lidos.forEach((i) => { if (porTipo[i.kind] != null) porTipo[i.kind]++; });

    // meta anual
    const meta = await Store.getGoal(ano);
    const pctMeta = meta ? Math.min(100, Math.round((lidosAno.length / meta) * 100)) : 0;

    // #2 volume lido por período (a partir das sessões)
    const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - 6); inicioSemana.setHours(0, 0, 0, 0);
    const inicioMes = new Date(ano, mesAtual, 1);
    const inicioAno = new Date(ano, 0, 1);
    const desdePorPeriodo = { semana: inicioSemana, mes: inicioMes, ano: inicioAno };
    const diasPorPeriodo = {
      semana: 7,
      mes: hoje.getDate(),
      ano: Math.ceil((hoje - inicioAno) / 86400000) + 1,
    };
    const desde = desdePorPeriodo[statsPeriodo];
    let volPags = 0, volCaps = 0;
    sessoes.forEach((s) => {
      if (new Date(s.date) >= desde) {
        if (s.unit === "paginas") volPags += s.amount || 0;
        else volCaps += s.amount || 0;
      }
    });
    const dias = diasPorPeriodo[statsPeriodo];
    const mediaPags = (volPags / dias).toFixed(1).replace(".0", "");
    const mediaCaps = (volCaps / dias).toFixed(1).replace(".0", "");
    const rotuloPeriodo = { semana: "nos últimos 7 dias", mes: `em ${MESES[mesAtual]}`, ano: `em ${ano}` }[statsPeriodo];

    // #1 sequência de leitura (dias seguidos com sessão)
    const diaLocal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    const diasLeitura = new Set(sessoes.map((s) => diaLocal(s.date)));
    let streakAtual = 0;
    { let d = new Date(); if (!diasLeitura.has(hojeISO())) d.setDate(d.getDate() - 1);
      while (diasLeitura.has(diaLocal(d.toISOString()))) { streakAtual++; d.setDate(d.getDate() - 1); } }
    let maiorStreak = 0;
    { const ds = [...diasLeitura].sort(); let cur = 0, prev = null;
      for (const x of ds) { cur = (prev && (new Date(x) - new Date(prev)) === 86400000) ? cur + 1 : 1; if (cur > maiorStreak) maiorStreak = cur; prev = x; } }

    // #3 ritmo
    const lidosComPag = lidos.filter((i) => i.total_pages);
    const maisLongo = lidosComPag.reduce((a, i) => (!a || i.total_pages > a.total_pages ? i : a), null);
    const maisCurto = lidosComPag.reduce((a, i) => (!a || i.total_pages < a.total_pages ? i : a), null);
    const totalPagSess = sessoes.filter((s) => s.unit === "paginas").reduce((a, s) => a + (s.amount || 0), 0);
    const mediaPagDiaGeral = diasLeitura.size ? Math.round(totalPagSess / diasLeitura.size) : 0;
    const duracoes = lidos.filter((i) => i.started_at && i.finished_at)
      .map((i) => Math.round((new Date(i.finished_at) - new Date(i.started_at)) / 86400000) + 1)
      .filter((d) => d >= 1 && d < 3650);
    const tempoMedio = duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : null;

    // #2 retrospectiva do ano
    const pagesAno = lidosAno.reduce((a, i) => a + (i.total_pages || 0), 0);
    const favorito = lidosAno.filter((i) => i.rating).sort((a, b) => (b.rating - a.rating) || quando(b).localeCompare(quando(a)))[0];
    const contaGen = {}; lidosAno.forEach((i) => (i.genres || []).forEach((g) => { if (g) contaGen[g] = (contaGen[g] || 0) + 1; }));
    const genTopAno = Object.entries(contaGen).sort((a, b) => b[1] - a[1])[0];
    const contaAut = {}; lidosAno.forEach((i) => { if (i.authors) contaAut[i.authors] = (contaAut[i.authors] || 0) + 1; });
    const autTopAno = Object.entries(contaAut).sort((a, b) => b[1] - a[1])[0];
    const mesTopIdx = porMes.indexOf(Math.max(...porMes));
    const mesTop = porMes[mesTopIdx] > 0 ? MESES[mesTopIdx] : null;

    $("stats-corpo").innerHTML = `
      <div class="stats-secao">
        <h2>Meta de ${ano}</h2>
        <div class="meta-linha">
          <input class="input" id="stats-meta" aria-label="Meta de livros no ano" type="number" inputmode="numeric" value="${meta || ""}" placeholder="ex.: 20">
          <span class="prog-sep">livros/ano</span>
          <button class="btn-primary" id="stats-salvar-meta">Salvar</button>
        </div>
        ${meta ? `
          <div class="prog-barra" style="margin-top:14px"><i style="width:${pctMeta}%"></i></div>
          <div class="meta-txt"><b>${lidosAno.length}</b> de <b>${meta}</b> livros — ${pctMeta}%
            ${lidosAno.length >= meta ? ". Meta batida." : ` (faltam ${meta - lidosAno.length})`}</div>
        ` : `<div class="meta-txt">Defina uma meta pra acompanhar seu progresso do ano.</div>`}
      </div>

      <div class="stats-secao">
        <h2>Sequência</h2>
        <div class="stats-nums">
          <div class="stat-num"><b>${streakAtual}</b><span>${streakAtual === 1 ? "dia seguido agora" : "dias seguidos agora"}</span></div>
          <div class="stat-num"><b>${maiorStreak}</b><span>maior sequência</span></div>
        </div>
      </div>

      <div class="stats-secao">
        <h2>Resumo</h2>
        <div class="stats-nums">
          <div class="stat-num"><b>${lidos.length}</b><span>lidos no total</span></div>
          <div class="stat-num"><b>${lidosAno.length}</b><span>em ${ano}</span></div>
          <div class="stat-num"><b>${lidosMes.length}</b><span>em ${MESES[mesAtual]}</span></div>
        </div>
        <div class="meta-txt">${[["livro", "livro", "livros"], ["manga", "mangá", "mangás"], ["quadrinho", "quadrinho", "quadrinhos"]]
          .filter(([k]) => k !== "quadrinho" || porTipo.quadrinho)   // quadrinhos só aparecem se existirem (aba oculta)
          .map(([k, um, varios]) => plural(porTipo[k], um, varios)).join(" e ")}</div>
      </div>

      <div class="stats-secao">
        <h2>Volume lido</h2>
        <div class="periodo-toggle" id="periodo-toggle">
          <button data-p="semana" class="${statsPeriodo === "semana" ? "is-active" : ""}">Semana</button>
          <button data-p="mes" class="${statsPeriodo === "mes" ? "is-active" : ""}">Mês</button>
          <button data-p="ano" class="${statsPeriodo === "ano" ? "is-active" : ""}">Ano</button>
        </div>
        <div class="stats-nums" style="margin-top:12px">
          <div class="stat-num"><b>${volPags}</b><span>páginas (livros)</span></div>
          <div class="stat-num"><b>${volCaps}</b><span>capítulos (mangás)</span></div>
        </div>
        <div class="meta-txt">Média diária ${rotuloPeriodo}: <b>${mediaPags}</b> pág/dia e <b>${mediaCaps}</b> cap/dia</div>
      </div>

      <div class="stats-secao">
        <h2>Sua retrospectiva de ${ano}</h2>
        ${lidosAno.length ? `<div class="retro-resumo">
          <div class="retro-linha"><b>${plural(lidosAno.length, "obra lida", "obras lidas")}</b> e <b>${pagesAno.toLocaleString("pt-BR")}</b> páginas</div>
          ${favorito ? `<div class="retro-linha">Favorito: <b>${esc(favorito.title)}</b> ${notaHTML(Math.round(clampNota(favorito.rating)), 12)}</div>` : ""}
          ${genTopAno ? `<div class="retro-linha">Gênero do ano: <b>${esc(genTopAno[0])}</b></div>` : ""}
          ${autTopAno && autTopAno[1] > 1 ? `<div class="retro-linha">Autor mais lido: <b>${esc(autTopAno[0])}</b> (${autTopAno[1]} livros)</div>` : ""}
          ${mesTop ? `<div class="retro-linha">Mês mais forte: <b>${mesTop}</b></div>` : ""}
          <button class="btn-primary" id="btn-retro" style="margin-top:12px">Ver retrospectiva de ${ano}</button>
        </div>` : `<div class="meta-txt">Termine alguns livros em ${ano} pra ver sua retrospectiva.</div>`}
      </div>

      <div class="stats-secao">
        <h2>Seu ritmo</h2>
        <div class="stats-nums">
          <div class="stat-num"><b>${mediaPagDiaGeral}</b><span>páginas/dia lido</span></div>
          <div class="stat-num"><b>${tempoMedio != null ? tempoMedio : "—"}</b><span>dias p/ terminar (média)</span></div>
        </div>
        ${maisLongo ? `<div class="meta-txt">Mais longo: <b>${esc(maisLongo.title)}</b> (${maisLongo.total_pages} pág)</div>` : ""}
        ${maisCurto && maisCurto !== maisLongo ? `<div class="meta-txt">Mais curto: <b>${esc(maisCurto.title)}</b> (${maisCurto.total_pages} pág)</div>` : ""}
      </div>

      <div class="stats-secao">
        <h2>Lidos por mês em ${ano}</h2>
        <div class="grafico-mes">
          ${porMes.map((n, idx) => `
            <div class="gm-col ${idx === mesAtual ? "gm-atual" : ""}">
              <div class="gm-barra-wrap"><div class="gm-barra" style="height:${Math.round((n / maxMes) * 100)}%" title="${plural(n, "obra lida", "obras lidas")}">${n ? `<span class="gm-n">${n}</span>` : ""}</div></div>
              <div class="gm-label">${MESES[idx]}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="stats-secao">
        <h2>Gêneros mais lidos</h2>
        ${topGen.length ? `<div class="grafico-gen">
          ${topGen.map(([g, n]) => `
            <div class="gg-linha">
              <span class="gg-nome">${esc(g)}</span>
              <span class="gg-barra-wrap"><span class="gg-barra" style="width:${Math.round((n / maxGen) * 100)}%"></span></span>
              <span class="gg-n">${n}</span>
            </div>`).join("")}
        </div>` : `<div class="meta-txt">Marque livros como "Lido" (com gêneros) pra ver seu ranking.</div>`}
      </div>`;

    $("stats-salvar-meta").onclick = async () => {
      const alvo = parseInt($("stats-meta").value) || 0;
      await Store.setGoal(ano, alvo);
      toast("Meta salva");
      renderStats();
    };
    $("periodo-toggle").querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => { statsPeriodo = b.dataset.p; renderStats(); }));

    // retrospectiva: reaproveita os números já calculados acima
    const capsAno = sessoes.filter((s) => s.unit === "capitulos" && new Date(s.date) >= inicioAno)
      .reduce((a, s) => a + (s.amount || 0), 0);
    const btnRetro = $("btn-retro");
    if (btnRetro) btnRetro.onclick = () => abrirRetro({
      ano, total: lidosAno.length, paginas: pagesAno, capitulos: capsAno,
      livros: lidosAno.filter((i) => i.kind === "livro").length,
      mangas: lidosAno.filter((i) => i.kind === "manga").length,
      favorito, genero: genTopAno && genTopAno[0],
      mes: mesTop ? MESES_LONGO[mesTopIdx].replace(/^./, (c) => c.toUpperCase()) : null, mesN: porMes[mesTopIdx], maiorStreak,
    });
  }

  // ============================================================
  //  RETROSPECTIVA DO ANO (telas cheias + imagem pra compartilhar)
  // ============================================================
  // nota de 0 a 5 em estrelas desenhadas (cheias + vazadas), com leitura por extenso
  const notaHTML = (n, px) => `<span class="nota" role="img" aria-label="${n} de 5 estrelas">${
    [1, 2, 3, 4, 5].map((k) => `<span class="${k <= n ? "on" : ""}">${ico("star", px)}</span>`).join("")}</span>`;
  const plural = (n, um, varios) => `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;

  function telasRetro(d) {
    const t = [];
    t.push(`<p class="rt-sus">Seu ano na Estante</p><p class="rt-grito rt-ano">${d.ano}</p><p class="rt-dica">Toque para continuar</p>`);
    const partes = [d.livros && plural(d.livros, "livro", "livros"), d.mangas && plural(d.mangas, "mangá", "mangás")].filter(Boolean);
    t.push(`<p class="rt-grito">${d.total}</p><p class="rt-txt">${d.total === 1 ? "obra concluída" : "obras concluídas"}</p>
      ${partes.length ? `<p class="rt-sus">${partes.join(" e ")}</p>` : ""}
      ${d.paginas ? `<p class="rt-sus">${plural(d.paginas, "página", "páginas")} de livro</p>` : ""}`);
    if (d.capitulos) t.push(`<p class="rt-grito">${d.capitulos.toLocaleString("pt-BR")}</p><p class="rt-txt">capítulos de mangá lidos</p>`);
    if (d.favorito) {
      const f = d.favorito, n = Math.round(clampNota(f.rating) || 0);
      t.push(`${f.cover_url ? `<div class="rt-fundo" style="--img:url(&quot;${esc(capaURL(f.cover_url))}&quot;)"></div>
          <img class="rt-capa" src="${esc(capaURL(f.cover_url))}" alt="">` : ""}
        <p class="rt-sus">Seu favorito</p><p class="rt-titulo">${esc(f.title)}</p>
        <p class="rt-sus">${esc(f.authors || "")}</p><p class="rt-estrelas">${notaHTML(n, 22)}</p>`);
    }
    if (d.genero) t.push(`<p class="rt-sus">O gênero do ano</p><p class="rt-grito rt-palavra">${esc(d.genero)}</p>`);
    if (d.mes) t.push(`<p class="rt-sus">Seu mês mais forte</p><p class="rt-grito rt-palavra">${d.mes}</p>
      <p class="rt-txt">${plural(d.mesN, "obra concluída", "obras concluídas")}</p>
      ${d.maiorStreak > 1 ? `<p class="rt-sus">Sua maior sequência: ${d.maiorStreak} dias seguidos lendo</p>` : ""}`);
    t.push(`<p class="rt-sus">Seu ${d.ano} em uma imagem</p><img class="rt-preview" id="rt-preview" alt="Resumo de ${d.ano}">
      <button class="btn-primary rt-share" id="rt-share" type="button">Compartilhar imagem</button>`);
    return t;
  }

  function abrirRetro(d) {
    const telas = telasRetro(d);
    let i = 0;
    const el = document.createElement("div");
    el.className = "retro"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", `Retrospectiva de ${d.ano}`);
    el.innerHTML = `<span class="rt-fita" aria-hidden="true"><i></i></span>
      <button class="rt-fechar" type="button" aria-label="Fechar">${ico("plus", 22)}</button>
      <div class="rt-tela" aria-live="polite"></div>
      <button class="rt-nav rt-ant" type="button" aria-label="Anterior"></button>
      <button class="rt-nav rt-prox" type="button" aria-label="Próximo"></button>`;
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";   // a página de trás não rola nem mostra barra
    const tela = el.querySelector(".rt-tela");
    const mostrar = () => {
      tela.innerHTML = telas[i];
      el.style.setProperty("--p", Math.round(((i + 1) / telas.length) * 100));  // a fita cresce a cada tela
      el.querySelector(".rt-ant").hidden = i === 0;
      el.querySelector(".rt-prox").hidden = i === telas.length - 1;
      if (i === telas.length - 1) prepararImagem(d);
    };
    const ir = (n) => { if (n >= 0 && n < telas.length) { i = n; mostrar(); } };
    const fechar = () => { document.removeEventListener("keydown", teclas); document.body.style.overflow = ""; el.remove(); };
    const teclas = (e) => {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight") ir(i + 1);
      else if (e.key === "ArrowLeft") ir(i - 1);
    };
    el.querySelector(".rt-fechar").onclick = fechar;
    el.querySelector(".rt-ant").onclick = () => ir(i - 1);
    el.querySelector(".rt-prox").onclick = () => ir(i + 1);
    document.addEventListener("keydown", teclas);
    mostrar();
    el.querySelector(".rt-prox").focus();
  }

  // imagem 1080×1920 (formato story), só tipografia + fita: capas de outros sites "sujariam"
  // o canvas (CORS) e o navegador bloquearia a exportação
  async function prepararImagem(d) {
    await Promise.all(["800 100px", "300 40px", "500 40px"].map((f) => document.fonts.load(`${f} "Bricolage Grotesque"`)));
    const W = 1080, H = 1920, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const F = (peso, px) => `${peso} ${px}px "Bricolage Grotesque", sans-serif`;
    g.fillStyle = "#121316"; g.fillRect(0, 0, W, H);
    // a fita, descendo pela direita até o fim (ano completo)
    g.fillStyle = "#c4384e";
    g.beginPath(); g.moveTo(930, 0); g.lineTo(978, 0); g.lineTo(978, 1500); g.lineTo(954, 1474); g.lineTo(930, 1500); g.closePath(); g.fill();
    g.fillStyle = "#ecedef"; g.font = F(800, 72); g.fillText("Estante", 90, 180);
    g.fillStyle = "#8a919b"; g.font = F(300, 40); g.fillText("Meu ano de leitura", 90, 245);
    g.fillStyle = "#ecedef"; g.font = F(800, 300); g.fillText(String(d.ano), 70, 590);
    const corta = (txt, max) => { let t = txt; while (g.measureText(t).width > max && t.length > 1) t = t.slice(0, -1); return t === txt ? t : t.trimEnd() + "…"; };
    const linhas = [
      [plural(d.total, "obra concluída", "obras concluídas"), [d.livros && plural(d.livros, "livro", "livros"), d.mangas && plural(d.mangas, "mangá", "mangás")].filter(Boolean).join(" e ")],
      d.paginas ? [plural(d.paginas, "página", "páginas"), "de livro"] : null,
      d.capitulos ? [plural(d.capitulos, "capítulo", "capítulos"), "de mangá"] : null,
      d.favorito ? [d.favorito.title, "meu favorito"] : null,
      d.genero ? [d.genero, "gênero do ano"] : null,
      d.mes ? [d.mes, "mês mais forte"] : null,
    ].filter(Boolean);
    let y = 760;
    for (const [grande, sus] of linhas) {
      g.fillStyle = "#ecedef"; g.font = F(800, 70); g.fillText(corta(grande, 790), 90, y);
      g.fillStyle = "#8a919b"; g.font = F(300, 40); g.fillText(sus, 90, y + 56);
      y += 170;
    }
    const prev = $("rt-preview"), btn = $("rt-share");
    if (!prev) return;   // usuário já saiu da última tela
    prev.src = c.toDataURL("image/png");
    btn.onclick = () => c.toBlob(async (blob) => {
      const arq = new File([blob], `estante-${d.ano}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [arq] })) {
        try { await navigator.share({ files: [arq], title: `Meu ${d.ano} na Estante` }); } catch {}   // cancelar não é erro
      } else {
        baixarArquivo(arq.name, blob, "image/png");
        toast("Imagem salva");
      }
    }, "image/png");
  }

  // troca entre as abas do menu inferior (biblioteca / estatísticas / histórico)
  let telaAtual = "biblioteca";
  async function mostrarView(view) {
    telaAtual = view;
    $("view-biblioteca").hidden = view !== "biblioteca";
    $("view-stats").hidden = view !== "stats";
    $("view-historico").hidden = view !== "historico";
    $("btn-adicionar").style.display = view === "biblioteca" ? "" : "none";
    $("brand-sus").hidden = view !== "biblioteca";
    document.querySelectorAll("#bottom-nav .bn-item").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.view === view));
    ariaAtivo();
    window.scrollTo(0, 0);
    salvarNav();
    if (view === "stats") await renderStats();
    if (view === "historico") await renderHistorico();
  }
  // rebusca os dados da tela atual (sem trocar de view)
  function atualizarTelaAtual() {
    if (telaAtual === "stats") return renderStats();
    if (telaAtual === "historico") return renderHistorico();
    return renderBiblioteca();
  }

  // ============================================================
  //  HISTÓRICO DE LEITURA (#3)
  // ============================================================
  function descricaoSessao(s) {
    if (s.unit === "paginas") {
      return `Leu ${s.amount} página${s.amount === 1 ? "" : "s"}` + (s.to_pos ? ` · até a pág. ${s.to_pos}` : "");
    }
    if (s.to_pos) {
      const de = s.to_pos - s.amount + 1;
      return s.amount === 1 ? `Leu o cap. ${s.to_pos}` : `Leu do cap. ${de} ao ${s.to_pos}`;
    }
    return `Leu ${s.amount} capítulo${s.amount === 1 ? "" : "s"}`;
  }
  function mesmoDia(a, b) { return a.toDateString() === b.toDateString(); }
  function rotuloDia(iso) {
    const d = new Date(iso), hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    if (mesmoDia(d, hoje)) return "Hoje";
    if (mesmoDia(d, ontem)) return "Ontem";
    return `${d.getDate()} de ${MESES_LONGO[d.getMonth()]}${d.getFullYear() !== hoje.getFullYear() ? " de " + d.getFullYear() : ""}`;
  }
  const horaDe = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  async function renderHistorico() {
    const corpo = $("historico-corpo");
    const sessoes = await Store.listAllSessions(200).catch(() => []);
    if (!sessoes.length) {
      corpo.innerHTML = `<div class="hist-vazio">Nenhuma leitura registrada ainda.<br>Atualize o progresso de um título (na ficha ou no botão direito/segurar) que a sessão aparece aqui.</div>`;
      return;
    }
    let html = "", diaAtual = "";
    sessoes.forEach((s) => {
      const it = s.item || {};
      const rot = rotuloDia(s.date);
      if (rot !== diaAtual) { diaAtual = rot; html += `<div class="hist-dia">${rot}</div>`; }
      html += `<div class="hist-entry" data-id="${s.id}">
        <div class="hist-capa">${capaHTML({ cover_url: it.cover_url, kind: it.kind || "livro" }, "hist-capa-img")}</div>
        <div class="hist-corpo">
          <div class="hist-titulo">${esc(it.title || "—")}</div>
          <div class="hist-desc">${descricaoSessao(s)}</div>
          <div class="hist-hora">${horaDe(s.date)}</div>
        </div>
        <div class="hist-acoes">
          <button class="hist-btn" data-act="editar" aria-label="Editar">${ico("pencil", 16)}</button>
          <button class="hist-btn" data-act="excluir" aria-label="Excluir">${ico("trash", 16)}</button>
        </div>
      </div>`;
    });
    corpo.innerHTML = html;
    corpo.querySelectorAll(".hist-entry").forEach((el) => {
      const s = sessoes.find((x) => x.id === el.dataset.id);
      el.querySelector('[data-act="editar"]').onclick = () => abrirEditarSessao(s);
      el.querySelector('[data-act="excluir"]').onclick = async () => {
        if (!confirm("Excluir este registro do histórico?")) return;
        await Store.removeSession(s.id);
        toast("Registro excluído");
        renderHistorico();
      };
    });
  }

  function abrirEditarSessao(s) {
    const dt = new Date(s.date);
    const localISO = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $("sessao-corpo").innerHTML = `
      <label class="campo">Quantidade lida (${s.unit === "paginas" ? "páginas" : "capítulos"})</label>
      <input class="input" id="se-amount" type="number" inputmode="numeric" value="${s.amount}">
      <label class="campo">Data e hora</label>
      <input class="input input-data" id="se-data" type="datetime-local" value="${localISO}">
      <div class="ficha-rodape">
        <button class="btn-ghost" id="se-cancel">Cancelar</button>
        <button class="btn-primary" id="se-salvar">Salvar</button>
      </div>`;
    $("modal-sessao").hidden = false;
    $("se-cancel").onclick = () => ($("modal-sessao").hidden = true);
    $("se-salvar").onclick = async () => {
      const amount = parseInt($("se-amount").value) || 0;
      const data = $("se-data").value ? new Date($("se-data").value).toISOString() : s.date;
      await Store.updateSession(s.id, { amount, date: data });
      $("modal-sessao").hidden = true;
      toast("Registro atualizado");
      renderHistorico();
    };
  }

  // ===== progresso compartilhado (ficha + ação rápida) =====
  // aplica o progresso + data de início automática (#1). Retorna o item atualizado.
  async function salvarProgresso(item, cur, tot, curv, totv) {
    const antes = item.kind === "livro" ? (item.current_page || 0) : (item.current_chapter || 0);
    const patch = item.kind === "livro"
      ? { current_page: cur, total_pages: tot }
      : { current_chapter: cur, total_chapters: tot, current_volume: curv || 0, total_volumes: totv ?? null };
    if (cur > 0 && item.status === "quero_ler") patch.status = "lendo";
    if (cur > 0 && !item.started_at) patch.started_at = hojeISO();
    const novo = await Store.update(item.id, patch);
    // registra a sessão de leitura se avançou (base do histórico e do volume)
    const delta = cur - antes;
    if (delta > 0) {
      try {
        await Store.addSession(item.id, {
          amount: delta,
          unit: item.kind === "livro" ? "paginas" : "capitulos",
          to_pos: cur,
        });
      } catch {}
    }
    return novo;
  }
  // salva progresso de LIVRO por "posição" do Kindle/e-book (posição atual de um total)
  async function salvarPosicao(item, cur, tot) {
    cur = Math.max(0, cur || 0);
    const antes = item.pos_atual || 0;
    const patch = { pos_atual: cur, pos_total: tot };
    if (cur > 0 && item.status === "quero_ler") patch.status = "lendo";
    if (cur > 0 && !item.started_at) patch.started_at = hojeISO();
    // histórico/estatística seguem em páginas: converte posição→página pelo total FÍSICO (ISBN)
    if (item.total_pages && tot) {
      const pgNovo = Math.round((cur / tot) * item.total_pages);
      patch.current_page = pgNovo;
      const novo = await Store.update(item.id, patch);
      const delta = pgNovo - Math.round((antes / tot) * item.total_pages);
      if (delta > 0) { try { await Store.addSession(item.id, { amount: delta, unit: "paginas", to_pos: pgNovo }); } catch {} }
      return novo;
    }
    return await Store.update(item.id, patch);
  }
  // #2 se chegou ao total, pergunta e conclui. Retorna true se concluiu.
  async function checarConclusao(novo) {
    if (temTotal(novo) && progresso(novo) >= 1 && novo.status !== "lido") {
      // mangá sem situação salva: consulta a MangaBaka na hora
      if (novo.kind === "manga" && !novo.release_status) {
        const info = await APIs.capitulosLancados(novo.title, novo.mangabaka_id);
        if (info.release_status) {
          novo.release_status = info.release_status;
          Store.update(novo.id, { release_status: info.release_status }).catch(() => {});
        }
      }
      // ainda saindo capítulo: você só está em dia, a obra não acabou
      if (aindaSaindo(novo)) { toast("Em dia com os lançamentos"); return false; }
      if (await perguntarConclusao(novo)) {
        await Store.update(novo.id, { status: "lido", finished_at: hojeISO() });
        toast("Leitura concluída");
        return true;
      }
    }
    return false;
  }

  // #5 ação rápida de progresso (right-click no desktop / long-press no mobile)
  async function abrirRapido(id) {
    const it = await Store.get(id);
    if (!it) return;
    fecharModais();
    const ehLivro = it.kind === "livro";
    const ehDigital = ehLivroDigital(it);   // livro por posição (Kindle) / % legado
    // livro digital sem total de posição definido → abre a ficha p/ preencher lá
    if (ehDigital && !it.pos_total) { abrirFicha(id); return; }
    const cur = ehDigital ? (it.pos_atual || 0) : ehLivro ? (it.current_page || 0) : (it.current_chapter || 0);
    const tot = ehDigital ? it.pos_total : ehLivro ? it.total_pages : it.total_chapters;
    const passo = ehDigital ? 25 : 1;
    const unidade = ehDigital ? "posição" : ehLivro ? "página" : "capítulo";
    $("rapido-titulo").textContent = it.title;
    $("rapido-corpo").innerHTML = `
      <div class="rapido-prog">
        <button class="rapido-step" id="r-menos" aria-label="menos">−</button>
        <input class="input" id="r-cur" aria-label="Progresso atual" type="text" inputmode="numeric" value="${cur}">
        <span class="prog-sep">de ${tot || "?"}</span>
        <button class="rapido-step" id="r-mais" aria-label="mais">+</button>
      </div>
      <div class="prog-dica" style="text-align:center">${unidade}</div>
      <div class="ficha-rodape">
        <button class="btn-ghost" id="r-cancel">Cancelar</button>
        <button class="btn-primary" id="r-salvar">Salvar</button>
      </div>`;
    $("modal-rapido").hidden = false;
    const inp = $("r-cur");
    const ler = () => parseInt((inp.value || "").replace(/\D/g, "")) || 0;  // tolera ponto de milhar
    setTimeout(() => { inp.focus(); inp.select(); }, 40);
    const teto = ehDigital ? (it.pos_total || Infinity) : Infinity;
    $("r-mais").onclick = () => { inp.value = Math.min(teto, ler() + passo); };
    $("r-menos").onclick = () => { inp.value = Math.max(0, ler() - passo); };
    $("r-cancel").onclick = () => ($("modal-rapido").hidden = true);
    const salvar = async () => {
      const novoCur = ler();
      const novo = ehDigital
        ? await salvarPosicao(it, novoCur, it.pos_total)
        : ehLivro
        ? await salvarProgresso(it, novoCur, it.total_pages, 0, null)
        : await salvarProgresso(it, novoCur, it.total_chapters, it.current_volume || 0, it.total_volumes);
      $("modal-rapido").hidden = true;
      renderBiblioteca();
      toast("Progresso salvo");
      await checarConclusao(novo);
      renderBiblioteca();
    };
    $("r-salvar").onclick = salvar;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") salvar(); });
  }

  // #2 pop-up de conclusão — resolve(true/false)
  function perguntarConclusao(item) {
    return new Promise((resolve) => {
      const bg = $("modal-conclusao");
      $("toast").hidden = true;   // o aviso "Progresso salvo" cobriria os botões
      $("conclusao-txt").textContent = `Você chegou ao fim de "${item.title}".`;
      // a capa com a fita descendo até o pé: o marcador chegou à última página
      $("conclusao-capa").innerHTML = capaHTML(item, "capa") + `<span class="fita" style="--p:100"><i></i></span>`;
      bg.hidden = false;
      const fim = (v) => {
        bg.hidden = true;
        $("conclusao-sim").onclick = null;
        $("conclusao-nao").onclick = null;
        bg.onclick = null;
        resolve(v);
      };
      $("conclusao-sim").onclick = () => fim(true);
      $("conclusao-nao").onclick = () => fim(false);
      bg.onclick = (e) => { if (e.target === bg) fim(false); };
    });
  }

  // ===== PUSH (notificações) =====
  function urlBase64ToUint8Array(base64) {
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }

  // pede permissão, inscreve no push e salva a inscrição na nuvem.
  // retorna true se deu certo.
  async function assinarPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast("Este navegador não suporta push"); return false;
    }
    if (!window.VAPID_PUBLIC_KEY) {
      toast("Push ainda não configurado (falta a chave VAPID)"); return false;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Permissão de notificação negada"); return false; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY),
      });
    }
    await Store.salvarInscricaoPush(sub);
    return true;
  }

  // ===== BIOMETRIA (#8 — WebAuthn: Windows Hello / digital Android) =====
  let sessaoAtual = null;
  const bufToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const b64ToBuf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  async function bioSuportado() {
    if (!window.PublicKeyCredential) return false;
    try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
    catch { return false; }
  }

  async function ativarBiometria() {
    const u = (sessaoAtual && sessaoAtual.user) || { id: "estante-local", email: "" };
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "Estante" },
          user: {
            id: new TextEncoder().encode(u.id),
            name: u.email || "usuario",
            displayName: u.email || "Você",
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        },
      });
      localStorage.setItem("bioCredId", bufToB64(cred.rawId));
      localStorage.setItem("bioOn", "1");
      atualizarBotaoBio();
      toast("Bloqueio biométrico ativado");
    } catch {
      toast("Não deu pra ativar a biometria agora.");
    }
  }

  function desativarBiometria() {
    localStorage.removeItem("bioOn");
    localStorage.removeItem("bioCredId");
    atualizarBotaoBio();
    toast("Bloqueio biométrico desativado");
  }

  async function desbloquear() {
    $("lock-erro").textContent = "";
    const id = localStorage.getItem("bioCredId");
    if (!id) { $("tela-lock").hidden = true; await mostrarApp(); return; }
    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: "public-key", id: b64ToBuf(id) }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      $("tela-lock").hidden = true;
      await mostrarApp();
    } catch {
      $("lock-erro").textContent = "Não reconheci a biometria. Tente de novo.";
    }
  }

  async function atualizarBotaoBio() {
    const btn = $("btn-bio");
    if (!(await bioSuportado())) { btn.hidden = true; return; }
    btn.hidden = false;
    const ligado = localStorage.getItem("bioOn") === "1";
    btn.innerHTML = ico(ligado ? "lock" : "unlock", 18);
    btn.title = ligado ? "Bloqueio biométrico ativo (clique p/ desativar)" : "Ativar bloqueio biométrico";
  }

  // capas da Open Library por ISBN devolvem imagem em BRANCO quando não existem;
  // ?default=false faz virar 404 → aí o onerror mostra o ícone de reserva.
  function capaURL(u) {
    if (u && u.includes("covers.openlibrary.org/b/isbn/") && !u.includes("default=false")) {
      return u + (u.includes("?") ? "&" : "?") + "default=false";
    }
    return u;
  }

  // sem capa (ou capa quebrada): capa tipográfica com título e autor; sem título, o ícone do tipo
  function capaHTML(item, cls) {
    const fb = item.title
      ? `<div class="${cls} fb fb-tipo"><span class="fb-tit">${esc(item.title)}</span><span class="fb-aut">${esc(item.authors || "")}</span></div>`
      : `<div class="${cls} fb">${ico(KIND_ICON[item.kind] || "book", 30)}</div>`;
    if (!item.cover_url) return fb;
    return `<img class="${cls}" src="${esc(capaURL(item.cover_url))}" alt="" loading="lazy" data-fb="${esc(fb)}" onerror="capaFalhou(this)">`;
  }
  // o HTML do fallback já vem escapado no data-fb (o navegador desfaz só a camada do atributo)
  window.capaFalhou = (img) => { img.outerHTML = img.dataset.fb; };

  // progresso 0..1 conforme a categoria
  // livro acompanhado por "posição" do Kindle (ou % legado) em vez de página
  const ehLivroDigital = (i) => i.kind === "livro" && i.pos_total != null;

  function progresso(item) {
    if (item.kind === "livro") {
      if (item.pos_total) return Math.min(1, (item.pos_atual || 0) / item.pos_total);  // posição Kindle
      if (item.total_pages) return Math.min(1, (item.current_page || 0) / item.total_pages);
    } else {
      if (item.total_chapters) return Math.min(1, (item.current_chapter || 0) / item.total_chapters);
      if (item.total_volumes) return Math.min(1, (item.current_volume || 0) / item.total_volumes);
    }
    return item.status === "lido" ? 1 : 0;
  }

  // tem um total definido? (só aí a % faz sentido)
  // mangá que ainda recebe capítulos: 100% = "em dia", não "terminou"
  const aindaSaindo = (i) => i.kind === "manga" && ["releasing", "hiatus"].includes((statusObra(i.release_status) || {}).cls);
  // linha entre o autor e o progresso: situação de lançamento do mangá
  const lancHTML = (i) => {
    const so = i.kind === "manga" && statusObra(i.release_status);
    return so ? `<div class="card-lanc ${so.cls}"><i></i>${so.label}</div>` : "";
  };

  // preenche a situação de lançamento dos mangás que ainda não têm (1x por sessão)
  const lancConsultados = new Set();
  async function completarLancamento(itens) {
    const faltam = itens.filter((i) => i.kind === "manga" && !i.release_status && !lancConsultados.has(i.id)).slice(0, 8);
    if (!faltam.length) return;
    let mudou = false;
    for (const i of faltam) {
      lancConsultados.add(i.id);
      const info = await APIs.capitulosLancados(i.title, i.mangabaka_id);
      if (!info.release_status) continue;
      try {
        await Store.update(i.id, { release_status: info.release_status, ...(info.mangabaka_id && { mangabaka_id: info.mangabaka_id }) });
        mudou = true;
      } catch { /* coluna ainda não existe (migration_v9 não rodada): tenta na próxima sessão */ }
    }
    if (mudou && ui.kind === "manga") renderBiblioteca();
  }

  function temTotal(item) {
    return item.kind === "livro" ? (!!item.pos_total || !!item.total_pages)
      : !!(item.total_chapters || item.total_volumes);
  }

  // texto curto de progresso p/ o card: "cap. 73/74" | "pág. 300/1200" | "cap. 73"
  function progressoTexto(item) {
    if (item.kind === "livro") {
      if (item.total_pages) return `pág. ${item.current_page || 0}/${item.total_pages}`;
      if (item.current_page) return `pág. ${item.current_page}`;
      return "";
    }
    if (item.total_chapters) return `cap. ${item.current_chapter || 0}/${item.total_chapters}`;
    if (item.current_chapter) return `cap. ${item.current_chapter}`;
    if (item.total_volumes) return `vol. ${item.current_volume || 0}/${item.total_volumes}`;
    if (item.current_volume) return `vol. ${item.current_volume}`;
    return "";
  }

  // popula os selects de filtro avançado (gênero, ano de leitura, autor)
  function popularFiltrosAvancados(itens) {
    const generos = [...new Set(itens.flatMap((i) => i.genres || []).filter(Boolean))].sort();
    // ano de leitura = ano em que começou OU concluiu (pega livros em andamento também)
    const anos = [...new Set(itens.flatMap((i) =>
      [(i.started_at || "").slice(0, 4), (i.finished_at || "").slice(0, 4)]).filter(Boolean))].sort().reverse();
    const autores = [...new Set(itens.map((i) => i.authors).filter(Boolean))].sort();
    const pop = (id, valores, rotulo, atual) => {
      const sel = $(id);
      sel.innerHTML = `<option value="">${rotulo}</option>` +
        valores.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
      sel.value = atual || "";
    };
    pop("fa-genero", generos, "Gênero: todos", ui.adv.genero);
    pop("fa-ano", anos, "Ano de leitura: todos", ui.adv.ano);
    pop("fa-autor", autores, "Autor: todos", ui.adv.autor);
    $("fa-formato").value = ui.adv.formato || "";
    // coleções: usa id como value e nome como rótulo
    const selC = $("fa-colecao");
    selC.innerHTML = `<option value="">Coleção: todas</option>` +
      colecoesCache.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    selC.value = ui.adv.colecao || "";
  }

  // ============================================================
  //  RENDER DA BIBLIOTECA
  // ============================================================
  // estado "selecionado" também pra leitor de tela (abas, grade/lista, menu inferior)
  function ariaAtivo() {
    document.querySelectorAll("#tabs .tab, #view-toggle .vt").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.classList.contains("is-active"))));
    document.querySelectorAll("#bottom-nav .bn-item").forEach((b) =>
      b.classList.contains("is-active") ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  }

  async function renderBiblioteca() {
    ariaAtivo();
    const wrap = $("biblioteca");
    let itens = await Store.list(ui.kind);
    if (ui.kind === "manga") completarLancamento(itens);   // em segundo plano

    // alimenta o banco de gêneros conhecidos (pras sugestões do editor)
    itens.forEach((i) => (i.genres || []).forEach((g) => g && generosConhecidos.add(g)));

    // coleções (pro badge e filtro)
    try { colecoesCache = await Store.listCollections(); } catch { colecoesCache = []; }
    const nomeColecao = (cid) => { const c = colecoesCache.find((x) => x.id === cid); return c ? c.name : ""; };

    // popula os selects dos filtros avançados a partir da lista completa (antes de filtrar)
    popularFiltrosAvancados(itens);

    if (ui.status !== "todos") itens = itens.filter((i) => i.status === ui.status);
    if (ui.filtro) {
      const f = ui.filtro.toLowerCase();
      itens = itens.filter((i) =>
        i.title.toLowerCase().includes(f) ||
        (i.authors || "").toLowerCase().includes(f) ||
        (i.collection_id && nomeColecao(i.collection_id).toLowerCase().includes(f)) ||
        (i.genres || []).some((g) => g.toLowerCase().includes(f)));
    }
    // #10 filtros avançados
    if (ui.adv.genero) itens = itens.filter((i) => (i.genres || []).includes(ui.adv.genero));
    if (ui.adv.formato) itens = itens.filter((i) => i.format === ui.adv.formato);
    if (ui.adv.ano) itens = itens.filter((i) =>
      (i.started_at || "").slice(0, 4) === ui.adv.ano || (i.finished_at || "").slice(0, 4) === ui.adv.ano);
    if (ui.adv.autor) itens = itens.filter((i) => (i.authors || "") === ui.adv.autor);
    if (ui.adv.colecao) itens = itens.filter((i) => i.collection_id === ui.adv.colecao);

    // ordenação
    itens.sort(ORDENADORES[ui.ordem] || ORDENADORES.recentes);
    // fila "Próxima leitura": no Quero ler, quem já tem lugar na fila vem antes, na ordem da fila
    // (sort estável: o resto mantém a ordenação escolhida)
    const naFila = ui.status === "quero_ler";
    if (naFila) itens.sort((a, b) => (a.fila_ordem ?? 1e9) - (b.fila_ordem ?? 1e9));
    const podeOrdenar = naFila && !ui.filtro && !Object.values(ui.adv).some(Boolean) && itens.length > 1;

    // status sobre a capa só faz sentido quando o filtro mistura status ("Todos")
    wrap.className = "biblioteca " + ui.view + (ui.status === "todos" ? " mostra-status" : "");
    $("vazio").hidden = itens.length > 0;
    if (!itens.length) {   // estado vazio diz o que fazer, conforme o filtro
      const filtrando = ui.filtro || Object.values(ui.adv).some(Boolean);
      const [t, sub] = filtrando ? ["Nada encontrado", "Tente outro termo ou limpe os filtros."]
        : {
          todos: [`Nenhum ${KIND[ui.kind].label.toLowerCase()} por aqui ainda`, "Toque em + para buscar e cadastrar o primeiro."],
          lendo: ["Nada em leitura agora", "Comece algo da sua fila em Quero ler, ou toque em + para adicionar."],
          quero_ler: ["Sua fila está vazia", "Toque em + e marque como Quero ler para montar a fila."],
          lido: ["Nenhuma leitura concluída ainda", "Quando terminar algo, ele aparece aqui."],
          pausado: ["Nada pausado", "Leituras que você pausar ficam guardadas aqui."],
          abandonado: ["Nada abandonado", "Obras que você largar ficam aqui, sem culpa."],
        }[ui.status];
      $("vazio-titulo").textContent = t;
      $("vazio-sub").textContent = sub;
    }
    // sussurro sob o nome do app: "4 mangás em leitura"
    { const nomes = { livro: ["livro", "livros"], quadrinho: ["quadrinho", "quadrinhos"], manga: ["mangá", "mangás"] };
      const suf = { todos: "na estante", lendo: "em leitura", quero_ler: "na fila", lido: "lido", pausado: "pausado", abandonado: "abandonado" }[ui.status] || "";
      const k = itens.length;
      $("brand-sus").textContent = `${k} ${nomes[ui.kind][k === 1 ? 0 : 1]} ${k !== 1 && suf.endsWith("o") ? suf + "s" : suf}`; }

    wrap.innerHTML = itens.map((i, idx) => {
      // leitura mais recente ganha destaque (grade, filtro "Lendo", sem busca)
      const proxima = idx === 0 && ui.view === "grid" && naFila && !ui.filtro;
      const destaque = proxima || (idx === 0 && ui.view === "grid" && ui.status === "lendo" && !ui.filtro && temTotal(i));
      const filaCtl = podeOrdenar ? `<span class="fila-ctl">
          <button type="button" data-mover="-1" aria-label="Subir na fila" title="Subir na fila"${idx === 0 ? " disabled" : ""}>${ico("arrowup", 16)}</button>
          <button type="button" data-mover="1" aria-label="Descer na fila" title="Descer na fila"${idx === itens.length - 1 ? " disabled" : ""}>${ico("arrowdown", 16)}</button>
        </span>` : "";
      const st = STATUS[i.status];
      const pct = Math.round(progresso(i) * 100);
      const cheias = Math.round(clampNota(i.rating) || 0);
      const estrelas = cheias ? notaHTML(cheias, 12) : "";
      const ehDigital = ehLivroDigital(i);   // livro por posição (Kindle) / % legado
      const progTxt = ehDigital ? "" : progressoTexto(i);
      const pctTxt = temTotal(i) ? `<span class="prog-pctinline">${pct}%</span>` : "";
      const progHTML = ehDigital
        ? (temTotal(i) ? `<div class="card-prog"><span class="prog-pctinline">${pct}% lido</span></div>` : "")
        : (progTxt ? `<div class="card-prog">${progTxt}${pctTxt ? " · " + pctTxt : ""}</div>` : "");
      // versão inline pro modo lista (digital mostra "% lido"; o resto, "pág/cap X/Y · %")
      const listProg = ehDigital
        ? (temTotal(i) ? `<span class="list-prog"><span class="prog-pctinline">${pct}% lido</span></span>` : "")
        : (progTxt ? `<span class="list-prog">${progTxt}${pctTxt ? " · " + pctTxt : ""}</span>` : "");
      const fmtBadge = i.format
        ? `<span class="fmt-badge">${ico(i.format === "fisico" ? "bookopen" : "phone", 13)} ${i.format === "fisico" ? "Físico" : "Digital"}</span>` : "";
      const colNome = i.collection_id ? nomeColecao(i.collection_id) : "";
      const colBadge = colNome ? `<span class="col-badge">${ico("layers", 13)} ${esc(colNome)}</span>` : "";

      if (ui.view === "list") {
        return `<div class="card" data-id="${i.id}">
          <div class="capa-wrap">${capaHTML(i, "capa")}${temTotal(i) ? `<span class="fita" style="--p:${pct}"><i></i></span>` : ""}</div>
          <div class="card-info">
            <button type="button" class="card-abrir"><span class="card-titulo">${esc(i.title)}</span></button>
            <div class="card-autor">${esc(i.authors) || "—"}</div>
            ${lancHTML(i)}
            <div class="list-meta">
              <span class="list-badge"><i style="background:${st.cor}"></i>${st.label}</span>
              ${listProg}
              ${fmtBadge}
              ${colBadge}
              ${estrelas ? `<span class="card-rating">${estrelas}</span>` : ""}
            </div>
          </div>
          ${filaCtl}
        </div>`;
      }
      return `<div class="card${destaque ? " destaque" : ""}" data-id="${i.id}">
        <div class="capa-wrap">
          ${capaHTML(i, "capa")}
          <span class="badge-status"><i style="background:${st.cor}"></i>${st.label}</span>
          ${temTotal(i) ? `<span class="fita" style="--p:${pct}"><i></i></span>` : ""}
        </div>
        <div class="card-info">
          ${proxima ? `<div class="proxima-rot">Próxima leitura</div>` : ""}
          <button type="button" class="card-abrir"><span class="card-titulo">${esc(i.title)}</span></button>
          <div class="card-autor">${esc(i.authors) || "—"}</div>
          ${lancHTML(i)}
          ${proxima ? `<button type="button" class="btn-primary btn-comecar" data-comecar>Começar a ler</button>`
            : destaque ? (pct ? `<div class="destaque-n">${pct}%<small>lido</small></div>${progTxt ? `<div class="card-prog">${progTxt}</div>` : ""}`
              : `<div class="destaque-inicio">Ainda não começou</div>`) : progHTML}
          <div class="card-baixo">${fmtBadge}${colBadge}${estrelas ? `<span class="card-rating">${estrelas}</span>` : ""}${filaCtl}</div>
        </div>
      </div>`;
    }).join("");

    wrap.querySelectorAll(".card").forEach((c) => {
      const cid = c.dataset.id;
      let lpTimer = null, lpFired = false;
      // clique normal → ficha (mas ignora o clique-fantasma após long-press)
      c.addEventListener("click", (e) => {
        if (lpFired) { lpFired = false; e.preventDefault(); return; }
        abrirFicha(cid);
      });
      // #5 desktop: botão direito → progresso rápido
      c.addEventListener("contextmenu", (e) => { e.preventDefault(); abrirRapido(cid); });
      // #5 mobile: pressionar e segurar → progresso rápido
      c.addEventListener("touchstart", () => {
        lpFired = false;
        lpTimer = setTimeout(() => { lpFired = true; abrirRapido(cid); }, 500);
      }, { passive: true });
      const cancelaLP = () => clearTimeout(lpTimer);
      c.addEventListener("touchmove", cancelaLP, { passive: true });
      c.addEventListener("touchend", cancelaLP);
      c.addEventListener("touchcancel", cancelaLP);
    });

    // fila: ↑/↓ e "Começar a ler" (não abrem a ficha)
    wrap.querySelectorAll("[data-mover]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      moverNaFila(itens, b.closest(".card").dataset.id, Number(b.dataset.mover));
    }));
    wrap.querySelectorAll("[data-comecar]").forEach((b) => b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const it = itens.find((x) => x.id === b.closest(".card").dataset.id);
      await Store.update(it.id, { status: "lendo", started_at: it.started_at || hojeISO(), fila_ordem: null });
      toast(`Boa leitura: ${it.title}`);
      renderBiblioteca();
    }));
  }

  // troca o item de lugar com o vizinho e grava só quem mudou de posição
  // (na primeira vez a fila inteira ganha número; depois são 2 escritas)
  async function moverNaFila(lista, id, dir) {
    const ordem = lista.map((i) => i.id);
    const de = ordem.indexOf(id), para = de + dir;
    if (de < 0 || para < 0 || para >= ordem.length) return;
    [ordem[de], ordem[para]] = [ordem[para], ordem[de]];
    const muda = lista.filter((i) => i.fila_ordem !== ordem.indexOf(i.id));
    await Promise.all(muda.map((i) => Store.update(i.id, { fila_ordem: ordem.indexOf(i.id) })));
    renderBiblioteca();
  }

  // ============================================================
  //  MODAL ADICIONAR (busca externa)
  // ============================================================
  function abrirAdd() {
    fecharModais();
    $("add-input").value = "";
    $("add-resultados").innerHTML = "";
    $("add-titulo").textContent = "Adicionar — " + KIND[ui.kind].label;
    $("add-hint").textContent = ui.kind === "manga"
      ? "Buscando na MangaBaka."
      : "Edições em português primeiro. Dica: cole um ISBN (10 ou 13 dígitos) pra busca exata.";
    $("add-input").placeholder = ui.kind === "manga"
      ? "Buscar mangá por título…"
      : "Título, autor ou ISBN…";
    $("modal-add").hidden = false;
    setTimeout(() => $("add-input").focus(), 50);
  }

  async function fazerBusca() {
    const termo = $("add-input").value.trim();
    if (!termo) return;
    const box = $("add-resultados");
    box.innerHTML = `<div class="spinner">Buscando “${esc(termo)}”…</div>`;
    try {
      const res = await APIs.buscar(ui.kind, termo);
      if (!res.length) { box.innerHTML = `<div class="spinner">Nada encontrado. Tente outro termo ou cadastre manualmente.</div>`; return; }
      box.innerHTML = "";
      res.forEach((r) => {
        const div = document.createElement("div");
        div.className = "res-item";
        const capa = r.cover_url
          ? `<img class="res-capa" src="${esc(capaURL(r.cover_url))}" alt="" loading="lazy"
               onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'res-capa fb',innerHTML:'${ico(KIND_ICON[ui.kind], 22).replace(/"/g, "&quot;")}'}))">`
          : `<div class="res-capa fb">${ico(KIND_ICON[ui.kind], 22)}</div>`;
        const meta = r.total_pages ? `${r.total_pages} págs`
          : r.total_chapters ? `${r.total_chapters} caps`
          : r.total_volumes ? `${r.total_volumes} vols` : "";
        const st = statusObra(r.release_status);
        const badge = st ? `<span class="obra-status ${st.cls}">${st.label}</span>` : "";
        div.innerHTML = `${capa}
          <div class="res-corpo">
            <div class="res-titulo">${esc(r.title)}</div>
            <div class="res-sub">${esc(r.authors) || "Autor desconhecido"}${meta ? " · " + meta : ""}${r.ano ? " · edição de " + r.ano : ""}</div>
            ${badge}
          </div>
          <button class="btn-primary res-add">Adicionar</button>`;

        // grava o item com o status escolhido (lendo / quero ler / concluído)
        async function adicionarCom(status, pick, chip) {
          const orig = chip.textContent;
          const item = { ...r, kind: ui.kind, status };
          // datas automáticas conforme o status (mesma convenção do resto do app)
          if (status === "lendo") item.started_at = item.started_at || hojeISO();
          if (status === "lido") { item.finished_at = item.finished_at || hojeISO(); item.started_at = item.started_at || hojeISO(); }
          pick.querySelectorAll("button").forEach((b) => (b.disabled = true));
          chip.textContent = "…";
          try {
            // mangá em andamento sem total? descobre os capítulos lançados na MangaBaka
            if (ui.kind === "manga" && !item.total_chapters) {
              const info = await APIs.capitulosLancados(item.title, item.mangabaka_id);
              if (info.ultimo) item.total_chapters = info.ultimo;
              if (info.mangabaka_id) item.mangabaka_id = info.mangabaka_id;
              if (info.release_status && !item.release_status) item.release_status = info.release_status;
            }
            await Store.add(item);
            $("modal-add").hidden = true;
            // mostra o item recém-criado na visão certa (evita "sumir" na aba Lendo)
            ui.status = status; marcarStatus(); salvarNav();
            toast(item.total_chapters ? `Adicionado à estante: ${plural(item.total_chapters, "capítulo lançado", "capítulos lançados")}` : "Adicionado à estante");
            renderBiblioteca();
          } catch (err) {
            console.warn("Falha ao adicionar:", err);
            pick.querySelectorAll("button").forEach((b) => (b.disabled = false));
            chip.textContent = orig;
            toast("Não consegui salvar. Tente de novo.");
          }
        }

        div.querySelector(".res-add").addEventListener("click", (ev) => {
          const btn = ev.currentTarget;
          const pick = document.createElement("div");
          pick.className = "res-status-pick";
          pick.innerHTML =
            `<button data-st="lendo">Lendo</button>` +
            `<button data-st="quero_ler">Quero ler</button>` +
            `<button data-st="lido">Concluído</button>`;
          btn.replaceWith(pick);
          pick.querySelectorAll("button").forEach((chip) =>
            chip.addEventListener("click", () => adicionarCom(chip.dataset.st, pick, chip)));
        });
        box.appendChild(div);
      });
    } catch (e) {
      box.innerHTML = `<div class="spinner">Erro na busca (${esc(e.message)}). Você ainda pode cadastrar manualmente.</div>`;
    }
  }

  // ============================================================
  //  IMPORTAR LISTA (ex.: Skoob)
  // ============================================================
  function abrirImport() {
    fecharModais();
    $("import-status").textContent = "";
    $("modal-import").hidden = false;
  }

  // busca a capa (e gêneros) por ISBN; se não achar, tenta por título+autor
  async function capaPorLivro(isbn, titulo, autor) {
    const limpo = (isbn || "").replace(/[^0-9Xx]/g, "");
    if (limpo.length === 10 || limpo.length === 13) {
      try { const r = await APIs.buscarISBN(limpo); if (r[0] && r[0].cover_url) return r[0]; } catch {}
    }
    try { const r = await APIs.buscar("livro", `${titulo} ${autor || ""}`.trim()); if (r[0]) return r[0]; } catch {}
    return null;
  }

  async function importarLista() {
    const linhas = $("import-texto").value.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!linhas.length) { toast("Cole a lista primeiro"); return; }
    const btn = $("import-run"); btn.disabled = true;
    const st = $("import-status");
    let add = 0, pulados = 0, erros = 0;
    try {
      const existentes = new Set((await Store.list()).map((i) => (i.title || "").toLowerCase().trim()));
      for (let n = 0; n < linhas.length; n++) {
        const p = linhas[n].split("|").map((x) => x.trim());
        const [isbn, titulo, autor, pgs, nota, inicio, fim] = p;
        if (!titulo) continue;
        st.textContent = `Processando ${n + 1}/${linhas.length}: ${titulo}…`;
        if (existentes.has(titulo.toLowerCase().trim())) { pulados++; continue; }
        try {
          const info = await capaPorLivro(isbn, titulo, autor);
          const totalPg = parseInt(pgs) || (info && info.total_pages) || null;
          await Store.add({
            kind: "livro", status: "lido",
            title: titulo,
            authors: autor || (info && info.authors) || "",
            cover_url: (info && info.cover_url) || "",
            genres: (info && info.genres) || [],
            total_pages: totalPg,
            current_page: totalPg || 0,
            rating: clampNota(nota ? parseFloat(String(nota).replace(",", ".")) : null),
            started_at: inicio || null,
            finished_at: fim || inicio || null,
            source: "manual",
          });
          existentes.add(titulo.toLowerCase().trim());
          add++;
        } catch (e) {
          erros++;
          console.warn("Import falhou em:", titulo, e);
        }
        await new Promise((r) => setTimeout(r, 250));   // gentil com as APIs
      }
      st.textContent = `Pronto! ${add} adicionado(s), ${pulados} já existia(m)${erros ? `, ${erros} com erro` : ""}.`;
      toast(`Importado: ${plural(add, "livro", "livros")}`);
    } catch (e) {
      st.textContent = "Erro ao importar. Verifique a conexão e tente de novo.";
    } finally {
      btn.disabled = false;
      renderBiblioteca();
    }
  }

  // ============================================================
  //  BACKUP (exportar / restaurar)
  // ============================================================
  function baixarArquivo(nome, texto, tipo = "application/json") {
    const blob = new Blob([texto], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportarDados() {
    try {
      $("restore-status").textContent = "Gerando backup…";
      const [items, collections, sessions, goals] = await Promise.all([
        Store.list(), Store.listCollections(), Store.listAllSessions(100000), Store.listGoals(),
      ]);
      const sess = sessions.map(({ item, ...s }) => s);   // tira o join de item
      const dados = {
        versao: "estante-backup-1",
        exportado_em: new Date().toISOString(),
        items, collections, sessions: sess, goals,
      };
      baixarArquivo(`estante-backup-${hojeISO()}.json`, JSON.stringify(dados, null, 2));
      $("restore-status").textContent = `Backup gerado: ${items.length} livro(s).`;
      toast("Backup exportado");
    } catch (e) {
      $("restore-status").textContent = "Não deu pra exportar agora.";
    }
  }

  async function restaurarBackup(file) {
    const st = $("restore-status");
    let dados;
    try { dados = JSON.parse(await file.text()); }
    catch { st.textContent = "Arquivo inválido (não é um JSON)."; return; }
    if (!dados || !Array.isArray(dados.items)) { st.textContent = "Backup sem livros — arquivo não reconhecido."; return; }
    try {
      // 1) coleções: cria as que faltam (por nome) e mapeia id antigo → novo
      const colAtuais = await Store.listCollections();
      const porNome = new Map(colAtuais.map((c) => [(c.name || "").toLowerCase(), c.id]));
      const mapaCol = new Map();
      for (const c of (dados.collections || [])) {
        let novoId = porNome.get((c.name || "").toLowerCase());
        if (!novoId && c.name) { const nova = await Store.addCollection(c.name, c.kind); novoId = nova.id; porNome.set(c.name.toLowerCase(), novoId); }
        if (c.id && novoId) mapaCol.set(c.id, novoId);
      }
      // 2) livros: pula os que já existem (por título), remapeia a coleção
      const existentes = new Set((await Store.list()).map((i) => (i.title || "").toLowerCase().trim()));
      let add = 0, pulados = 0;
      for (const it of dados.items) {
        const chave = (it.title || "").toLowerCase().trim();
        if (!chave || existentes.has(chave)) { pulados++; continue; }
        const { id, user_id, created_at, updated_at, ...campos } = it;
        campos.collection_id = it.collection_id ? (mapaCol.get(it.collection_id) || null) : null;
        try { await Store.add(campos); existentes.add(chave); add++; }
        catch { /* item problemático → pula */ }
        st.textContent = `Restaurando… ${add} adicionado(s)`;
      }
      // 3) metas
      for (const g of (dados.goals || [])) { if (g && g.year && g.target) { try { await Store.setGoal(g.year, g.target); } catch {} } }
      st.textContent = `Restaurado: ${add} livro(s), ${pulados} já existia(m). (histórico de sessões não é restaurado)`;
      toast(`Restaurado: ${plural(add, "título", "títulos")}`);
      renderBiblioteca();
    } catch (e) {
      st.textContent = "Erro ao restaurar. Verifique a conexão e tente de novo.";
    }
  }

  // ============================================================
  //  MODAL CADASTRO MANUAL
  // ============================================================
  // usado como CADASTRO (existente = null) e como EDIÇÃO (existente = item)
  function abrirManual(existente) {
    fecharModais();
    const ed = existente || null;
    const k = ed ? ed.kind : ui.kind;
    const val = (v) => (v == null ? "" : String(v));
    const progFields = k === "livro"
      ? `<label class="campo">Total de páginas</label>
         <input class="input" id="m-pages" type="number" inputmode="numeric" placeholder="ex.: 320" value="${ed ? val(ed.total_pages) : ""}">
         <label class="campo">ISBN da sua edição (opcional: traz a capa exata)</label>
         <input class="input" id="m-isbn" inputmode="numeric" placeholder="ex.: 9788595084742" value="${ed ? esc(ed.isbn || "") : ""}">`
      : `<label class="campo">Total de capítulos</label>
         <input class="input" id="m-chaps" type="number" inputmode="numeric" placeholder="ex.: 120" value="${ed ? val(ed.total_chapters) : ""}">
         <label class="campo">Total de volumes</label>
         <input class="input" id="m-vols" type="number" inputmode="numeric" placeholder="ex.: 24" value="${ed ? val(ed.total_volumes) : ""}">`;

    $("manual-titulo").textContent = ed ? "Editar item" : "Cadastro manual";
    $("manual-corpo").innerHTML = `
      <label class="campo">Título *</label>
      <input class="input" id="m-title" placeholder="Título" value="${ed ? esc(ed.title) : ""}">
      <label class="campo">Autor(es) / Artista</label>
      <input class="input" id="m-authors" placeholder="Nome" value="${ed ? esc(ed.authors) : ""}">
      <label class="campo">Status</label>
      <select class="input" id="m-status">
        ${Object.entries(STATUS).map(([sk, v]) => `<option value="${sk}" ${ed && ed.status === sk ? "selected" : ""}>${v.label}</option>`).join("")}
      </select>
      ${progFields}
      <label class="campo">Formato</label>
      <select class="input" id="m-format">
        <option value="" ${ed && !ed.format ? "selected" : ""}>— Não definido</option>
        <option value="fisico" ${ed && ed.format === "fisico" ? "selected" : ""}>Físico</option>
        <option value="digital" ${ed && ed.format === "digital" ? "selected" : ""}>Digital</option>
      </select>
      <div class="datas-linha">
        <label class="campo-inline">Data de início
          <input class="input input-data" id="m-inicio" type="date" value="${ed ? val(ed.started_at) : ""}">
        </label>
        <label class="campo-inline">Data de conclusão
          <input class="input input-data" id="m-fim" type="date" value="${ed ? val(ed.finished_at) : ""}">
        </label>
      </div>
      <label class="campo">Categorias / Gêneros</label>
      <div class="tags-box" id="m-genres-box"></div>
      <input class="input" id="m-genres-input" placeholder="Digite um gênero e Enter…" autocomplete="off">
      <div class="tags-sug" id="m-genres-sug"></div>
      <label class="campo">Capa</label>
      <input class="input" id="m-cover" placeholder="Cole uma URL ou use 'Buscar capas'" value="${ed ? esc(ed.cover_url) : ""}">
      <div class="capa-acoes">
        <img id="m-capa-preview" class="edit-capa-preview" alt="" src="${ed && ed.cover_url ? esc(capaURL(ed.cover_url)) : ""}" ${ed && ed.cover_url ? "" : "hidden"} onerror="this.hidden=true">
        <button class="btn-ghost ico-btn" id="m-buscar-capa" type="button">${ico("refresh", 14)} Buscar capas</button>
      </div>
      <div class="capas-grid" id="m-capas"></div>
      <label class="campo">Sinopse</label>
      <textarea class="input" id="m-syn" placeholder="Resumo…">${ed ? esc(ed.synopsis) : ""}</textarea>
      <div class="ficha-rodape">
        <button class="btn-ghost" id="m-cancel">Cancelar</button>
        <button class="btn-primary" id="m-salvar">${ed ? "Salvar alterações" : "Salvar na estante"}</button>
      </div>`;
    $("modal-manual").hidden = false;

    // ----- editor de gêneros (tags clicáveis) -----
    const generos = ed ? [...(ed.genres || [])] : [];
    const boxG = $("m-genres-box"), inputG = $("m-genres-input"), sugG = $("m-genres-sug");
    const temG = (g) => generos.some((x) => x.toLowerCase() === g.toLowerCase());
    const addG = (g) => { g = (g || "").trim(); if (g && !temG(g)) { generos.push(g); generosConhecidos.add(g); renderG(); } };
    const rmG = (g) => { const i = generos.indexOf(g); if (i >= 0) generos.splice(i, 1); renderG(); };
    function renderG() {
      boxG.innerHTML = generos.length
        ? generos.map((g) => `<span class="tag-chip">${esc(g)}<button type="button" class="tag-remove" data-g="${esc(g)}">×</button></span>`).join("")
        : `<span class="tags-vazio">Nenhum gênero ainda</span>`;
      boxG.querySelectorAll(".tag-remove").forEach((b) => (b.onclick = () => rmG(b.dataset.g)));
      const sug = [...new Set([...(GENEROS_COMUNS[k] || []), ...generosConhecidos])].filter((g) => !temG(g)).slice(0, 18);
      sugG.innerHTML = sug.map((g) => `<button type="button" class="tag-sug" data-g="${esc(g)}">+ ${esc(g)}</button>`).join("");
      sugG.querySelectorAll(".tag-sug").forEach((b) => (b.onclick = () => addG(b.dataset.g)));
    }
    inputG.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addG(inputG.value); inputG.value = ""; }
    });
    inputG.addEventListener("blur", () => { if (inputG.value.trim()) { addG(inputG.value); inputG.value = ""; } });
    renderG();

    // ----- capa: preview ao digitar + buscar opções em todas as APIs (#5) -----
    const inpCover = $("m-cover"), prevCover = $("m-capa-preview");
    inpCover.addEventListener("input", () => {
      const u = inpCover.value.trim();
      if (u) { prevCover.src = capaURL(u); prevCover.hidden = false; } else { prevCover.hidden = true; }
    });
    $("m-buscar-capa").addEventListener("click", async () => {
      const titulo = $("m-title").value.trim();
      if (!titulo) { toast("Preencha o título primeiro"); return; }
      const grid = $("m-capas"), btnC = $("m-buscar-capa");
      btnC.disabled = true;
      grid.innerHTML = `<div class="spinner">Buscando capas…</div>`;
      try {
        const isbnInformado = $("m-isbn") ? $("m-isbn").value.trim() : "";
        const capas = await APIs.buscarCapas(k, `${titulo} ${$("m-authors").value.trim()}`.trim(), isbnInformado);
        if (!capas.length) { grid.innerHTML = `<div class="spinner">Nenhuma capa encontrada. Cole uma URL acima.</div>`; return; }
        grid.innerHTML = capas.map((u) => `<img class="capa-op" src="${esc(u)}" alt="" loading="lazy" data-u="${esc(u)}" onerror="this.remove()">`).join("");
        grid.querySelectorAll(".capa-op").forEach((img) => img.addEventListener("click", () => {
          inpCover.value = img.dataset.u;
          prevCover.src = capaURL(img.dataset.u); prevCover.hidden = false;
          grid.querySelectorAll(".capa-op").forEach((x) => x.classList.remove("sel"));
          img.classList.add("sel");
        }));
      } catch { grid.innerHTML = `<div class="spinner">Erro ao buscar. Cole uma URL acima.</div>`; }
      finally { btnC.disabled = false; }
    });

    $("m-cancel").onclick = () => {
      $("modal-manual").hidden = true;
      if (ed) abrirFicha(ed.id);           // volta pra ficha ao cancelar edição
    };
    $("m-salvar").onclick = async () => {
      const title = $("m-title").value.trim();
      if (!title) { toast("Dê um título ao item"); return; }
      const dados = {
        title,
        authors: $("m-authors").value.trim(),
        status: $("m-status").value,
        cover_url: $("m-cover").value.trim(),
        synopsis: $("m-syn").value.trim(),
        genres: generos,
        format: $("m-format").value || null,
        started_at: $("m-inicio").value || null,
        finished_at: $("m-fim").value || null,
        total_pages: k === "livro" ? (parseInt($("m-pages").value) || null) : null,
        total_chapters: k !== "livro" ? (parseInt($("m-chaps").value) || null) : null,
        total_volumes: k !== "livro" ? (parseInt($("m-vols").value) || null) : null,
      };
      const isbnNovo = $("m-isbn") ? $("m-isbn").value.replace(/[-\s]/g, "") : "";
      if (isbnNovo) dados.isbn = isbnNovo;
      $("modal-manual").hidden = true;
      if (ed) {
        await Store.update(ed.id, dados);
        toast("Alterações salvas");
        renderBiblioteca();
        abrirFicha(ed.id);
      } else {
        await Store.add({ kind: k, source: "manual", ...dados });
        toast("Adicionado à estante");
        renderBiblioteca();
      }
    };
  }

  // ============================================================
  //  FICHA DO ITEM
  // ============================================================
  async function abrirFicha(id) {
    const it = await Store.get(id);
    if (!it) return;
    fecharModais();
    const corpo = $("ficha-corpo");
    const colecoes = await Store.listCollections().catch(() => []);

    const statusOps = Object.entries(STATUS).map(([k, v]) =>
      `<button class="status-op ico-btn ${it.status === k ? "is-active" : ""}"
        data-status="${k}"><i class="st-ponto" style="background:${v.cor}"></i>${v.label}</button>`
    ).join("");

    // bloco de progresso conforme categoria
    let progBloco;
    if (it.kind === "livro") {
      if (ehLivroDigital(it)) {
        // Kindle/e-book: acompanha pela "posição" (Posição X de Y)
        progBloco = `<div class="prog-linha">
            <input class="input" id="f-pos-cur" aria-label="Posição atual" type="text" inputmode="numeric" value="${it.pos_atual || 0}">
            <span class="prog-sep">de</span>
            <input class="input" id="f-pos-tot" aria-label="Total de posições" type="text" inputmode="numeric" value="${it.pos_total || ""}" placeholder="total">
            <span class="prog-sep">posição</span>
          </div>
          <div class="prog-dica">
            Digite a posição do Kindle, com ou sem ponto (ex.: 3.450 de 9.876).
            <button class="link-btn" id="f-modo-pag" type="button">Usar páginas</button>
          </div>`;
      } else {
        progBloco = `<div class="prog-linha">
            <input class="input" id="f-cur" aria-label="Página atual" type="number" inputmode="numeric" value="${it.current_page || 0}">
            <span class="prog-sep">de</span>
            <input class="input" id="f-tot" aria-label="Total de páginas" type="number" inputmode="numeric" value="${it.total_pages || ""}" placeholder="total">
            <span class="prog-sep">páginas</span>
          </div>
          <div class="prog-dica">
            <button class="link-btn" id="f-modo-pos" type="button">Lendo no Kindle? Usar a posição</button>
          </div>`;
      }
    } else {
      // "detectar lançados" usa a MangaBaka → só faz sentido em mangá
      const dicaDetectar = it.kind === "manga" ? `
        <div class="prog-dica">
          Em andamento? Use o total de capítulos já <b>lançados</b>.
          <button class="link-btn ico-btn" id="f-detectar" type="button">${ico("refresh", 14)} detectar lançados</button>
        </div>` : "";
      progBloco = `<div class="prog-linha">
          <input class="input" id="f-cur" aria-label="Capítulo atual" type="number" inputmode="numeric" value="${it.current_chapter || 0}">
          <span class="prog-sep">de</span>
          <input class="input" id="f-tot" aria-label="Total de capítulos" type="number" inputmode="numeric" value="${it.total_chapters || ""}" placeholder="total">
          <span class="prog-sep">capítulos</span>
        </div>${dicaDetectar}
        <div class="prog-linha">
          <input class="input" id="f-curv" aria-label="Volume atual" type="number" inputmode="numeric" value="${it.current_volume || 0}">
          <span class="prog-sep">de</span>
          <input class="input" id="f-totv" aria-label="Total de volumes" type="number" inputmode="numeric" value="${it.total_volumes || ""}" placeholder="total">
          <span class="prog-sep">volumes</span>
        </div>`;
    }

    const pct = Math.round(progresso(it) * 100);
    const generos = (it.genres || []).slice(0, 6)
      .map((g) => `<span class="tag-genero">${esc(g)}</span>`).join("");

    // bloco de notificação: só faz sentido em mangá + modo nuvem (depende do robô)
    const notifBloco = (it.kind === "manga" && Store.cloud) ? `
      <div class="ficha-secao">
        <h2>Notificações</h2>
        <button class="${it.notify ? "btn-primary" : "btn-ghost"}" id="f-notify">
          ${ico("bell", 15)} ${it.notify ? "Avisos ligados — desligar" : "Avisar quando sair capítulo novo"}
        </button>
        <div class="prog-dica">${it.notify
          ? `Vigiando a partir do capítulo ${it.last_notified_chapter || "?"}. Você recebe um push quando sair um novo — mesmo com o app fechado.`
          : "Recebe um push (Android/desktop) assim que um novo capítulo for lançado."}</div>
      </div>` : "";

    corpo.innerHTML = `
      ${it.cover_url ? `<div class="ficha-fundo" style="--img:url(&quot;${esc(capaURL(it.cover_url))}&quot;)"></div>` : ""}
      <div class="ficha-topo">
        <div class="ficha-capa-wrap">
          ${capaHTML(it, "ficha-capa")}
          ${temTotal(it) ? `<span class="fita" id="f-fita" style="--p:${pct}"><i></i></span>` : ""}
        </div>
        <div class="ficha-cab">
          <div class="ficha-titulo">${esc(it.title)}</div>
          <div class="ficha-autor">${esc(it.authors) || "Autor desconhecido"}</div>
          <div class="ficha-generos">${generos}</div>
        </div>
      </div>

      <div class="ficha-secao">
        <div class="prog-pct"><span class="n" id="f-pct">${pct}%</span><span>lido</span></div>
        <div class="prog-barra"><i id="f-barra" style="width:${pct}%"></i></div>
        ${progBloco}
      </div>

      <div class="ficha-secao">
        <h2>Status</h2>
        <div class="status-select" id="f-status">${statusOps}</div>
      </div>

      <div class="ficha-secao">
        <h2>Datas</h2>
        <div class="datas-linha">
          <label class="campo-inline">Início
            <input class="input input-data" id="f-inicio" type="date" value="${it.started_at || ""}">
          </label>
          <label class="campo-inline">Conclusão
            <input class="input input-data" id="f-fim" type="date" value="${it.finished_at || ""}">
          </label>
        </div>
      </div>

      <div class="ficha-secao">
        <h2>Formato</h2>
        <div class="status-select" id="f-formato">
          <button class="status-op ico-btn ${it.format === "fisico" ? "is-active" : ""}" data-fmt="fisico">${ico("bookopen", 15)} Físico</button>
          <button class="status-op ico-btn ${it.format === "digital" ? "is-active" : ""}" data-fmt="digital">${ico("phone", 15)} Digital</button>
          <button class="status-op ${!it.format ? "is-active" : ""}" data-fmt="">— Não definido</button>
        </div>
      </div>

      <div class="ficha-secao">
        <h2>Coleção / Saga</h2>
        <div class="colecao-linha">
          <select class="input" id="f-colecao">
            <option value="">— Nenhuma</option>
            ${colecoes.map((c) => `<option value="${esc(c.id)}" ${it.collection_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
          </select>
          <button class="btn-ghost" id="f-nova-colecao" type="button">＋ Nova</button>
        </div>
      </div>

      <div class="ficha-secao">
        <h2>Avaliação</h2>
        <div class="estrelas" id="f-estrelas" role="group" aria-label="Avaliação">
          ${[1,2,3,4,5].map((n) => `<button type="button" class="estrela ${it.rating >= n ? "on" : ""}" data-n="${n}" aria-label="${n} de 5 estrelas" aria-pressed="${it.rating === n}">${ico("star", 26)}</button>`).join("")}
        </div>
      </div>

      <div class="ficha-secao">
        <h2>Resenha e anotações</h2>
        <textarea class="input" id="f-review" placeholder="O que achou? (sem spoiler)">${esc(it.review)}</textarea>
      </div>

      ${notifBloco}

      ${it.synopsis ? `<div class="ficha-secao"><h2>Sinopse</h2><div class="sinopse">${esc(it.synopsis)}</div></div>` : ""}

      <div class="ficha-rodape">
        <button class="btn-ghost ico-btn" id="f-editar">${ico("pencil", 15)} Editar</button>
        <button class="btn-ghost" id="f-fechar2">Fechar</button>
        <button class="btn-perigo" id="f-remover">Remover</button>
      </div>`;

    $("modal-ficha").hidden = false;

    // --- status ---
    corpo.querySelectorAll("#f-status .status-op").forEach((b) =>
      b.addEventListener("click", async () => {
        const novoStatus = b.dataset.status;
        const patch = { status: novoStatus };
        // marcar "Lido" registra a data de conclusão (se ainda não houver)
        if (novoStatus === "lido" && !it.finished_at) patch.finished_at = hojeISO();
        await Store.update(id, patch);
        abrirFicha(id); renderBiblioteca();
      }));

    // --- formato (físico/digital) ---
    corpo.querySelectorAll("#f-formato .status-op").forEach((b) =>
      b.addEventListener("click", async () => {
        await Store.update(id, { format: b.dataset.fmt || null });
        it.format = b.dataset.fmt || null;
        abrirFicha(id); renderBiblioteca();
      }));

    // --- coleção (Onda C) ---
    $("f-colecao").addEventListener("change", async (e) => {
      await Store.update(id, { collection_id: e.target.value || null });
      it.collection_id = e.target.value || null;
      renderBiblioteca();
    });
    $("f-nova-colecao").addEventListener("click", async () => {
      const nome = prompt("Nome da coleção / saga (ex.: Trilogia Mistborn):");
      if (!nome || !nome.trim()) return;
      const c = await Store.addCollection(nome.trim());
      await Store.update(id, { collection_id: c.id });
      it.collection_id = c.id;
      abrirFicha(id); renderBiblioteca();
    });

    // --- progresso (salva ao editar) ---
    async function salvarProg() {
      const cur = parseInt($("f-cur").value) || 0;
      const tot = parseInt($("f-tot").value) || null;
      const curv = it.kind !== "livro" ? (parseInt($("f-curv").value) || 0) : 0;
      const totv = it.kind !== "livro" ? (parseInt($("f-totv").value) || null) : null;
      const novo = await salvarProgresso(it, cur, tot, curv, totv);
      Object.assign(it, novo);                 // mantém o `it` local em dia
      const p = Math.round(progresso(novo) * 100);
      $("f-barra").style.width = p + "%";
      $("f-pct").textContent = p + "%";
      $("f-fita")?.style.setProperty("--p", p);
      if (novo.started_at && $("f-inicio")) $("f-inicio").value = novo.started_at;
      renderBiblioteca();
      if (await checarConclusao(novo)) { abrirFicha(id); renderBiblioteca(); }
    }
    ["f-cur", "f-tot", "f-curv", "f-totv"].forEach((fid) => {
      const el = $(fid); if (el) el.addEventListener("change", salvarProg);
    });

    // --- progresso por posição (livro no Kindle/e-book) ---
    async function salvarPos() {
      // tolera ponto de milhar do Kindle (9.876 → 9876)
      const soNum = (id) => parseInt(($(id).value || "").replace(/\D/g, ""));
      const cur = soNum("f-pos-cur") || 0;
      const tot = soNum("f-pos-tot") || null;
      const novo = await salvarPosicao(it, cur, tot);
      Object.assign(it, novo);
      const p = Math.round(progresso(novo) * 100);
      $("f-barra").style.width = p + "%";
      $("f-pct").textContent = p + "%";
      $("f-fita")?.style.setProperty("--p", p);
      if (novo.started_at && $("f-inicio")) $("f-inicio").value = novo.started_at;
      renderBiblioteca();
      if (await checarConclusao(novo)) { abrirFicha(id); renderBiblioteca(); }
    }
    ["f-pos-cur", "f-pos-tot"].forEach((fid) => {
      const el = $(fid); if (el) el.addEventListener("change", salvarPos);
    });
    // alternar entre página e posição (só livro)
    const bModoPos = $("f-modo-pos");
    if (bModoPos) bModoPos.addEventListener("click", async () => {
      await Store.update(id, { pos_atual: 0, pos_total: 0 });  // liga o modo posição (total a preencher)
      it.pos_atual = 0; it.pos_total = 0;
      abrirFicha(id);
    });
    const bModoPag = $("f-modo-pag");
    if (bModoPag) bModoPag.addEventListener("click", async () => {
      await Store.update(id, { pos_atual: null, pos_total: null });
      it.pos_atual = null; it.pos_total = null;
      abrirFicha(id);
    });

    // --- datas (editáveis) ---
    const fInicio = $("f-inicio");
    if (fInicio) fInicio.addEventListener("change", (e) =>
      Store.update(id, { started_at: e.target.value || null }));
    const fFim = $("f-fim");
    if (fFim) fFim.addEventListener("change", (e) =>
      Store.update(id, { finished_at: e.target.value || null }));

    // --- detectar capítulos lançados (MangaBaka) ---
    const btnDet = $("f-detectar");
    if (btnDet) btnDet.addEventListener("click", async () => {
      btnDet.innerHTML = ico("refresh", 14) + " buscando…"; btnDet.disabled = true;
      const info = await APIs.capitulosLancados(it.title, it.mangabaka_id);
      btnDet.disabled = false;
      btnDet.innerHTML = ico("refresh", 14) + " detectar lançados";
      if (info.ultimo) {
        $("f-tot").value = info.ultimo;
        await salvarProg();
        // guarda o id da MangaBaka pra próximas consultas / robô
        await Store.update(id, { mangabaka_id: info.mangabaka_id, ...(info.release_status && { release_status: info.release_status }) });
        it.mangabaka_id = info.mangabaka_id;
        if (info.release_status) it.release_status = info.release_status;
        toast(`Último lançado: capítulo ${info.ultimo}`);
      } else {
        toast("Não encontrei — preencha manualmente");
      }
    });

    // --- notificações (🔔) ---
    const btnNotify = $("f-notify");
    if (btnNotify) btnNotify.addEventListener("click", async () => {
      if (it.notify) {                              // já ligado → desligar
        await Store.update(id, { notify: false });
        it.notify = false;
        abrirFicha(id);
        toast("Avisos desligados");
        return;
      }
      btnNotify.disabled = true; btnNotify.textContent = "Ativando…";
      const ok = await assinarPush();
      if (!ok) { abrirFicha(id); return; }
      // baseline: último capítulo lançado (MangaBaka). Só avisa dos PRÓXIMOS.
      const info = await APIs.capitulosLancados(it.title, it.mangabaka_id);
      const baseline = info.ultimo || it.total_chapters || it.current_chapter || 0;
      await Store.update(id, {
        notify: true,
        mangabaka_id: info.mangabaka_id,
        last_notified_chapter: baseline,
      });
      it.notify = true;
      abrirFicha(id);
      toast("Avisos ligados");
    });

    // --- estrelas ---
    corpo.querySelectorAll(".estrela").forEach((s) =>
      s.addEventListener("click", async () => {
        const n = Number(s.dataset.n);
        const novaNota = it.rating === n ? null : n; // clicar de novo limpa
        await Store.update(id, { rating: novaNota });
        it.rating = novaNota;
        corpo.querySelectorAll(".estrela").forEach((e) => {
          e.classList.toggle("on", !!novaNota && Number(e.dataset.n) <= novaNota);
          e.setAttribute("aria-pressed", String(novaNota === Number(e.dataset.n)));
        });
        renderBiblioteca();
      }));

    // --- resenha (salva ao sair do campo) ---
    $("f-review").addEventListener("change", (e) => Store.update(id, { review: e.target.value }));

    // --- rodapé ---
    $("f-editar").onclick = () => abrirManual(it);
    $("f-fechar2").onclick = () => ($("modal-ficha").hidden = true);
    $("f-remover").onclick = async () => {
      if (!confirm("Remover este título da estante?")) return;
      await Store.remove(id);
      $("modal-ficha").hidden = true;
      toast("Removido");
      renderBiblioteca();
    };
  }

  // ============================================================
  //  LIGAÇÕES DA INTERFACE
  // ============================================================
  function ligarEventos() {
    // abas
    $("tabs").querySelectorAll(".tab").forEach((t) =>
      t.addEventListener("click", () => {
        $("tabs").querySelector(".is-active").classList.remove("is-active");
        t.classList.add("is-active");
        ui.kind = t.dataset.kind;
        salvarNav();
        renderBiblioteca();
      }));

    // filtro de status (texto)
    $("filtro-status").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-st]");
      if (!b || b.dataset.st === ui.status) return;
      ui.status = b.dataset.st;
      marcarStatus(); salvarNav(); renderBiblioteca();
    });

    // ordenação
    $("ordenar").addEventListener("change", (e) => {
      ui.ordem = e.target.value;
      salvarNav();
      renderBiblioteca();
    });

    // grade/lista
    $("view-toggle").querySelectorAll(".vt").forEach((v) =>
      v.addEventListener("click", () => {
        $("view-toggle").querySelector(".is-active").classList.remove("is-active");
        v.classList.add("is-active");
        ui.view = v.dataset.view;
        salvarNav();
        renderBiblioteca();
      }));

    // filtro local
    $("busca-local").addEventListener("input", (e) => {
      ui.filtro = e.target.value.trim();
      renderBiblioteca();
    });

    // #10 filtros avançados
    $("btn-filtros").addEventListener("click", () => {
      const p = $("filtros-avancados");
      p.hidden = !p.hidden;
      $("btn-filtros").classList.toggle("is-active", !p.hidden);
    });
    const mapAdv = { "fa-genero": "genero", "fa-formato": "formato", "fa-ano": "ano", "fa-autor": "autor", "fa-colecao": "colecao" };
    Object.keys(mapAdv).forEach((fid) =>
      $(fid).addEventListener("change", (e) => { ui.adv[mapAdv[fid]] = e.target.value; renderBiblioteca(); }));
    $("fa-limpar").addEventListener("click", () => {
      ui.adv = { genero: "", formato: "", ano: "", autor: "", colecao: "" };
      renderBiblioteca();
    });

    // adicionar
    $("btn-adicionar").addEventListener("click", abrirAdd);
    $("add-fechar").addEventListener("click", () => ($("modal-add").hidden = true));
    $("add-buscar").addEventListener("click", fazerBusca);
    $("add-input").addEventListener("keydown", (e) => { if (e.key === "Enter") fazerBusca(); });
    $("btn-manual").addEventListener("click", () => abrirManual());
    $("btn-import").addEventListener("click", abrirImport);
    $("import-fechar").addEventListener("click", () => ($("modal-import").hidden = true));
    $("import-cancel").addEventListener("click", () => ($("modal-import").hidden = true));
    $("import-run").addEventListener("click", importarLista);
    $("btn-exportar").addEventListener("click", exportarDados);
    $("btn-restaurar").addEventListener("click", () => $("restore-file").click());
    $("restore-file").addEventListener("change", (e) => {
      const f = e.target.files[0]; if (f) restaurarBackup(f); e.target.value = "";
    });
    $("manual-fechar").addEventListener("click", () => ($("modal-manual").hidden = true));
    $("ficha-fechar").addEventListener("click", () => ($("modal-ficha").hidden = true));
    $("rapido-fechar").addEventListener("click", () => ($("modal-rapido").hidden = true));

    // menu inferior (Biblioteca / Estatísticas / Histórico)
    document.querySelectorAll("#bottom-nav .bn-item").forEach((b) =>
      b.addEventListener("click", () => mostrarView(b.dataset.view)));
    $("sessao-fechar").addEventListener("click", () => ($("modal-sessao").hidden = true));

    // fechar modal ao clicar no fundo
    document.querySelectorAll(".modal-bg").forEach((bg) =>
      bg.addEventListener("click", (e) => { if (e.target === bg) bg.hidden = true; }));

    // Esc fecha qualquer modal aberto (saída de emergência)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") fecharModais();
    });

    // login / logout (modo nuvem)
    $("btn-login").addEventListener("click", fazerLogin);
    $("login-senha").addEventListener("keydown", (e) => { if (e.key === "Enter") fazerLogin(); });
    $("btn-sair").addEventListener("click", async () => {
      try { await Store.signOut(); } catch {}
      recarregar();
    });

    // tema claro/escuro
    $("btn-tema").addEventListener("click", (e) => { e.stopPropagation(); abrirMenuTema(); });

    // #8 biometria
    $("btn-bio").addEventListener("click", async () => {
      if (localStorage.getItem("bioOn") === "1") {
        if (confirm("Desativar o bloqueio biométrico?")) desativarBiometria();
      } else {
        await ativarBiometria();
      }
    });
    $("btn-desbloquear").addEventListener("click", desbloquear);
    $("btn-lock-sair").addEventListener("click", async () => {
      try { await Store.signOut(); } catch {}
      localStorage.removeItem("bioOn");
      localStorage.removeItem("bioCredId");
      recarregar();
    });
  }

  // ============================================================
  //  LOGIN
  // ============================================================
  async function fazerLogin() {
    const email = $("login-email").value.trim();
    const senha = $("login-senha").value;
    const erro = $("login-erro");
    erro.textContent = "";
    if (!email || !senha) { erro.textContent = "Preencha e-mail e senha."; return; }
    const btn = $("btn-login");
    btn.disabled = true; btn.textContent = "Entrando…";
    try {
      sessaoAtual = await Store.signIn(email, senha);
      $("tela-login").hidden = true;
      await mostrarApp();
    } catch (e) {
      erro.textContent = "E-mail ou senha inválidos.";
    } finally {
      btn.disabled = false; btn.textContent = "Entrar";
    }
  }

  // filtro de status em texto: marca o botão ativo
  function marcarStatus() {
    $("filtro-status").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.st === ui.status)));
  }

  // guarda/retoma a navegação (aba, filtro, ordem, grade/lista, tela) entre refreshs
  function salvarNav() {
    try {
      localStorage.setItem("nav", JSON.stringify({
        kind: ui.kind, status: ui.status, view: ui.view, ordem: ui.ordem, tela: telaAtual,
      }));
    } catch {}
  }
  function restaurarNav() {
    let nav = {};
    try { nav = JSON.parse(localStorage.getItem("nav")) || {}; } catch {}
    const KINDS = ["livro", "quadrinho", "manga"];
    const STATUS = ["todos", "lendo", "quero_ler", "lido", "pausado", "abandonado"];
    const VIEWS = ["grid", "list"];
    const TELAS = ["biblioteca", "stats", "historico"];
    ui.kind = KINDS.includes(nav.kind) ? nav.kind : "livro";
    // aba Quadrinhos está oculta (ver index.html) → não retoma nela; pra reativar, remova esta linha
    if (ui.kind === "quadrinho") ui.kind = "livro";
    ui.status = STATUS.includes(nav.status) ? nav.status : "lendo";
    ui.view = VIEWS.includes(nav.view) ? nav.view : "grid";
    ui.ordem = nav.ordem || "recentes";
    // sincroniza a UI com o estado restaurado
    $("tabs").querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.kind === ui.kind));
    marcarStatus();
    $("ordenar").value = ui.ordem;
    $("view-toggle").querySelectorAll(".vt").forEach((v) => v.classList.toggle("is-active", v.dataset.view === ui.view));
    return TELAS.includes(nav.tela) ? nav.tela : "biblioteca";
  }

  // mostra a biblioteca (usuário autenticado ou modo local)
  async function mostrarApp() {
    $("btn-sair").hidden = !Store.cloud;   // botão sair só na nuvem
    $("app").hidden = false;
    atualizarBotaoBio();                    // #8 mostra/atualiza o botão de biometria
    const tela = restaurarNav();            // retoma aba/filtro/ordem/visão do último uso
    await renderBiblioteca();
    if (tela !== "biblioteca") await mostrarView(tela);  // e sobe pra Estatísticas/Histórico se era o caso
  }

  // ============================================================
  //  BOOT
  // ============================================================
  let jaRecarregando = false;
  function recarregar() { if (jaRecarregando) return; jaRecarregando = true; location.reload(); }

  // modais: semântica de diálogo; o foco entra ao abrir e volta pra origem ao fechar
  function prepararModais() {
    document.querySelectorAll(".modal-bg").forEach((bg) => {
      const m = bg.querySelector(".modal");
      if (!m) return;
      const tit = m.querySelector(".modal-titulo");
      if (tit && !tit.id) tit.id = bg.id + "-titulo";
      m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.tabIndex = -1;
      if (tit) m.setAttribute("aria-labelledby", tit.id);
      m.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        const f = [...m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          .filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const ini = f[0], fim = f[f.length - 1], at = document.activeElement;
        if (e.shiftKey && (at === ini || at === m)) { e.preventDefault(); fim.focus(); }
        else if (!e.shiftKey && at === fim) { e.preventDefault(); ini.focus(); }
      });
      let origem = null, origemId = null;
      new MutationObserver(() => {
        if (!bg.hidden) {
          if (!m.contains(document.activeElement)) {
            origem = document.activeElement;
            origemId = origem && origem.closest ? (origem.closest("[data-id]") || {}).dataset?.id : null;
          }
          m.focus({ preventScroll: true });
        } else if (origem) {
          // a biblioteca pode ter sido redesenhada: volta pro card da mesma obra
          const alvo = document.contains(origem) ? origem
            : origemId && document.querySelector(`[data-id="${CSS.escape(origemId)}"] .card-abrir`);
          if (alvo) alvo.focus({ preventScroll: true });
          origem = origemId = null;
        }
      }).observe(bg, { attributes: true, attributeFilter: ["hidden"] });
    });
  }

  async function boot() {
    pintarIcones();          // ícones flat estáticos
    atualizarBotaoTema();    // ícone sol/lua conforme o tema salvo
    { const m = document.getElementById("meta-theme"); if (m) m.content = infoTema(temaAtual()).meta; }
    ligarEventos();
    prepararModais();

    // rede de segurança: qualquer falha assíncrona não tratada vira um aviso
    // (ex.: escrita na nuvem que falhou por conexão) em vez de sumir em silêncio
    window.addEventListener("unhandledrejection", (e) => {
      console.warn("Falha não tratada:", e && e.reason);
      toast("Algo não salvou. Verifique a conexão e tente de novo.");
    });

    // sessão expirou/caiu enquanto usava → volta pro login
    if (Store.cloud) {
      Store.onAuthChange((s) => {
        if (!s && !$("app").hidden) recarregar();
      });
    }

    // aviso de conexão (offline)
    const atualizarOffline = () => { const b = $("offline-banner"); if (b) b.hidden = navigator.onLine; };
    window.addEventListener("online", atualizarOffline);
    window.addEventListener("offline", atualizarOffline);
    atualizarOffline();

    // ao voltar pro app (ex.: clicou na notificação de capítulo novo), rebusca a
    // tela atual — pega o total já atualizado pelo robô e sincroniza entre aparelhos
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !$("app").hidden && navigator.onLine) {
        atualizarTelaAtual();
      }
    });

    // decide: login (nuvem sem sessão) → tranca biométrica → biblioteca
    let sessao = null;
    try { sessao = await Store.session(); } catch { sessao = null; }
    sessaoAtual = sessao;
    if (Store.cloud && !sessao) {
      $("tela-login").hidden = false;
      setTimeout(() => $("login-email").focus(), 100);
    } else if (localStorage.getItem("bioOn") === "1") {
      // #8 sessão existe, mas está trancada por biometria
      $("tela-lock").hidden = false;
      setTimeout(desbloquear, 300);           // dispara o Windows Hello / digital de cara
    } else {
      await mostrarApp();
    }

    // esconde splash
    const sp = $("splash");
    sp.classList.add("hide");
    setTimeout(() => (sp.style.display = "none"), 320);

    // registra service worker (PWA) — só quando servido por http(s)
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        reg.update();                                   // busca versão nova a cada abertura
        // se um SW novo assumir o controle, recarrega uma vez pra pegar a versão fresca
        let recarregou = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (recarregou) return; recarregou = true; location.reload();
        });
      }).catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
