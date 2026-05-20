from dataclasses import dataclass
from typing import Dict, List, Set, Optional

@dataclass(frozen=True)
class Node:
    iata: str
    city: str
    region: str

@dataclass
class Edge:
    source: str
    target: str
    connection_type: str
    justification: str
    weight: float

class Graph:
    def __init__(self, directed: bool = False):
        self.nodes: Dict[str, Node] = {}
        self.adjacency_list: Dict[str, List[Edge]] = {}
        self.directed = directed

    def add_node(self, node: Node):
        """Adiciona um nó ao grafo se ele ainda não existir."""
        if node.iata not in self.nodes:
            self.nodes[node.iata] = node
            self.adjacency_list[node.iata] = []

    def add_edge(self, source: str, target: str, connection_type: str, justification: str, weight: float):
        """Adiciona uma aresta entre dois nós. Se o grafo for não-direcionado, adiciona a aresta reversa."""
        if source not in self.nodes or target not in self.nodes:
            return

        edge = Edge(source, target, connection_type, justification, weight)
        self.adjacency_list[source].append(edge)

        if not self.directed:
            reverse_edge = Edge(target, source, connection_type, justification, weight)
            self.adjacency_list[target].append(reverse_edge)

    def get_neighbors(self, iata: str) -> List[str]:
        """Retorna a lista de IATAs dos vizinhos de um nó."""
        if iata not in self.adjacency_list:
            return []
        return [edge.target for edge in self.adjacency_list[iata]]

    def get_edge(self, source: str, target: str) -> Optional[Edge]:
        """Retorna o objeto Edge entre dois nós, se existir."""
        if source not in self.adjacency_list:
            return None
        for edge in self.adjacency_list[source]:
            if edge.target == target:
                return edge
        return None

    def get_order(self) -> int:
        """Retorna a ordem do grafo (número de nós)."""
        return len(self.nodes)

    def get_size(self) -> int:
        """Retorna o tamanho do grafo (número de arestas)."""
        count = sum(len(edges) for edges in self.adjacency_list.values())
        return count if self.directed else count // 2

    def get_density(self) -> float:
        """Calcula a densidade do grafo."""
        order = self.get_order()
        if order < 2:
            return 0.0
        size = self.get_size()
        if self.directed:
            return size / (order * (order - 1))
        else:
            return (2 * size) / (order * (order - 1))
