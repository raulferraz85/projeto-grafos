# Rede de Aeroportos do Brasil + Comparação de Algoritmos (Spotify)

Projeto de **Teoria dos Grafos + Análise e Visualização de Dados (AVD)** — CESAR School.
Algoritmos implementados do zero (BFS, DFS, Dijkstra, Bellman-Ford), métricas de rede,
visualizações orientadas por Gestalt, grafo interativo e frontend React.

---

## Estrutura do Projeto

```
projeto/
├── data/
│   ├── aeroportos_data.csv          # 128 aeroportos (IATA, cidade, região)
│   ├── adjacencias_aeroportos.csv   # 426 conexões (origem, destino, tipo, peso)
│   ├── rotas.csv                    # 5 pares obrigatórios para caminho mínimo
│   └── dataset_parte2/              # Dataset Spotify (k-NN — Parte 2)
├── src/
│   ├── cli.py                       # Interface de linha de comando (Parte 1 e Parte 2)
│   ├── solve.py                     # Métricas globais, regionais e ego-redes
│   ├── viz.py                       # Visualizações analíticas (PNG + analise.md)
│   ├── interactive.py               # Gerador do grafo interativo HTML
│   ├── graphs/
│   │   ├── graph.py                 # Estrutura de grafo (lista de adjacência)
│   │   ├── bfs.py                   # BFS — implementação própria
│   │   ├── dfs.py                   # DFS — iterativa, classificação de arestas
│   │   ├── dijkstra.py              # Dijkstra — implementação própria (heapq)
│   │   ├── bellman_ford.py          # Bellman-Ford — detecta e reporta ciclo negativo
│   │   ├── algorithms.py            # Fachada de reexport + get_path
│   │   └── io.py                    # Leitura e validação dos CSVs
│   └── parte2/
│       ├── loader.py                # Carrega grafos do dataset Spotify
│       ├── benchmark.py             # Casos obrigatórios, tempos, memória, escala
│       └── viz.py                   # Visualizações da Parte 2
├── scripts/
│   ├── build_data.py                # Agrega out/ → frontend/public/data.json
│   ├── populate_data.py             # Gera adjacências via OurAirports
│   ├── generate_parte2.py           # Pré-processa o dataset Spotify (k-NN + mood DAG)
│   └── generate_relatorio.py        # Gera relatorio_tecnico.pdf a partir dos outputs
├── out/                             # Saídas geradas pelo pipeline
├── frontend/                        # App React (Vite + TypeScript + Tailwind CSS)
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
| Node.js | 18+ |
| npm | 9+ |

```bash
# Opção A — tudo automático
make install

# Opção B — manual
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install
```

---

## Como rodar

```bash
make dev
```

Esse único comando instala dependências, roda o pipeline completo (Parte 1 + Parte 2) e
sobe o frontend em **http://localhost:5173**.

### Outros comandos

```bash
make pipeline   # Backend: gera out/ (Parte 1 + Parte 2) e data.json
make parte2     # Só a Parte 2: pré-processa o Spotify e roda o benchmark
make relatorio  # Gera relatorio_tecnico.pdf a partir dos outputs em out/
make test       # Roda os testes unitários com pytest
make clean      # Remove todos os arquivos gerados em out/
```

### Configuração do dataset Spotify (Parte 2)

O dataset bruto do Spotify não está no repositório por ser grande demais. Para habilitá-lo:

1. Acesse [kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset](https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset)
2. Baixe o arquivo `dataset.csv`, renomeie para `spotfy-dataset.csv` e coloque em `data/dataset_parte2/`
3. Rode o pré-processamento:

```bash
make parte2
```

Isso gera três arquivos em `data/dataset_parte2/`:

| Arquivo | Conteúdo |
|---|---|
| `nodes.csv` | ~3.000 músicas amostradas com features normalizadas |
| `edges.csv` | Conexões por similaridade de áudio — peso = distância euclidiana (≥ 0) |
| `edges_mood.csv` | Conexões por mood score — peso = valência − energia (pode ser negativo, DAG) |

Se o dataset Spotify não estiver presente, `make pipeline` e `make dev` ignoram a Parte 2 automaticamente e rodam apenas a Parte 1.

---

## Pipeline manual

```bash
source .venv/bin/activate

# Parte 1 — aeroportos
python -m src.cli \
  --dataset data/aeroportos_data.csv \
  --adjacencias data/adjacencias_aeroportos.csv \
  --rotas data/rotas.csv \
  --out out/

# Parte 2 — Spotify
python -m src.cli --dataset data/dataset_parte2/ --out out/

# Consolidar para o frontend e subir
python scripts/build_data.py
cd frontend && npm run dev
```

### Algoritmos individualmente

```bash
python -m src.cli --dataset data/aeroportos_data.csv --alg BFS --source REC --out out/
python -m src.cli --dataset data/aeroportos_data.csv --alg DFS --source MAO --out out/
python -m src.cli --dataset data/aeroportos_data.csv --alg DIJKSTRA --source REC --target POA --out out/
python -m src.cli --dataset data/aeroportos_data.csv --alg BELLMAN-FORD --source BEL --target CWB --out out/
```

---

## Saídas geradas (`out/`)

### Parte 1 — Aeroportos

| Arquivo | Descrição |
|---|---|
| `global.json` | Ordem, tamanho, densidade e conectividade do grafo |
| `regioes.json` | Métricas dos subgrafos induzidos por região |
| `ego_aeroportos.csv` | Grau, ordem, tamanho e densidade da ego-rede por aeroporto |
| `graus.csv` | Grau de cada aeroporto |
| `distancias_rotas.csv` | Caminhos mínimos (Dijkstra) para os 5 pares de `rotas.csv` |
| `grafo_interativo.html` | Grafo interativo completo (vis-network) |
| `arvore_percurso.html` | Árvore de percurso das 5 rotas obrigatórias |
| `grafico_<slug>/` | 10 bundles analíticos: PNG + `analise.md` |

### Parte 2 — Spotify

| Arquivo | Descrição |
|---|---|
| `parte2_report.json` | Casos obrigatórios, tempos, memória de pico, escala e análise |
| `parte2_degree_dist.png` | Distribuição de graus da rede musical |
| `parte2_algo_comparison.png` | Comparação de desempenho dos algoritmos |
| `parte2_ordem_vs_tempo.png` | Ordem do grafo × tempo de execução (escala log) |
| `parte2_bfs_layers.png` | Camadas BFS a partir de 3 fontes distintas |
| `parte2_genre_dist.png` | Distribuição de gêneros da amostra |
| `parte2_analises.md` | Interpretação escrita de cada visualização |

### Visualizações analíticas (`out/grafico_*/`)

| Slug | Pergunta |
|---|---|
| `grafico_distribuicao_graus` | Como se distribuem os graus? |
| `grafico_grau_por_regiao` | Como o grau médio varia por região? |
| `grafico_densidade_ego_por_regiao` | Qual região tem ego-redes mais densas? |
| `grafico_composicao_conexoes` | Mix hub nacional / regional / voo por origem? |
| `grafico_duracao_por_tipo` | Duração típica por tipo de conexão? |
| `grafico_top_hubs` | Quais hubs concentram mais conexões? |
| `grafico_grau_vs_densidade_ego` | Grau alto implica ego-rede densa? |
| `grafico_rotas_minimas` | Tempo de cada rota em `rotas.csv`? |
| `grafico_duracao_entre_regioes` | Duração média entre regiões? (heatmap) |
| `grafico_metricas_regionais` | Ordem, tamanho e densidade por região? |

---

## Algoritmos

Todos implementados do zero — sem NetworkX, igraph ou similares.

| Algoritmo | Arquivo | Complexidade |
|---|---|---|
| **BFS** | `src/graphs/bfs.py` | O(V + E) |
| **DFS** | `src/graphs/dfs.py` | O(V + E) — iterativa com pilha explícita; classifica arestas (tree/back/forward/cross) e detecta ciclos |
| **Dijkstra** | `src/graphs/dijkstra.py` | O((V + E) log V) — rejeita pesos negativos |
| **Bellman-Ford** | `src/graphs/bellman_ford.py` | O(V · E) — detecta e reporta o ciclo negativo completo |

---

## Testes

```bash
make test
```

| Arquivo | O que verifica |
|---|---|
| `test_bfs.py` | Níveis corretos; nós inalcançáveis |
| `test_dfs.py` | Detecção de ciclo (back edges); ordem de descoberta |
| `test_dijkstra.py` | Caminhos corretos; rejeição de pesos negativos; alvo inalcançável |
| `test_bellman_ford.py` | Pesos negativos sem ciclo; ciclo negativo detectado e reportado; ciclo inalcançável ignorado |

---

## Modelagem

### Parte 1 — Aeroportos

- **Nós:** 128 aeroportos brasileiros (fonte: OurAirports)
- **Arestas:** 426 conexões não-direcionadas com 3 tipos:
  - `hub_nacional` (91): todos os pares entre os 14 principais hubs
  - `hub_regional` (232): cada aeroporto conectado aos 2 hubs mais próximos (haversine)
  - `regional` (103): 1 conexão com aeroporto da mesma região
- **Pesos:** duração estimada em minutos — `haversine / 800 km·h⁻¹ × 60 + 30 min`
- **Grafo conectado** (verificado por BFS) com densidade global ≈ 5,2%

### Parte 2 — Spotify

Spotify Tracks Dataset (Kaggle) — 3.000 músicas (vértices) e 150.000 arestas dirigidas
ponderadas por similaridade de áudio (k-NN, k=50). Um segundo grafo (`edges_mood.csv`)
usa peso = valência − energia, com ~69% de pesos negativos, para os casos do Bellman-Ford.

---

## Frontend

App React (Vite + TypeScript + Tailwind CSS) com dois domínios navegáveis por abas:

### Parte 1 — Aeroportos

| Página | Conteúdo |
|---|---|
| **Visão geral** | Métricas globais, insights automáticos, tabela regional, composição das conexões |
| **Rankings** | Top 10 por grau, densidade ego e tamanho ego |
| **Rotas** | Busca dinâmica entre qualquer par (Dijkstra) + 5 rotas pré-calculadas |
| **Grafo** | Grafo interativo (vis-network): busca preditiva, destaque de caminhos (Dijkstra/BFS/DFS), filtro por região e grau, métricas em tempo real |
| **Aeroportos** | Tabela completa com filtros, ordenação e ego-rede expansível por linha |

### Parte 2 — Rede Musical Spotify

| Aba | Conteúdo |
|---|---|
| **Dataset** | Métricas do grafo completo (3k nós, 150k arestas), distribuição de graus, top gêneros, exemplos de conexão |
| **Grafos** | Grafo interativo (vis-network, top-200 nós): clique para destacar vizinhos, filtro por gênero com isolamento de arestas, histograma de grau e barras de gênero em tempo real |
| **Algoritmos** | Flashcards BFS/DFS/Dijkstra/Bellman-Ford com casos reais do dataset, jornada visual do Dijkstra, detecção de ciclo negativo |
| **Performance** | Tabela de complexidades, comparação de tempo/memória no mesmo grafo, experimento de escala (log-log), contexto Python vs. browser |
