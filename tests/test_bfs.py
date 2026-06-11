import pytest

from src.graphs.graph import Graph, Node
from src.graphs.algorithms import bfs


def test_bfs_levels():
    g = Graph()
    for c in "ABCD":
        g.add_node(Node(c, c, "R"))

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", 1.0)
    g.add_edge("A", "D", "type", "just", 1.0)

    levels = bfs(g, "A")
    assert levels["A"] == 0
    assert levels["B"] == 1
    assert levels["D"] == 1
    assert levels["C"] == 2


def test_bfs_disconnected():
    g = Graph()
    for c in "ABCD":
        g.add_node(Node(c, c, "R"))

    g.add_edge("A", "B", "type", "just", 1.0)

    levels = bfs(g, "A")
    assert "A" in levels
    assert "B" in levels
    assert "C" not in levels
    assert "D" not in levels
