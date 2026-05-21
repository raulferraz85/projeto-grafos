# Rede de Aeroportos do Brasil

Este projeto implementa uma análise da rede de aeroportos do Brasil utilizando teoria dos grafos.

## Estrutura do Projeto

- `src/graphs/`: Implementação do grafo e algoritmos (BFS, DFS, Dijkstra, Bellman-Ford).
- `src/solve.py`: Cálculo de métricas globais, regionais e de ego-redes.
- `src/cli.py`: Interface de linha de comando.
- `src/viz.py`: Visualizações interativas.
- `data/`: Datasets de aeroportos, adjacências e rotas.
- `out/`: Arquivos de saída (JSON, CSV, HTML).

## Requisitos

- Python 3.11+
- Dependências listadas em `requirements.txt` (principalmente para visualização).

Instale as dependências:
```bash
pip install -r requirements.txt
```

## Como Executar

### Parte 1: Métricas e Algoritmos

Para calcular todas as métricas e rodar um algoritmo específico:

```bash
# Exemplo BFS
python -m src.cli --dataset data/aeroportos_data.csv --alg BFS --source REC --out out/

# Exemplo Dijkstra
python -m src.cli --dataset data/aeroportos_data.csv --alg DIJKSTRA --source REC --target POA --out out/
```

### Saídas Geradas

Os seguintes arquivos são gerados automaticamente na pasta `out/`:
- `global.json`: Ordem, tamanho e densidade do grafo.
- `regioes.json`: Métricas por região.
- `ego_aeroportos.csv`: Métricas de ego-rede por aeroporto.
- `graus.csv`: Lista de graus de cada aeroporto.
- `distancias_rotas.csv`: Caminhos mínimos calculados para as rotas em `data/rotas.csv`.

### Visualizações

Para gerar as visualizações interativas:
```bash
python src/viz.py
```
Isso gerará o arquivo `out/arvore_percurso.html`.

## Frontend (SkyGraph)

Há também um frontend em React (Vite + TypeScript + Tailwind + Framer Motion + Recharts)
que consome um único `frontend/public/data.json` gerado a partir de `out/` + `data/`.

### Atalho (recomendado)

Na raiz do projeto, um único script prepara backend + JSON do frontend:

```bash
./prepare.sh
cd frontend && npm run dev   # http://localhost:5173
```

### Passo a passo manual

```bash
# 1. Gerar o JSON consolidado a partir do out/
python3 scripts/build_data.py

# 2. Rodar o app (regenera o JSON automaticamente)
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Depois de regerar `out/` (executando o pipeline em Python), basta rodar
`python3 scripts/build_data.py` (ou `npm run data` dentro de `frontend/`) para
o frontend refletir os novos dados.

## Algoritmos Implementados (Manualmente)

- **BFS (Breadth-First Search)**: Cálculo de níveis e distâncias.
- **DFS (Depth-First Search)**: Classificação de arestas e detecção de ciclos.
- **Dijkstra**: Caminho mínimo em grafos ponderados (sem pesos negativos).
- **Bellman-Ford**: Caminho mínimo com suporte a pesos negativos e detecção de ciclos negativos.
