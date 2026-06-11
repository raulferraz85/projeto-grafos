import csv
from typing import List, Tuple

from .graph import Node, Graph


def load_airports(file_path: str) -> List[Node]:
    airports = []
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            airports.append(Node(
                iata=row['iata'],
                city=row['cidade'],
                region=row['regiao']
            ))
    return airports


def load_adjacencies(file_path: str, graph: Graph) -> None:
    with open(file_path, mode='r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                peso = float(row['peso'])
            except (ValueError, KeyError):
                peso = 1.0
            graph.add_edge(row['origem'], row['destino'], row['tipo_conexao'], row['justificativa'], peso)


def load_routes(file_path: str) -> List[Tuple]:
    routes = []
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            routes.append((row['origem'], row['destino']))
    return routes
