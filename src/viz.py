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


REGION_ORDER = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]

_TIPO_LABELS = {
    "hub_nacional": "Hub nacional",
    "hub_regional": "Hub regional",
    "regional": "Voo regional",
}


def _save_fig(fig, out_dir, filename):
    os.makedirs(out_dir, exist_ok=True)
    fig.savefig(os.path.join(out_dir, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)


_LEGACY_PNGS = (
    "distribuicao_graus.png",
    "aeroportos_por_regiao.png",
    "densidade_por_regiao.png",
    "top_10_conectados.png",
)


def generate_exploratory_plots(out_dir, data_dir="data"):
    """
    Gera 8 visualizacoes analiticas em out/:
      - grau_por_regiao_boxplot.png
      - densidade_ego_por_regiao_violin.png
      - composicao_tipos_conexao_por_regiao.png
      - peso_conexoes_por_tipo_boxplot.png
      - top_15_hubs_grau.png
      - relacao_grau_vs_densidade_ego.png
      - distribuicao_tempo_rotas_minimas.png
      - heatmap_media_peso_origem_destino_regiao.png
    """
    for legacy in _LEGACY_PNGS:
        legacy_path = os.path.join(out_dir, legacy)
        if os.path.isfile(legacy_path):
            os.remove(legacy_path)

    sns.set_theme(style="darkgrid", palette="muted")
    region_palette = dict(REGION_COLORS)

    ego_df = pd.read_csv(os.path.join(out_dir, "ego_aeroportos.csv"))
    airports_df = pd.read_csv(os.path.join(data_dir, "aeroportos_data.csv"))
    adj_df = pd.read_csv(os.path.join(data_dir, "adjacencias_aeroportos.csv"))
    routes_df = pd.read_csv(os.path.join(out_dir, "distancias_rotas.csv"))

    region_map = airports_df.set_index("iata")["regiao"].to_dict()
    ego_df = ego_df.merge(
        airports_df[["iata", "regiao"]].rename(columns={"iata": "aeroporto"}),
        on="aeroporto",
        how="left",
    )
    ego_df["regiao"] = ego_df["regiao"].fillna("Desconhecida")

    adj_df = adj_df.rename(columns={"tipo_conexao": "tipo"})
    adj_df["regiao_origem"] = adj_df["origem"].map(region_map)
    adj_df["regiao_destino"] = adj_df["destino"].map(region_map)
    adj_df = adj_df.dropna(subset=["regiao_origem", "regiao_destino"])

    region_cats = [r for r in REGION_ORDER if r in ego_df["regiao"].unique()]

    # ── 1. Grau por regiao (boxplot) ─────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.boxplot(
        data=ego_df, x="regiao", y="grau", hue="regiao", order=region_cats,
        hue_order=region_cats, palette=region_palette, ax=ax, linewidth=1.2,
        dodge=False, legend=False,
    )
    ax.set_title(
        "Distribuição de Grau por Região\n"
        "(compara conectividade local entre regiões)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Região", fontsize=11)
    ax.set_ylabel("Grau (conexões diretas)", fontsize=11)
    ax.tick_params(axis="x", rotation=15)
    _save_fig(fig, out_dir, "grau_por_regiao_boxplot.png")

    # ── 2. Densidade ego por regiao (violin) ─────────────────────────
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.violinplot(
        data=ego_df, x="regiao", y="densidade_ego", hue="regiao",
        order=region_cats, hue_order=region_cats, palette=region_palette,
        ax=ax, inner="quartile", cut=0, dodge=False, legend=False,
    )
    ax.set_title(
        "Densidade da Ego-Rede por Região\n"
        "(quão interconectados estão os vizinhos de cada aeroporto)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Região", fontsize=11)
    ax.set_ylabel("Densidade da ego-rede", fontsize=11)
    ax.tick_params(axis="x", rotation=15)
    _save_fig(fig, out_dir, "densidade_ego_por_regiao_violin.png")

    # ── 3. Composicao tipos de conexao por regiao (barras empilhadas) ─
    tipo_by_region = (
        adj_df.groupby(["regiao_origem", "tipo"])
        .size()
        .unstack(fill_value=0)
    )
    for col in ["hub_nacional", "hub_regional", "regional"]:
        if col not in tipo_by_region.columns:
            tipo_by_region[col] = 0
    tipo_by_region = tipo_by_region[["hub_nacional", "hub_regional", "regional"]]
    tipo_by_region = tipo_by_region.reindex(
        [r for r in REGION_ORDER if r in tipo_by_region.index]
    )
    tipo_pct = tipo_by_region.div(tipo_by_region.sum(axis=1), axis=0) * 100

    fig, ax = plt.subplots(figsize=(10, 5))
    bottom = None
    tipo_colors = [EDGE_COLORS[t] for t in ["hub_nacional", "hub_regional", "regional"]]
    for i, tipo in enumerate(["hub_nacional", "hub_regional", "regional"]):
        values = tipo_pct[tipo].values
        ax.bar(
            tipo_pct.index, values, bottom=bottom,
            label=_TIPO_LABELS[tipo], color=tipo_colors[i],
            edgecolor="#0f172a", linewidth=0.6,
        )
        bottom = values if bottom is None else bottom + values
    ax.set_title(
        "Composição dos Tipos de Conexão por Região de Origem\n"
        "(participação percentual das arestas que partem de cada região)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Região de origem", fontsize=11)
    ax.set_ylabel("Participação (%)", fontsize=11)
    ax.set_ylim(0, 100)
    ax.legend(title="Tipo de conexão", fontsize=9, title_fontsize=9)
    ax.tick_params(axis="x", rotation=15)
    _save_fig(fig, out_dir, "composicao_tipos_conexao_por_regiao.png")

    # ── 4. Peso (duracao) por tipo de conexao (boxplot) ──────────────
    fig, ax = plt.subplots(figsize=(9, 5))
    tipo_order = ["hub_nacional", "hub_regional", "regional"]
    tipo_colors_map = {t: EDGE_COLORS[t] for t in tipo_order}
    sns.boxplot(
        data=adj_df, x="tipo", y="peso", hue="tipo", order=tipo_order,
        hue_order=tipo_order, palette=tipo_colors_map,
        ax=ax, linewidth=1.2, dodge=False, legend=False,
    )
    ax.set_xticks(range(len(tipo_order)))
    ax.set_xticklabels([_TIPO_LABELS[t] for t in tipo_order])
    ax.set_title(
        "Duração Estimada das Conexões por Tipo\n"
        "(peso em minutos: distância / 800 km/h + 30 min de manobra)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Tipo de conexão", fontsize=11)
    ax.set_ylabel("Duração estimada (min)", fontsize=11)
    _save_fig(fig, out_dir, "peso_conexoes_por_tipo_boxplot.png")

    # ── 5. Top 15 hubs por grau ──────────────────────────────────────
    top_15 = ego_df.nlargest(15, "grau").sort_values("grau")
    fig, ax = plt.subplots(figsize=(10, 7))
    bar_colors = [
        region_palette.get(r, "#94a3b8") for r in top_15["regiao"]
    ]
    bars = ax.barh(
        top_15["aeroporto"], top_15["grau"],
        color=bar_colors, edgecolor="#0f172a", linewidth=0.8,
    )
    ax.bar_label(bars, padding=4, fontsize=9)
    if len(bars) > 0:
        bars[-1].set_edgecolor("#f97316")
        bars[-1].set_linewidth(2.5)
    ax.set_title(
        "Top 15 Aeroportos com Maior Grau\n"
        "(hubs com mais conexões diretas na malha)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Grau (conexões diretas)", fontsize=11)
    ax.set_ylabel("Aeroporto (IATA)", fontsize=11)
    patches = [mpatches.Patch(color=c, label=r) for r, c in region_palette.items()]
    ax.legend(handles=patches, title="Região", fontsize=8, title_fontsize=8,
              loc="lower right")
    _save_fig(fig, out_dir, "top_15_hubs_grau.png")

    # ── 6. Grau vs densidade ego (scatter) ───────────────────────────
    fig, ax = plt.subplots(figsize=(10, 6))
    for reg in region_cats:
        subset = ego_df[ego_df["regiao"] == reg]
        ax.scatter(
            subset["grau"], subset["densidade_ego"],
            label=reg, color=region_palette.get(reg, "#94a3b8"),
            alpha=0.75, s=50, edgecolors="#0f172a", linewidths=0.4,
        )
    top_grau = ego_df.nlargest(3, "grau")
    for _, row in top_grau.iterrows():
        ax.annotate(
            row["aeroporto"],
            (row["grau"], row["densidade_ego"]),
            fontsize=8, xytext=(4, 4), textcoords="offset points",
        )
    ax.set_title(
        "Relação entre Grau e Densidade da Ego-Rede\n"
        "(canto superior direito: hubs altamente conectados e coesos)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Grau", fontsize=11)
    ax.set_ylabel("Densidade da ego-rede", fontsize=11)
    ax.legend(title="Região", fontsize=9, title_fontsize=9)
    _save_fig(fig, out_dir, "relacao_grau_vs_densidade_ego.png")

    # ── 7. Distribuicao tempo rotas minimas ──────────────────────────
    valid_routes = routes_df[routes_df["custo"] > 0].copy()
    fig, ax = plt.subplots(figsize=(10, 5))
    if not valid_routes.empty:
        sns.histplot(
            valid_routes["custo"], bins=min(8, len(valid_routes)),
            kde=len(valid_routes) > 2, color="#38bdf8", ax=ax,
            edgecolor="#0f172a", linewidth=0.5,
        )
        mean_cost = valid_routes["custo"].mean()
        ax.axvline(
            mean_cost, color="#f97316", linestyle="--", linewidth=1.5,
            label=f"Média ({mean_cost:.0f} min)",
        )
        ax.legend(fontsize=10)
    else:
        ax.text(0.5, 0.5, "Sem rotas válidas", ha="center", va="center",
                transform=ax.transAxes)
    ax.set_title(
        "Distribuição do Tempo de Caminhos Mínimos\n"
        "(custo total em minutos para pares em rotas.csv)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Tempo total do caminho mínimo (min)", fontsize=11)
    ax.set_ylabel("Frequência", fontsize=11)
    _save_fig(fig, out_dir, "distribuicao_tempo_rotas_minimas.png")

    # ── 8. Heatmap media peso origem-destino por regiao ──────────────
    heatmap_df = (
        adj_df.groupby(["regiao_origem", "regiao_destino"])["peso"]
        .mean()
        .unstack()
    )
    heatmap_df = heatmap_df.reindex(
        index=[r for r in REGION_ORDER if r in heatmap_df.index],
        columns=[r for r in REGION_ORDER if r in heatmap_df.columns],
    )

    fig, ax = plt.subplots(figsize=(9, 7))
    if heatmap_df.size > 0:
        sns.heatmap(
            heatmap_df, annot=True, fmt=".0f", cmap="YlOrRd",
            linewidths=0.5, linecolor="#334155", ax=ax,
            cbar_kws={"label": "Duração média (min)"},
        )
    ax.set_title(
        "Duração Média das Conexões entre Regiões\n"
        "(origem nas linhas, destino nas colunas)",
        fontsize=13, pad=12,
    )
    ax.set_xlabel("Região de destino", fontsize=11)
    ax.set_ylabel("Região de origem", fontsize=11)
    _save_fig(fig, out_dir, "heatmap_media_peso_origem_destino_regiao.png")

    print("8 visualizações analíticas geradas em out/")
