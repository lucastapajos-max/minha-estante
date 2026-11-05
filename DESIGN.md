# Estante — sistema visual (V2)

## 1. Atmosfera

Um acervo pessoal de leituras visto como **sala de projeção**: a interface quase desaparece e as
**capas são a única fonte de cor**. A calma vem do Runway (sem sombra, sem gradiente, bordas finíssimas,
cinza frio). A identidade vem do The Verge (**a fonte é a marca**: um display pesado usado grande, ao lado
de rótulos leves). O elemento próprio do app é a **fita marcadora**: o progresso de cada obra é uma fita
carmim que desce pela capa até onde você parou.

Leitura é calma: nada pisca, nada grita. A ousadia fica concentrada em dois lugares só: o tamanho da
tipografia nos momentos-herói e a fita.

## 2. Paleta e papéis

### Escuro (padrão)
| Token | Hex | Papel |
|---|---|---|
| `--bg` | `#121316` | fundo (grafite) |
| `--bg-card` | `#1b1d21` | superfícies: modais, campos, menus |
| `--bg-card-2` | `#23262b` | superfície elevada / trilhos de barra |
| `--linha` | `#2a2d33` | bordas finíssimas e divisórias |
| `--txt` | `#ecedef` | texto principal ("papel") |
| `--txt-suave` | `#adb2b9` | texto secundário |
| `--txt-fraco` | `#8a919b` | metadados (ardósia fria) |
| `--acento` | `#c4384e` | **carmim da fita** — fita, aba ativa, foco. Nunca fundo de botão. |

### Claro
Fundo `#f4f5f7`, superfícies `#ffffff`/`#e9ebef`, linha `#dfe2e7`, texto `#16171a`,
secundário `#4a4f57`, ardósia `#646b75`, carmim `#b32e44` (mais fundo, pra contraste em fundo claro).

Ação principal = botão **cor do texto** (papel no escuro, tinta no claro). O carmim é reservado à fita.

**Carmim como texto pequeno:** o `--acento` puro passa como traço, fita e sublinha (3:1), mas **não como
letra pequena no escuro** (3.6:1). Texto em carmim usa `--acento-txt` (`#e06a7c` no escuro, 5.8:1; no claro é o
próprio `#b32e44`). Itens ativos de navegação ficam na cor do texto, com o traço carmim como marcador.

## 3. Tipografia

- **Bricolage Grotesque** (variável, 300–800) em tudo. Hospedada em `fonts/` (PWA offline, CSP `font-src 'self'`).
- **Newsreader** só em texto de leitura longa: sinopse e resenha. Nunca na interface.

| Papel | Tamanho | Peso | Entrelinha | Tracking |
|---|---|---|---|---|
| Nome do app (masthead) | 40–46px | 800 | 0.9 | -0.035em |
| Título da ficha | 34px | 800 | 0.95 | -0.03em |
| Número-herói (%, estatísticas) | 44–56px | 800 | 0.9 | -0.04em |
| Sussurro (subtítulo, autor) | 14–15px | 300 | 1.3 | 0 |
| Interface | 13–15px | 400–600 | 1.4 | 0 |

Sem CAIXA-ALTA em rótulos. Sem negrito "gritando" em texto corrido.

## 4. Componentes

- **Fita marcadora**: traço de 7px, carmim chapado, rabo bifurcado (entalhe de 4px). Fica a 6px da borda
  direita da capa e sai 6px pela cabeça do livro. Uma penumbra curta (`drop-shadow(-1px 1.5px 2px rgba(0,0,0,.4))`)
  separa da capa. Comprimento = % lido (mínimo: só a ponta).
- **Aba ativa**: sublinha de 2px em carmim (mesmo traço da fita).
- **Card da biblioteca**: sem caixa. Capa (raio 4px) + título + sussurro. Sem elevação no hover.
- **Ficha cinematográfica**: a capa vira atmosfera desfocada no topo do modal, e o conteúdo emerge do
  escuro. Título grande; % lido como número-herói.
- **Botões**: raio 6px. Primário = cor do texto; secundário = contorno de 1px.
- **Capa tipográfica**: obra sem capa (ou com capa quebrada) vira um bloco grafite com o título em Bricolage 800
  e o autor em 300, alinhados à esquerda. A fita continua por cima. Nunca um retângulo vazio.
- **Estatísticas**: números grandes sobre um fio de 1px, sem caixa, sem ícone decorativo e sem frase de incentivo.
- **Status**: rótulo discreto sobre a capa com ponto de cor do status (as cores de status nunca viram fundo grande).

## 5. Profundidade

Zero sombras de elevação. Profundidade vem de: superfície um degrau mais clara, borda de 1px, escurecimento
do fundo atrás dos modais. A única sombra do sistema é a penumbra da fita.

## 6. Faça / Não faça

- Faça: deixar a capa ser a cor; usar o tamanho da fonte como ênfase; carmim só na fita e em estados ativos.
- Não faça: gradiente decorativo, sombra de card, pílulas arredondadas, cor de acento como fundo de botão,
  rótulos em caixa-alta, segunda cor de acento.

## Inspirado em

- **Runway** — interface invisível, mídia como cor, zero sombra, cinza frio, hero cinematográfico.
  *Adaptado:* sem fonte única proprietária; trocada por Bricolage; mantemos um tema claro.
- **The Verge** — fonte como identidade (display pesado só grande × rótulos leves), um acento-assinatura,
  sublinha de aba ativa. *Adaptado:* sem verde-ácido/ultravioleta (vira a fita carmim), sem rótulos mono
  em caixa-alta, display não condensado, nada de pílulas.
- **Próprio** — a fita marcadora como unidade de progresso e de marca.
