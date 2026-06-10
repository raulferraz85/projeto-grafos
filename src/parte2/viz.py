"""Visualizações da Parte 2 (dataset Spotify)."""

from __future__ import annotations

import json
import os
from collections import Counter
from typing import Any, Dict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

from ..graphs.graph import Graph

GENRE_COLORS = [
    "#38bdf8", "#f97316", "#a78bfa", "#22c55e", "#facc15",
    "#fb923c", "#4ade80", "#f472b6", "#ef4444", "#818cf8",
    "#fbbf24", "#86efac", "#67e8f9", "#c4b5fd", "#fca5a5",
]

ALGO_COLORS = {
    "BFS": "#38bdf8",
    "DFS": "#a78bfa",
    "Dijkstra": "#22c55e",
    "Bellman-Ford": "#f97316",
}

SOURCE_LABELS = ["Hub (maior grau)", "Mediano", "Periférico (menor grau)"]


def _apply_style():
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "font.size": 10,
        "axes.titlesize": 11,
        "axes.labelsize": 10,
    })


def generate_parte2_visualizations(graph: Graph, report: Dict[str, Any], out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    _apply_style()

    _plot_degree_distribution(graph, report, out_dir)
    _plot_algo_comparison(report, out_dir)
    _plot_bfs_layers(report, out_dir)
    _plot_genre_distribution(graph, out_dir)
    _build_sample_graph_html(graph, out_dir)

    print("Visualizações Parte 2 geradas.")


def _plot_degree_distribution(graph: Graph, report: Dict[str, Any], out_dir: str):
    all_nodes = list(graph.nodes.keys())
    degrees = [len(graph.adjacency_list.get(n, [])) for n in all_nodes]
    ds = report.get("dataset", {})

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.hist(degrees, bins=50, color="#38bdf8", edgecolor="#0ea5e9", linewidth=0.5, alpha=0.85)
    mean_deg = ds.get("degree_mean", 0)
    med_deg = ds.get("degree_median", 0)
    ax.axvline(mean_deg, color="#f97316", linestyle="--", linewidth=2, label=f"Média: {mean_deg:.1f}")
    ax.axvline(med_deg, color="#22c55e", linestyle="-.", linewidth=2, label=f"Mediana: {med_deg}")
    ax.set_title(
        "Distribuição de Graus — Rede Musical Spotify\n"
        f"{ds.get('nodes', 0):,} músicas · {ds.get('edges', 0):,} conexões",
        pad=10,
    )
    ax.set_xlabel("Grau (nº de músicas similares conectadas)")
    ax.set_ylabel("Frequência")
    ax.legend(fontsize=10)
    plt.tight_layout()
    fig.savefig(os.path.join(out_dir, "parte2_degree_dist.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


def _plot_algo_comparison(report: Dict[str, Any], out_dir: str):
    perf = report.get("performance_summary", {})
    algos = ["BFS", "DFS", "Dijkstra", "Bellman-Ford"]
    keys = ["bfs_avg_ms", "dfs_avg_ms", "dijkstra_avg_ms", "bellman_ford_avg_ms"]
    times = [perf.get(k, 0) for k in keys]
    colors = [ALGO_COLORS[a] for a in algos]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    bars = ax1.barh(algos, times, color=colors, edgecolor="#334155", linewidth=0.6)
    ax1.bar_label(bars, fmt="%.2f ms", padding=4, fontsize=9)
    max_t = max(times) if max(times) > 0 else 1
    ax1.set_xlim(right=max_t * 1.3)
    ax1.set_xlabel("Tempo médio (ms)")
    ax1.set_title("Comparação de Desempenho\n(média por execução no dataset Spotify)")

    complexity_data = [
        ["BFS", "O(V + E)", "O(V)", "Pesos iguais, por camadas"],
        ["DFS", "O(V + E)", "O(V)", "Por profundidade, detecta ciclos"],
        ["Dijkstra", "O((V+E) log V)", "O(V)", "Apenas pesos não-negativos"],
        ["Bellman-Ford", "O(V × E)", "O(V)", "Suporta pesos negativos"],
    ]
    ax2.axis("off")
    tbl = ax2.table(
        cellText=complexity_data,
        colLabels=["Algoritmo", "Complexidade tempo", "Espaço", "Quando usar"],
        loc="center",
        cellLoc="left",
    )
    tbl.auto_set_font_size(True)
    tbl.set_fontsize(9)
    tbl.scale(1, 1.9)
    for (row, col), cell in tbl.get_celld().items():
        if row == 0:
            cell.set_facecolor("#1e293b")
            cell.set_text_props(color="white", fontweight="bold")
        elif row % 2 == 1:
            cell.set_facecolor("#f8fafc")
        cell.set_edgecolor("#e2e8f0")
    ax2.set_title("Complexidade e Aplicabilidade", pad=20)

    fig.suptitle("Análise de Algoritmos de Grafo — Dataset Spotify", fontsize=12, y=1.02)
    plt.tight_layout()
    fig.savefig(os.path.join(out_dir, "parte2_algo_comparison.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


def _plot_bfs_layers(report: Dict[str, Any], out_dir: str):
    bfs_results = report.get("bfs_results", [])
    if not bfs_results:
        return

    n_src = len(bfs_results)
    fig, axes = plt.subplots(1, n_src, figsize=(5 * n_src, 5), sharey=False)
    if n_src == 1:
        axes = [axes]

    for ax, result, lbl in zip(axes, bfs_results, SOURCE_LABELS):
        layer_sizes = result.get("layer_sizes", [])[:20]
        layers = list(range(len(layer_sizes)))
        if not layer_sizes:
            ax.text(0.5, 0.5, "Sem dados", ha="center", va="center", transform=ax.transAxes)
            continue
        bars = ax.bar(layers, layer_sizes, color="#38bdf8", edgecolor="#0ea5e9", linewidth=0.4)
        if layer_sizes:
            peak = layer_sizes.index(max(layer_sizes))
            bars[peak].set_color("#f97316")
        ax.set_xlabel("Camada (nº de saltos)")
        ax.set_ylabel("Nós na camada")
        ax.set_title(
            f"BFS · {lbl}\n"
            f"Visitados: {result.get('visited', 0):,}  ·  {result.get('time_ms', 0):.1f} ms",
            fontsize=9,
        )
    fig.suptitle("Exploração por Camadas (BFS) — Rede Spotify", fontsize=11, y=1.02)
    plt.tight_layout()
    fig.savefig(os.path.join(out_dir, "parte2_bfs_layers.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


def _plot_genre_distribution(graph: Graph, out_dir: str):
    genres = [graph.nodes[n].region for n in graph.nodes]
    top15 = Counter(genres).most_common(15)
    labels = [g[0] for g in top15]
    counts = [g[1] for g in top15]
    c_map = {g: GENRE_COLORS[i % len(GENRE_COLORS)] for i, g in enumerate(labels)}

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.barh(labels[::-1], counts[::-1],
                   color=[c_map[g] for g in labels[::-1]],
                   edgecolor="#334155", linewidth=0.5)
    ax.bar_label(bars, padding=4, fontsize=9)
    ax.set_xlabel("Número de músicas na amostra")
    ax.set_title("Distribuição por Gênero Musical\nTop 15 gêneros no dataset amostrado", pad=10)
    plt.tight_layout()
    fig.savefig(os.path.join(out_dir, "parte2_genre_dist.png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


def _build_sample_graph_html(graph: Graph, out_dir: str):
    """Gera HTML interativo vis.js com 200 nós mais conectados."""
    sorted_nodes = sorted(
        graph.nodes.keys(),
        key=lambda n: len(graph.adjacency_list.get(n, [])),
        reverse=True,
    )
    sample_ids = set(sorted_nodes[:200])

    genres = sorted({graph.nodes[n].region for n in sample_ids})
    genre_to_color = {g: GENRE_COLORS[i % len(GENRE_COLORS)] for i, g in enumerate(genres)}

    vis_nodes = []
    for nid in sample_ids:
        node = graph.nodes[nid]
        deg = len(graph.adjacency_list.get(nid, []))
        vis_nodes.append({
            "id": nid,
            "label": node.region[:12],
            "title": f"<b>{node.city[:50]}</b><br>Gênero: {node.region}<br>Grau: {deg}",
            "color": genre_to_color.get(node.region, "#94a3b8"),
            "size": max(8, 8 + deg * 0.25),
            "genre": node.region,
            "city": node.city[:50],
            "degree": deg,
        })

    vis_edges = []
    seen: set[tuple[str, str]] = set()
    eid = 0
    for nid in sample_ids:
        for edge in graph.adjacency_list.get(nid, []):
            if edge.target not in sample_ids:
                continue
            pair = (min(nid, edge.target), max(nid, edge.target))
            if pair in seen:
                continue
            seen.add(pair)
            vis_edges.append({
                "id": eid,
                "from": nid,
                "to": edge.target,
                "title": f"Dist. áudio: {edge.weight:.3f}",
                "color": {"color": "#334155", "opacity": 0.35},
            })
            eid += 1

    legend_html = "".join(
        f'<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px;">'
        f'<div style="width:10px;height:10px;border-radius:50%;background:{genre_to_color[g]};flex-shrink:0;"></div>'
        f'<span style="color:#cbd5e1;">{g}</span></div>'
        for g in list(genres)[:15]
    )

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Rede Musical Spotify — Amostra</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js"></script>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; height: 100vh; overflow: hidden; }}
    #sidebar {{ width: 240px; min-width: 240px; background: #1e293b; padding: 14px 12px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; border-right: 1px solid #334155; }}
    #network-wrap {{ flex: 1; position: relative; overflow: hidden; }}
    #mynetwork {{ width: 100%; height: 100%; }}
    h1 {{ font-size: 14px; font-weight: 700; color: #f1f5f9; }}
    .sub {{ font-size: 11px; color: #64748b; margin-top: 2px; }}
    .sec {{ font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }}
    #q {{ width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; font-size: 12px; outline: none; }}
    #q:focus {{ border-color: #38bdf8; }}
    #hover-bar {{ position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(15,23,42,.92); border: 1px solid #334155; border-radius: 6px; padding: 5px 14px; font-size: 11px; color: #94a3b8; pointer-events: none; white-space: nowrap; max-width: 620px; overflow: hidden; text-overflow: ellipsis; }}
  </style>
</head>
<body>
<div id="sidebar">
  <div>
    <h1>&#9835; Rede Musical Spotify</h1>
    <p class="sub">Amostra: {len(vis_nodes)} músicas &middot; {len(vis_edges)} conexões</p>
    <p class="sub" style="margin-top:4px;">Nós coloridos por gênero &middot; tamanho &#x221d; grau</p>
  </div>
  <div>
    <div class="sec">Buscar por gênero / título</div>
    <input id="q" type="text" placeholder="rock, jazz, título...">
  </div>
  <div>
    <div class="sec">Gêneros ({len(genres)})</div>
    {legend_html}
  </div>
</div>
<div id="network-wrap">
  <div id="mynetwork"></div>
  <div id="hover-bar">Passe o mouse sobre um nó para ver detalhes</div>
</div>
<script>
const NODES = {json.dumps(vis_nodes, ensure_ascii=False)};
const EDGES = {json.dumps(vis_edges, ensure_ascii=False)};
const nodesDS = new vis.DataSet(NODES);
const edgesDS = new vis.DataSet(EDGES);
const network = new vis.Network(
  document.getElementById('mynetwork'),
  {{ nodes: nodesDS, edges: edgesDS }},
  {{
    nodes: {{ shape: 'dot', font: {{ color: '#e2e8f0', size: 9, strokeWidth: 2, strokeColor: '#0f172a' }}, borderWidth: 1 }},
    edges: {{ width: 0.5, smooth: {{ type: 'continuous', roundness: 0.1 }} }},
    physics: {{
      stabilization: {{ iterations: 100, updateInterval: 20 }},
      barnesHut: {{ gravitationalConstant: -4000, springLength: 80, springConstant: 0.02 }},
    }},
    interaction: {{ hover: true, tooltipDelay: 60, navigationButtons: true }},
  }}
);
network.on('hoverNode', p => {{
  const n = NODES.find(x => x.id === p.node);
  if (n) document.getElementById('hover-bar').textContent =
    n.city + '  |  Gênero: ' + n.genre + '  |  Grau: ' + n.degree;
}});
network.on('blurNode', () => {{
  document.getElementById('hover-bar').textContent = 'Passe o mouse sobre um nó para ver detalhes';
}});
document.getElementById('q').addEventListener('input', function() {{
  const q = this.value.trim().toLowerCase();
  nodesDS.update(NODES.map(n => ({{
    id: n.id,
    opacity: !q || n.genre.toLowerCase().includes(q) || n.city.toLowerCase().includes(q) ? 1 : 0.08,
    color: !q || n.genre.toLowerCase().includes(q) || n.city.toLowerCase().includes(q)
      ? undefined
      : '#1e293b',
  }})));
}});
</script>
</body>
</html>"""

    out_path = os.path.join(out_dir, "parte2_grafo_amostra.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  parte2_grafo_amostra.html → {out_path}")
