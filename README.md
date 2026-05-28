# Rede de Aeroportos do Brasil

Análise da malha aérea brasileira com teoria dos grafos — algoritmos implementados do zero, métricas de rede e frontend interativo.

## Estrutura do Projeto

```
projeto-grafos/
├── data/
│   ├── aeroportos_data.csv          # 128 aeroportos (IATA, cidade, região)
│   ├── adjacencias_aeroportos.csv   # 426 conexões (origem, destino, tipo, justificativa, peso)
│   └── rotas.csv                    # 5 pares para cálculo de caminho mínimo
├── out/                             # Saídas geradas pelo pipeline
├── src/
│   ├── cli.py                       # Interface de linha de comando
│   ├── solve.py                     # Métricas globais, regionais e ego-redes
│   ├── viz.py                       # Visualizações (HTML interativo + PNGs)
│   └── graphs/
│       ├── graph.py                 # Estrutura de lista de adjacência
│       ├── algorithms.py            # BFS, DFS, Dijkstra, Bellman-Ford
│       └── io.py                    # Leitura e validação dos CSVs
├── scripts/
│   ├── build_data.py                # Agrega out/ → frontend/public/data.json
│   └── populate_data.py             # Gera adjacências a partir do OurAirports (API pública)
├── frontend/                        # App React (Vite + TypeScript + Tailwind)
├── tests/                           # Testes unitários (pytest)
├── Makefile                         # Atalhos de execução
└── requirements.txt
```

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Como rodar (forma mais rápida)

```bash
make dev
```

Esse único comando:
1. Cria o ambiente virtual Python (`.venv`) e instala as dependências
2. Roda o pipeline — gera todos os arquivos em `out/` e o `data.json` do frontend
3. Mata qualquer servidor anterior na porta 5173
4. Sobe o frontend em **http://localhost:5173**

---

## Outros comandos `make`

```bash
make pipeline   # Só roda o backend (gera out/ e data.json), sem subir o servidor
make test       # Roda os 7 testes unitários com pytest
make install    # Instala dependências Python e Node (skip se já existirem)
make clean      # Remove todos os arquivos gerados em out/
```

---

## Executando o pipeline manualmente

```bash
# 1. Ativar o ambiente virtual
source .venv/bin/activate          # Linux/macOS
# .venv\Scripts\activate           # Windows

# 2. Gerar métricas, visualizações e rotas
python -m src.cli \
  --dataset data/aeroportos_data.csv \
  --adjacencias data/adjacencias_aeroportos.csv \
  --rotas data/rotas.csv \
  --out out/

# 3. Consolidar dados para o frontend
python scripts/build_data.py

# 4. Subir o frontend
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

# Bellman-Ford: Belém → Curitiba
python -m src.cli --dataset data/aeroportos_data.csv --alg BELLMAN-FORD --source BEL --target CWB --out out/
```

---

## Saídas geradas (`out/`)

| Arquivo | Descrição |
|---|---|
| `global.json` | Ordem, tamanho e densidade do grafo completo |
| `regioes.json` | Métricas dos subgrafos induzidos por região |
| `ego_aeroportos.csv` | Grau, ordem, tamanho e densidade da ego-rede por aeroporto |
| `graus.csv` | Grau de cada aeroporto |
| `distancias_rotas.csv` | Caminhos mínimos (Dijkstra) para os pares em `rotas.csv` |
| `grafo_interativo.html` | Grafo interativo com busca e destaque de caminhos |
| `arvore_percurso.html` | Árvore de percurso dos caminhos obrigatórios |
| `distribuicao_graus.png` | Histograma de distribuição de graus (exploratória) |
| `aeroportos_por_regiao.png` | Aeroportos por região (exploratória) |
| `densidade_por_regiao.png` | Densidade regional comparada (explanatória) |
| `top_10_conectados.png` | Top 10 hubs mais conectados (explanatória) |

---

## Algoritmos implementados

Todos implementados do zero — sem uso de NetworkX, igraph ou similares.

| Algoritmo | Localização | O que faz |
|---|---|---|
| **BFS** | `src/graphs/algorithms.py` | Níveis e distâncias por camadas |
| **DFS** | `src/graphs/algorithms.py` | Classificação de arestas, detecção de ciclos |
| **Dijkstra** | `src/graphs/algorithms.py` | Caminho mínimo com pesos ≥ 0 |
| **Bellman-Ford** | `src/graphs/algorithms.py` | Caminho mínimo com pesos negativos, detecção de ciclo negativo |

---

## Testes

```bash
make test
# ou: source .venv/bin/activate && python -m pytest tests/ -v
```

| Teste | O que verifica |
|---|---|
| `test_bfs.py` | Níveis corretos em grafo pequeno |
| `test_dfs.py` | Detecção de ciclo e classificação de arestas |
| `test_dijkstra.py` | Caminhos corretos + rejeição de pesos negativos |
| `test_bellman_ford.py` | Pesos negativos sem ciclo → distâncias corretas; ciclo negativo → flag |

---

## Modelagem do Grafo

- **Nós:** 128 aeroportos brasileiros (fonte: [OurAirports](https://ourairports.com/))
- **Arestas:** 426 conexões não-direcionadas, construídas com 3 critérios:
  - `hub_nacional` (91): todos os pares entre os 14 principais hubs
  - `hub_regional` (232): cada aeroporto conectado aos 2 hubs mais próximos (haversine)
  - `regional` (103): 1 conexão aleatória com aeroporto da mesma região
- **Pesos:** duração estimada do voo em minutos (`haversine(lat,lon) / 800km/h × 60 + 30min`)
- **Grafo conectado:** densidade global ≈ 5,2%

---

## Frontend

App React com 5 páginas:

| Página | O que mostra |
|---|---|
| **Visão geral** | Métricas globais, insights, tabela regional com barras de densidade, composição das conexões |
| **Rankings** | Top 10 por grau, densidade ego e tamanho ego — com filtro de grau mínimo na aba de densidade |
| **Rotas** | Pesquisa dinâmica entre qualquer par (Dijkstra no frontend) + 5 rotas pré-calculadas com visualização PathGraph |
| **Grafo** | vis.js interativo com busca, destaque de caminhos obrigatórios e legenda por região |
| **Aeroportos** | Tabela completa com métricas ego por aeroporto |
