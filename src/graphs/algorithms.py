
from typing import Dict, List, Optional

from .bfs import bfs
from .bellman_ford import bellman_ford
from .dfs import dfs
from .dijkstra import dijkstra

__all__ = ["bfs", "dfs", "dijkstra", "bellman_ford", "get_path"]


def get_path(
    predecessors: Dict[str, Optional[str]],
    target: str,
    source: Optional[str] = None,
) -> List[str]:
    if target not in predecessors:
        return []

    path = []
    current: Optional[str] = target
    max_steps = len(predecessors) + 1
    while current is not None and len(path) < max_steps:
        path.append(current)
        current = predecessors.get(current)

    path.reverse()
    if source is not None and path[0] != source:
        return []
    return path
