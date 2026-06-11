
from __future__ import annotations

import json
import os
import random
import time
import tracemalloc
from typing import Any, Dict, List

from ..graphs.algorithms import bellman_ford, bfs, dfs, dijkstra, get_path
from ..graphs.graph import Graph, Node
from .loader import load_mood_graph, load_spotify_graph


def _pick_sources(graph: Graph) -> List[str]:
    degrees = sorted(graph.nodes.keys(), key=lambda n: len(graph.adjacency_list.get(n, [])))
    n = len(degrees)
    if n < 3:
        return degrees
    return [degrees[-1], degrees[n // 2], degrees[0]]


def _make_negative_cycle_graph() -> Graph:
    g = Graph(directed=True)
    for i in range(4):
        g.add_node(Node(iata=f"S{i}", city=f"Sintético {i}", region="Sintético"))
    for src, tgt, w in [
        ("S0", "S1",  2.0),
        ("S1", "S2", -1.0),
        ("S2", "S3", -1.0),
        ("S3", "S1", -1.5),
        ("S0", "S3",  5.0),
    ]:
        g.add_edge(src, tgt, "synthetic", f"peso={w}", w)
    return g


def _induced_subgraph(graph: Graph, node_ids: List[str]) -> Graph:
    keep = set(node_ids)
    sub = Graph(directed=graph.directed)
    for nid in node_ids:
        sub.add_node(graph.nodes[nid])
    for nid in node_ids:
        for edge in graph.adjacency_list.get(nid, []):
            if edge.target in keep:
                sub.add_edge(edge.source, edge.target, edge.connection_type,
                             edge.justification, edge.weight)
    return sub


def _measure_peak_memory(fn) -> float:
    tracemalloc.start()
    fn()
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak / 1024.0


def _run_scaling_experiment(graph: Graph, all_nodes: List[str]) -> List[Dict[str, Any]]:
    if not all_nodes:
        return []
    sizes = [s for s in (500, 1000, 1500, 2000, 2500, 3000) if s <= len(all_nodes)]
    if len(all_nodes) not in sizes:
        sizes.append(len(all_nodes))

    rows: List[Dict[str, Any]] = []
    for size in sizes:
        sub = _induced_subgraph(graph, all_nodes[:size])
        src = next(iter(sub.nodes))

        t0 = time.perf_counter()
        bfs(sub, src)
        t_bfs = (time.perf_counter() - t0) * 1000

        t0 = time.perf_counter()
        dfs(sub, src)
        t_dfs = (time.perf_counter() - t0) * 1000

        t0 = time.perf_counter()
        dijkstra(sub, src)
        t_dijk = (time.perf_counter() - t0) * 1000

        t0 = time.perf_counter()
        bellman_ford(sub, src)
        t_bf = (time.perf_counter() - t0) * 1000

        rows.append({
            "order": sub.get_order(),
            "edges": sub.get_size(),
            "bfs_ms": round(t_bfs, 3),
            "dfs_ms": round(t_dfs, 3),
            "dijkstra_ms": round(t_dijk, 3),
            "bellman_ford_ms": round(t_bf, 3),
        })
        print(f"  escala n={size}: BFS {t_bfs:.1f}ms · DFS {t_dfs:.1f}ms · "
              f"Dijkstra {t_dijk:.1f}ms · Bellman-Ford {t_bf:.1f}ms")
    return rows


def _build_graph_sample(graph: Graph, all_nodes: List[str]) -> Dict[str, Any]:
    top200 = sorted(all_nodes, key=lambda nd: len(graph.adjacency_list.get(nd, [])), reverse=True)[:200]
    top200_set = set(top200)

    sample_nodes = [
        {
            "id": nd,
            "label": graph.nodes[nd].city[:40],
            "genre": graph.nodes[nd].region,
            "degree": len(graph.adjacency_list.get(nd, [])),
        }
        for nd in top200
    ]

    sample_edges = []
    for nd in top200:
        for edge in graph.adjacency_list.get(nd, []):
            if edge.target in top200_set:
                sample_edges.append({
                    "source": nd,
                    "target": edge.target,
                    "weight": round(edge.weight, 4),
                })

    return {"nodes": sample_nodes, "edges": sample_edges}


def _compute_dataset_analytics(graph: Graph, all_nodes: List[str]) -> Dict[str, Any]:
    genre_counts: Dict[str, int] = {}
    for nd in all_nodes:
        genre = graph.nodes[nd].region
        genre_counts[genre] = genre_counts.get(genre, 0) + 1

    all_weights = [
        edge.weight
        for nd in all_nodes
        for edge in graph.adjacency_list.get(nd, [])
    ]
    n_bins = 20
    bin_size = 1.0 / n_bins
    weight_hist = [0] * n_bins
    for w in all_weights:
        idx = min(int(w / bin_size), n_bins - 1)
        weight_hist[idx] += 1
    edge_weight_hist = [
        {"bin_start": round(i * bin_size, 2), "bin_end": round((i + 1) * bin_size, 2), "count": weight_hist[i]}
        for i in range(n_bins)
    ]

    in_degree: Dict[str, int] = {nd: 0 for nd in all_nodes}
    out_degree: Dict[str, int] = {}
    for nd in all_nodes:
        edges = graph.adjacency_list.get(nd, [])
        out_degree[nd] = len(edges)
        for edge in edges:
            if edge.target in in_degree:
                in_degree[edge.target] += 1
    total_degree = {nd: out_degree.get(nd, 0) + in_degree.get(nd, 0) for nd in all_nodes}
    top_hubs = sorted(all_nodes, key=lambda nd: -total_degree[nd])[:10]
    top_hubs_data = [
        {
            "id": nd,
            "label": graph.nodes[nd].city[:40],
            "genre": graph.nodes[nd].region,
            "degree": total_degree[nd],
            "out_degree": out_degree.get(nd, 0),
        }
        for nd in top_hubs
    ]

    cross = sum(
        1
        for nd in all_nodes
        for edge in graph.adjacency_list.get(nd, [])
        if graph.nodes[nd].region != graph.nodes.get(edge.target, graph.nodes[nd]).region
    )
    total_edges = len(all_weights)

    return {
        "genre_counts": genre_counts,
        "edge_weight_hist": edge_weight_hist,
        "edge_weight_mean": round(sum(all_weights) / max(len(all_weights), 1), 4),
        "edge_weight_near_pct": round(100.0 * sum(1 for w in all_weights if w < 0.2) / max(len(all_weights), 1), 1),
        "top_hubs": top_hubs_data,
        "cross_genre_pct": round(100.0 * cross / max(total_edges, 1), 1),
    }


def run_benchmark(dataset_dir: str, out_dir: str) -> Dict[str, Any]:
    os.makedirs(out_dir, exist_ok=True)

    print("Carregando grafo Spotify (Parte 2)...")
    graph = load_spotify_graph(dataset_dir)
    all_nodes = list(graph.nodes.keys())
    n = graph.get_order()
    e = graph.get_size()
    degrees = [len(graph.adjacency_list.get(nd, [])) for nd in all_nodes]
    sorted_degs = sorted(degrees)
    print(f"  {n:,} nós · {e:,} arestas")

    sources = _pick_sources(graph)

    print("BFS...")
    bfs_results: List[Dict[str, Any]] = []
    for src in sources:
        t0 = time.perf_counter()
        levels = bfs(graph, src)
        elapsed = (time.perf_counter() - t0) * 1000

        max_layer = max(levels.values()) if levels else 0
        layer_counts: Dict[int, int] = {}
        for lv in levels.values():
            layer_counts[lv] = layer_counts.get(lv, 0) + 1

        bfs_results.append({
            "source": src,
            "source_label": graph.nodes[src].city[:60],
            "source_genre": graph.nodes[src].region,
            "visited": len(levels),
            "max_layer": max_layer,
            "layer_sizes": [layer_counts.get(i, 0) for i in range(min(max_layer + 1, 25))],
            "time_ms": round(elapsed, 3),
        })

    print("DFS...")
    dfs_results: List[Dict[str, Any]] = []
    for src in sources:
        t0 = time.perf_counter()
        result = dfs(graph, src)
        elapsed = (time.perf_counter() - t0) * 1000
        back_edges = sum(1 for v in result["edges"].values() if v == "Back Edge")
        dfs_results.append({
            "source": src,
            "source_label": graph.nodes[src].city[:60],
            "source_genre": graph.nodes[src].region,
            "visited": len(result["discovery"]),
            "back_edges": back_edges,
            "has_cycle": back_edges > 0,
            "time_ms": round(elapsed, 3),
        })

    print("Dijkstra...")
    top50 = sorted(all_nodes, key=lambda nd: len(graph.adjacency_list.get(nd, [])), reverse=True)[:50]
    random.seed(42)
    pairs: List[tuple[str, str]] = []
    attempts = 0
    while len(pairs) < 5 and attempts < 200:
        a, b = random.choice(top50), random.choice(top50)
        attempts += 1
        if a != b and (a, b) not in pairs and (b, a) not in pairs:
            pairs.append((a, b))

    dijkstra_results: List[Dict[str, Any]] = []
    for src, tgt in pairs:
        t0 = time.perf_counter()
        distances, predecessors = dijkstra(graph, src, tgt)
        elapsed = (time.perf_counter() - t0) * 1000
        cost = distances.get(tgt, float("inf"))
        path = get_path(predecessors, tgt) if cost != float("inf") else []
        dijkstra_results.append({
            "source": src,
            "source_label": graph.nodes[src].city[:50],
            "target": tgt,
            "target_label": graph.nodes[tgt].city[:50],
            "cost": round(cost, 6) if cost != float("inf") else -1,
            "hops": len(path) - 1 if len(path) > 1 else -1,
            "path_labels": [graph.nodes[nd].city[:30] for nd in path[:8]] if path else [],
            "reachable": cost != float("inf") and len(path) > 1,
            "time_ms": round(elapsed, 3),
        })

    print("Bellman-Ford (caso 1: pesos negativos sem ciclo)...")
    try:
        mood_graph = load_mood_graph(dataset_dir)
        mood_nodes = list(mood_graph.nodes.keys())

        if mood_nodes:
            out_deg = {nd: len(mood_graph.adjacency_list.get(nd, [])) for nd in mood_nodes}
            in_deg: Dict[str, int] = {nd: 0 for nd in mood_nodes}
            for nd in mood_nodes:
                for edge in mood_graph.adjacency_list.get(nd, []):
                    in_deg[edge.target] = in_deg.get(edge.target, 0) + 1

            bf1_src = max(mood_nodes, key=lambda nd: out_deg[nd])
            candidates = sorted(mood_nodes, key=lambda nd: in_deg[nd], reverse=True)
            bf1_tgt = next(nd for nd in candidates if nd != bf1_src)

            t0 = time.perf_counter()
            bf1_dist, bf1_pred, bf1_cycle, _ = bellman_ford(mood_graph, bf1_src)
            elapsed = (time.perf_counter() - t0) * 1000

            cost1 = bf1_dist.get(bf1_tgt, float("inf"))
            if cost1 == float("inf"):
                reachable = [nd for nd, d in bf1_dist.items() if d != float("inf") and nd != bf1_src]
                if reachable:
                    bf1_tgt = max(reachable, key=lambda nd: in_deg[nd])
                    cost1 = bf1_dist[bf1_tgt]
            path1 = get_path(bf1_pred, bf1_tgt) if cost1 != float("inf") else []

            neg_edges = sum(
                1 for u in mood_graph.adjacency_list
                for edge in mood_graph.adjacency_list[u]
                if edge.weight < 0
            )
            total_mood_edges = mood_graph.get_size()

            bf_case1: Dict[str, Any] = {
                "source": bf1_src,
                "source_label": mood_graph.nodes[bf1_src].city[:50],
                "target": bf1_tgt,
                "target_label": mood_graph.nodes[bf1_tgt].city[:50],
                "cost": round(cost1, 6) if cost1 != float("inf") else None,
                "path_labels": [mood_graph.nodes[nd].city[:30] for nd in path1[:8]] if path1 else [],
                "negative_cycle": bf1_cycle,
                "negative_edges_count": neg_edges,
                "total_mood_edges": total_mood_edges,
                "pct_negative": round(100 * neg_edges / max(total_mood_edges, 1), 1),
                "time_ms": round(elapsed, 3),
                "description": (
                    "Grafo mood-score (valence - energy). "
                    "Pesos negativos quando energia > valência. "
                    "DAG garantido (arestas apenas de índice menor para maior) — sem ciclos negativos."
                ),
            }
        else:
            bf_case1 = {"error": "Grafo mood vazio após filtragem"}
    except Exception as exc:
        bf_case1 = {"error": str(exc)}

    print("Bellman-Ford (caso 2: ciclo negativo)...")
    synth = _make_negative_cycle_graph()
    t0 = time.perf_counter()
    _, _, synth_has_cycle, synth_cycle = bellman_ford(synth, "S0")
    elapsed = (time.perf_counter() - t0) * 1000

    cycle_weight = 0.0
    for u, v in zip(synth_cycle, synth_cycle[1:]):
        edge = synth.get_edge(u, v)
        if edge:
            cycle_weight += edge.weight

    bf_case2: Dict[str, Any] = {
        "graph_nodes": synth.get_order(),
        "graph_edges_directed": [
            {"from": u, "to": edge.target, "weight": edge.weight}
            for u in synth.adjacency_list
            for edge in synth.adjacency_list[u]
        ],
        "negative_cycle_detected": synth_has_cycle,
        "negative_cycle_nodes": synth_cycle,
        "negative_cycle_weight": round(cycle_weight, 3),
        "time_ms": round(elapsed, 3),
        "description": (
            "Grafo sintético: 4 nós, ciclo S1→S2→S3→S1 com soma de pesos = -3.5. "
            "Bellman-Ford detecta e reporta o ciclo em negative_cycle_nodes."
        ),
    }

    print("Experimento de escala (Ordem × Tempo)...")
    scaling = _run_scaling_experiment(graph, all_nodes)

    print("Medindo memória de pico...")
    mem_src = sources[0]
    memory_kb = {
        "bfs": round(_measure_peak_memory(lambda: bfs(graph, mem_src)), 1),
        "dfs": round(_measure_peak_memory(lambda: dfs(graph, mem_src)), 1),
        "dijkstra": round(_measure_peak_memory(lambda: dijkstra(graph, mem_src)), 1),
        "bellman_ford": round(_measure_peak_memory(lambda: bellman_ford(graph, mem_src)), 1),
    }

    avg_bfs = sum(r["time_ms"] for r in bfs_results) / max(len(bfs_results), 1)
    avg_dfs = sum(r["time_ms"] for r in dfs_results) / max(len(dfs_results), 1)
    avg_dijk = sum(r["time_ms"] for r in dijkstra_results) / max(len(dijkstra_results), 1)
    bf_times = [t for t in (bf_case1.get("time_ms"), bf_case2["time_ms"]) if t]
    avg_bf = sum(bf_times) / max(len(bf_times), 1)

    report: Dict[str, Any] = {
        "dataset": {
            "name": "Spotify Tracks Dataset",
            "source": "Kaggle — maharshipandya/-spotify-tracks-dataset",
            "nodes": n,
            "edges": e,
            "type": "directed_weighted",
            "weighted": True,
            "degree_min": sorted_degs[0] if sorted_degs else 0,
            "degree_max": sorted_degs[-1] if sorted_degs else 0,
            "degree_mean": round(sum(degrees) / max(len(degrees), 1), 2),
            "degree_median": sorted_degs[len(sorted_degs) // 2] if sorted_degs else 0,
        },
        "bfs_results": bfs_results,
        "dfs_results": dfs_results,
        "dijkstra_results": dijkstra_results,
        "bellman_ford_results": {
            "negative_weight_case": bf_case1,
            "negative_cycle_case": bf_case2,
        },
        "performance_summary": {
            "bfs_avg_ms": round(avg_bfs, 3),
            "dfs_avg_ms": round(avg_dfs, 3),
            "dijkstra_avg_ms": round(avg_dijk, 3),
            "bellman_ford_avg_ms": round(avg_bf, 3),
            "peak_memory_kb": memory_kb,
        },
        "scaling_experiment": scaling,
        "analysis": {
            "comparacao": (
                f"Comparação justa (mesmo grafo, {scaling[-1]['order']:,} nós e "
                f"{scaling[-1]['edges']:,} arestas): BFS {scaling[-1]['bfs_ms']:.1f} ms, "
                f"Dijkstra {scaling[-1]['dijkstra_ms']:.1f} ms, DFS {scaling[-1]['dfs_ms']:.1f} ms "
                f"e Bellman-Ford {scaling[-1]['bellman_ford_ms']:.1f} ms "
                f"({scaling[-1]['bellman_ford_ms'] / max(scaling[-1]['bfs_ms'], 0.001):.0f}× a BFS). "
                "BFS e Dijkstra visitam cada aresta uma vez (o heap adiciona o fator log V); "
                "o DFS paga o custo extra da classificação de arestas; o Bellman-Ford repete "
                "passadas completas de relaxamento (O(V·E) no pior caso — aqui a parada "
                "antecipada limita as passadas ao diâmetro do grafo, e ainda assim ele é o "
                "mais lento). Sem a parada antecipada, as 2.999 passadas levariam minutos."
            ),
            "adequacao": (
                "BFS: caminhos com menos saltos em grafos não ponderados e análise por camadas. "
                "DFS: detecção de ciclos e classificação estrutural de arestas. "
                "Dijkstra: caminho mínimo com pesos não negativos (caso geral mais eficiente). "
                "Bellman-Ford: único correto com pesos negativos; detecta e reporta ciclos negativos."
            ),
            "limites_do_modelo": (
                "Pesos do grafo principal são distâncias euclidianas em espaço de áudio "
                "normalizado — sem significado físico absoluto; o k-NN (k=50) impõe grau de "
                "saída fixo, distorcendo a distribuição de graus natural. No grafo mood "
                "(valence − energia), o peso negativo modela 'ganho de energia', mas a "
                "construção em DAG impede ciclos por definição, então o caso de ciclo "
                "negativo precisa de grafo sintético."
            ),
        },
        "graph_sample": _build_graph_sample(graph, all_nodes),
        "dataset_analytics": _compute_dataset_analytics(graph, all_nodes),
    }

    out_path = os.path.join(out_dir, "parte2_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  parte2_report.json → {out_path}")

    return report
