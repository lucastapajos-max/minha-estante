# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um único usuário: o dono do app (Lucas), leitor de **livros** (físicos e no Kindle) e de **mangás em
andamento**. Usa no **celular Android** (PWA instalado) e no **Firefox do PC**.

Os momentos de uso mais comuns:
- **Logo depois de ler**: celular na mão, muitas vezes à noite, registrar onde parou (página, capítulo
  ou posição do Kindle). Precisa ser rápido.
- **Pra ver o histórico**: estatísticas, sequência, retrospectiva do ano. Momento de reflexão, sem pressa.
- Também: abrir pelo aviso de capítulo novo de mangá, e olhar a fila pra escolher a próxima leitura.

A Estante também vai entrar no **portfólio** do dono como projeto, numa versão demo que não usa os
dados reais dele.

## Product Purpose

Ser o acervo pessoal de leituras: saber o que está lendo, onde parou, o que vem depois e como foi a
trajetória. Três trabalhos com **peso igual**, nenhum se sobrepõe aos outros:
1. **Registrar rápido** o progresso, com o mínimo de toques.
2. **Refletir**: ver a própria trajetória com prazer (histórico, números, retrospectiva compartilhável).
3. **Manter em dia**: não perder capítulo novo de mangá nem esquecer o que estava lendo.

Sucesso = o dono usa todo dia sem atrito e gosta de voltar pra olhar o que já leu.

## Positioning

É uma ferramenta **sob medida e privada**, não uma rede social de leitura: sem perfil público, sem
seguidores, sem feed. O que um app genérico não oferece junto:
- progresso de livro do Kindle pela **posição** (granular, da própria edição digital);
- **aviso por push de capítulo novo** de mangá (robô no GitHub Actions + MangaBaka) com o app fechado;
- livros e mangás no mesmo acervo, cada um com sua unidade (páginas, posição, capítulos/volumes).

## Operating Context

- Registro de progresso: ficha da obra ou ação rápida (botão direito no PC, segurar no celular).
- Fila "Próxima leitura" no filtro Quero ler; "Começar a ler" move pra Lendo.
- Histórico de sessões, estatísticas e meta anual; retrospectiva do ano com imagem pra compartilhar
  (WhatsApp/Instagram).
- Notificações: o robô roda a cada 6h, atualiza o total de capítulos e manda push por dispositivo.
- Importação de lista (ex.: Skoob) e backup/restauração em JSON.

## Capabilities and Constraints

- PWA estático (HTML/CSS/JS puro, **sem build e sem Node**), offline via service worker.
- Dados no **Supabase** (login por e-mail/senha, RLS); modo local em localStorage pra testes.
- Deploy em Cloudflare Workers (`minha-estante.lucastapajos.workers.dev`) a cada `git push`.
- Buscas externas: Google Books / Open Library / BrasilAPI (livros), MangaBaka (mangás; Jikan/AniList
  como reserva). CSP restringe cada domínio externo.
- Biometria (Windows Hello / digital) como tranca local opcional.
- Tudo em **português do Brasil**.
- A categoria **Quadrinhos** existe no código, mas está oculta na interface porque o dono não lê
  quadrinhos hoje. Reativar é uma decisão do dono.
- **Em aberto:** como será a versão demo do portfólio (dados de exemplo e de onde vêm, sem Supabase).

## Brand Commitments

- Nome: **Estante**.
- Voz: português direto e calmo, frases curtas, sem jargão técnico; o app fala do jeito que o dono
  falaria com ele mesmo. Erros dizem o que fazer, sem pedir desculpas.
- Sistema visual registrado em `DESIGN.md` (V2): é a referência visual obrigatória.

## Evidence on Hand

- Acervo real do dono no Supabase (privado): não pode aparecer no portfólio.
- Capas vêm das APIs externas; não há imagens próprias.
- Não existem depoimentos, usuários externos nem métricas públicas, e não devem ser inventados.

## Product Principles

1. **Atrito mínimo no registro.** Atualizar onde parou tem que caber em poucos segundos, com uma mão.
2. **Calma acima de engajamento.** Nada de notificação ou métrica pra prender; o app serve à leitura, não o contrário.
3. **Fiel a como cada obra é lida.** Página, posição do Kindle e capítulo são unidades diferentes e respeitadas.
4. **Privado por padrão.** Os dados são do dono; compartilhar é sempre um gesto explícito dele.
5. **Sob medida, mas apresentável.** Decisões podem seguir o jeito do dono, sem deixar de funcionar como peça de portfólio.
