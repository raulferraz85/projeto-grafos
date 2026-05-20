from src.graphs.graph import Graph, Node
from src.graphs.algorithms import bellman_ford

def test_bellman_ford_negative_weights():
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 5.0)
    g.add_edge("B", "C", "type", "just", -2.0)
    g.add_edge("A", "C", "type", "just", 10.0)

    distances, _, has_cycle = bellman_ford(g, "A")
    assert has_cycle is False
    assert distances["C"] == 3.0 # A->B->C is 5-2=3

def test_bellman_ford_negative_cycle():
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", -5.0)
    g.add_edge("C", "B", "type", "just", 1.0) # Cycle B-C-B: -5 + 1 = -4

    _, _, has_cycle = bellman_ford(g, "A")
    assert has_cycle is True
