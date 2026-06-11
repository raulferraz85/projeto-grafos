from src.graphs.graph import Graph, Node
from src.graphs.algorithms import bellman_ford, get_path

def test_bellman_ford_negative_weights():
    # Caso obrigatório 1: pesos negativos SEM ciclo negativo — deve funcionar normalmente
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
    assert distances["C"] == 3.0  # A->B->C custa 5 + (-2) = 3, melhor que A->C (10)
    assert get_path(predecessors, "C", source="A") == ["A", "B", "C"]

def test_bellman_ford_negative_cycle():
    # Caso obrigatório 2: ciclo negativo — deve detectar E reportar o ciclo
    g = Graph(directed=True)
    nodes = [Node(c, c, "R") for c in "ABC"]
    for n in nodes:
        g.add_node(n)

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("B", "C", "type", "just", -5.0)
    g.add_edge("C", "B", "type", "just", 1.0)  # Ciclo B->C->B: -5 + 1 = -4

    _, _, has_cycle, cycle = bellman_ford(g, "A")
    assert has_cycle is True
    # O ciclo reportado deve ser fechado e conter exatamente B e C
    assert cycle[0] == cycle[-1]
    assert set(cycle) == {"B", "C"}

def test_bellman_ford_cycle_weight_is_negative():
    # O custo total do ciclo reportado deve ser de fato negativo
    g = Graph(directed=True)
    for c in "SABC":
        g.add_node(Node(c, c, "R"))

    g.add_edge("S", "A", "type", "just", 2.0)
    g.add_edge("A", "B", "type", "just", -1.0)
    g.add_edge("B", "C", "type", "just", -1.0)
    g.add_edge("C", "A", "type", "just", -1.5)  # ciclo A->B->C->A soma -3.5

    _, _, has_cycle, cycle = bellman_ford(g, "S")
    assert has_cycle is True
    total = 0.0
    for u, v in zip(cycle, cycle[1:]):
        edge = g.get_edge(u, v)
        assert edge is not None
        total += edge.weight
    assert total < 0

def test_bellman_ford_unreachable_negative_cycle_ignored():
    # Ciclo negativo em componente NÃO alcançável a partir da origem não deve disparar a detecção
    g = Graph(directed=True)
    for c in "ABXY":
        g.add_node(Node(c, c, "R"))

    g.add_edge("A", "B", "type", "just", 1.0)
    g.add_edge("X", "Y", "type", "just", -2.0)
    g.add_edge("Y", "X", "type", "just", 1.0)  # ciclo negativo isolado de A

    distances, _, has_cycle, cycle = bellman_ford(g, "A")
    assert has_cycle is False
    assert cycle == []
    assert distances["B"] == 1.0
