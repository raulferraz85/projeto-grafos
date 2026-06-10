# Dataset Parte 2 — Spotify Tracks

## Download

1. Acesse https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset
2. Faça login no Kaggle e baixe o arquivo `dataset.csv`
3. Renomeie para `spotify_tracks.csv` e coloque nesta pasta:
   ```
   data/dataset_parte2/spotify_tracks.csv
   ```

## Processar o dataset

Após baixar, execute o script de pré-processamento:

```bash
python scripts/generate_parte2.py
```

Isso gera:
- `nodes.csv` — ~3.000 músicas amostradas com features normalizadas
- `edges.csv` — conexões por similaridade de áudio (pesos positivos, para Dijkstra)
- `edges_mood.csv` — conexões por mood score (pesos podem ser negativos, para Bellman-Ford)

## Estrutura dos arquivos gerados

### nodes.csv
```
track_id,track_name,artists,track_genre,energy,valence,popularity
```

### edges.csv
```
source,target,connection_type,justification,weight
```
- `weight` = distância euclidiana entre vetores de features (sempre ≥ 0)

### edges_mood.csv
```
source,target,connection_type,justification,weight
```
- `weight` = valence - energy do nó de origem (pode ser negativo)
- Grafo dirigido sem ciclos (DAG), para demonstrar Bellman-Ford com pesos negativos

## Modelagem do grafo

- **Nós**: músicas do Spotify (~3.000 amostras estratificadas por gênero)
- **Arestas**: dois tracks são conectados se a distância euclidiana dos seus vetores de atributos musicais for menor que um threshold (k-NN com k=50)
- **Features usadas**: energy, danceability, acousticness, instrumentalness, valence, tempo (normalizados para [0,1])
- **Pesos positivos**: distância euclidiana no espaço de features
- **Pesos do mood graph**: `valence - energy` (pode ser negativo quando energia > valência)

## Tamanho esperado

| Arquivo | Nós | Arestas |
|---|---|---|
| Grafo principal (edges.csv) | ~3.000 | ~75.000 |
| Mood graph (edges_mood.csv) | ~3.000 | ~37.000 (dirigido) |
