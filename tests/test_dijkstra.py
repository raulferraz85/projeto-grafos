import pytest
from src.graphs.graph import Graph, Node
from src.graphs.algorithms import dijkstra, get_path

def test_dijkstra_path():
    g = Graph()
    nodes = [Node(c, c, "R") for c in "ABCD"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", 2.0)
    g.add_edge("A", "D", "type", "just", 5.0)
    g.add_edge("C", "D", "type", "just", 1.0)

    # Path A-B-C-D has weight 4, Path A-D has weight 5
    distances, predecessors = dijkstra(g, "A")
    assert distances["D"] == 4.0
    path = get_path(predecessors, "D")
    assert path == ["A", "B", "C", "D"]

def test_dijkstra_negative_weight():
    g = Graph()
    g.add_node(Node("A", "A", "R"))
    g.add_node(Node("B", "B", "R"))
    g.add_edge("A", "B", "type", "just", -1.0)

    with pytest.raises(ValueError, match="Dijkstra"):
        dijkstra(g, "A")

def test_dijkstra_unreachable():
    g = Graph(directed=True)
    for c in "ABC":
        g.add_node(Node(c, c, "R"))
    g.add_edge("A", "B", "type", "just", 1.0)
    # C não tem arestas de A ou B

    distances, _ = dijkstra(g, "A")
    assert distances["C"] == float("inf")
