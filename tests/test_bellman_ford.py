import pytest

from src.graphs.graph import Graph, Node
from src.graphs.algorithms import bellman_ford, get_path


def test_bellman_ford_negative_weights():
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 5.0)
    g.add_edge("B", "C", "type", "just", -2.0)
    g.add_edge("A", "C", "type", "just", 10.0)

    distances, predecessors, has_cycle, cycle = bellman_ford(g, "A")
    assert has_cycle is False
    assert cycle == []
    assert distances["C"] == 3.0
    assert get_path(predecessors, "C", source="A") == ["A", "B", "C"]


def test_bellman_ford_negative_cycle():
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", -5.0)
    g.add_edge("C", "B", "type", "just", 1.0)

    _, _, has_cycle, cycle = bellman_ford(g, "A")
    assert has_cycle is True
    assert cycle[0] == cycle[-1]
    assert set(cycle) == {"B", "C"}


def test_bellman_ford_cycle_weight_is_negative():
    g = Graph(directed=True)
    for c in "SABC":
        g.add_node(Node(c, c, "R"))

    g.add_edge("S", "A", "type", "just", 2.0)
    g.add_edge("A", "B", "type", "just", -1.0)
    g.add_edge("B", "C", "type", "just", -1.0)
    g.add_edge("C", "A", "type", "just", -1.5)

    _, _, has_cycle, cycle = bellman_ford(g, "S")
    assert has_cycle is True
    total = 0.0
    for u, v in zip(cycle, cycle[1:]):
        edge = g.get_edge(u, v)
        assert edge is not None
        total += edge.weight
    assert total < 0


def test_bellman_ford_unreachable_negative_cycle_ignored():
    g = Graph(directed=True)
    for c in "ABXY":
        g.add_node(Node(c, c, "R"))

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("X", "Y", "type", "just", -2.0)
    g.add_edge("Y", "X", "type", "just", 1.0)

    distances, _, has_cycle, cycle = bellman_ford(g, "A")
    assert has_cycle is False
    assert cycle == []
    assert distances["B"] == 1.0
