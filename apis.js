/* ============================================================
   apis.js — integrações de busca externa (com reservas)
   ------------------------------------------------------------
   Livros / Quadrinhos:
     1º Google Books  (dados ricos: páginas, sinopse, categorias)
     2º Open Library  (reserva grátis, SEM cota, se o Google falhar)
   Mangás:
     1º MangaBaka (open source, capítulos em tempo real, capa, sinopse)
     2º Jikan/MyAnimeList  (reserva, se a MangaBaka cair)
     3º AniList (GraphQL, reserva SEM chave)

   Toda busca devolve uma lista NORMALIZADA no mesmo formato,
   pronta para virar um item do Store:
     { title, authors, cover_url, synopsis, genres,
       total_pages, total_chapters, total_volumes,
       source, external_id }
   ============================================================ */
const APIs = (() => {

  const limpaHTML = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+\n/g, "\n").trim();

  // gênero legível e uniforme: sem underscore e com Cada Palavra Capitalizada
  // (school_life → School Life, sci-fi → Sci-Fi, comedy → Comedy)
  const capGenero = (g) => String(g).replace(/_/g, " ").replace(/\s+/g, " ").trim()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

  // fetch com timeout (aborta se a API demorar demais — não trava a importação)
  async function fetchT(url, opts = {}, ms = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  // ---------- Capas ----------
  // ISBN-13 (978…) → ISBN-10, que é o código da Amazon pra livro físico. 979… não tem ISBN-10.
  function isbn10de(isbn) {
    const s = String(isbn || "").replace(/[-\s]/g, "").toUpperCase();
    if (/^\d{9}[\dX]$/.test(s)) return s;
    if (!/^978\d{10}$/.test(s)) return null;
    const core = s.slice(3, 12);
    const soma = [...core].reduce((a, d, i) => a + Number(d) * (10 - i), 0);
    const dv = (11 - (soma % 11)) % 11;
    return core + (dv === 10 ? "X" : String(dv));
  }
  // capa atual da edição na Amazon (endereço público por ISBN-10; sem a capa, devolve um GIF de 1×1)
  // shortcut: endereço não-oficial da Amazon; se parar de funcionar, as outras fontes seguem como reserva
  const capaAmazon = (isbn) => { const i10 = isbn10de(isbn); return i10 ? `https://m.media-amazon.com/images/P/${i10}.01._SCLZZZZZZZ_.jpg` : ""; };
  console.assert(isbn10de("9788595084742") === "8595084742" && isbn10de("9791032305690") === null && isbn10de("9780306406157") === "0306406152", "isbn10de");
  const capaOpenLibrary = (isbn) => isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : "";

  // testa se a imagem existe de verdade (Amazon responde 1×1 quando não tem; OL dá 404)
  function imagemValida(url, ms = 3000) {
    return new Promise((ok) => {
      if (!url) return ok(false);
      const img = new Image();
      const t = setTimeout(() => { img.src = ""; ok(false); }, ms);
      img.onload = () => { clearTimeout(t); ok(img.naturalWidth > 10 && img.naturalHeight > 10); };
      img.onerror = () => { clearTimeout(t); ok(false); };
      img.src = url;
    });
  }
  // primeira capa que carrega, na ordem de preferência (as candidatas carregam em paralelo)
  async function primeiraCapa(candidatas) {
    const lista = [...new Set(candidatas.filter(Boolean))];
    const testes = lista.map((u) => imagemValida(u));
    for (let i = 0; i < testes.length; i++) if (await testes[i]) return lista[i];   // não espera as piores
    return "";
  }
  // troca a capa de cada resultado pela melhor disponível: Amazon (atual) → a que a fonte trouxe → Open Library
  async function melhorarCapas(itens) {
    await Promise.all(itens.map(async (it) => {
      if (!it.isbn) return;
      it.cover_url = await primeiraCapa([capaAmazon(it.isbn), it.cover_url, capaOpenLibrary(it.isbn)]) || it.cover_url;
    }));
    return itens;
  }

  // ---------- Google Books ----------
  // chave opcional em config.js (window.GOOGLE_BOOKS_KEY): sem ela, a cota anônima estoura e a busca volta vazia
  // ptOnly=true restringe a edições em português (langRestrict=pt)
  async function googleBooks(termo, ptOnly) {
    let url = "https://www.googleapis.com/books/v1/volumes?maxResults=12&country=BR&q=" + encodeURIComponent(termo);
    if (ptOnly) url += "&langRestrict=pt";
    if (window.GOOGLE_BOOKS_KEY) url += "&key=" + encodeURIComponent(window.GOOGLE_BOOKS_KEY);
    const r = await fetchT(url);
    if (!r.ok) throw new Error("google " + r.status);
    const j = await r.json();
    return (j.items || []).map((v) => {
      const info = v.volumeInfo || {};
      let capa = (info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail)) || "";
      capa = capa.replace("http://", "https://").replace("&edge=curl", "");
      const ids = info.industryIdentifiers || [];
      const isbn = (ids.find((x) => x.type === "ISBN_13") || ids.find((x) => x.type === "ISBN_10") || {}).identifier || "";
      return {
        isbn,
        title: info.title || "Sem título",
        // só o 1º autor: nas edições BR o Google costuma pôr o tradutor como 2º
        authors: (info.authors || [])[0] || "",
        cover_url: capa,
        synopsis: info.description || "",
        genres: info.categories || [],
        total_pages: info.pageCount || null,
        total_chapters: null, total_volumes: null,
        source: "google_books", external_id: v.id || "",
        language: info.language || "",
        ano: parseInt(String(info.publishedDate || "").slice(0, 4)) || null,   // ano desta edição
      };
    });
  }

  // ---------- Open Library (reserva de livros) ----------
  async function openLibrary(termo, lingua = "por") {
    // "language:por" na consulta faz a OL devolver a edição naquele idioma (título, ISBN e capa da edição)
    const url = "https://openlibrary.org/search.json?limit=12&fields=key,title,author_name,cover_i,number_of_pages_median,subject,"
      + "editions,editions.title,editions.isbn,editions.cover_i,editions.publish_date&q=" + encodeURIComponent(termo + (lingua ? " language:" + lingua : ""));
    const r = await fetchT(url);
    if (!r.ok) throw new Error("openlibrary " + r.status);
    const j = await r.json();
    if (lingua && !(j.docs || []).length) return openLibrary(termo, "");   // nada em português → qualquer idioma
    return (j.docs || []).map((d) => {
      const ed = ((d.editions || {}).docs || [])[0] || {};
      const capaId = ed.cover_i || d.cover_i;
      return {
      isbn: (ed.isbn || []).find((x) => x.length === 13) || (ed.isbn || [])[0] || "",
      title: ed.title || d.title || "Sem título",
      authors: (d.author_name || [])[0] || "",   // só o 1º autor
      cover_url: capaId ? `https://covers.openlibrary.org/b/id/${capaId}-M.jpg` : "",
      synopsis: "",
      genres: (d.subject || []).slice(0, 4),
      total_pages: d.number_of_pages_median || null,
      total_chapters: null, total_volumes: null,
      language: lingua === "por" ? "pt" : "",
      ano: parseInt((String((ed.publish_date || [])[0] || "").match(/\d{4}/) || [])[0]) || null,
      source: "google_books", external_id: "",
    }; });
  }

  // junta duas listas sem duplicar (mesma edição = mesmo ISBN; sem ISBN, título+autor)
  function mesclar(a, b) {
    const chave = (x) => (x.isbn || x.external_id || (x.title + "|" + x.authors)).toLowerCase();
    const vistos = new Set(a.map(chave));
    return a.concat(b.filter((x) => !vistos.has(chave(x))));
  }

  async function buscarLivros(termo) {
    // edições em português primeiro, mas sem esconder o resto (o livro certo pode não ter edição PT).
    // A Open Library entra junto: costuma ter a edição brasileira que o Google não põe no topo.
    const [pt, geral, ol] = await Promise.all([
      googleBooks(termo, true).catch(() => []),
      googleBooks(termo, false).catch(() => []),
      openLibrary(termo).catch(() => []),
    ]);
    const ehPt = (x) => /^pt/i.test(x.language || "");   // Google manda "pt" ou "pt-BR"
    const lista = await melhorarCapas([pt.filter(ehPt), ol, geral.filter(ehPt), pt, geral].reduce(mesclar, []).slice(0, 15));
    // relevância: bate com o que foi digitado + edição em português
    const norm = (t) => String(t || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const palavras = norm(termo).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
    const pontos = (x) => (palavras.length && palavras.every((w) => norm(x.title + " " + x.authors).includes(w)) ? 1 : 0)
      + (ehPt(x) ? 1 : 0);
    const amazon = (x) => (x.cover_url.includes("media-amazon") ? 1 : 0);
    // relevância → edição mais recente → capa atual da Amazon (sort estável: empate mantém a ordem acima)
    return lista.sort((a, b) => (pontos(b) - pontos(a)) || ((b.ano || 0) - (a.ano || 0)) || (amazon(b) - amazon(a)));
  }

  // #3 ISBN: detecção e busca exata por ISBN-10 / ISBN-13
  function extrairISBN(termo) {
    const limpo = (termo || "").replace(/[-\s]/g, "");
    return /^(97[89]\d{10}|\d{9}[\dxX])$/.test(limpo) ? limpo : null;
  }
  // BrasilAPI — melhor cobertura de livros brasileiros por ISBN
  async function brasilapiISBN(isbn) {
    const r = await fetchT(`https://brasilapi.com.br/api/isbn/v1/${isbn}`);
    if (!r.ok) return null;
    const d = await r.json();
    return {
      title: d.title || "Sem título",
      authors: (d.authors || [])[0] || "",   // só o 1º (evita tradutor)
      // default=false → se a OL não tiver capa, dá 404 (mostra o ícone) em vez de imagem em branco
      cover_url: d.cover_url || "",
      synopsis: d.synopsis || "",
      genres: d.subjects || [],
      total_pages: d.page_count || null,
      total_chapters: null, total_volumes: null,
      source: "google_books", external_id: isbn,
    };
  }

  async function buscarISBN(isbn) {
    // dados: Google (mais completo) ou BrasilAPI (cobre ISBN brasileiro que o Google não tem).
    // capa: a primeira que existir entre Amazon (atual), Google, BrasilAPI e Open Library.
    const [g, b] = await Promise.all([
      googleBooks("isbn:" + isbn, false).catch(() => []),
      brasilapiISBN(isbn).catch(() => null),
    ]);
    const base = g[0] || b;
    if (base) {
      base.isbn = isbn;
      base.cover_url = await primeiraCapa([capaAmazon(isbn), g[0] && g[0].cover_url, b && b.cover_url, capaOpenLibrary(isbn)]);
      return [base];
    }
    // 3) reserva: Open Library pelo endpoint de ISBN
    try {
      const r = await fetchT(`https://openlibrary.org/isbn/${isbn}.json`);
      if (r.ok) {
        const d = await r.json();
        return [{
          title: d.title || "Sem título",
          authors: "",
          cover_url: await primeiraCapa([capaAmazon(isbn), d.covers && d.covers[0] ? `https://covers.openlibrary.org/b/id/${d.covers[0]}-L.jpg` : ""]),
          synopsis: typeof d.description === "string" ? d.description : (d.description && d.description.value) || "",
          genres: d.subjects || [],
          total_pages: d.number_of_pages || null,
          total_chapters: null, total_volumes: null,
          source: "google_books", external_id: "",
        }];
      }
    } catch {}
    return [];
  }

  // ---------- Jikan / MyAnimeList ----------
  async function jikanManga(termo) {
    const url = "https://api.jikan.moe/v4/manga?limit=12&q=" + encodeURIComponent(termo);
    const r = await fetchT(url);
    if (!r.ok) throw new Error("jikan " + r.status);
    const j = await r.json();
    return (j.data || []).map((m) => ({
      title: m.title || (m.titles && m.titles[0] && m.titles[0].title) || "Sem título",
      authors: (m.authors || []).map((a) => a.name).join(", "),
      cover_url: (m.images && m.images.jpg && m.images.jpg.image_url) || "",
      synopsis: m.synopsis || "",
      genres: (m.genres || []).map((g) => g.name),
      total_pages: null,
      total_chapters: m.chapters || null,
      total_volumes: m.volumes || null,
      source: "jikan", external_id: String(m.mal_id || ""),
      release_status: m.status || "",   // Finished | Publishing | On Hiatus…
    }));
  }

  // ---------- AniList (reserva de mangás) ----------
  async function anilistManga(termo) {
    const query = `query ($s: String) {
      Page(perPage: 12) {
        media(search: $s, type: MANGA) {
          id title { english romaji }
          coverImage { large }
          description(asHtml: false)
          status
          chapters volumes genres
          staff(perPage: 2) { nodes { name { full } } }
        }
      }
    }`;
    const r = await fetchT("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { s: termo } }),
    });
    if (!r.ok) throw new Error("anilist " + r.status);
    const j = await r.json();
    const media = (j.data && j.data.Page && j.data.Page.media) || [];
    return media.map((m) => ({
      title: (m.title && (m.title.english || m.title.romaji)) || "Sem título",
      authors: (m.staff && m.staff.nodes || []).map((s) => s.name && s.name.full).filter(Boolean).join(", "),
      cover_url: (m.coverImage && m.coverImage.large) || "",
      synopsis: limpaHTML(m.description),
      genres: m.genres || [],
      total_pages: null,
      total_chapters: m.chapters || null,
      total_volumes: m.volumes || null,
      source: "jikan", external_id: String(m.id || ""),
      release_status: m.status || "",   // RELEASING | FINISHED | HIATUS…
    }));
  }

  // ---------- MangaBaka: busca de obras (fonte primária de mangá) ----------
  // Open source, atualizado com frequência, rastreia capítulo a capítulo.
  // A própria busca já traz título, autor, capa, sinopse, gêneros, total de
  // capítulos/volumes E o id — então o item já nasce completo, sem passo extra.
  function mapMangabaka(s) {
    const cov = s.cover || {};
    const capa = (cov.x350 && cov.x350.x1) || (cov.x250 && cov.x250.x1) || (cov.raw && cov.raw.url) || "";
    const nch = Math.floor(parseFloat(s.total_chapters));
    const nvol = Math.floor(parseFloat(s.final_volume));
    return {
      title: s.title || "Sem título",
      authors: (s.authors || []).join(", "),
      cover_url: capa,
      synopsis: limpaHTML(s.description),
      genres: (s.genres || []).map(capGenero),   // school_life → School Life
      total_pages: null,
      total_chapters: Number.isFinite(nch) && nch > 0 ? nch : null,
      total_volumes: Number.isFinite(nvol) && nvol > 0 ? nvol : null,
      source: "mangabaka", external_id: String(s.id || ""),
      mangabaka_id: String(s.id || ""),
      release_status: s.status || "",   // releasing | completed | hiatus | cancelled…
    };
  }
  // esconde versões eróticas/fan-made (doujinshi, hentai, pornográfico).
  // NÃO filtra ecchi/mature/suggestive — isso é o mangá oficial (ex.: Dandadan).
  function serieAdulta(s) {
    const cr = String(s.content_rating || "").toLowerCase();
    if (cr === "pornographic" || cr === "erotica") return true;
    const g = (s.genres || []).map((x) => String(x).toLowerCase());
    return g.includes("hentai") || g.includes("doujinshi");
  }
  async function mangabakaBuscar(termo) {
    const r = await fetchT("https://api.mangabaka.org/v1/series/search?limit=20&q=" + encodeURIComponent(termo));
    if (!r.ok) throw new Error("mangabaka " + r.status);
    const j = await r.json();
    return (j.data || []).filter((s) => !serieAdulta(s)).map(mapMangabaka).slice(0, 12);
  }

  async function buscarMangas(termo) {
    try {
      const mb = await mangabakaBuscar(termo);
      if (mb.length) return mb;
    } catch {}
    try {
      const j = await jikanManga(termo);   // reserva 1
      if (j.length) return j;
    } catch {}
    try { return await anilistManga(termo); } catch { return []; }  // reserva 2
  }

  // ---------- MangaBaka: id + último capítulo lançado ----------
  // Jikan/AniList deixam o total vazio enquanto a obra está em andamento.
  // A MangaBaka rastreia capítulo a capítulo (inclusive de mangás licenciados),
  // então dá pra descobrir quantos já saíram. Retorna { id, ultimo } ou null.
  async function mangabakaInfo(titulo, id) {
    try {
      let serie = null;
      if (id) {
        const r = await fetchT(`https://api.mangabaka.org/v1/series/${id}`);
        if (r.ok) serie = (await r.json()).data;
      }
      if (!serie) {
        const r = await fetchT("https://api.mangabaka.org/v1/series/search?limit=1&q=" + encodeURIComponent(titulo));
        if (!r.ok) return null;
        serie = ((await r.json()).data || [])[0];
      }
      if (!serie) return null;
      const n = Math.floor(parseFloat(serie.total_chapters));
      return { id: String(serie.id), ultimo: Number.isFinite(n) && n > 0 ? n : null, status: serie.status || "" };
    } catch { return null; }
  }

  // #capítulos: número do último capítulo lançado via MangaBaka.
  // Retorna { ultimo, mangabaka_id, release_status }.
  async function capitulosLancados(titulo, mangabakaId) {
    const mb = await mangabakaInfo(titulo, mangabakaId);
    const release_status = (mb && mb.status) || "";
    if (mb && mb.ultimo) return { ultimo: mb.ultimo, mangabaka_id: mb.id, release_status };
    return { ultimo: null, mangabaka_id: (mb && mb.id) || mangabakaId || "", release_status };
  }

  // #5 opções de capa de TODAS as fontes usadas (dedup, sem vazias)
  async function buscarCapas(kind, termo) {
    const urls = new Set();
    const push = (u) => { if (u && typeof u === "string") urls.add(u); };
    if (kind === "manga") {
      await Promise.all([
        mangabakaBuscar(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        jikanManga(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        anilistManga(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
      ]);
    } else {
      const isbn = extrairISBN(termo);
      await Promise.all([
        googleBooks(termo, false).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        openLibrary(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        isbn ? buscarISBN(isbn).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}) : Promise.resolve(),
      ]);
      if (isbn) { const amz = capaAmazon(isbn); if (await imagemValida(amz)) push(amz); }
    }
    return [...urls].slice(0, 24);
  }

  // ---------- roteador por categoria ----------
  async function buscar(kind, termo) {
    termo = (termo || "").trim();
    if (!termo) return [];
    if (kind === "manga") return buscarMangas(termo);
    const isbn = extrairISBN(termo);           // #3 se for ISBN, busca exata
    if (isbn) return buscarISBN(isbn);
    return buscarLivros(termo); // livro e quadrinho
  }

  return { buscar, googleBooks, openLibrary, jikanManga, anilistManga,
           mangabakaBuscar, mangabakaInfo, capitulosLancados,
           buscarISBN, extrairISBN, buscarCapas };
})();
