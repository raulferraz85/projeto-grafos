"""Busca em Largura (BFS) — implementação própria, sem bibliotecas de grafos."""

from collections import deque
from typing import Dict

from .graph import Graph


def bfs(graph: Graph, start_node: str) -> Dict[str, int]:
    """
    Busca em Largura (BFS) para calcular níveis/distâncias a partir do start_node.
    Retorna um dicionário mapeando o IATA do nó para o seu nível.
    """
    if start_node not in graph.nodes:
        return {}

    levels = {start_node: 0}
    queue = deque([start_node])

    while queue:
        current = queue.popleft()
        current_level = levels[current]

        for neighbor in graph.get_neighbors(current):
            if neighbor not in levels:
                levels[neighbor] = current_level + 1
                queue.append(neighbor)
    return levels
