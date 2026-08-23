/* ============================================================
   apis.js — integrações de busca externa (com reservas)
   ------------------------------------------------------------
   Livros / Quadrinhos:
     1º Google Books  (dados ricos: páginas, sinopse, categorias)
     2º Open Library  (reserva grátis, SEM cota, se o Google falhar)
   Mangás:
     1º Jikan/MyAnimeList
     2º AniList (GraphQL, reserva SEM chave, se o Jikan falhar)

   Toda busca devolve uma lista NORMALIZADA no mesmo formato,
   pronta para virar um item do Store:
     { title, authors, cover_url, synopsis, genres,
       total_pages, total_chapters, total_volumes,
       source, external_id }
   ============================================================ */
const APIs = (() => {

  const limpaHTML = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+\n/g, "\n").trim();

  // fetch com timeout (aborta se a API demorar demais — não trava a importação)
  async function fetchT(url, opts = {}, ms = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  // ---------- Google Books ----------
  // ptOnly=true restringe a edições em português (langRestrict=pt)
  async function googleBooks(termo, ptOnly) {
    let url = "https://www.googleapis.com/books/v1/volumes?maxResults=12&country=BR&q=" + encodeURIComponent(termo);
    if (ptOnly) url += "&langRestrict=pt";
    const r = await fetchT(url);
    if (!r.ok) throw new Error("google " + r.status);
    const j = await r.json();
    return (j.items || []).map((v) => {
      const info = v.volumeInfo || {};
      let capa = (info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail)) || "";
      capa = capa.replace("http://", "https://").replace("&edge=curl", "");
      return {
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
      };
    });
  }

  // ---------- Open Library (reserva de livros) ----------
  async function openLibrary(termo) {
    const url = "https://openlibrary.org/search.json?limit=12&fields=title,author_name,cover_i,number_of_pages_median,first_publish_year,subject&q="
      + encodeURIComponent(termo);
    const r = await fetchT(url);
    if (!r.ok) throw new Error("openlibrary " + r.status);
    const j = await r.json();
    return (j.docs || []).map((d) => ({
      title: d.title || "Sem título",
      authors: (d.author_name || [])[0] || "",   // só o 1º autor
      cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : "",
      synopsis: "",
      genres: (d.subject || []).slice(0, 4),
      total_pages: d.number_of_pages_median || null,
      total_chapters: null, total_volumes: null,
      source: "google_books", external_id: "",
    }));
  }

  // junta duas listas sem duplicar (por external_id ou título+autor)
  function mesclar(a, b) {
    const chave = (x) => (x.external_id || (x.title + "|" + x.authors)).toLowerCase();
    const vistos = new Set(a.map(chave));
    return a.concat(b.filter((x) => !vistos.has(chave(x))));
  }

  async function buscarLivros(termo) {
    try {
      // #6 PT-BR: se houver QUALQUER edição em português, mostra só as PT
      const pt = await googleBooks(termo, true).catch(() => []);
      const soPt = pt.filter((x) => !x.language || x.language === "pt");
      if (soPt.length) return soPt;
      // nenhuma edição PT → amplia, mas joga eventuais PT pro topo
      const geral = await googleBooks(termo, false).catch(() => []);
      if (geral.length) {
        geral.sort((a, b) => (b.language === "pt") - (a.language === "pt"));
        return geral;
      }
      return await openLibrary(termo);   // reserva
    } catch {
      return await openLibrary(termo);   // reserva
    }
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
      cover_url: d.cover_url || `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`,
      synopsis: d.synopsis || "",
      genres: d.subjects || [],
      total_pages: d.page_count || null,
      total_chapters: null, total_volumes: null,
      source: "google_books", external_id: isbn,
    };
  }

  async function buscarISBN(isbn) {
    // 1) Google Books por isbn: — dados ricos (autor, capa, páginas) quando tem
    try {
      const g = await googleBooks("isbn:" + isbn, false);
      if (g.length) return g;
    } catch {}
    // 2) BrasilAPI — cobre ISBN brasileiro que o Google não tem (título ao menos)
    try {
      const b = await brasilapiISBN(isbn);
      if (b) return [b];
    } catch {}
    // 3) reserva: Open Library pelo endpoint de ISBN
    try {
      const r = await fetchT(`https://openlibrary.org/isbn/${isbn}.json`);
      if (r.ok) {
        const d = await r.json();
        return [{
          title: d.title || "Sem título",
          authors: "",
          cover_url: d.covers && d.covers[0] ? `https://covers.openlibrary.org/b/id/${d.covers[0]}-M.jpg` : "",
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
    }));
  }

  async function buscarMangas(termo) {
    try {
      const j = await jikanManga(termo);
      if (j.length) return j;
      return await anilistManga(termo);  // Jikan vazio → reserva
    } catch {
      return await anilistManga(termo);  // Jikan falhou (ex.: 504) → reserva
    }
  }

  // ---------- MangaDex: id + último capítulo lançado ----------
  // Jikan/AniList deixam o total vazio enquanto a obra está em andamento.
  // A MangaDex rastreia capítulo a capítulo, então dá pra descobrir quantos
  // já saíram. Retorna { id, ultimo } ou null.
  async function mangadexInfo(titulo) {
    try {
      const s = await fetchT("https://api.mangadex.org/manga?limit=1&title=" + encodeURIComponent(titulo));
      if (!s.ok) return null;
      const sj = await s.json();
      const m = sj.data && sj.data[0];
      if (!m) return null;
      const c = await fetchT(`https://api.mangadex.org/chapter?manga=${m.id}&limit=1&order[chapter]=desc`);
      if (!c.ok) return { id: m.id, ultimo: null };
      const cj = await c.json();
      const cap = cj.data && cj.data[0] && cj.data[0].attributes.chapter;
      const n = Math.floor(parseFloat(cap));
      return { id: m.id, ultimo: Number.isFinite(n) && n > 0 ? n : null };
    } catch {
      return null;
    }
  }
  // atalho: só o número do último capítulo (mantém compatibilidade)
  async function mangadexUltimoCapitulo(titulo) {
    const info = await mangadexInfo(titulo);
    return info ? info.ultimo : null;
  }

  // ---------- MangaDex: capa (arte) por título ----------
  async function mangadexCapa(termo) {
    try {
      const s = await fetchT("https://api.mangadex.org/manga?limit=1&includes[]=cover_art&title=" + encodeURIComponent(termo));
      if (!s.ok) return null;
      const m = (await s.json()).data?.[0];
      if (!m) return null;
      const cover = (m.relationships || []).find((r) => r.type === "cover_art");
      const file = cover && cover.attributes && cover.attributes.fileName;
      return file ? `https://uploads.mangadex.org/covers/${m.id}/${file}.512.jpg` : null;
    } catch { return null; }
  }

  // #5 opções de capa de TODAS as fontes usadas (dedup, sem vazias)
  async function buscarCapas(kind, termo) {
    const urls = new Set();
    const push = (u) => { if (u && typeof u === "string") urls.add(u); };
    if (kind === "manga") {
      await Promise.all([
        jikanManga(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        anilistManga(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        mangadexCapa(termo).then((u) => push(u)).catch(() => {}),
      ]);
    } else {
      const isbn = extrairISBN(termo);
      await Promise.all([
        googleBooks(termo, false).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        openLibrary(termo).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}),
        isbn ? buscarISBN(isbn).then((rs) => rs.forEach((r) => push(r.cover_url))).catch(() => {}) : Promise.resolve(),
      ]);
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
           mangadexInfo, mangadexUltimoCapitulo, buscarISBN, extrairISBN, buscarCapas };
})();
