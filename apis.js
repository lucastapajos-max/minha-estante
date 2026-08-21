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

  // ---------- Google Books ----------
  async function googleBooks(termo) {
    const url = "https://www.googleapis.com/books/v1/volumes?maxResults=12&q=" + encodeURIComponent(termo);
    const r = await fetch(url);
    if (!r.ok) throw new Error("google " + r.status);
    const j = await r.json();
    return (j.items || []).map((v) => {
      const info = v.volumeInfo || {};
      let capa = (info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail)) || "";
      capa = capa.replace("http://", "https://").replace("&edge=curl", "");
      return {
        title: info.title || "Sem título",
        authors: (info.authors || []).join(", "),
        cover_url: capa,
        synopsis: info.description || "",
        genres: info.categories || [],
        total_pages: info.pageCount || null,
        total_chapters: null, total_volumes: null,
        source: "google_books", external_id: v.id || "",
      };
    });
  }

  // ---------- Open Library (reserva de livros) ----------
  async function openLibrary(termo) {
    const url = "https://openlibrary.org/search.json?limit=12&fields=title,author_name,cover_i,number_of_pages_median,first_publish_year,subject&q="
      + encodeURIComponent(termo);
    const r = await fetch(url);
    if (!r.ok) throw new Error("openlibrary " + r.status);
    const j = await r.json();
    return (j.docs || []).map((d) => ({
      title: d.title || "Sem título",
      authors: (d.author_name || []).slice(0, 3).join(", "),
      cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : "",
      synopsis: "",
      genres: (d.subject || []).slice(0, 4),
      total_pages: d.number_of_pages_median || null,
      total_chapters: null, total_volumes: null,
      source: "google_books", external_id: "",
    }));
  }

  async function buscarLivros(termo) {
    try {
      const g = await googleBooks(termo);
      if (g.length) return g;
      return await openLibrary(termo);   // Google respondeu vazio → tenta reserva
    } catch {
      return await openLibrary(termo);   // Google falhou (ex.: cota) → reserva
    }
  }

  // ---------- Jikan / MyAnimeList ----------
  async function jikanManga(termo) {
    const url = "https://api.jikan.moe/v4/manga?limit=12&q=" + encodeURIComponent(termo);
    const r = await fetch(url);
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
    const r = await fetch("https://graphql.anilist.co", {
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

  // ---------- MangaDex: último capítulo lançado ----------
  // Jikan/AniList deixam o total vazio enquanto a obra está em andamento.
  // A MangaDex rastreia capítulo a capítulo, então dá pra descobrir quantos
  // já saíram. Retorna um inteiro (ex.: 74) ou null se não achar.
  async function mangadexUltimoCapitulo(titulo) {
    try {
      const s = await fetch("https://api.mangadex.org/manga?limit=1&title=" + encodeURIComponent(titulo));
      if (!s.ok) return null;
      const sj = await s.json();
      const m = sj.data && sj.data[0];
      if (!m) return null;
      const c = await fetch(`https://api.mangadex.org/chapter?manga=${m.id}&limit=1&order[chapter]=desc`);
      if (!c.ok) return null;
      const cj = await c.json();
      const cap = cj.data && cj.data[0] && cj.data[0].attributes.chapter;
      const n = Math.floor(parseFloat(cap));
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  // ---------- roteador por categoria ----------
  async function buscar(kind, termo) {
    termo = (termo || "").trim();
    if (!termo) return [];
    if (kind === "manga") return buscarMangas(termo);
    return buscarLivros(termo); // livro e quadrinho
  }

  return { buscar, googleBooks, openLibrary, jikanManga, anilistManga, mangadexUltimoCapitulo };
})();
