"""Busca em Profundidade (DFS) — implementação própria, com classificação de arestas."""

from typing import Dict, List, Optional

from .graph import Graph


def dfs(graph: Graph, start_node: Optional[str] = None) -> Dict[str, dict]:
    """
    Busca em Profundidade (DFS) iterativa. Se start_node for None, executa em todos os nós.
    Usa pilha explícita com marcadores de entrada/saída para evitar estouro de recursão.
    Retorna um dicionário com tempo de descoberta, tempo de término, pai e classificação de arestas.
    A presença de "Back Edge" na classificação indica ciclo no grafo.
    """
    # Cores: 0 = branco (não visitado), 1 = cinza (na pilha), 2 = preto (concluído)
    color: Dict[str, int] = {}
    discovery_time: Dict[str, int] = {}
    finish_time: Dict[str, int] = {}
    parent: Dict[str, Optional[str]] = {}
    edge_classification: Dict[tuple, str] = {}
    timer = [0]  # lista para mutabilidade sem nonlocal

    def _visit(start: str) -> None:
        # Pilha de (nó, is_return) — is_return=True significa que estamos saindo do nó
        stack: List[tuple] = [(start, False)]

        while stack:
            u, is_return = stack.pop()

            if is_return:
                # Saída do nó: marcar como preto e registrar finish_time
                color[u] = 2
                timer[0] += 1
                finish_time[u] = timer[0]
                continue

            if color.get(u, 0) != 0:
                continue  # já visitado

            # Entrada no nó: marcar como cinza
            color[u] = 1
            timer[0] += 1
            discovery_time[u] = timer[0]

            # Empurra marcador de saída antes dos filhos
            stack.append((u, True))

            # Processa vizinhos em ordem reversa para manter ordem de visita
            for neighbor in reversed(list(graph.get_neighbors(u))):
                n_color = color.get(neighbor, 0)
                if n_color == 0:
                    parent[neighbor] = u
                    edge_classification[(u, neighbor)] = "Tree Edge"
                    stack.append((neighbor, False))
                else:
                    # Para grafos não-dirigidos: pular aresta de volta ao pai
                    if not graph.directed and neighbor == parent.get(u):
                        continue
                    if n_color == 1:
                        edge_classification[(u, neighbor)] = "Back Edge"
                    elif discovery_time.get(u, 0) < discovery_time.get(neighbor, 0):
                        edge_classification[(u, neighbor)] = "Forward Edge"
                    else:
                        edge_classification[(u, neighbor)] = "Cross Edge"

    nodes_to_visit = [start_node] if start_node else list(graph.nodes.keys())
    for node in nodes_to_visit:
        if color.get(node, 0) == 0:
            _visit(node)

    return {
        "discovery": discovery_time,
        "finish": finish_time,
        "parent": parent,
        "edges": edge_classification
    }
