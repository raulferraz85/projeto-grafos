
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from ..graphs.graph import Graph, Node


@dataclass
class MusicNode:
    track_id: str
    label: str
    genre: str


def _row_to_music_node(row: dict[str, str]) -> MusicNode:
    name = row.get("track_name", "")[:40]
    artist = row.get("artists", "")[:25]
    return MusicNode(
        track_id=row["track_id"],
        label=f"{name} — {artist}".strip(" —"),
        genre=row.get("track_genre", "other"),
    )


def load_spotify_graph(dataset_dir: str | Path) -> Graph:
    d = Path(dataset_dir)
    nodes_path = d / "nodes.csv"
    edges_path = d / "edges.csv"

    if not nodes_path.exists() or not edges_path.exists():
        raise FileNotFoundError(
            f"nodes.csv ou edges.csv não encontrado em '{dataset_dir}'.\n"
            "Execute: python scripts/generate_parte2.py"
        )

    graph = Graph(directed=True)

    with nodes_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mn = _row_to_music_node(row)
            graph.add_node(Node(iata=mn.track_id, city=mn.label, region=mn.genre))

    with edges_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            graph.add_edge(
                source=row["source"],
                target=row["target"],
                connection_type=row.get("connection_type", "similar_audio"),
                justification=row.get("justification", ""),
                weight=float(row.get("weight", 1.0)),
            )

    return graph


def load_mood_graph(dataset_dir: str | Path) -> Graph:
    d = Path(dataset_dir)
    nodes_path = d / "nodes.csv"
    mood_path = d / "edges_mood.csv"

    if not mood_path.exists():
        raise FileNotFoundError(
            f"edges_mood.csv não encontrado em '{dataset_dir}'.\n"
            "Execute: python scripts/generate_parte2.py"
        )

    graph = Graph(directed=True)

    with nodes_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mn = _row_to_music_node(row)
            graph.add_node(Node(iata=mn.track_id, city=mn.label, region=mn.genre))

    with mood_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            src = row["source"]
            tgt = row["target"]
            if src not in graph.nodes or tgt not in graph.nodes:
                continue
            graph.add_edge(
                source=src,
                target=tgt,
                connection_type=row.get("connection_type", "mood_affinity"),
                justification=row.get("justification", ""),
                weight=float(row.get("weight", 0.0)),
            )

    return graph
