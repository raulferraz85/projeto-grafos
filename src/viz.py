import os
import json

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import pandas as pd

REGION_COLORS = {
    "Norte":        "#22c55e",
    "Nordeste":     "#f97316",
    "Sudeste":      "#38bdf8",
    "Sul":          "#a78bfa",
    "Centro-Oeste": "#facc15",
}

EDGE_COLORS = {
    "hub_nacional":  "#ef4444",
    "hub_regional":  "#fb923c",
    "regional":      "#64748b",
}

_EDGE_LABELS = {
    "hub_nacional":  "Hub nacional (91)",
    "hub_regional":  "Hub regional (232)",
    "regional":      "Voo regional (103)",
}

_HTML = """\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rede de Aeroportos do Brasil</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #0f172a; color: #e2e8f0;
      display: flex; height: 100vh; overflow: hidden;
    }
    #sidebar {
      width: 260px; min-width: 260px; background: #1e293b;
      padding: 16px 14px; display: flex; flex-direction: column; gap: 14px;
      overflow-y: auto; border-right: 1px solid #334155;
    }
    #network-wrap { flex: 1; position: relative; overflow: hidden; }
    #mynetwork    { width: 100%; height: 100%; }
    .section-title {
      font-size: 10px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
    }
    .app-header h1 { font-size: 15px; font-weight: 700; color: #f1f5f9; }
    .app-header p  { font-size: 11px; color: #64748b; margin-top: 2px; }
    #search-input {
      width: 100%; padding: 7px 10px; border-radius: 6px;
      border: 1px solid #334155; background: #0f172a; color: #e2e8f0;
      font-size: 13px; outline: none; transition: border-color .15s;
    }
    #search-input:focus       { border-color: #38bdf8; }
    #search-input::placeholder { color: #475569; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 2px 0; color: #cbd5e1; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .bar { width: 20px; height: 3px; border-radius: 2px; flex-shrink: 0; }
    .path-btn {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid;
      cursor: pointer; font-size: 12px; font-weight: 600;
      transition: opacity .15s; background: transparent; text-align: left; margin-bottom: 6px;
    }
    .path-btn:hover  { opacity: .75; }
    .path-btn:last-child { margin-bottom: 0; }
    #btn-rec-poa { border-color: #38bdf8; color: #38bdf8; }
    #btn-mao-gru { border-color: #f97316; color: #f97316; }
    #btn-reset   { border-color: #64748b; color: #94a3b8; }
    #hover-bar {
      position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(15,23,42,.90); border: 1px solid #334155;
      border-radius: 6px; padding: 5px 14px; font-size: 11px; color: #94a3b8;
      pointer-events: none; white-space: nowrap;
    }
  </style>
</head>
<body>

<div id="sidebar">
  <div class="app-header">
    <h1>&#9992; Rede de Aeroportos</h1>
    <p>128 aeroportos &middot; 426 conex&otilde;es &middot; Brasil</p>
  </div>

  <div>
    <div class="section-title">Buscar Aeroporto</div>
    <input id="search-input" type="text" placeholder="C&oacute;digo IATA ou cidade...">
  </div>

  <div>
    <div class="section-title">Regi&otilde;es</div>
    <div id="region-legend"></div>
  </div>

  <div>
    <div class="section-title">Tipo de Conex&atilde;o</div>
    <div id="edge-legend"></div>
  </div>

  <div>
    <div class="section-title">Caminhos Obrigat&oacute;rios</div>
    <button class="path-btn" id="btn-rec-poa">&#9992; Recife &rarr; Porto Alegre</button>
    <button class="path-btn" id="btn-mao-gru">&#9992; Manaus &rarr; S&atilde;o Paulo</button>
    <button class="path-btn" id="btn-reset">&#8635; Limpar Destaque</button>
  </div>
</div>

<div id="network-wrap">
  <div id="mynetwork"></div>
  <div id="hover-bar">Passe o mouse sobre um aeroporto para ver detalhes</div>
</div>

<script>
  const NODES_DATA = __NODES__;
  const EDGES_DATA = __EDGES__;
  const PATHS      = __PATHS__;
  const REG_COLORS = __REG_COLORS__;
  const EDG_COLORS = __EDG_COLORS__;
  const EDG_LABELS = __EDG_LABELS__;

  const nodesDS = new vis.DataSet(NODES_DATA);
  const edgesDS = new vis.DataSet(EDGES_DATA);

  const network = new vis.Network(
    document.getElementById('mynetwork'),
    { nodes: nodesDS, edges: edgesDS },
    {
      nodes: {
        shape: 'dot',
        font: { color: '#e2e8f0', size: 11, strokeWidth: 2, strokeColor: '#0f172a' },
        borderWidth: 1.5,
      },
      edges: { width: 1, smooth: { type: 'continuous', roundness: 0.15 } },
      physics: {
        stabilization: { iterations: 150, updateInterval: 25 },
        barnesHut: {
          gravitationalConstant: -6000,
          springLength: 100,
          springConstant: 0.02,
          damping: 0.09,
        },
      },
      interaction: { hover: true, tooltipDelay: 80, navigationButtons: true, keyboard: true },
    }
  );

  // Undirected edge lookup: "A|B" -> edgeId
  const edgeLookup = {};
  EDGES_DATA.forEach(e => {
    edgeLookup[e.from + '|' + e.to]   = e.id;
    edgeLookup[e.to   + '|' + e.from] = e.id;
  });

  // Snapshot original state for reset
  const origNode = {};
  NODES_DATA.forEach(n => { origNode[n.id] = n.color; });
  const origEdge = {};
  EDGES_DATA.forEach(e => { origEdge[e.id] = e.color; });

  // ── Legends ────────────────────────────────────────────────────
  const rl = document.getElementById('region-legend');
  Object.entries(REG_COLORS).forEach(([reg, col]) => {
    rl.innerHTML += `<div class="legend-item"><div class="dot" style="background:${col}"></div><span>${reg}</span></div>`;
  });

  const el = document.getElementById('edge-legend');
  Object.entries(EDG_COLORS).forEach(([tipo, col]) => {
    el.innerHTML += `<div class="legend-item"><div class="bar" style="background:${col}"></div><span>${EDG_LABELS[tipo] || tipo}</span></div>`;
  });

  // ── Search ─────────────────────────────────────────────────────
  document.getElementById('search-input').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    if (!q) { resetAll(false); return; }

    const ids = NODES_DATA
      .filter(n => n.id.toLowerCase().includes(q) || (n.city || '').toLowerCase().includes(q))
      .map(n => n.id);

    if (!ids.length) { resetAll(false); return; }

    applyDimAll();
    nodesDS.update(ids.map(id => ({ id, color: '#facc15', opacity: 1 })));
    if (ids.length === 1) network.focus(ids[0], { scale: 1.8, animation: { duration: 600 } });
  });

  // ── Path highlight ─────────────────────────────────────────────
  function highlightPath(pathKey, color) {
    const pnodes = PATHS[pathKey];
    if (!pnodes || !pnodes.length) { alert('Caminho não disponível.'); return; }

    applyDimAll();

    nodesDS.update(pnodes.map(id => ({ id, color: color, opacity: 1 })));

    const eUpdates = [];
    for (let i = 0; i < pnodes.length - 1; i++) {
      const eid = edgeLookup[pnodes[i] + '|' + pnodes[i + 1]];
      if (eid !== undefined)
        eUpdates.push({ id: eid, color: { color, highlight: color, hover: color }, width: 5, opacity: 1 });
    }
    edgesDS.update(eUpdates);
    network.fit({ nodes: pnodes, animation: { duration: 800, easingFunction: 'easeInOutCubic' } });
  }

  function applyDimAll() {
    nodesDS.update(NODES_DATA.map(n => ({ id: n.id, color: '#1e293b', opacity: 0.15 })));
    edgesDS.update(EDGES_DATA.map(e => ({ id: e.id, color: { color: '#243347' }, width: 0.5, opacity: 0.12 })));
  }

  function resetAll(clearSearch) {
    nodesDS.update(NODES_DATA.map(n => ({ id: n.id, color: origNode[n.id], opacity: 1 })));
    edgesDS.update(EDGES_DATA.map(e => ({ id: e.id, color: origEdge[e.id], width: 1, opacity: 1 })));
    if (clearSearch) document.getElementById('search-input').value = '';
  }

  document.getElementById('btn-rec-poa').addEventListener('click', () => highlightPath('REC->POA', '#38bdf8'));
  document.getElementById('btn-mao-gru').addEventListener('click', () => highlightPath('MAO->GRU', '#f97316'));
  document.getElementById('btn-reset').addEventListener('click',   () => resetAll(true));

  // ── Hover info bar ─────────────────────────────────────────────
  const hoverBar = document.getElementById('hover-bar');
  network.on('hoverNode', p => {
    const n = NODES_DATA.find(x => x.id === p.node);
    if (n) hoverBar.textContent =
      `${n.id} — ${n.city}  |  Região: ${n.region}  |  Grau: ${n.degree}  |  Densidade Ego: ${n.egoDensity.toFixed(4)}`;
  });
  network.on('blurNode', () => {
    hoverBar.textContent = 'Passe o mouse sobre um aeroporto para ver detalhes';
  });
</script>
</body>
</html>
"""


def generate_interactive_graph(graph, ego_data, out_path, mandatory_paths=None):
    """
    Gera grafo interativo (out/grafo_interativo.html) com:
    - Tooltip por aeroporto: grau, regiao, densidade_ego
    - Caixa de busca por IATA ou cidade
    - Botoes para realcar os caminhos obrigatorios REC->POA e MAO->GRU
    """
    ego_map = {item["aeroporto"]: item for item in ego_data}

    # ── Nodes ──────────────────────────────────────────────────────
    nodes = []
    for iata, node in graph.nodes.items():
        info = ego_map.get(iata, {"grau": 0, "densidade_ego": 0.0})
        degree = int(info.get("grau", 0))
        ego_density = float(info.get("densidade_ego", 0.0))
        color = REGION_COLORS.get(node.region, "#94a3b8")
        size = max(8, 8 + degree * 0.45)
        tooltip = (
            f"<b>{iata}</b> &mdash; {node.city}<br>"
            f"<b>Regi&atilde;o:</b> {node.region}<br>"
            f"<b>Grau:</b> {degree}<br>"
            f"<b>Densidade Ego:</b> {ego_density:.4f}"
        )
        nodes.append({
            "id":         iata,
            "label":      iata,
            "title":      tooltip,
            "color":      color,
            "size":       size,
            "region":     node.region,
            "city":       node.city,
            "degree":     degree,
            "egoDensity": ego_density,
        })

    # ── Edges ──────────────────────────────────────────────────────
    edges = []
    seen = set()
    edge_id = 0
    for u in graph.adjacency_list:
        for edge in graph.adjacency_list[u]:
            pair = tuple(sorted((u, edge.target)))
            if pair in seen:
                continue
            seen.add(pair)
            tipo = edge.connection_type
            col = EDGE_COLORS.get(tipo, "#64748b")
            edges.append({
                "id":    edge_id,
                "from":  u,
                "to":    edge.target,
                "title": f"{tipo}: {edge.justification} ({edge.weight:.0f} min)",
                "color": {"color": col, "highlight": "#ffffff", "hover": "#ffffff"},
            })
            edge_id += 1

    # ── Mandatory paths ────────────────────────────────────────────
    paths_json = mandatory_paths if mandatory_paths else {}

    html = _HTML \
        .replace("__NODES__",      json.dumps(nodes,                ensure_ascii=False)) \
        .replace("__EDGES__",      json.dumps(edges,                ensure_ascii=False)) \
        .replace("__PATHS__",      json.dumps(paths_json,           ensure_ascii=False)) \
        .replace("__REG_COLORS__", json.dumps(REGION_COLORS,        ensure_ascii=False)) \
        .replace("__EDG_COLORS__", json.dumps(EDGE_COLORS,          ensure_ascii=False)) \
        .replace("__EDG_LABELS__", json.dumps(_EDGE_LABELS,         ensure_ascii=False))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Grafo interativo gerado em: {out_path}")


def generate_path_tree(graph, paths, out_path):
    """Gera arvore de percurso para os caminhos obrigatorios (HTML interativo via vis.js)."""
    colors_seq = ["#38bdf8", "#f97316", "#22c55e", "#a78bfa", "#facc15"]

    # Collect all unique nodes and edges for the path subgraph
    path_nodes_set = set()
    path_edges = []       # (u, v, color, name)
    for i, (name, path) in enumerate(paths.items()):
        color = colors_seq[i % len(colors_seq)]
        for n in path:
            path_nodes_set.add(n)
        for j in range(len(path) - 1):
            path_edges.append((path[j], path[j + 1], color, name))

    # Build vis data
    nodes = []
    for iata in path_nodes_set:
        node = graph.nodes.get(iata)
        city = node.city if node else ""
        region = node.region if node else ""
        # Color: endpoint = brighter, intermediate = muted
        is_endpoint = any(
            iata == p[0] or iata == p[-1]
            for p in paths.values()
        )
        color = "#f1f5f9" if is_endpoint else "#64748b"
        nodes.append({
            "id":    iata,
            "label": iata,
            "title": f"<b>{iata}</b><br>{city}<br>{region}",
            "color": color,
            "size":  20 if is_endpoint else 14,
            "font":  {"size": 14, "color": "#0f172a"},
        })

    edges = []
    for eid, (u, v, color, name) in enumerate(path_edges):
        # Get edge weight from graph
        weight = 0.0
        for e in graph.adjacency_list.get(u, []):
            if e.target == v:
                weight = e.weight
                break
        edges.append({
            "id":    eid,
            "from":  u,
            "to":    v,
            "color": {"color": color, "highlight": color},
            "width": 6,
            "title": f"{name} ({weight:.0f} min)",
            "label": f"{weight:.0f} min",
            "font":  {"size": 11, "color": "#e2e8f0", "strokeWidth": 2, "strokeColor": "#0f172a"},
        })

    # Legend entries
    legend_items = "".join(
        f'<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">'
        f'<div style="width:24px;height:4px;background:{colors_seq[i % len(colors_seq)]};border-radius:2px;"></div>'
        f'<span style="font-size:13px;color:#cbd5e1;">{name.replace("->", " → ")}</span></div>'
        for i, name in enumerate(paths.keys())
    )

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Arvore de Percurso</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js"></script>
  <style>
    body {{ background:#0f172a; color:#e2e8f0; font-family:'Segoe UI',sans-serif; margin:0; display:flex; flex-direction:column; height:100vh; }}
    h1   {{ font-size:16px; padding:14px 20px; background:#1e293b; border-bottom:1px solid #334155; }}
    #legend {{ padding:10px 20px; background:#1e293b; border-bottom:1px solid #334155; display:flex; gap:24px; flex-wrap:wrap; }}
    #mynetwork {{ flex:1; }}
  </style>
</head>
<body>
  <h1>&#9992; Arvore de Percurso — Caminhos Obrigatorios</h1>
  <div id="legend">{legend_items}</div>
  <div id="mynetwork"></div>
  <script>
    const nodesDS = new vis.DataSet({json.dumps(nodes, ensure_ascii=False)});
    const edgesDS = new vis.DataSet({json.dumps(edges, ensure_ascii=False)});
    new vis.Network(document.getElementById('mynetwork'), {{nodes: nodesDS, edges: edgesDS}}, {{
      nodes: {{ shape: 'dot', borderWidth: 2 }},
      edges: {{ smooth: {{ type: 'curvedCW', roundness: 0.2 }}, arrows: 'to' }},
      physics: {{ enabled: false }},
      layout: {{ hierarchical: {{ direction: 'LR', sortMethod: 'directed', levelSeparation: 180, nodeSpacing: 80 }} }},
      interaction: {{ hover: true, tooltipDelay: 80 }},
    }});
  </script>
</body>
</html>"""

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Arvore de percurso gerada em: {out_path}")


def generate_exploratory_plots(out_dir):
    """
    Gera 4 visualizacoes analiticas salvas em out/:
      - distribuicao_graus.png       [EXPLORATORIA] distribuicao dos graus
      - aeroportos_por_regiao.png    [EXPLORATORIA] qtd de aeroportos por regiao
      - densidade_por_regiao.png     [EXPLANATORIA] comparativo de densidade regional
      - top_10_conectados.png        [EXPLANATORIA] ranking dos 10 hubs mais conectados
    """
    sns.set_theme(style="darkgrid", palette="muted")
    ego_df = pd.read_csv(os.path.join(out_dir, "ego_aeroportos.csv"))

    with open(os.path.join(out_dir, "regioes.json"), "r", encoding="utf-8") as f:
        regioes = json.load(f)
    reg_df = pd.DataFrame(regioes)

    # Paleta por regiao alinhada ao HTML interativo
    region_palette = {r: c for r, c in REGION_COLORS.items()}
    reg_df["color"] = reg_df["region"].map(region_palette)

    # ── 1. Distribuicao de graus (EXPLORATORIA) ────────────────────
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.histplot(ego_df["grau"], bins=15, kde=True, color="#38bdf8", ax=ax,
                 edgecolor="#0f172a", linewidth=0.5)
    ax.set_title("Distribuição de Graus dos Aeroportos\n"
                 "(a maioria tem poucos voos; poucos hubs concentram muitas conexões)",
                 fontsize=13, pad=12)
    ax.set_xlabel("Grau (número de conexões)", fontsize=11)
    ax.set_ylabel("Frequência", fontsize=11)
    ax.axvline(ego_df["grau"].mean(), color="#f97316", linestyle="--", linewidth=1.5,
               label=f"Média ({ego_df['grau'].mean():.1f})")
    ax.axvline(ego_df["grau"].median(), color="#facc15", linestyle=":", linewidth=1.5,
               label=f"Mediana ({ego_df['grau'].median():.1f})")
    ax.legend(fontsize=10)
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "distribuicao_graus.png"), dpi=150)
    plt.close(fig)

    # ── 2. Aeroportos por regiao (EXPLORATORIA) ────────────────────
    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(reg_df["region"], reg_df["order"],
                  color=[region_palette.get(r, "#94a3b8") for r in reg_df["region"]],
                  edgecolor="#0f172a", linewidth=0.8)
    ax.bar_label(bars, padding=4, fontsize=10)
    ax.set_title("Número de Aeroportos por Região do Brasil", fontsize=13, pad=12)
    ax.set_xlabel("Região", fontsize=11)
    ax.set_ylabel("Número de Aeroportos", fontsize=11)
    patches = [mpatches.Patch(color=c, label=r) for r, c in region_palette.items()]
    ax.legend(handles=patches, title="Região", fontsize=9, title_fontsize=9,
              loc="upper right")
    ax.set_ylim(0, reg_df["order"].max() * 1.15)
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "aeroportos_por_regiao.png"), dpi=150)
    plt.close(fig)

    # ── 3. Densidade por regiao (EXPLANATORIA) ─────────────────────
    reg_sorted = reg_df.sort_values("density", ascending=False)
    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(reg_sorted["region"], reg_sorted["density"],
                  color=[region_palette.get(r, "#94a3b8") for r in reg_sorted["region"]],
                  edgecolor="#0f172a", linewidth=0.8)
    ax.bar_label(bars, fmt="%.3f", padding=4, fontsize=10)
    ax.set_title("Densidade da Malha Aérea por Região\n"
                 "(Centro-Oeste lidera: poucas cidades, mas muito interconectadas)",
                 fontsize=13, pad=12)
    ax.set_xlabel("Região", fontsize=11)
    ax.set_ylabel("Densidade do Subgrafo Regional", fontsize=11)
    ax.set_ylim(0, reg_sorted["density"].max() * 1.18)
    patches = [mpatches.Patch(color=c, label=r) for r, c in region_palette.items()]
    ax.legend(handles=patches, title="Região", fontsize=9, title_fontsize=9,
              loc="upper right")
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "densidade_por_regiao.png"), dpi=150)
    plt.close(fig)

    # ── 4. Top 10 mais conectados (EXPLANATORIA) ───────────────────
    top_10 = ego_df.nlargest(10, "grau").sort_values("grau")
    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(top_10["aeroporto"], top_10["grau"],
                   color="#38bdf8", edgecolor="#0f172a", linewidth=0.8)
    ax.bar_label(bars, padding=4, fontsize=10)
    ax.set_title("Top 10 Aeroportos com Maior Número de Conexões\n"
                 "(BEL e CWB lideram — hubs regionais com alta conectividade)",
                 fontsize=13, pad=12)
    ax.set_xlabel("Grau (número de conexões diretas)", fontsize=11)
    ax.set_ylabel("Aeroporto (IATA)", fontsize=11)
    ax.set_xlim(0, top_10["grau"].max() * 1.15)
    # Highlight top 1
    bars[-1].set_color("#f97316")
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "top_10_conectados.png"), dpi=150)
    plt.close(fig)

    print("Visualizações analíticas geradas em out/")
