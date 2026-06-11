
from collections import deque
from typing import Dict

from .graph import Graph


def bfs(graph: Graph, start_node: str) -> Dict[str, int]:
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
