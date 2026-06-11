
from typing import Dict, List, Optional, Tuple

from .graph import Graph


def bellman_ford(
    graph: Graph, start_node: str
) -> Tuple[Dict[str, float], Dict[str, str], bool, List[str]]:
    if start_node not in graph.nodes:
        return {}, {}, False, []

    distances = {node: float('inf') for node in graph.nodes}
    distances[start_node] = 0
    predecessors: Dict[str, Optional[str]] = {node: None for node in graph.nodes}

    nodes_list = list(graph.nodes.keys())
    for _ in range(len(nodes_list) - 1):
        changed = False
        for u in nodes_list:
            if distances[u] == float('inf'):
                continue
            for edge in graph.adjacency_list[u]:
                v = edge.target
                if distances[u] + edge.weight < distances[v]:
                    distances[v] = distances[u] + edge.weight
                    predecessors[v] = u
                    changed = True
        if not changed:
            break

    cycle_entry: Optional[str] = None
    for u in nodes_list:
        if distances[u] == float('inf'):
            continue
        for edge in graph.adjacency_list[u]:
            v = edge.target
            if distances[u] + edge.weight < distances[v]:
                predecessors[v] = u
                cycle_entry = v
                break
        if cycle_entry:
            break

    if cycle_entry is None:
        return distances, predecessors, False, []

    inside = cycle_entry
    for _ in range(len(nodes_list)):
        inside = predecessors[inside]

    cycle = [inside]
    current = predecessors[inside]
    while current != inside:
        cycle.append(current)
        current = predecessors[current]
    cycle.append(inside)
    cycle.reverse()

    return distances, predecessors, True, cycle
