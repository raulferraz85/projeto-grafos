import argparse
import os
import sys
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

def main():
    parser = argparse.ArgumentParser(description="Brazilian Airport Network Analysis")
    parser.add_argument("--dataset", type=str, required=True, help="Path to airport data CSV")
    parser.add_argument("--adjacencias", type=str, default="data/adjacencias_aeroportos.csv", help="Path to adjacencies CSV")
    parser.add_argument("--rotas", type=str, default="data/rotas.csv", help="Path to routes CSV")
    parser.add_argument("--alg", type=str, choices=["BFS", "DFS", "DIJKSTRA", "BELLMAN-FORD"], help="Algorithm to run")
    parser.add_argument("--source", type=str, help="Source IATA code")
    parser.add_argument("--target", type=str, help="Target IATA code")
    parser.add_argument("--out", type=str, default="out/", help="Output directory")

    args = parser.parse_args()

    # Initialize Graph
    graph = Graph(directed=False)
    
    # Load Data
    try:
        airports = load_airports(args.dataset)
        for airport in airports:
            graph.add_node(airport)
            
        load_adjacencies(args.adjacencias, graph)
        routes = load_routes(args.rotas)
    except Exception as e:
        print(f"Error loading data: {e}")
        sys.exit(1)

    # Calculate and Save Metrics (Always done as part of Parte 1)
    print("Calculating metrics...")
    calculate_global_metrics(graph, args.out)
    calculate_regional_metrics(graph, args.out)
    ego_data = calculate_ego_metrics(graph, args.out)
    find_rankings(ego_data)
    route_results = process_routes(graph, routes, args.out)

    # Caminhos obrigatorios (REC->POA e MAO->GRU)
    mandatory_paths = {}
    for res in route_results:
        key = f"{res['origem']}->{res['destino']}"
        is_mandatory = (
            (res["origem"] == "REC" and res["destino"] == "POA") or
            (res["origem"] == "MAO" and res["destino"] == "GRU")
        )
        if is_mandatory and res["caminho"] != "N/A":
            mandatory_paths[key] = res["caminho"].split(" -> ")

    # Visualizations
    print("Generating visualizations...")
    from .viz import generate_interactive_graph, generate_path_tree, generate_exploratory_plots
    generate_interactive_graph(graph, ego_data, os.path.join(args.out, "grafo_interativo.html"), mandatory_paths)
    data_dir = os.path.dirname(args.dataset) or "data"
    generate_exploratory_plots(args.out, data_dir=data_dir)

    if mandatory_paths:
        generate_path_tree(graph, mandatory_paths, os.path.join(args.out, "arvore_percurso.html"))

    # Run specific algorithm if requested
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
                print(f"Dijkstra from {args.source} to {args.target}: Cost={cost}, Path={' -> '.join(path)}")
                
        elif args.alg == "BELLMAN-FORD":
            if not args.source:
                print("Error: BELLMAN-FORD requires --source")
            else:
                distances, predecessors, cycle = bellman_ford(graph, args.source)
                if cycle:
                    print("Warning: Negative cycle detected!")
                if args.target:
                    path = get_path(predecessors, args.target)
                    cost = distances.get(args.target, float('inf'))
                    print(f"Bellman-Ford from {args.source} to {args.target}: Cost={cost}, Path={' -> '.join(path)}")
                else:
                    print(f"Bellman-Ford distances from {args.source} calculated.")

if __name__ == "__main__":
    main()
