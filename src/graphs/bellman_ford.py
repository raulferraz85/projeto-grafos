"""Algoritmo de Bellman-Ford — implementação própria, com detecção e extração de ciclo negativo."""

from typing import Dict, List, Optional, Tuple

from .graph import Graph


def bellman_ford(
    graph: Graph, start_node: str
) -> Tuple[Dict[str, float], Dict[str, str], bool, List[str]]:
    """
    Algoritmo de Bellman-Ford para caminhos mínimos com suporte a pesos negativos.
    Retorna (distâncias, predecessores, tem_ciclo_negativo, ciclo_negativo).
    Se houver ciclo negativo alcançável a partir de start_node, ciclo_negativo
    contém a sequência de nós que o forma (fechada: primeiro == último);
    caso contrário, é uma lista vazia.
    """
    if start_node not in graph.nodes:
        return {}, {}, False, []

    distances = {node: float('inf') for node in graph.nodes}
    distances[start_node] = 0
    predecessors: Dict[str, Optional[str]] = {node: None for node in graph.nodes}

    # Relaxa as arestas até |V| - 1 vezes, com parada antecipada:
    # se uma passada inteira não relaxa nada, as distâncias já convergiram.
    nodes_list = list(graph.nodes.keys())
    for _ in range(len(nodes_list) - 1):
        changed = False
        for u in nodes_list:
            if distances[u] == float('inf'):
                continue  # nó inalcançável não relaxa nada
            for edge in graph.adjacency_list[u]:
                v = edge.target
                if distances[u] + edge.weight < distances[v]:
                    distances[v] = distances[u] + edge.weight
                    predecessors[v] = u
                    changed = True
        if not changed:
            break

    # Passada extra: se alguma aresta ainda relaxa, há ciclo negativo
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

    # Extrai o ciclo: anda |V| passos para trás para garantir que estamos
    # DENTRO do ciclo (v pode estar apenas pendurado nele), depois percorre
    # os predecessores até fechar a volta.
    inside = cycle_entry
    for _ in range(len(nodes_list)):
        inside = predecessors[inside]

    cycle = [inside]
    current = predecessors[inside]
    while current != inside:
        cycle.append(current)
        current = predecessors[current]
    cycle.append(inside)
    cycle.reverse()  # ordem de percurso (u -> ... -> u)

    return distances, predecessors, True, cycle
