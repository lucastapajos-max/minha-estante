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
    livro:     { label: "Livro",     emoji: "📖", unidade: "páginas" },
    quadrinho: { label: "Quadrinho", emoji: "💥", unidade: "páginas" },
    manga:     { label: "Mangá",     emoji: "🎌", unidade: "capítulos" },
  };

  // ---------- estado da tela ----------
  const ui = { kind: "livro", status: "todos", view: "grid", filtro: "" };

  // ---------- atalhos ----------
  const $ = (id) => document.getElementById(id);
  const hojeISO = () => {
    const d = new Date(); const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const esc = (s) => (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2200);
  }

  // fecha TODOS os modais — usado antes de abrir qualquer um
  // (garante que nunca fiquem empilhados/travados)
  function fecharModais() {
    ["modal-add", "modal-manual", "modal-ficha"].forEach((id) => {
      const m = $(id); if (m) m.hidden = true;
    });
  }

  // #2 pop-up de conclusão — resolve(true/false)
  function perguntarConclusao(item) {
    return new Promise((resolve) => {
      const bg = $("modal-conclusao");
      $("conclusao-txt").textContent = `"${item.title}" chegou ao fim. Marcar como concluída?`;
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

  // capas da Open Library por ISBN devolvem imagem em BRANCO quando não existem;
  // ?default=false faz virar 404 → aí o onerror mostra o ícone de reserva.
  function capaURL(u) {
    if (u && u.includes("covers.openlibrary.org/b/isbn/") && !u.includes("default=false")) {
      return u + (u.includes("?") ? "&" : "?") + "default=false";
    }
    return u;
  }

  function capaHTML(item, cls) {
    if (item.cover_url) {
      return `<img class="${cls}" src="${esc(capaURL(item.cover_url))}" alt="" loading="lazy"
              onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} fb',textContent:'${KIND[item.kind].emoji}'}))">`;
    }
    return `<div class="${cls} fb">${KIND[item.kind].emoji}</div>`;
  }

  // progresso 0..1 conforme a categoria
  function progresso(item) {
    if (item.kind === "livro") {
      if (item.total_pages) return Math.min(1, (item.current_page || 0) / item.total_pages);
    } else {
      if (item.total_chapters) return Math.min(1, (item.current_chapter || 0) / item.total_chapters);
      if (item.total_volumes) return Math.min(1, (item.current_volume || 0) / item.total_volumes);
    }
    return item.status === "lido" ? 1 : 0;
  }

  // tem um total definido? (só aí a % faz sentido)
  function temTotal(item) {
    return item.kind === "livro" ? !!item.total_pages
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

  // ============================================================
  //  RENDER DA BIBLIOTECA
  // ============================================================
  async function renderBiblioteca() {
    const wrap = $("biblioteca");
    let itens = await Store.list(ui.kind);

    if (ui.status !== "todos") itens = itens.filter((i) => i.status === ui.status);
    if (ui.filtro) {
      const f = ui.filtro.toLowerCase();
      itens = itens.filter((i) =>
        i.title.toLowerCase().includes(f) || (i.authors || "").toLowerCase().includes(f));
    }

    wrap.className = "biblioteca " + ui.view;
    $("vazio").hidden = itens.length > 0;

    wrap.innerHTML = itens.map((i) => {
      const st = STATUS[i.status];
      const pct = Math.round(progresso(i) * 100);
      const estrelas = i.rating ? "★".repeat(Math.round(i.rating)) + "☆".repeat(5 - Math.round(i.rating)) : "";
      const progTxt = progressoTexto(i);
      const pctTxt = temTotal(i) ? `<span class="prog-pctinline">${pct}%</span>` : "";
      const progHTML = progTxt
        ? `<div class="card-prog">${progTxt}${pctTxt ? " · " + pctTxt : ""}</div>` : "";

      if (ui.view === "list") {
        return `<div class="card" data-id="${i.id}">
          <div class="capa-wrap">${capaHTML(i, "capa")}</div>
          <div class="card-info">
            <div class="card-titulo">${esc(i.title)}</div>
            <div class="card-autor">${esc(i.authors) || "—"}</div>
            <div class="list-meta">
              <span class="list-badge" style="background:${st.cor}">${st.label}</span>
              ${progTxt ? `<span class="list-prog">${progTxt}${pctTxt ? " · " + pctTxt : ""}</span>` : ""}
              ${estrelas ? `<span class="card-rating">${estrelas}</span>` : ""}
            </div>
          </div>
        </div>`;
      }
      return `<div class="card" data-id="${i.id}">
        <div class="capa-wrap">
          ${capaHTML(i, "capa")}
          <span class="badge-status" style="background:${st.cor}">${st.label}</span>
          ${temTotal(i) ? `<div class="progress-mini"><i style="width:${pct}%"></i></div>` : ""}
        </div>
        <div class="card-info">
          <div class="card-titulo">${esc(i.title)}</div>
          <div class="card-autor">${esc(i.authors) || "—"}</div>
          ${progHTML}
          ${estrelas ? `<div class="card-rating">${estrelas}</div>` : ""}
        </div>
      </div>`;
    }).join("");

    wrap.querySelectorAll(".card").forEach((c) =>
      c.addEventListener("click", () => abrirFicha(c.dataset.id)));
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
      ? "Buscando em Jikan / MyAnimeList."
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
               onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'res-capa fb',textContent:'${KIND[ui.kind].emoji}'}))">`
          : `<div class="res-capa fb">${KIND[ui.kind].emoji}</div>`;
        const meta = r.total_pages ? `${r.total_pages} págs`
          : r.total_chapters ? `${r.total_chapters} caps`
          : r.total_volumes ? `${r.total_volumes} vols` : "";
        div.innerHTML = `${capa}
          <div class="res-corpo">
            <div class="res-titulo">${esc(r.title)}</div>
            <div class="res-sub">${esc(r.authors) || "Autor desconhecido"}${meta ? " · " + meta : ""}</div>
          </div>
          <button class="btn-primary res-add">Adicionar</button>`;
        div.querySelector(".res-add").addEventListener("click", async (ev) => {
          const btn = ev.currentTarget;
          const item = { ...r, kind: ui.kind, status: "quero_ler" };
          // mangá em andamento sem total? tenta descobrir os capítulos lançados na MangaDex
          if (ui.kind === "manga" && !item.total_chapters) {
            btn.disabled = true; btn.textContent = "…";
            const cap = await APIs.mangadexUltimoCapitulo(item.title);
            if (cap) item.total_chapters = cap;
          }
          await Store.add(item);
          $("modal-add").hidden = true;
          toast(item.total_chapters ? `Adicionado ✓ (${item.total_chapters} caps lançados)` : "Adicionado à estante ✓");
          renderBiblioteca();
        });
        box.appendChild(div);
      });
    } catch (e) {
      box.innerHTML = `<div class="spinner">Erro na busca (${esc(e.message)}). Você ainda pode cadastrar manualmente.</div>`;
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
         <input class="input" id="m-pages" type="number" inputmode="numeric" placeholder="ex.: 320" value="${ed ? val(ed.total_pages) : ""}">`
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
      <label class="campo">Categorias / Gêneros</label>
      <input class="input" id="m-genres" placeholder="Ex.: Fantasia, Aventura (separe por vírgula)" value="${ed ? esc((ed.genres || []).join(", ")) : ""}">
      <label class="campo">URL da capa</label>
      <input class="input" id="m-cover" placeholder="https://…" value="${ed ? esc(ed.cover_url) : ""}">
      ${ed && ed.cover_url ? `<img src="${esc(capaURL(ed.cover_url))}" class="edit-capa-preview" alt="" onerror="this.style.display='none'">` : ""}
      <label class="campo">Sinopse</label>
      <textarea class="input" id="m-syn" placeholder="Resumo…">${ed ? esc(ed.synopsis) : ""}</textarea>
      <div class="ficha-rodape">
        <button class="btn-ghost" id="m-cancel">Cancelar</button>
        <button class="btn-primary" id="m-salvar">${ed ? "Salvar alterações" : "Salvar na estante"}</button>
      </div>`;
    $("modal-manual").hidden = false;

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
        genres: $("m-genres").value.split(",").map((s) => s.trim()).filter(Boolean),
        total_pages: k === "livro" ? (parseInt($("m-pages").value) || null) : null,
        total_chapters: k !== "livro" ? (parseInt($("m-chaps").value) || null) : null,
        total_volumes: k !== "livro" ? (parseInt($("m-vols").value) || null) : null,
      };
      $("modal-manual").hidden = true;
      if (ed) {
        await Store.update(ed.id, dados);
        toast("Alterações salvas ✓");
        renderBiblioteca();
        abrirFicha(ed.id);
      } else {
        await Store.add({ kind: k, source: "manual", ...dados });
        toast("Adicionado à estante ✓");
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

    const statusOps = Object.entries(STATUS).map(([k, v]) =>
      `<button class="status-op ${it.status === k ? "is-active" : ""}"
        data-status="${k}" style="${it.status === k ? `background:${v.cor};border-color:${v.cor}` : ""}">${v.label}</button>`
    ).join("");

    // bloco de progresso conforme categoria
    let progBloco;
    if (it.kind === "livro") {
      progBloco = `<div class="prog-linha">
          <input class="input" id="f-cur" type="number" inputmode="numeric" value="${it.current_page || 0}">
          <span class="prog-sep">de</span>
          <input class="input" id="f-tot" type="number" inputmode="numeric" value="${it.total_pages || ""}" placeholder="total">
          <span class="prog-sep">páginas</span>
        </div>`;
    } else {
      progBloco = `<div class="prog-linha">
          <input class="input" id="f-cur" type="number" inputmode="numeric" value="${it.current_chapter || 0}">
          <span class="prog-sep">de</span>
          <input class="input" id="f-tot" type="number" inputmode="numeric" value="${it.total_chapters || ""}" placeholder="total">
          <span class="prog-sep">capítulos</span>
        </div>
        <div class="prog-dica">
          Em andamento? Use o total de capítulos já <b>lançados</b>.
          <button class="link-btn" id="f-detectar" type="button">🔄 detectar lançados</button>
        </div>
        <div class="prog-linha">
          <input class="input" id="f-curv" type="number" inputmode="numeric" value="${it.current_volume || 0}">
          <span class="prog-sep">de</span>
          <input class="input" id="f-totv" type="number" inputmode="numeric" value="${it.total_volumes || ""}" placeholder="total">
          <span class="prog-sep">volumes</span>
        </div>`;
    }

    const pct = Math.round(progresso(it) * 100);
    const generos = (it.genres || []).slice(0, 6)
      .map((g) => `<span class="tag-genero">${esc(g)}</span>`).join("");

    // bloco de notificação: só faz sentido em mangá + modo nuvem (depende do robô)
    const notifBloco = (it.kind === "manga" && Store.cloud) ? `
      <div class="ficha-secao">
        <h4>Notificações</h4>
        <button class="${it.notify ? "btn-primary" : "btn-ghost"}" id="f-notify">
          ${it.notify ? "🔔 Avisos ligados — desligar" : "🔔 Avisar quando sair capítulo novo"}
        </button>
        <div class="prog-dica">${it.notify
          ? `Vigiando a partir do capítulo ${it.last_notified_chapter || "?"}. Você recebe um push quando sair um novo — mesmo com o app fechado.`
          : "Recebe um push (Android/desktop) assim que um novo capítulo for lançado."}</div>
      </div>` : "";

    corpo.innerHTML = `
      <div class="ficha-topo">
        ${capaHTML(it, "ficha-capa")}
        <div class="ficha-cab">
          <div class="ficha-titulo">${esc(it.title)}</div>
          <div class="ficha-autor">${esc(it.authors) || "Autor desconhecido"}</div>
          <div class="ficha-generos">${generos}</div>
        </div>
      </div>

      <div class="ficha-secao">
        <h4>Status</h4>
        <div class="status-select" id="f-status">${statusOps}</div>
      </div>

      <div class="ficha-secao">
        <h4>Progresso</h4>
        ${progBloco}
        <div class="prog-barra"><i id="f-barra" style="width:${pct}%"></i></div>
        <div class="prog-pct" id="f-pct">${pct}% lido</div>
      </div>

      <div class="ficha-secao">
        <h4>Datas</h4>
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
        <h4>Avaliação</h4>
        <div class="estrelas" id="f-estrelas">
          ${[1,2,3,4,5].map((n) => `<span class="estrela ${it.rating >= n ? "on" : ""}" data-n="${n}">★</span>`).join("")}
        </div>
      </div>

      <div class="ficha-secao">
        <h4>Resenha e anotações</h4>
        <textarea class="input" id="f-review" placeholder="O que achou? (sem spoiler)">${esc(it.review)}</textarea>
      </div>

      ${notifBloco}

      ${it.synopsis ? `<div class="ficha-secao"><h4>Sinopse</h4><div class="sinopse">${esc(it.synopsis)}</div></div>` : ""}

      <div class="ficha-rodape">
        <button class="btn-ghost" id="f-editar">✏️ Editar</button>
        <button class="btn-ghost" id="f-fechar2">Fechar</button>
        <button class="btn-perigo" id="f-remover">Remover</button>
      </div>`;

    $("modal-ficha").hidden = false;

    // --- status ---
    corpo.querySelectorAll(".status-op").forEach((b) =>
      b.addEventListener("click", async () => {
        const novoStatus = b.dataset.status;
        const patch = { status: novoStatus };
        // marcar "Lido" registra a data de conclusão (se ainda não houver)
        if (novoStatus === "lido" && !it.finished_at) patch.finished_at = hojeISO();
        await Store.update(id, patch);
        abrirFicha(id); renderBiblioteca();
      }));

    // --- progresso (salva ao editar) ---
    async function salvarProg() {
      const cur = parseInt($("f-cur").value) || 0;
      const tot = parseInt($("f-tot").value) || null;
      const patch = it.kind === "livro"
        ? { current_page: cur, total_pages: tot }
        : { current_chapter: cur, total_chapters: tot };
      if (it.kind !== "livro") {
        patch.current_volume = parseInt($("f-curv").value) || 0;
        patch.total_volumes = parseInt($("f-totv").value) || null;
      }
      // avanço vira leitura → marca "lendo" se estava "quero ler"
      if (cur > 0 && it.status === "quero_ler") patch.status = "lendo";
      // #1 data de início: preenche na PRIMEIRA atualização de progresso
      if (cur > 0 && !it.started_at) patch.started_at = hojeISO();

      const novo = await Store.update(id, patch);
      Object.assign(it, novo);                 // mantém o `it` local em dia
      const p = Math.round(progresso(novo) * 100);
      $("f-barra").style.width = p + "%";
      $("f-pct").textContent = p + "% lido";
      if (patch.started_at && $("f-inicio")) $("f-inicio").value = patch.started_at;
      renderBiblioteca();

      // #2 chegou ao total? pergunta se concluiu
      if (temTotal(novo) && progresso(novo) >= 1 && novo.status !== "lido") {
        const concluiu = await perguntarConclusao(novo);
        if (concluiu) {
          await Store.update(id, { status: "lido", finished_at: hojeISO() });
          abrirFicha(id);
          renderBiblioteca();
          toast("Leitura concluída! 🎉");
        }
      }
    }
    ["f-cur", "f-tot", "f-curv", "f-totv"].forEach((fid) => {
      const el = $(fid); if (el) el.addEventListener("change", salvarProg);
    });

    // --- datas (editáveis) ---
    const fInicio = $("f-inicio");
    if (fInicio) fInicio.addEventListener("change", (e) =>
      Store.update(id, { started_at: e.target.value || null }));
    const fFim = $("f-fim");
    if (fFim) fFim.addEventListener("change", (e) =>
      Store.update(id, { finished_at: e.target.value || null }));

    // --- detectar capítulos lançados (MangaDex) ---
    const btnDet = $("f-detectar");
    if (btnDet) btnDet.addEventListener("click", async () => {
      btnDet.textContent = "🔄 buscando…"; btnDet.disabled = true;
      const cap = await APIs.mangadexUltimoCapitulo(it.title);
      btnDet.disabled = false;
      if (cap) {
        $("f-tot").value = cap;
        await salvarProg();
        btnDet.textContent = "🔄 detectar lançados";
        toast(`Último lançado: capítulo ${cap}`);
      } else {
        btnDet.textContent = "🔄 detectar lançados";
        toast("Não encontrei na MangaDex — preencha manualmente");
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
      // baseline: id e último capítulo na MangaDex (só avisa dos PRÓXIMOS)
      const info = await APIs.mangadexInfo(it.title);
      const baseline = (info && info.ultimo) || it.total_chapters || it.current_chapter || 0;
      await Store.update(id, {
        notify: true,
        mangadex_id: (info && info.id) || "",
        last_notified_chapter: baseline,
      });
      it.notify = true;
      abrirFicha(id);
      toast("🔔 Avisos ligados!");
    });

    // --- estrelas ---
    corpo.querySelectorAll(".estrela").forEach((s) =>
      s.addEventListener("click", async () => {
        const n = Number(s.dataset.n);
        const novaNota = it.rating === n ? null : n; // clicar de novo limpa
        await Store.update(id, { rating: novaNota });
        it.rating = novaNota;
        corpo.querySelectorAll(".estrela").forEach((e) =>
          e.classList.toggle("on", novaNota && Number(e.dataset.n) <= novaNota));
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
        renderBiblioteca();
      }));

    // filtro de status (dropdown #4)
    $("filtro-status").addEventListener("change", (e) => {
      ui.status = e.target.value;
      renderBiblioteca();
    });

    // grade/lista
    $("view-toggle").querySelectorAll(".vt").forEach((v) =>
      v.addEventListener("click", () => {
        $("view-toggle").querySelector(".is-active").classList.remove("is-active");
        v.classList.add("is-active");
        ui.view = v.dataset.view;
        renderBiblioteca();
      }));

    // filtro local
    $("busca-local").addEventListener("input", (e) => {
      ui.filtro = e.target.value.trim();
      renderBiblioteca();
    });

    // adicionar
    $("btn-adicionar").addEventListener("click", abrirAdd);
    $("add-fechar").addEventListener("click", () => ($("modal-add").hidden = true));
    $("add-buscar").addEventListener("click", fazerBusca);
    $("add-input").addEventListener("keydown", (e) => { if (e.key === "Enter") fazerBusca(); });
    $("btn-manual").addEventListener("click", () => abrirManual());
    $("manual-fechar").addEventListener("click", () => ($("modal-manual").hidden = true));
    $("ficha-fechar").addEventListener("click", () => ($("modal-ficha").hidden = true));

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
      await Store.signOut();
      location.reload();
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
      await Store.signIn(email, senha);
      $("tela-login").hidden = true;
      await mostrarApp();
    } catch (e) {
      erro.textContent = "E-mail ou senha inválidos.";
    } finally {
      btn.disabled = false; btn.textContent = "Entrar";
    }
  }

  // mostra a biblioteca (usuário autenticado ou modo local)
  async function mostrarApp() {
    $("btn-sair").hidden = !Store.cloud;   // botão sair só na nuvem
    $("app").hidden = false;
    await renderBiblioteca();
  }

  // ============================================================
  //  BOOT
  // ============================================================
  async function boot() {
    ligarEventos();

    // decide: tela de login (nuvem sem sessão) ou direto pra biblioteca
    let sessao = null;
    try { sessao = await Store.session(); } catch { sessao = null; }
    if (Store.cloud && !sessao) {
      $("tela-login").hidden = false;
      setTimeout(() => $("login-email").focus(), 100);
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
