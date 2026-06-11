import json
import csv
import os
from typing import Dict, List, Any
from .graphs.graph import Graph, Node
from .graphs.algorithms import bfs, dijkstra, get_path

def calculate_global_metrics(graph: Graph, out_dir: str):
    """Calcula métricas globais do grafo e salva em global.json."""
    # Conectividade verificada com a própria BFS: o grafo é conectado se uma
    # varredura a partir de qualquer nó alcança todos os demais.
    first_node = next(iter(graph.nodes), None)
    connected = (
        len(bfs(graph, first_node)) == graph.get_order() if first_node else False
    )
    metrics = {
        "order": graph.get_order(),
        "size": graph.get_size(),
        "density": graph.get_density(),
        "connected": connected
    }

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "global.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=4)
    return metrics

def calculate_regional_metrics(graph: Graph, out_dir: str):
    """Calcula métricas para subgrafos induzidos por região e salva em regioes.json."""
    regions = {}
    for node in graph.nodes.values():
        if node.region not in regions:
            regions[node.region] = []
        regions[node.region].append(node.iata)

    regional_metrics = []
    for region, nodes in regions.items():
        # Subgrafo induzido
        subgraph = Graph(directed=graph.directed)
        for iata in nodes:
            subgraph.add_node(graph.nodes[iata])

        for iata in nodes:
            for edge in graph.adjacency_list[iata]:
                if edge.target in nodes:
                    # Evita contagem dupla para grafos não-direcionados
                    if not graph.directed and iata > edge.target:
                        continue
                    subgraph.add_edge(edge.source, edge.target, edge.connection_type, edge.justification, edge.weight)

        regional_metrics.append({
            "region": region,
            "order": subgraph.get_order(),
            "size": subgraph.get_size(),
            "density": subgraph.get_density()
        })

    with open(os.path.join(out_dir, "regioes.json"), "w", encoding="utf-8") as f:
        json.dump(regional_metrics, f, indent=4)
    return regional_metrics

def calculate_ego_metrics(graph: Graph, out_dir: str):
    """Calcula métricas de ego-redes para cada aeroporto e salva em arquivos CSV."""
    ego_data = []
    for iata in graph.nodes:
        neighbors = graph.get_neighbors(iata)
        ego_nodes = set(neighbors + [iata])

        # Subgrafo da ego-rede
        subgraph = Graph(directed=graph.directed)
        for node_iata in ego_nodes:
            subgraph.add_node(graph.nodes[node_iata])

        for node_iata in ego_nodes:
            for edge in graph.adjacency_list[node_iata]:
                if edge.target in ego_nodes:
                    if not graph.directed and node_iata > edge.target:
                        continue
                    subgraph.add_edge(edge.source, edge.target, edge.connection_type, edge.justification, edge.weight)

        ego_data.append({
            "aeroporto": iata,
            "grau": len(neighbors),
            "ordem_ego": subgraph.get_order(),
            "tamanho_ego": subgraph.get_size(),
            "densidade_ego": subgraph.get_density()
        })

    # out/ego_aeroportos.csv
    with open(os.path.join(out_dir, "ego_aeroportos.csv"), "w", encoding="utf-8", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["aeroporto", "grau", "ordem_ego", "tamanho_ego", "densidade_ego"])
        writer.writeheader()
        writer.writerows(ego_data)

    # out/graus.csv
    with open(os.path.join(out_dir, "graus.csv"), "w", encoding="utf-8", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["aeroporto", "grau"])
        for item in ego_data:
            writer.writerow([item["aeroporto"], item["grau"]])

    return ego_data

def find_rankings(ego_data: List[Dict[str, Any]]):
    """Identifica e imprime os aeroportos de destaque."""
    most_connected = max(ego_data, key=lambda x: x["grau"])
    highest_local_density = max(ego_data, key=lambda x: x["densidade_ego"])

    print(f"Aeroporto mais conectado: {most_connected['aeroporto']} (grau {most_connected['grau']})")
    print(f"Aeroporto com maior densidade local: {highest_local_density['aeroporto']} (densidade {highest_local_density['densidade_ego']:.4f})")

def process_routes(graph: Graph, routes: List[tuple], out_dir: str):
    """Calcula caminhos mínimos para uma lista de rotas e salva em distancias_rotas.csv."""
    route_results = []
    for origin, destination in routes:
        try:
            distances, predecessors = dijkstra(graph, origin, destination)
            cost = distances.get(destination, float('inf'))
            path = get_path(predecessors, destination)
            route_results.append({
                "origem": origin,
                "destino": destination,
                "custo": cost if cost != float('inf') else -1,
                "caminho": " -> ".join(path) if path else "N/A"
            })
        except Exception as e:
            print(f"Erro ao processar rota {origin} -> {destination}: {e}")

    with open(os.path.join(out_dir, "distancias_rotas.csv"), "w", encoding="utf-8", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["origem", "destino", "custo", "caminho"])
        writer.writeheader()
        writer.writerows(route_results)
    return route_results
