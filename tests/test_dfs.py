import pytest

from src.graphs.graph import Graph, Node
from src.graphs.algorithms import dfs


def test_dfs_cycle_detection():
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", 1.0)
    g.add_edge("C", "A", "type", "just", 1.0)

    result = dfs(g)
    has_back_edge = any(t == "Back Edge" for t in result["edges"].values())
    assert has_back_edge is True


def test_dfs_no_cycle():
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", 1.0)

    result = dfs(g)
    has_back_edge = any(t == "Back Edge" for t in result["edges"].values())
    assert has_back_edge is False


def test_dfs_discovery_order():
    g = Graph(directed=True)
    for c in "ABC":
        g.add_node(Node(c, c, "R"))
    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", 1.0)

    result = dfs(g, "A")
    assert result["discovery"]["A"] < result["discovery"]["B"] < result["discovery"]["C"]
    assert result["finish"]["A"] > result["finish"]["B"] > result["finish"]["C"]
