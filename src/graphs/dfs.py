
from typing import Dict, List, Optional

from .graph import Graph

WHITE = 0
GRAY = 1
BLACK = 2


def dfs(graph: Graph, start_node: Optional[str] = None) -> Dict[str, dict]:
    color: Dict[str, int] = {}
    discovery_time: Dict[str, int] = {}
    finish_time: Dict[str, int] = {}
    parent: Dict[str, Optional[str]] = {}
    edge_classification: Dict[tuple, str] = {}
    timer = [0]

    def _visit(start: str) -> None:
        stack: List[tuple] = [(start, False)]

        while stack:
            u, is_return = stack.pop()

            if is_return:
                color[u] = BLACK
                timer[0] += 1
                finish_time[u] = timer[0]
                continue

            if color.get(u, WHITE) != WHITE:
                continue

            color[u] = GRAY
            timer[0] += 1
            discovery_time[u] = timer[0]

            stack.append((u, True))

            for v in reversed(list(graph.get_neighbors(u))):
                neighbor_color = color.get(v, WHITE)
                if neighbor_color == WHITE:
                    parent[v] = u
                    edge_classification[(u, v)] = "Tree Edge"
                    stack.append((v, False))
                else:
                    if not graph.directed and v == parent.get(u):
                        continue
                    if neighbor_color == GRAY:
                        edge_classification[(u, v)] = "Back Edge"
                    elif discovery_time.get(u, 0) < discovery_time.get(v, 0):
                        edge_classification[(u, v)] = "Forward Edge"
                    else:
                        edge_classification[(u, v)] = "Cross Edge"

    nodes_to_visit = [start_node] if start_node else list(graph.nodes.keys())
    for node in nodes_to_visit:
        if color.get(node, WHITE) == WHITE:
            _visit(node)

    return {
        "discovery": discovery_time,
        "finish": finish_time,
        "parent": parent,
        "edges": edge_classification
    }
