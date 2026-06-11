import argparse
import os
import sys
from pathlib import Path
from .graphs.graph import Graph
from .graphs.io import load_airports, load_adjacencies, load_routes
from .graphs.algorithms import bfs, dfs, dijkstra, bellman_ford, get_path
from .solve import (
    calculate_global_metrics,
    calculate_regional_metrics,
    calculate_ego_metrics,
    find_rankings,
    process_routes
)


def _is_parte2_dataset(dataset_path: str) -> bool:
    return "dataset_parte2" in dataset_path.replace("\\", "/")


def _run_parte2(
    dataset_dir: str,
    out_dir: str,
    alg: str | None,
    source: str | None,
    target: str | None,
) -> None:
    from .parte2.benchmark import run_benchmark
    from .parte2.viz import generate_parte2_visualizations
    from .parte2.loader import load_spotify_graph

    print("==> Parte 2: Benchmark nos dados do Spotify...")
    report = run_benchmark(dataset_dir, out_dir)

    print("==> Parte 2: Gerando visualizações...")
    graph = load_spotify_graph(dataset_dir)
    generate_parte2_visualizations(graph, report, out_dir)

    if alg:
        if not source:
            print(f"Erro: --alg {alg} requer --source")
            return
        all_nodes = list(graph.nodes.keys())
        if source not in graph.nodes:
            print(f"Nó '{source}' não encontrado. Use um track_id do nodes.csv")
            return
        if alg == "BFS":
            levels = bfs(graph, source)
            print(
                f"BFS de {source}: {len(levels)} nós visitados,"
                f" max_layer={max(levels.values())}"
            )
        elif alg == "DFS":
            result = dfs(graph, source)
            back = sum(1 for v in result["edges"].values() if v == "Back Edge")
            print(
                f"DFS de {source}: {len(result['discovery'])} visitados,"
                f" {back} back edges"
            )
        elif alg == "DIJKSTRA":
            if not target:
                print("Erro: DIJKSTRA requer --target")
                return
            distances, predecessors = dijkstra(graph, source, target)
            cost = distances.get(target, float("inf"))
            path = get_path(predecessors, target) if cost != float("inf") else []
            print(
                f"Dijkstra {source}→{target}: custo={cost:.4f},"
                f" caminho={' → '.join(path)}"
            )
        elif alg == "BELLMAN-FORD":
            from .parte2.loader import load_mood_graph
            mood_graph = load_mood_graph(dataset_dir)
            if source not in mood_graph.nodes:
                print(f"Nó '{source}' não encontrado no mood graph.")
                return
            distances, predecessors, has_cycle, cycle = bellman_ford(mood_graph, source)
            if has_cycle:
                print(f"Aviso: ciclo negativo detectado! Ciclo: {' → '.join(cycle)}")
            if target and target in mood_graph.nodes:
                cost = distances.get(target, float("inf"))
                path = get_path(predecessors, target) if cost != float("inf") else []
                print(
                    f"Bellman-Ford {source}→{target}: custo={cost:.4f},"
                    f" caminho={' → '.join(path)}"
                )
            else:
                reachable = sum(1 for v in distances.values() if v != float("inf"))
                print(f"Bellman-Ford de {source}: {reachable} nós alcançáveis")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Graph Network Analysis — Parte 1 (Aeroportos) e Parte 2 (Spotify)"
        )
    )
    parser.add_argument(
        "--dataset",
        type=str,
        required=True,
        help=(
            "Caminho para o CSV de aeroportos (Parte 1) ou"
            " diretório dataset_parte2/ (Parte 2)"
        ),
    )
    parser.add_argument(
        "--adjacencias",
        type=str,
        default="data/adjacencias_aeroportos.csv",
        help="CSV de adjacências (Parte 1)",
    )
    parser.add_argument(
        "--rotas",
        type=str,
        default="data/rotas.csv",
        help="CSV de rotas (Parte 1)",
    )
    parser.add_argument(
        "--alg",
        type=str,
        choices=["BFS", "DFS", "DIJKSTRA", "BELLMAN-FORD"],
        help="Algoritmo a executar",
    )
    parser.add_argument("--source", type=str, help="Nó de origem")
    parser.add_argument("--target", type=str, help="Nó de destino")
    parser.add_argument("--out", type=str, default="out/", help="Diretório de saída")

    args = parser.parse_args()

    if _is_parte2_dataset(args.dataset):
        try:
            _run_parte2(args.dataset, args.out, args.alg, args.source, args.target)
        except FileNotFoundError as exc:
            print(f"Erro: {exc}")
            sys.exit(1)
        return

    graph = Graph(directed=False)

    try:
        airports = load_airports(args.dataset)
        for airport in airports:
            graph.add_node(airport)

        load_adjacencies(args.adjacencias, graph)
        routes = load_routes(args.rotas)
    except Exception as e:
        print(f"Error loading data: {e}")
        sys.exit(1)

    print("Calculating metrics...")
    calculate_global_metrics(graph, args.out)
    calculate_regional_metrics(graph, args.out)
    ego_data = calculate_ego_metrics(graph, args.out)
    find_rankings(ego_data)
    route_results = process_routes(graph, routes, args.out)

    mandatory_paths = {}
    for res in route_results:
        key = f"{res['origem']}->{res['destino']}"
        if res["caminho"] != "N/A":
            mandatory_paths[key] = res["caminho"].split(" -> ")

    print("Generating visualizations...")
    from .interactive import generate_interactive_graph
    from .viz import generate_path_tree, generate_exploratory_plots
    generate_interactive_graph(
        graph,
        ego_data,
        os.path.join(args.out, "grafo_interativo.html"),
        mandatory_paths,
    )
    data_dir = os.path.dirname(args.dataset) or "data"
    generate_exploratory_plots(args.out, data_dir=data_dir)

    if mandatory_paths:
        generate_path_tree(
            graph,
            mandatory_paths,
            os.path.join(args.out, "arvore_percurso.html"),
        )

    if args.alg:
        if args.alg == "BFS":
            if not args.source:
                print("Error: BFS requires --source")
            else:
                levels = bfs(graph, args.source)
                print(f"BFS Levels from {args.source}: {levels}")

        elif args.alg == "DFS":
            result = dfs(graph, args.source)
            print(f"DFS executed. Cycles and edge classification recorded.")

        elif args.alg == "DIJKSTRA":
            if not args.source or not args.target:
                print("Error: DIJKSTRA requires --source and --target")
            else:
                distances, predecessors = dijkstra(graph, args.source, args.target)
                path = get_path(predecessors, args.target)
                cost = distances.get(args.target, float('inf'))
                print(
                    f"Dijkstra from {args.source} to {args.target}:"
                    f" Cost={cost}, Path={' -> '.join(path)}"
                )

        elif args.alg == "BELLMAN-FORD":
            if not args.source:
                print("Error: BELLMAN-FORD requires --source")
            else:
                distances, predecessors, has_cycle, cycle = bellman_ford(
                    graph, args.source
                )
                if has_cycle:
                    print(
                        f"Warning: Negative cycle detected!"
                        f" Cycle: {' -> '.join(cycle)}"
                    )
                if args.target:
                    path = get_path(predecessors, args.target)
                    cost = distances.get(args.target, float('inf'))
                    print(
                        f"Bellman-Ford from {args.source} to {args.target}:"
                        f" Cost={cost}, Path={' -> '.join(path)}"
                    )
                else:
                    print(f"Bellman-Ford distances from {args.source} calculated.")


if __name__ == "__main__":
    main()
