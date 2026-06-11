"""Algoritmo de Dijkstra — implementação própria com fila de prioridade (heapq)."""

import heapq
from typing import Dict, Optional, Tuple

from .graph import Graph


def dijkstra(graph: Graph, start_node: str, end_node: Optional[str] = None) -> Tuple[Dict[str, float], Dict[str, str]]:
    """
    Algoritmo de Dijkstra para caminhos mínimos com pesos não negativos.
    heapq é usado apenas como fila de prioridade; a lógica do algoritmo é própria.
    Retorna distâncias e predecessores.
    """
    if start_node not in graph.nodes:
        return {}, {}

    distances = {node: float('inf') for node in graph.nodes}
    distances[start_node] = 0
    predecessors = {node: None for node in graph.nodes}

    pq = [(0, start_node)]

    while pq:
        current_dist, u = heapq.heappop(pq)

        # Entrada obsoleta no heap: já existe caminho melhor até u
        if current_dist > distances[u]:
            continue

        if end_node and u == end_node:
            break

        for edge in graph.adjacency_list[u]:
            v = edge.target
            weight = edge.weight

            if weight < 0:
                raise ValueError("Dijkstra não suporta pesos negativos.")

            distance = current_dist + weight
            if distance < distances[v]:
                distances[v] = distance
                predecessors[v] = u
                heapq.heappush(pq, (distance, v))

    return distances, predecessors
