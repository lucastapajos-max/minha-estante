/* ============================================================
   demo.js — estante de exemplo para quem abre o app com ?demo
   ------------------------------------------------------------
   Só é usada no modo demo (store.js), que roda no navegador do
   visitante e nunca toca no Supabase. Cobre todos os filtros:
   os 5 status nas duas abas, físico e digital, dois anos de
   leitura, autor repetido e uma coleção (O Senhor dos Anéis). Capas de livro são da
   edição atual na Amazon (pelo ISBN); mangás vêm da MangaBaka.
   As datas são relativas a hoje, para as estatísticas não
   envelhecerem.
   ============================================================ */
window.ESTANTE_DEMO = (() => {
  const dia = 864e5;
  const ha = (d) => new Date(Date.now() - d * dia).toISOString();
  // capa da edição atual na Amazon, pelo ISBN-10 (o mesmo caminho que apis.js usa)
  const capaAZ = (i10) => `https://m.media-amazon.com/images/P/${i10}.01._SCLZZZZZZZ_.jpg`;
  const capaMB = (b64) => `https://cdn.mangabaka.dev/imgproxy/plain/x350@1/${b64}`;
  const COL = "demo-col-sda";

  const livro = (o) => ({ kind: "livro", source: "openlibrary", ...o });
  const manga = (o) => ({ kind: "manga", source: "mangabaka", ...o });

  const items = [
    livro({ id: "demo-1", title: "Torto Arado", authors: "Itamar Vieira Junior", isbn: "9786580309313", cover_url: capaAZ("6580309318"),
      synopsis: "Duas irmãs crescem numa fazenda do sertão baiano, ligadas por um acidente na infância.",
      status: "lendo", total_pages: 280, current_page: 161, pos_atual: 3120, pos_total: 5410, format: "digital",
      genres: ["Realismo mágico", "Literatura nacional"], started_at: ha(16) }),
    livro({ id: "demo-2", title: "Quincas Borba", authors: "Machado de Assis", isbn: "9788594318855", cover_url: capaAZ("8594318855"),
      synopsis: "Rubião herda a fortuna e o cachorro do filósofo Quincas Borba e se muda para a Corte.",
      status: "lendo", total_pages: 246, current_page: 112, format: "fisico",
      genres: ["Clássico", "Literatura nacional"], started_at: ha(10) }),
    livro({ id: "demo-3", title: "Dom Casmurro", authors: "Machado de Assis", isbn: "9788525406798", cover_url: capaAZ("8525406791"),
      synopsis: "Bento Santiago revê a vida e o casamento com Capitu, e a dúvida que o consome.",
      status: "lido", total_pages: 269, current_page: 269, format: "fisico", rating: 5,
      review: "Releitura. A narração não confiável funciona ainda melhor da segunda vez.",
      genres: ["Clássico", "Literatura nacional"], started_at: ha(70), finished_at: ha(55) }),
    livro({ id: "demo-4", title: "Memórias Póstumas de Brás Cubas", authors: "Machado de Assis", isbn: "9786584952126", cover_url: capaAZ("6584952126"),
      synopsis: "Um defunto autor conta a própria vida, com ironia e sem pressa.",
      status: "lido", total_pages: 409, current_page: 409, format: "fisico", rating: 5,
      genres: ["Clássico", "Literatura nacional"], started_at: ha(430), finished_at: ha(412) }),
    livro({ id: "demo-5", title: "A Hora da Estrela", authors: "Clarice Lispector", isbn: "9786555950236", cover_url: capaAZ("6555950234"),
      synopsis: "Rodrigo S.M. narra a história de Macabéa, uma nordestina que vive no Rio de Janeiro.",
      status: "lido", total_pages: 96, current_page: 96, format: "digital", rating: 4,
      genres: ["Psicológico", "Literatura nacional"], started_at: ha(150), finished_at: ha(146) }),
    livro({ id: "demo-6", title: "Vidas Secas", authors: "Graciliano Ramos", isbn: "9786580210886", cover_url: capaAZ("6580210885"),
      synopsis: "Uma família de retirantes atravessa o sertão fugindo da seca.",
      status: "lido", total_pages: 214, current_page: 214, format: "fisico", rating: 4,
      genres: ["Clássico", "Literatura nacional"], started_at: ha(385), finished_at: ha(377) }),
    livro({ id: "demo-7", title: "Capitães da Areia", authors: "Jorge Amado", isbn: "9788563397386", cover_url: capaAZ("8563397389"),
      synopsis: "Um bando de meninos de rua vive num trapiche abandonado em Salvador.",
      status: "pausado", total_pages: 298, current_page: 140, format: "fisico",
      genres: ["Literatura nacional"], started_at: ha(95) }),
    livro({ id: "demo-8", title: "Ensaio sobre a Cegueira", authors: "José Saramago", isbn: "9788543801216", cover_url: capaAZ("8543801214"),
      synopsis: "Uma epidemia de cegueira branca se espalha por uma cidade sem nome.",
      status: "abandonado", total_pages: 352, current_page: 120, format: "digital",
      genres: ["Distopia", "Ficção"], started_at: ha(200) }),
    livro({ id: "demo-9", title: "O Pequeno Príncipe", authors: "Antoine de Saint-Exupéry", isbn: "9788522014743", cover_url: capaAZ("8522014744"),
      synopsis: "Um aviador perdido no deserto conhece um menino vindo de outro planeta.",
      status: "quero_ler", total_pages: 112, format: "fisico", fila_ordem: 2, genres: ["Ficção"] }),
    livro({ id: "demo-10", title: "O Cortiço", authors: "Aluísio Azevedo", isbn: "9788578651282", cover_url: capaAZ("8578651286"),
      synopsis: "A vida coletiva de um cortiço no Rio de Janeiro do século XIX.",
      status: "quero_ler", total_pages: 463, format: "digital", fila_ordem: 3, genres: ["Clássico", "Literatura nacional"] }),

    livro({ id: "demo-17", title: "A Sociedade do Anel", authors: "J.R.R. Tolkien", isbn: "9788595086333", cover_url: capaAZ("8595086338"),
      synopsis: "Frodo herda um anel perigoso e parte do Condado com uma comitiva para destruí-lo.",
      status: "lido", total_pages: 582, current_page: 582, format: "fisico", collection_id: COL, rating: 5,
      genres: ["Fantasia", "Clássico"], started_at: ha(330), finished_at: ha(300) }),
    livro({ id: "demo-18", title: "As Duas Torres", authors: "J.R.R. Tolkien", isbn: "9788595086326", cover_url: capaAZ("859508632X"),
      synopsis: "A comitiva se divide: Frodo e Sam seguem para Mordor, e os outros enfrentam a guerra em Rohan.",
      status: "lido", total_pages: 452, current_page: 452, format: "fisico", collection_id: COL, rating: 4,
      genres: ["Fantasia", "Clássico"], started_at: ha(110), finished_at: ha(80) }),
    livro({ id: "demo-19", title: "O Retorno do Rei", authors: "J.R.R. Tolkien", isbn: "9788595086371", cover_url: capaAZ("8595086370"),
      synopsis: "A guerra pela Terra-média chega ao fim enquanto Frodo e Sam se aproximam da Montanha da Perdição.",
      status: "quero_ler", total_pages: 547, format: "fisico", collection_id: COL, fila_ordem: 1,
      genres: ["Fantasia", "Clássico"] }),

    manga({ id: "demo-11", title: "One Piece", authors: "Eiichirou Oda", mangabaka_id: "377", release_status: "releasing",
      cover_url: capaMB("aHR0cHM6Ly9pbWFnZXMubWFuZ2FiYWthLmRldi8yLzYvOS9lLzMvMS8yLzAvNzU2NC80ZWM3L2ExODYvNDliODZkMGFkZmY5"),
      synopsis: "Luffy e sua tripulação navegam atrás do tesouro deixado pelo Rei dos Piratas.",
      status: "lendo", total_chapters: 1198, current_chapter: 1102, format: "digital",
      genres: ["action", "adventure", "comedy", "fantasy", "shounen"], started_at: ha(120) }),
    manga({ id: "demo-12", title: "Frieren: Beyond Journey's End", authors: "Kanehito Yamada", mangabaka_id: "1995", release_status: "hiatus",
      cover_url: capaMB("aHR0cHM6Ly9pbWFnZXMubWFuZ2FiYWthLmRldi8yL2MvOC9mL2MvYS9iLzcvOGI2Yi80Yjg1L2IyM2QvNDlkMGJmMDhhZjc2"),
      synopsis: "Depois de derrotar o Rei Demônio, uma elfa maga descobre o que perdeu ao não dar valor ao tempo.",
      status: "quero_ler", total_chapters: 147, format: "fisico", fila_ordem: 1,
      genres: ["adventure", "drama", "fantasy", "slice_of_life"] }),
    manga({ id: "demo-13", title: "Death Note", authors: "Tsugumi Ooba", mangabaka_id: "1824", release_status: "completed",
      cover_url: capaMB("aHR0cHM6Ly9pbWFnZXMubWFuZ2FiYWthLmRldi84LzkvMS83LzEvMS9lLzAvMmI4Mi80OTNhL2IwZGYvZDhjNDM0ZDFiNDQy"),
      synopsis: "Um estudante encontra um caderno que mata quem tiver o nome escrito nele.",
      status: "lido", total_chapters: 108, current_chapter: 108, format: "fisico", rating: 5,
      genres: ["mystery", "psychological", "supernatural", "thriller", "shounen"], started_at: ha(450), finished_at: ha(420) }),
    manga({ id: "demo-14", title: "Slam Dunk", authors: "Takehiko Inoue", mangabaka_id: "13074", release_status: "completed",
      cover_url: capaMB("aHR0cHM6Ly9pbWFnZXMubWFuZ2FiYWthLmRldi82LzcvNy9lLzIvMi85LzEvOGJlMi80ODViLzg5ZmQvNzlkYTYxZTM1NTcx"),
      synopsis: "Um delinquente entra para o time de basquete da escola para impressionar uma garota.",
      status: "lido", total_chapters: 276, current_chapter: 276, format: "fisico", rating: 5,
      genres: ["comedy", "drama", "sports", "school_life", "shounen"], started_at: ha(220), finished_at: ha(160) }),
    manga({ id: "demo-15", title: "Vagabond", authors: "Takehiko Inoue", mangabaka_id: "1566", release_status: "hiatus",
      cover_url: capaMB("aHR0cHM6Ly9pbWFnZXMubWFuZ2FiYWthLmRldi84LzEvMy80LzEvYi8xLzUvNjQzMS80MWEzL2I4YWEvNjM4OGQ2MWE2M2Y4"),
      synopsis: "A trajetória do espadachim Miyamoto Musashi no Japão do século XVII.",
      status: "pausado", total_chapters: 327, current_chapter: 180, format: "fisico",
      genres: ["action", "historical", "martial_arts", "seinen"], started_at: ha(60) }),
    manga({ id: "demo-16", title: "Chainsaw Man", authors: "Tatsuki Fujimoto", mangabaka_id: "1677", release_status: "completed",
      cover_url: capaMB("aHR0cHM6Ly9pbWFnZXMubWFuZ2FiYWthLmRldi9lL2YvYS83L2UvNS83L2MvNDE2Ni80ZTI0LzkwZmIvOTk3ODZjYzU4ZmIw"),
      synopsis: "Denji, endividado, se funde ao seu demônio-motosserra e vira caçador de demônios.",
      status: "abandonado", total_chapters: 232, current_chapter: 40, format: "digital",
      genres: ["action", "horror", "supernatural", "shounen"], started_at: ha(35) }),
  ].map((i) => ({ created_at: i.started_at || ha(5), updated_at: i.finished_at || i.started_at || ha(5), ...i }));

  // sessões de leitura: o progresso de cada obra dividido em dias, do início até a conclusão (ou hoje)
  const sessions = [];
  items.forEach((i) => {
    const feito = i.kind === "livro" ? i.current_page : i.current_chapter;
    if (!i.started_at || !feito) return;
    const ini = Date.parse(i.started_at);
    // lido: até a conclusão; lendo: até ontem; pausado/abandonado: parou umas semanas depois de começar
    const fim = i.finished_at ? Date.parse(i.finished_at)
      : i.status === "lendo" ? Date.now() - dia : Math.min(ini + 21 * dia, Date.now() - 7 * dia);
    const n = Math.max(1, Math.min(8, Math.round((fim - ini) / (3 * dia))));
    let pos = 0;
    for (let k = 1; k <= n; k++) {
      const ate = Math.round((feito * k) / n);
      sessions.push({ id: `${i.id}-s${k}`, item_id: i.id, date: new Date(ini + ((fim - ini) * k) / n).toISOString(),
        amount: ate - pos, unit: i.kind === "livro" ? "paginas" : "capitulos", to_pos: ate, note: "" });
      pos = ate;
    }
  });

  const ano = new Date().getFullYear();
  return {
    items, sessions,
    collections: [{ id: COL, name: "O Senhor dos Anéis", kind: "livro", created_at: ha(330) }],
    goals: { [ano]: 12 },
  };
})();
