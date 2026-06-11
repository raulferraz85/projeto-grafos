# Rede de Aeroportos do Brasil + Comparação de Algoritmos (Spotify)

Projeto de **Teoria dos Grafos + Análise e Visualização de Dados (AVD)** — CESAR School.
Algoritmos implementados do zero (BFS, DFS, Dijkstra, Bellman-Ford), métricas de rede,
visualizações orientadas por Gestalt, grafo interativo e frontend React.

## Estrutura do Projeto

```
projeto/
├── data/
│   ├── aeroportos_data.csv          # 128 aeroportos (IATA, cidade, região)
│   ├── adjacencias_aeroportos.csv   # 426 conexões (origem, destino, tipo, justificativa, peso)
│   ├── rotas.csv                    # 5 pares obrigatórios para caminho mínimo
│   └── dataset_parte2/              # Dataset da Parte 2 (Spotify Tracks — não relacionado à malha aérea)
├── src/
│   ├── cli.py                       # Interface de linha de comando (Parte 1 e Parte 2)
│   ├── solve.py                     # Métricas globais, regionais e ego-redes
│   ├── viz.py                       # Visualizações analíticas (PNG + analise.md)
│   ├── interactive.py               # Gerador do grafo interativo (out/grafo_interativo.html)
│   ├── graphs/
│   │   ├── graph.py                 # Estrutura de grafo (lista de adjacência)
│   │   ├── bfs.py                   # BFS — implementação própria
│   │   ├── dfs.py                   # DFS — implementação própria (classificação de arestas/ciclos)
│   │   ├── dijkstra.py              # Dijkstra — implementação própria (heapq só como fila)
│   │   ├── bellman_ford.py          # Bellman-Ford — detecta E reporta ciclo negativo
│   │   ├── algorithms.py            # Fachada de reexport + get_path
│   │   └── io.py                    # Leitura e validação dos CSVs
│   └── parte2/
│       ├── loader.py                # Carrega grafos do dataset Spotify
│       ├── benchmark.py             # Casos obrigatórios, tempos, memória, escala
│       └── viz.py                   # Visualizações da Parte 2
├── scripts/
│   ├── build_data.py                # Agrega out/ → frontend/public/data.json
│   ├── populate_data.py             # Gera adjacências a partir do OurAirports (API pública)
│   ├── generate_parte2.py           # Pré-processa o dataset Spotify (k-NN + mood DAG)
│   └── generate_relatorio.py        # Gera relatorio_tecnico.pdf a partir dos outputs reais
├── out/                             # Saídas geradas pelo pipeline
├── frontend/                        # App React (Vite + TypeScript + Tailwind)
├── tests/                           # Testes unitários (pytest)
├── relatorio_tecnico.pdf            # Relatório técnico (storytelling AVD)
├── Makefile                         # Atalhos de execução
└── requirements.txt
```

---

## Instalação

| Ferramenta | Versão mínima |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ (apenas para o frontend) |
| npm | 9+ (apenas para o frontend) |

```bash
# Opção A — tudo automático
make install

# Opção B — manual
python3 -m venv .venv
source .venv/bin/activate            # Linux/macOS  (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
cd frontend && npm install           # opcional, só para o frontend
```

---

## Como rodar (forma mais rápida)

```bash
make dev
```

Esse único comando:
1. Cria o ambiente virtual Python (`.venv`) e instala as dependências
2. Roda o pipeline — gera todos os arquivos em `out/` (Parte 1 + Parte 2) e o `data.json` do frontend
3. Sobe o frontend em **http://localhost:5173**

## Outros comandos `make`

```bash
make pipeline   # Só o backend: gera out/ (Parte 1 + Parte 2) e data.json
make parte2     # Só a Parte 2: pré-processa o Spotify e roda o benchmark
make test       # Roda os testes unitários com pytest
make clean      # Remove todos os arquivos gerados em out/
```

---

## Executando o pipeline manualmente

```bash
source .venv/bin/activate

# Parte 1 — aeroportos: métricas, rotas e visualizações
python -m src.cli \
  --dataset data/aeroportos_data.csv \
  --adjacencias data/adjacencias_aeroportos.csv \
  --rotas data/rotas.csv \
  --out out/

# Parte 2 — Spotify: casos obrigatórios, benchmark e visualizações
python -m src.cli --dataset data/dataset_parte2/ --out out/

# Relatório técnico em PDF (usa os números reais de out/)
python scripts/generate_relatorio.py

# Consolidar dados para o frontend e subir
python scripts/build_data.py
cd frontend && npm run dev
```

### Rodando algoritmos individualmente

```bash
# BFS a partir de Recife
python -m src.cli --dataset data/aeroportos_data.csv --alg BFS --source REC --out out/

# DFS a partir de Manaus
python -m src.cli --dataset data/aeroportos_data.csv --alg DFS --source MAO --out out/

# Dijkstra: Recife → Porto Alegre
python -m src.cli --dataset data/aeroportos_data.csv --alg DIJKSTRA --source REC --target POA --out out/

# Bellman-Ford: Belém → Curitiba (reporta o ciclo se existir)
python -m src.cli --dataset data/aeroportos_data.csv --alg BELLMAN-FORD --source BEL --target CWB --out out/
```

---

## Saídas geradas (`out/`)

### Parte 1 — Aeroportos

| Arquivo | Descrição |
|---|---|
| `global.json` | Ordem, tamanho, densidade e conectividade do grafo completo |
| `regioes.json` | Métricas dos subgrafos induzidos por região |
| `ego_aeroportos.csv` | Grau, ordem, tamanho e densidade da ego-rede por aeroporto |
| `graus.csv` | Grau de cada aeroporto |
| `distancias_rotas.csv` | Caminhos mínimos (Dijkstra) para os 5 pares de `rotas.csv` |
| `grafo_interativo.html` | Grafo interativo completo (ver recursos abaixo) |
| `arvore_percurso.html` | Árvore de percurso das 5 rotas obrigatórias |
| `grafico_<slug>/` | 10 bundles analíticos: PNG + `analise.md` |

### Parte 2 — Spotify

| Arquivo | Descrição |
|---|---|
| `parte2_report.json` | Casos obrigatórios, tempos, memória de pico, experimento de escala e análise |
| `parte2_degree_dist.png` | Distribuição de graus da rede musical |
| `parte2_algo_comparison.png` | Comparação de desempenho no mesmo grafo + complexidades |
| `parte2_ordem_vs_tempo.png` | Dispersão Ordem do Grafo × Tempo de Execução (escala log) |
| `parte2_bfs_layers.png` | Camadas BFS a partir de 3 fontes distintas |
| `parte2_genre_dist.png` | Distribuição de gêneros da amostra |
| `parte2_grafo_amostra.html` | Grafo interativo da amostra (top-200 por grau) |
| `parte2_analises.md` | Interpretação escrita de cada visualização da Parte 2 |

### Grafo interativo (`out/grafo_interativo.html`)

Recursos obrigatórios: tooltip em nós e arestas, busca por IATA/cidade, destaque dos
5 caminhos mínimos obrigatórios (Dijkstra), nós coloridos por região, espessura de
aresta proporcional ao peso, hubs maiores, fundo escuro.

Recursos bônus: busca preditiva com autocompletar, seletor de algoritmo
(Dijkstra / BFS / DFS) com origem e destino livres, camadas BFS coloridas,
filtro por região (checkboxes), filtro por grau mínimo (slider), painel de métricas
em tempo real (ordem/tamanho/densidade reagem aos filtros), legenda dinâmica com
contagens e animação de pulso nos caminhos destacados.

### Visualizações analíticas (`out/grafico_*/`)

Cada pasta contém a figura e um relatório em Markdown (título, pergunta, legenda,
números-chave, interpretação e limitações):

| Slug | Pergunta |
|---|---|
| `grafico_distribuicao_graus` | Como se distribuem os graus? (histograma com hubs destacados) |
| `grafico_grau_por_regiao` | Como o grau médio varia por região? |
| `grafico_densidade_ego_por_regiao` | Qual região tem ego-redes mais densas? |
| `grafico_composicao_conexoes` | Mix hub nacional / regional / voo por origem? |
| `grafico_duracao_por_tipo` | Duração típica por tipo de conexão? |
| `grafico_top_hubs` | Quais hubs concentram conexões? |
| `grafico_grau_vs_densidade_ego` | Grau alto implica ego-rede densa? |
| `grafico_rotas_minimas` | Tempo de cada rota em `rotas.csv`? |
| `grafico_duracao_entre_regioes` | Duração média entre regiões? (heatmap) |
| `grafico_metricas_regionais` | Ordem, tamanho e densidade por região? |

---

## Algoritmos implementados

Todos implementados do zero — sem NetworkX, igraph ou similares. Cada algoritmo em
arquivo próprio dentro de `src/graphs/`:

| Algoritmo | Arquivo | O que faz |
|---|---|---|
| **BFS** | `src/graphs/bfs.py` | Níveis e distâncias por camadas |
| **DFS** | `src/graphs/dfs.py` | Classificação de arestas (tree/back/forward/cross), detecção de ciclos |
| **Dijkstra** | `src/graphs/dijkstra.py` | Caminho mínimo com pesos ≥ 0 (rejeita negativos) |
| **Bellman-Ford** | `src/graphs/bellman_ford.py` | Pesos negativos; detecta **e reporta** o ciclo negativo (lista de nós) |

---

## Testes

```bash
make test
# ou: source .venv/bin/activate && python -m pytest tests/ -v
```

| Teste | O que verifica |
|---|---|
| `test_bfs.py` | Níveis corretos; nós inalcançáveis |
| `test_dfs.py` | Detecção de ciclo (back edges); ordem de descoberta |
| `test_dijkstra.py` | Caminhos corretos; rejeição de pesos negativos; alvo inalcançável |
| `test_bellman_ford.py` | Pesos negativos sem ciclo → distâncias corretas; ciclo negativo detectado **e reportado** (nós + soma negativa); ciclo inalcançável ignorado |

---

## Modelagem do Grafo (Parte 1)

- **Nós:** 128 aeroportos brasileiros (fonte: [OurAirports](https://ourairports.com/))
- **Arestas:** 426 conexões não-direcionadas, com 3 critérios documentados:
  - `hub_nacional` (91): todos os pares entre os 14 principais hubs
  - `hub_regional` (232): cada aeroporto conectado aos 2 hubs mais próximos (haversine)
  - `regional` (103): 1 conexão com aeroporto da mesma região
- **Pesos (régua única, sem negativos):** duração estimada do voo em minutos —
  `haversine(lat,lon) / 800 km/h × 60 + 30 min`
- **Grafo conectado** (verificado por BFS): densidade global ≈ 5,2%

## Dataset da Parte 2

Spotify Tracks Dataset (Kaggle) — 3.000 músicas (vértices) e 150.000 arestas dirigidas
ponderadas por similaridade de áudio (k-NN, k=50). Um segundo grafo (`edges_mood.csv`)
usa peso = valência − energia, com ~69% de pesos **negativos**, para os casos do
Bellman-Ford. Detalhes em `data/dataset_parte2/README.md`.

---

## Frontend

App React com 5 páginas:

| Página | O que mostra |
|---|---|
| **Visão geral** | Métricas globais, insights, tabela regional, composição das conexões |
| **Rankings** | Top 10 por grau, densidade ego e tamanho ego |
| **Rotas** | Pesquisa dinâmica entre qualquer par (Dijkstra) + 5 rotas pré-calculadas |
| **Grafo** | vis.js interativo com busca, destaque de caminhos e legenda por região |
| **Aeroportos** | Tabela completa com métricas ego por aeroporto |
