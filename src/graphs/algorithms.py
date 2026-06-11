"""
Fachada dos algoritmos de grafos.

Cada algoritmo vive em seu próprio módulo (bfs.py, dfs.py, dijkstra.py,
bellman_ford.py); este arquivo apenas reexporta para manter um ponto de
importação único em todo o projeto.
"""

from typing import Dict, List, Optional

from .bfs import bfs
from .dfs import dfs
from .dijkstra import dijkstra
from .bellman_ford import bellman_ford

__all__ = ["bfs", "dfs", "dijkstra", "bellman_ford", "get_path"]


def get_path(predecessors: Dict[str, Optional[str]], target: str, source: Optional[str] = None) -> List[str]:
    """
    Reconstrói o caminho a partir do dicionário de predecessores.
    Retorna [] se o alvo não existe ou não foi alcançado (quando source é
    informado e o caminho reconstruído não começa nele). O limite de passos
    evita laço infinito caso os predecessores contenham ciclo (Bellman-Ford
    com ciclo negativo).
    """
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
