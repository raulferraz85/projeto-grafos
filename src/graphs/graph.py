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
        if node.iata not in self.nodes:
            self.nodes[node.iata] = node
            self.adjacency_list[node.iata] = []

    def add_edge(self, source: str, target: str, connection_type: str, justification: str, weight: float):
        if source not in self.nodes or target not in self.nodes:
            return

        edge = Edge(source, target, connection_type, justification, weight)
        self.adjacency_list[source].append(edge)

        if not self.directed:
            reverse_edge = Edge(target, source, connection_type, justification, weight)
            self.adjacency_list[target].append(reverse_edge)

    def get_neighbors(self, iata: str) -> List[str]:
        if iata not in self.adjacency_list:
            return []
        return [edge.target for edge in self.adjacency_list[iata]]

    def get_edge(self, source: str, target: str) -> Optional[Edge]:
        if source not in self.adjacency_list:
            return None
        for edge in self.adjacency_list[source]:
            if edge.target == target:
                return edge
        return None

    def get_order(self) -> int:
        return len(self.nodes)

    def get_size(self) -> int:
        count = sum(len(edges) for edges in self.adjacency_list.values())
        return count if self.directed else count // 2

    def get_density(self) -> float:
        order = self.get_order()
        if order < 2:
            return 0.0
        size = self.get_size()
        if self.directed:
            return size / (order * (order - 1))
        else:
            return (2 * size) / (order * (order - 1))
