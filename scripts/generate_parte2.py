"""
Pré-processa o Spotify Tracks Dataset para a Parte 2 do projeto.

Entrada:  data/dataset_parte2/spotify_tracks.csv
Saída:
  data/dataset_parte2/nodes.csv        — nós (músicas amostradas)
  data/dataset_parte2/edges.csv        — arestas por similaridade de áudio (pesos ≥ 0)
  data/dataset_parte2/edges_mood.csv   — arestas mood score (pesos podem ser negativos, DAG)

Uso:
  python scripts/generate_parte2.py [--max-per-genre N] [--total N] [--k-neighbors N]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

import glob as _glob

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "dataset_parte2"

_candidates = [
    f for f in _glob.glob(str(OUT_DIR / "*.csv"))
    if not any(x in Path(f).name for x in ("nodes", "edges"))
]
INPUT_CSV = Path(_candidates[0]) if _candidates else OUT_DIR / "spotify_tracks.csv"

FEATURES = ["danceability", "energy", "acousticness", "instrumentalness", "valence", "tempo"]
DEFAULT_MAX_PER_GENRE = 150
DEFAULT_TOTAL = 3000
DEFAULT_K = 50


def load_and_clean(path: Path) -> pd.DataFrame:
    print(f"Carregando {path.name}...")
    df = pd.read_csv(path)
    print(f"  Linhas originais: {len(df):,}")

    required = ["track_id", "track_name", "artists", "track_genre"] + FEATURES
    missing = [c for c in required if c not in df.columns]
    if missing:
        sys.exit(f"Colunas ausentes no CSV: {missing}\nColunas disponíveis: {list(df.columns)}")

    df = df.dropna(subset=required).drop_duplicates(subset="track_id")
    print(f"  Linhas após limpeza: {len(df):,}")
    return df


def sample_stratified(df: pd.DataFrame, max_per_genre: int, total: int) -> pd.DataFrame:
    sampled = pd.concat([
        g.sample(min(len(g), max_per_genre), random_state=42)
        for _, g in df.groupby("track_genre")
    ])
    if len(sampled) > total:
        sampled = sampled.sample(total, random_state=42)
    sampled = sampled.reset_index(drop=True)
    print(f"  Amostra: {len(sampled):,} músicas · {sampled['track_genre'].nunique()} gêneros")
    return sampled


def normalize_features(df: pd.DataFrame) -> np.ndarray:
    matrix = df[FEATURES].values.astype(float)
    vmin = matrix.min(axis=0)
    vmax = matrix.max(axis=0)
    diff = vmax - vmin
    diff[diff == 0] = 1.0
    return (matrix - vmin) / diff


def build_knn_edges(sampled: pd.DataFrame, matrix: np.ndarray, k: int):
    """Builds directed k-NN edges (i→j: j is among i's k nearest neighbors). O(n²) — ok for n≤3000."""
    n = len(sampled)
    track_ids = sampled["track_id"].tolist()
    genres = sampled["track_genre"].tolist()

    try:
        from scipy.spatial.distance import cdist
        dist_matrix = cdist(matrix, matrix, metric="euclidean")
    except ImportError:
        print("  scipy não encontrado, usando numpy para cálculo de distâncias...")
        diff = matrix[:, np.newaxis, :] - matrix[np.newaxis, :, :]
        dist_matrix = np.sqrt((diff ** 2).sum(axis=-1))

    np.fill_diagonal(dist_matrix, np.inf)

    edges = []
    seen: set[tuple[int, int]] = set()

    for i in range(n):
        nn_indices = np.argsort(dist_matrix[i])[:k]
        for j in nn_indices:
            j = int(j)
            if (i, j) in seen:
                continue
            seen.add((i, j))
            dist = float(dist_matrix[i, j])
            genre_i, genre_j = genres[i], genres[j]
            if genre_i == genre_j:
                conn_type = "same_genre"
                justif = f"Mesmo gênero: {genre_i}"
            elif dist < 0.1:
                conn_type = "very_similar"
                justif = f"Áudio muito similar (dist={dist:.3f})"
            else:
                conn_type = "similar_audio"
                justif = f"Áudio similar entre gêneros (dist={dist:.3f})"
            edges.append({
                "source": track_ids[i],
                "target": track_ids[j],
                "connection_type": conn_type,
                "justification": justif,
                "weight": round(dist, 6),
            })

    print(f"  Arestas no grafo dirigido (k-NN): {len(edges):,}")
    return edges


def build_mood_edges(sampled: pd.DataFrame, edges: list[dict]) -> list[dict]:
    """Builds directed mood edges as a true DAG.

    Only includes edge (src → tgt) when dataframe-index[src] < dataframe-index[tgt],
    which guarantees the graph is acyclic (no negative cycles possible).
    Weight = valence - energy of the source node (can be negative).
    """
    feat_map = sampled.set_index("track_id")[["valence", "energy"]].to_dict("index")
    # Maps each track_id to its position in the sampled DataFrame (0-based)
    id_to_idx = {tid: idx for idx, tid in enumerate(sampled["track_id"])}

    mood_edges = []
    for e in edges:
        src, tgt = e["source"], e["target"]
        # DAG constraint: only keep forward edges (lower-index → higher-index)
        if id_to_idx.get(src, 0) >= id_to_idx.get(tgt, 0):
            continue
        feat = feat_map.get(src, {"valence": 0.5, "energy": 0.5})
        val = float(feat["valence"])
        eng = float(feat["energy"])
        mood_w = round(val - eng, 6)
        mood_edges.append({
            "source": src,
            "target": e["target"],
            "connection_type": "mood_affinity",
            "justification": f"valence={val:.2f} energy={eng:.2f} mood={mood_w:.2f}",
            "weight": mood_w,
        })

    neg_count = sum(1 for e in mood_edges if e["weight"] < 0)
    print(
        f"  Arestas no mood graph (DAG dirigido): {len(mood_edges):,} "
        f"({neg_count:,} negativas = {100*neg_count/max(len(mood_edges),1):.1f}%)"
    )
    return mood_edges


def save_outputs(sampled: pd.DataFrame, edges: list[dict], mood_edges: list[dict]):
    # nodes.csv
    cols = ["track_id", "track_name", "artists", "track_genre"] + FEATURES + ["popularity"]
    if "popularity" not in sampled.columns:
        sampled["popularity"] = 0
    nodes_path = OUT_DIR / "nodes.csv"
    sampled[cols].to_csv(nodes_path, index=False)
    print(f"  nodes.csv: {len(sampled):,} nós → {nodes_path}")

    # edges.csv
    edges_path = OUT_DIR / "edges.csv"
    pd.DataFrame(edges).to_csv(edges_path, index=False)
    print(f"  edges.csv: {len(edges):,} arestas → {edges_path}")

    # edges_mood.csv
    mood_path = OUT_DIR / "edges_mood.csv"
    pd.DataFrame(mood_edges).to_csv(mood_path, index=False)
    print(f"  edges_mood.csv: {len(mood_edges):,} arestas → {mood_path}")


def main():
    parser = argparse.ArgumentParser(description="Pré-processa Spotify Tracks para Parte 2")
    parser.add_argument("--max-per-genre", type=int, default=DEFAULT_MAX_PER_GENRE)
    parser.add_argument("--total", type=int, default=DEFAULT_TOTAL)
    parser.add_argument("--k-neighbors", type=int, default=DEFAULT_K)
    args = parser.parse_args()

    if not INPUT_CSV.exists():
        sys.exit(
            f"\nArquivo não encontrado: {INPUT_CSV}\n"
            "Consulte data/dataset_parte2/README.md para instruções de download.\n"
        )

    print(f"\n=== Gerando dataset Parte 2 (k={args.k_neighbors}, max/gênero={args.max_per_genre}, total={args.total}) ===\n")

    df = load_and_clean(INPUT_CSV)
    sampled = sample_stratified(df, args.max_per_genre, args.total)
    matrix = normalize_features(sampled)
    edges = build_knn_edges(sampled, matrix, args.k_neighbors)
    mood_edges = build_mood_edges(sampled, edges)
    save_outputs(sampled, edges, mood_edges)

    print("\n=== Concluído ===")
    print(f"  Nós: {len(sampled):,} · Arestas: {len(edges):,} · Mood edges: {len(mood_edges):,}")
    print("  Próximo passo: make pipeline  (ou python -m src.cli --dataset data/dataset_parte2/ ...)")


if __name__ == "__main__":
    main()
