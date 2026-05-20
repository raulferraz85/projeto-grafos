import heapq
from collections import deque
from typing import Dict, List, Optional, Set, Tuple
from .graph import Graph, Edge

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

def dfs(graph: Graph, start_node: Optional[str] = None) -> Dict[str, dict]:
    """
    Busca em Profundidade (DFS). Se start_node for None, executa em todos os nós.
    Retorna um dicionário com tempo de descoberta, tempo de término, pai e classificação de arestas.
    """
    visited = set()
    discovery_time = {}
    finish_time = {}
    parent = {}
    edge_classification = {} # (u, v) -> tipo
    time = 0

    def visit(u):
        nonlocal time
        time += 1
        discovery_time[u] = time
        visited.add(u)

        for neighbor in graph.get_neighbors(u):
            if neighbor not in visited:
                parent[neighbor] = u
                edge_classification[(u, neighbor)] = "Tree Edge"
                visit(neighbor)
            else:
                # Classificação para grafo não-direcionado: Tree ou Back
                # Se for direcionado: Tree, Back, Forward, Cross
                if neighbor != parent.get(u):
                    if neighbor in discovery_time and neighbor not in finish_time:
                        edge_classification[(u, neighbor)] = "Back Edge"
                    elif discovery_time[u] < discovery_time[neighbor]:
                        edge_classification[(u, neighbor)] = "Forward Edge"
                    else:
                        edge_classification[(u, neighbor)] = "Cross Edge"

        time += 1
        finish_time[u] = time

    nodes_to_visit = [start_node] if start_node else list(graph.nodes.keys())
    for node in nodes_to_visit:
        if node not in visited:
            visit(node)

    return {
        "discovery": discovery_time,
        "finish": finish_time,
        "parent": parent,
        "edges": edge_classification
    }

def dijkstra(graph: Graph, start_node: str, end_node: Optional[str] = None) -> Tuple[Dict[str, float], Dict[str, str]]:
    """
    Algoritmo de Dijkstra para caminhos mínimos.
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

def bellman_ford(graph: Graph, start_node: str) -> Tuple[Dict[str, float], Dict[str, str], bool]:
    """
    Algoritmo de Bellman-Ford.
    Retorna distâncias, predecessores e um booleano indicando se existe ciclo negativo.
    """
    if start_node not in graph.nodes:
        return {}, {}, False

    distances = {node: float('inf') for node in graph.nodes}
    distances[start_node] = 0
    predecessors = {node: None for node in graph.nodes}

    # Relaxa as arestas |V| - 1 vezes
    nodes_list = list(graph.nodes.keys())
    for _ in range(len(nodes_list) - 1):
        for u in nodes_list:
            for edge in graph.adjacency_list[u]:
                v = edge.target
                if distances[u] + edge.weight < distances[v]:
                    distances[v] = distances[u] + edge.weight
                    predecessors[v] = u

    # Verifica ciclos negativos
    has_negative_cycle = False
    for u in nodes_list:
        for edge in graph.adjacency_list[u]:
            v = edge.target
            if distances[u] + edge.weight < distances[v]:
                has_negative_cycle = True
                break
        if has_negative_cycle:
            break

    return distances, predecessors, has_negative_cycle

def get_path(predecessors: Dict[str, str], target: str) -> List[str]:
    """Reconstrói o caminho a partir do dicionário de predecessores."""
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = predecessors.get(current)
    return path[::-1] if path[0] == target else []
