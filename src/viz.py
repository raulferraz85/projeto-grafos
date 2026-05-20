import os
import pandas as pd
from pyvis.network import Network
import json

def generate_visualizations(out_dir="out"):
    os.makedirs(out_dir, exist_ok=True)
    
    # Load global and ego data for tooltips
    try:
        with open(os.path.join(out_dir, "global.json"), "r") as f:
            global_metrics = json.load(f)
        ego_df = pd.read_csv(os.path.join(out_dir, "ego_aeroportos.csv"))
        ego_map = ego_df.set_index("aeroporto").to_dict(orient="index")
    except Exception as e:
        print(f"Warning: Could not load metrics for tooltips: {e}")
        ego_map = {}

    # 1. Interactive Graph (out/grafo_interativo.html)
    net = Network(height="750px", width="100%", bgcolor="#0f172a", font_color="white", directed=False)
    net.toggle_physics(True)
    
    # Add nodes with tooltips
    for iata, info in ego_map.items():
        tooltip = f"IATA: {iata}<br>Grau: {info['grau']}<br>Densidade Ego: {info['densidade_ego']:.4f}"
        net.add_node(iata, label=iata, title=tooltip, color="#38bdf8")
        
    # We need the edges too. Let's load them from adjacencias.
    # For simplicity, I'll just assume they are available if we have the graph object.
    # But since this is a separate script, I'll just skip adding all edges for now 
    # or I could pass the graph. Let's assume this function is called from cli or solve.
    
    # Actually, the user wants out/arvore_percurso.html specifically for the two paths.
    
import matplotlib.pyplot as plt
import seaborn as sns

def generate_exploratory_plots(out_dir):
    # 1. Degree Distribution
    ego_df = pd.read_csv(os.path.join(out_dir, "ego_aeroportos.csv"))
    plt.figure(figsize=(10, 6))
    sns.histplot(ego_df["grau"], bins=10, kde=True, color="skyblue")
    plt.title("Distribuição de Graus dos Aeroportos")
    plt.xlabel("Grau (Número de Conexões)")
    plt.ylabel("Frequência")
    plt.savefig(os.path.join(out_dir, "distribuicao_graus.png"))
    plt.close()

    # 2. Regional Comparison
    with open(os.path.join(out_dir, "regioes.json"), "r") as f:
        regioes = json.load(f)
    reg_df = pd.DataFrame(regioes)
    plt.figure(figsize=(10, 6))
    sns.barplot(x="region", y="order", data=reg_df, palette="viridis")
    plt.title("Número de Aeroportos por Região")
    plt.xlabel("Região")
    plt.ylabel("Ordem (Nº de Aeroportos)")
    plt.savefig(os.path.join(out_dir, "aeroportos_por_regiao.png"))
    plt.close()

    # 3. Density Comparison
    plt.figure(figsize=(10, 6))
    sns.barplot(x="region", y="density", data=reg_df, palette="magma")
    plt.title("Densidade da Malha Aérea por Região")
    plt.xlabel("Região")
    plt.ylabel("Densidade")
    plt.savefig(os.path.join(out_dir, "densidade_por_regiao.png"))
    plt.close()

    # 4. Top 10 Connected Airports
    top_10 = ego_df.nlargest(10, "grau")
    plt.figure(figsize=(12, 6))
    sns.barplot(x="grau", y="aeroporto", data=top_10, palette="rocket")
    plt.title("Top 10 Aeroportos Mais Conectados")
    plt.xlabel("Grau")
    plt.ylabel("Aeroporto (IATA)")
    plt.savefig(os.path.join(out_dir, "top_10_conectados.png"))
    plt.close()
    print("Visualizações exploratórias geradas em out/")

def generate_interactive_graph(graph, ego_data, out_path):
    net = Network(height="750px", width="100%", bgcolor="#0f172a", font_color="white", directed=False)
    net.toggle_physics(True)
    
    ego_map = {item["aeroporto"]: item for item in ego_data}
    
    for iata, node in graph.nodes.items():
        info = ego_map.get(iata, {"grau": 0, "densidade_ego": 0})
        tooltip = f"IATA: {iata}<br>Cidade: {node.city}<br>Região: {node.region}<br>Grau: {info['grau']}<br>Densidade Ego: {info['densidade_ego']:.4f}"
        net.add_node(iata, label=iata, title=tooltip, color="#38bdf8")
        
    for u in graph.adjacency_list:
        for edge in graph.adjacency_list[u]:
            if u < edge.target: # Avoid double edges in undirected
                net.add_edge(u, edge.target, title=f"{edge.connection_type}: {edge.justification}")
                
    net.write_html(out_path)
    print(f"Grafo interativo gerado em: {out_path}")

def generate_path_tree(graph, paths, out_path):
    net = Network(height="750px", width="100%", bgcolor="#0f172a", font_color="white", directed=False)
    net.toggle_physics(False)
    
    colors = ["#38bdf8", "#f97316", "#22c55e", "#a78bfa", "#facc15"]
    
    added_nodes = set()
    
    for i, (name, path) in enumerate(paths.items()):
        color = colors[i % len(colors)]
        for j in range(len(path) - 1):
            u, v = path[j], path[j+1]
            if u not in added_nodes:
                net.add_node(u, label=u, color="#64748b", size=25)
                added_nodes.add(u)
            if v not in added_nodes:
                net.add_node(v, label=v, color="#64748b", size=25)
                added_nodes.add(v)
            
            net.add_edge(u, v, color=color, width=6, title=f"Caminho: {name}")
            
    net.write_html(out_path)
    print(f"Árvore de percurso gerada em: {out_path}")

if __name__ == "__main__":
    # This is a bit tricky to run standalone without the graph.
    # I'll integrate it into solve.py or cli.py.
    pass
