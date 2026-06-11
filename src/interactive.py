"""
Gerador do grafo interativo (out/grafo_interativo.html).

Obrigatórios (criterios-grafos 1.5 / criterios-avd UX-UI):
  - Tooltip em nós e arestas (nome, grau, peso)
  - Busca por código IATA com destaque
  - Destaque visual dos caminhos mínimos obrigatórios (Dijkstra)
  - Gestalt: cores por região, espessura ∝ peso, hubs maiores, fundo escuro

Bônus implementados:
  - Filtro por região (checkboxes) e por grau mínimo (slider)
  - Painel de métricas em tempo real (ordem/tamanho/densidade com filtros)
  - Seletor de algoritmo (Dijkstra/BFS/DFS) com destaque do caminho
  - Camadas BFS coloridas (passo a passo da busca em largura)
  - Animação de pulso no caminho destacado
  - Busca preditiva (autocompletar por IATA/cidade)
  - Legenda dinâmica (contagens atualizam com filtros)
"""

import json
import math
import os

# Paleta única do projeto (mesmas cores em todas as visualizações — Similaridade/Gestalt)
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

EDGE_LABELS = {
    "hub_nacional":  "Hub nacional",
    "hub_regional":  "Hub regional",
    "regional":      "Voo regional",
}

PATH_PALETTE = ["#38bdf8", "#f97316", "#22c55e", "#a78bfa", "#facc15"]

_HTML = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rede de Aeroportos do Brasil — Grafo Interativo</title>
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
      width: 290px; min-width: 290px; background: #1e293b;
      padding: 16px 14px; display: flex; flex-direction: column; gap: 16px;
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

    /* Painel de métricas em tempo real */
    #metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .metric-card {
      background: #0f172a; border: 1px solid #334155; border-radius: 8px;
      padding: 8px 6px; text-align: center;
    }
    .metric-card .val { font-size: 15px; font-weight: 700; color: #38bdf8; }
    .metric-card .lbl { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

    /* Busca com autocomplete */
    #search-box { position: relative; }
    #search-input {
      width: 100%; padding: 7px 10px; border-radius: 6px;
      border: 1px solid #334155; background: #0f172a; color: #e2e8f0;
      font-size: 13px; outline: none; transition: border-color .15s;
    }
    #search-input:focus        { border-color: #38bdf8; }
    #search-input::placeholder { color: #475569; }
    #suggestions {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 30;
      background: #0f172a; border: 1px solid #334155; border-radius: 0 0 8px 8px;
      max-height: 220px; overflow-y: auto; display: none;
    }
    .suggestion {
      padding: 7px 10px; font-size: 12px; cursor: pointer;
      display: flex; gap: 8px; align-items: center;
    }
    .suggestion:hover, .suggestion.active { background: #1e293b; }
    .suggestion b { color: #38bdf8; min-width: 34px; }
    .suggestion span { color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Seletor de algoritmo */
    select, .algo-row button {
      width: 100%; padding: 7px 8px; border-radius: 6px; font-size: 12px;
      border: 1px solid #334155; background: #0f172a; color: #e2e8f0; outline: none;
    }
    select:focus { border-color: #38bdf8; }
    .algo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
    #btn-run-algo {
      margin-top: 6px; cursor: pointer; font-weight: 700;
      background: #0c4a6e; border-color: #0284c7; color: #7dd3fc;
      transition: filter .15s;
    }
    #btn-run-algo:hover { filter: brightness(1.25); }
    #algo-result {
      margin-top: 6px; font-size: 11px; color: #94a3b8; line-height: 1.5;
      background: #0f172a; border: 1px solid #334155; border-radius: 6px;
      padding: 6px 8px; display: none;
    }

    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 2px 0; color: #cbd5e1; }
    .legend-item label { display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; }
    .legend-item input[type="checkbox"] { accent-color: #38bdf8; cursor: pointer; }
    .legend-item .count { margin-left: auto; font-size: 10px; color: #64748b; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .bar { width: 20px; height: 3px; border-radius: 2px; flex-shrink: 0; }

    /* Slider de grau mínimo */
    #degree-slider { width: 100%; accent-color: #38bdf8; cursor: pointer; }
    #degree-value  { font-size: 11px; color: #94a3b8; }

    .path-btn {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid;
      cursor: pointer; font-size: 12px; font-weight: 600;
      transition: opacity .15s; background: transparent; text-align: left; margin-bottom: 6px;
    }
    .path-btn:hover { opacity: .75; }
    #hover-bar {
      position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(15,23,42,.90); border: 1px solid #334155;
      border-radius: 6px; padding: 5px 14px; font-size: 11px; color: #94a3b8;
      pointer-events: none; white-space: nowrap; max-width: 90%;
      overflow: hidden; text-overflow: ellipsis;
    }
    #bfs-layer-legend {
      position: absolute; top: 10px; right: 10px; display: none;
      background: rgba(15,23,42,.92); border: 1px solid #334155;
      border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #cbd5e1;
    }
    #bfs-layer-legend .legend-item { padding: 1px 0; }
  </style>
</head>
<body>

<div id="sidebar">
  <div class="app-header">
    <h1>&#9992; Rede de Aeroportos</h1>
    <p id="subtitle"></p>
  </div>

  <div>
    <div class="section-title">M&eacute;tricas em Tempo Real</div>
    <div id="metrics">
      <div class="metric-card"><div class="val" id="m-order">–</div><div class="lbl">Ordem</div></div>
      <div class="metric-card"><div class="val" id="m-size">–</div><div class="lbl">Tamanho</div></div>
      <div class="metric-card"><div class="val" id="m-density">–</div><div class="lbl">Densidade</div></div>
    </div>
  </div>

  <div>
    <div class="section-title">Buscar Aeroporto (IATA / cidade)</div>
    <div id="search-box">
      <input id="search-input" type="text" placeholder="Digite: REC, GRU, Manaus..." autocomplete="off">
      <div id="suggestions"></div>
    </div>
  </div>

  <div>
    <div class="section-title">Algoritmo de Caminho</div>
    <select id="algo-select">
      <option value="dijkstra">Dijkstra (peso m&iacute;nimo)</option>
      <option value="bfs">BFS (menos escalas + camadas)</option>
      <option value="dfs">DFS (percurso em profundidade)</option>
    </select>
    <div class="algo-grid">
      <select id="algo-source"></select>
      <select id="algo-target"></select>
    </div>
    <button id="btn-run-algo" class="algo-row">&#9654; Executar e destacar</button>
    <div id="algo-result"></div>
  </div>

  <div>
    <div class="section-title">Caminhos Obrigat&oacute;rios (Dijkstra)</div>
    <div id="path-buttons"></div>
    <button class="path-btn" id="btn-reset" style="border-color:#64748b;color:#94a3b8;">&#8635; Limpar destaque</button>
  </div>

  <div>
    <div class="section-title">Filtrar por Regi&atilde;o</div>
    <div id="region-legend"></div>
  </div>

  <div>
    <div class="section-title">Grau M&iacute;nimo do N&oacute;</div>
    <input id="degree-slider" type="range" min="0" max="20" value="0" step="1">
    <div id="degree-value">Mostrando todos (grau &ge; 0)</div>
  </div>

  <div>
    <div class="section-title">Regi&atilde;o Comum (Gestalt)</div>
    <div class="legend-item">
      <label><input type="checkbox" id="hulls-toggle" checked>
      <span>&Aacute;reas de fundo por regi&atilde;o</span></label>
    </div>
  </div>

  <div>
    <div class="section-title">Tipo de Conex&atilde;o</div>
    <div id="edge-legend"></div>
  </div>
</div>

<div id="network-wrap">
  <div id="mynetwork"></div>
  <div id="hover-bar">Passe o mouse sobre um aeroporto ou conex&atilde;o para ver detalhes</div>
  <div id="bfs-layer-legend"></div>
</div>

<script>
  const NODES_DATA = __NODES__;
  const EDGES_DATA = __EDGES__;
  const PATHS      = __PATHS__;   // { "REC->POA": {nodes: [...], cost: 252, label: "Recife → Porto Alegre"}, ... }
  const REG_COLORS = __REG_COLORS__;
  const EDG_COLORS = __EDG_COLORS__;
  const EDG_LABELS = __EDG_LABELS__;
  const PATH_COLORS = __PATH_COLORS__;

  document.getElementById('subtitle').textContent =
    NODES_DATA.length + ' aeroportos · ' + EDGES_DATA.length + ' conexões · Brasil';

  // vis-network ≥ 8 escapa strings no tooltip — converter para elemento DOM
  function htmlTitle(html) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el;
  }
  const visNodes = NODES_DATA.map(n => ({ ...n, title: htmlTitle(n.titleHtml) }));
  const visEdges = EDGES_DATA.map(e => ({ ...e, title: htmlTitle(e.titleHtml) }));

  const nodesDS = new vis.DataSet(visNodes);
  const edgesDS = new vis.DataSet(visEdges);

  const network = new vis.Network(
    document.getElementById('mynetwork'),
    { nodes: nodesDS, edges: edgesDS },
    {
      nodes: {
        shape: 'dot',
        font: { color: '#e2e8f0', size: 11, strokeWidth: 2, strokeColor: '#0f172a' },
        borderWidth: 1.5,
      },
      edges: { smooth: { type: 'continuous', roundness: 0.15 } },
      physics: {
        stabilization: { iterations: 150, updateInterval: 25 },
        barnesHut: {
          gravitationalConstant: -6000,
          springLength: 100,
          springConstant: 0.02,
          damping: 0.09,
        },
      },
      interaction: { hover: true, tooltipDelay: 80, navigationButtons: true, keyboard: false },
    }
  );

  // ── Estruturas auxiliares ───────────────────────────────────────
  const nodeById = {};
  NODES_DATA.forEach(n => { nodeById[n.id] = n; });

  // Lista de adjacência não-dirigida { id: [{to, weight, edgeId}] }
  const adj = {};
  NODES_DATA.forEach(n => { adj[n.id] = []; });
  const edgeLookup = {};
  EDGES_DATA.forEach(e => {
    adj[e.from].push({ to: e.to,   weight: e.weight, edgeId: e.id });
    adj[e.to  ].push({ to: e.from, weight: e.weight, edgeId: e.id });
    edgeLookup[e.from + '|' + e.to] = e.id;
    edgeLookup[e.to   + '|' + e.from] = e.id;
  });

  // Snapshot do estado original (cor/tamanho/largura) para reset
  const origNode = {}, origEdge = {};
  NODES_DATA.forEach(n => { origNode[n.id] = { color: n.color, size: n.size }; });
  EDGES_DATA.forEach(e => { origEdge[e.id] = { color: e.color, width: e.width }; });

  // ── Algoritmos reimplementados em JS (mesma lógica do src/graphs) ──
  function jsDijkstra(src, tgt) {
    const dist = {}, prev = {}, visited = new Set();
    NODES_DATA.forEach(n => { dist[n.id] = Infinity; });
    dist[src] = 0;
    // Fila de prioridade simples (128 nós: busca linear é suficiente)
    while (true) {
      let u = null, best = Infinity;
      for (const id in dist)
        if (!visited.has(id) && dist[id] < best) { best = dist[id]; u = id; }
      if (u === null || u === tgt) break;
      visited.add(u);
      for (const { to, weight } of adj[u]) {
        if (dist[u] + weight < dist[to]) { dist[to] = dist[u] + weight; prev[to] = u; }
      }
    }
    return { dist, prev };
  }

  function jsBFS(src) {
    const level = { [src]: 0 }, prev = {}, queue = [src];
    while (queue.length) {
      const u = queue.shift();
      for (const { to } of adj[u])
        if (!(to in level)) { level[to] = level[u] + 1; prev[to] = u; queue.push(to); }
    }
    return { level, prev };
  }

  function jsDFS(src, tgt) {
    // DFS iterativo; retorna o caminho da pilha quando o alvo é encontrado
    const visited = new Set();
    const stack = [[src, [src]]];
    let visitedCount = 0;
    while (stack.length) {
      const [u, path] = stack.pop();
      if (visited.has(u)) continue;
      visited.add(u); visitedCount++;
      if (u === tgt) return { path, visitedCount };
      // ordem reversa para visitar vizinhos na ordem natural
      const neighbors = adj[u].map(a => a.to).reverse();
      for (const v of neighbors)
        if (!visited.has(v)) stack.push([v, path.concat(v)]);
    }
    return { path: null, visitedCount };
  }

  function rebuildPath(prev, src, tgt) {
    const path = [tgt];
    let cur = tgt;
    while (cur !== src) {
      cur = prev[cur];
      if (cur === undefined) return null;
      path.push(cur);
    }
    return path.reverse();
  }

  function pathCost(path) {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const e = adj[path[i]].find(a => a.to === path[i + 1]);
      total += e ? e.weight : 0;
    }
    return total;
  }

  // ── Estado de filtros ───────────────────────────────────────────
  const allRegions = [...new Set(NODES_DATA.map(n => n.region))];
  const activeRegions = new Set(allRegions);
  let minDegree = 0;

  function nodeVisible(n) {
    return activeRegions.has(n.region) && n.degree >= minDegree;
  }

  function applyFilters() {
    const visibleIds = new Set(NODES_DATA.filter(nodeVisible).map(n => n.id));
    nodesDS.update(NODES_DATA.map(n => ({ id: n.id, hidden: !visibleIds.has(n.id) })));
    const visibleEdges = EDGES_DATA.filter(e => visibleIds.has(e.from) && visibleIds.has(e.to));
    edgesDS.update(EDGES_DATA.map(e => ({
      id: e.id, hidden: !(visibleIds.has(e.from) && visibleIds.has(e.to)),
    })));
    updateMetrics(visibleIds.size, visibleEdges.length);
    updateLegendCounts(visibleIds);
  }

  function updateMetrics(order, size) {
    const density = order > 1 ? (2 * size) / (order * (order - 1)) : 0;
    document.getElementById('m-order').textContent   = order;
    document.getElementById('m-size').textContent    = size;
    document.getElementById('m-density').textContent = density.toFixed(4);
  }

  // ── Legenda dinâmica de regiões (com checkboxes de filtro) ──────
  function buildRegionLegend() {
    const rl = document.getElementById('region-legend');
    rl.innerHTML = '';
    allRegions.forEach(reg => {
      const col = REG_COLORS[reg] || '#94a3b8';
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML =
        `<label><input type="checkbox" checked data-region="${reg}">` +
        `<div class="dot" style="background:${col}"></div><span>${reg}</span></label>` +
        `<span class="count" id="count-${reg}"></span>`;
      rl.appendChild(item);
    });
    rl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) activeRegions.add(cb.dataset.region);
        else            activeRegions.delete(cb.dataset.region);
        applyFilters();
      });
    });
  }

  function updateLegendCounts(visibleIds) {
    allRegions.forEach(reg => {
      const total   = NODES_DATA.filter(n => n.region === reg).length;
      const visible = NODES_DATA.filter(n => n.region === reg && visibleIds.has(n.id)).length;
      const el = document.getElementById('count-' + reg);
      if (el) el.textContent = visible + '/' + total;
    });
  }

  // ── Legenda de tipos de aresta ──────────────────────────────────
  const el = document.getElementById('edge-legend');
  Object.entries(EDG_COLORS).forEach(([tipo, col]) => {
    const n = EDGES_DATA.filter(e => e.tipo === tipo).length;
    el.innerHTML += `<div class="legend-item"><div class="bar" style="background:${col}"></div>` +
                    `<span>${EDG_LABELS[tipo] || tipo}</span><span class="count">${n}</span></div>`;
  });

  // ── Slider de grau mínimo ───────────────────────────────────────
  const slider = document.getElementById('degree-slider');
  slider.max = Math.max(...NODES_DATA.map(n => n.degree));
  slider.addEventListener('input', () => {
    minDegree = parseInt(slider.value, 10);
    document.getElementById('degree-value').textContent =
      minDegree === 0 ? 'Mostrando todos (grau ≥ 0)'
                      : 'Apenas aeroportos com grau ≥ ' + minDegree;
    applyFilters();
  });

  // ── Destaque com animação de pulso ──────────────────────────────
  let pulseTimer = null, pulseNodes = [], pulseEdges = [], pulseOn = false;

  function stopPulse() {
    if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
    pulseNodes = []; pulseEdges = []; pulseOn = false;
  }

  function startPulse(nodeIds, edgeIds, color) {
    stopPulse();
    pulseNodes = nodeIds; pulseEdges = edgeIds;
    pulseTimer = setInterval(() => {
      pulseOn = !pulseOn;
      nodesDS.update(pulseNodes.map(id => ({
        id,
        size: origNode[id].size * (pulseOn ? 1.45 : 1.1),
        borderWidth: pulseOn ? 4 : 2,
        color: { background: color, border: '#ffffff' },
      })));
      edgesDS.update(pulseEdges.map(id => ({ id, width: pulseOn ? 7 : 5 })));
    }, 450);
  }

  function applyDimAll() {
    document.getElementById('bfs-layer-legend').style.display = 'none';
    nodesDS.update(NODES_DATA.map(n => ({
      id: n.id, color: '#1e293b', opacity: 0.15, size: origNode[n.id].size, borderWidth: 1.5,
    })));
    // vis-network 9: opacity de aresta só funciona dentro de color
    edgesDS.update(EDGES_DATA.map(e => ({ id: e.id, color: { color: '#243347', opacity: 0.12 }, width: 0.5 })));
  }

  function highlightPath(pnodes, color) {
    applyDimAll();
    stopPulse();
    nodesDS.update(pnodes.map(id => ({ id, color: color, opacity: 1, hidden: false })));
    const eids = [];
    for (let i = 0; i < pnodes.length - 1; i++) {
      const eid = edgeLookup[pnodes[i] + '|' + pnodes[i + 1]];
      if (eid !== undefined) {
        eids.push(eid);
        edgesDS.update([{ id: eid, color: { color, highlight: color, hover: color, opacity: 1 }, width: 5, hidden: false }]);
      }
    }
    startPulse(pnodes, eids, color);
    network.fit({ nodes: pnodes, animation: { duration: 800, easingFunction: 'easeInOutCubic' } });
  }

  function resetAll(clearSearch) {
    stopPulse();
    document.getElementById('bfs-layer-legend').style.display = 'none';
    document.getElementById('algo-result').style.display = 'none';
    nodesDS.update(NODES_DATA.map(n => ({
      id: n.id, color: origNode[n.id].color, size: origNode[n.id].size,
      opacity: 1, borderWidth: 1.5,
    })));
    edgesDS.update(EDGES_DATA.map(e => ({ id: e.id, color: origEdge[e.id].color, width: origEdge[e.id].width })));
    if (clearSearch) document.getElementById('search-input').value = '';
    applyFilters(); // mantém filtros ativos após reset
  }

  // ── Botões dos caminhos obrigatórios (gerados dinamicamente) ────
  const pb = document.getElementById('path-buttons');
  Object.entries(PATHS).forEach(([key, info], i) => {
    const color = PATH_COLORS[i % PATH_COLORS.length];
    const btn = document.createElement('button');
    btn.className = 'path-btn';
    btn.style.borderColor = color;
    btn.style.color = color;
    btn.innerHTML = `&#9992; ${info.label} <span style="margin-left:auto;font-weight:400;opacity:.8">${Math.round(info.cost)} min</span>`;
    btn.addEventListener('click', () => highlightPath(info.nodes, color));
    pb.appendChild(btn);
  });
  document.getElementById('btn-reset').addEventListener('click', () => resetAll(true));

  // ── Busca preditiva (autocomplete) ──────────────────────────────
  const searchInput = document.getElementById('search-input');
  const sugBox = document.getElementById('suggestions');

  function selectAirport(id) {
    sugBox.style.display = 'none';
    searchInput.value = id + ' — ' + nodeById[id].city;
    applyDimAll();
    stopPulse();
    nodesDS.update([{ id, color: '#facc15', opacity: 1, hidden: false }]);
    startPulse([id], [], '#facc15');
    network.focus(id, { scale: 1.8, animation: { duration: 600 } });
  }

  searchInput.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    if (!q) { sugBox.style.display = 'none'; resetAll(false); return; }

    const matches = NODES_DATA.filter(n =>
      n.id.toLowerCase().includes(q) || (n.city || '').toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) { sugBox.style.display = 'none'; return; }
    sugBox.innerHTML = matches.map(n =>
      `<div class="suggestion" data-id="${n.id}"><b>${n.id}</b><span>${n.city} · ${n.region} · grau ${n.degree}</span></div>`
    ).join('');
    sugBox.style.display = 'block';
    sugBox.querySelectorAll('.suggestion').forEach(s =>
      s.addEventListener('click', () => selectAirport(s.dataset.id))
    );
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = sugBox.querySelector('.suggestion');
      if (first) selectAirport(first.dataset.id);
    } else if (e.key === 'Escape') {
      sugBox.style.display = 'none';
    }
  });
  document.addEventListener('click', e => {
    if (!document.getElementById('search-box').contains(e.target)) sugBox.style.display = 'none';
  });

  // ── Seletor de algoritmo ────────────────────────────────────────
  const srcSel = document.getElementById('algo-source');
  const tgtSel = document.getElementById('algo-target');
  const sortedNodes = [...NODES_DATA].sort((a, b) => a.id.localeCompare(b.id));
  sortedNodes.forEach(n => {
    srcSel.innerHTML += `<option value="${n.id}">${n.id} — ${n.city}</option>`;
    tgtSel.innerHTML += `<option value="${n.id}">${n.id} — ${n.city}</option>`;
  });
  srcSel.value = 'REC'; tgtSel.value = 'GRU';

  const LAYER_COLORS = ['#facc15', '#fb923c', '#f97316', '#ef4444', '#e879f9', '#a78bfa', '#818cf8', '#38bdf8'];

  document.getElementById('btn-run-algo').addEventListener('click', () => {
    const algo = document.getElementById('algo-select').value;
    const src = srcSel.value, tgt = tgtSel.value;
    const resBox = document.getElementById('algo-result');
    if (src === tgt) {
      resBox.style.display = 'block';
      resBox.innerHTML = 'Origem e destino devem ser diferentes.';
      return;
    }

    let path = null, info = '';
    if (algo === 'dijkstra') {
      const t0 = performance.now();
      const { dist, prev } = jsDijkstra(src, tgt);
      const ms = (performance.now() - t0).toFixed(1);
      path = isFinite(dist[tgt]) ? rebuildPath(prev, src, tgt) : null;
      if (path) info = `<b style="color:#22c55e">Dijkstra</b> ${src} → ${tgt}<br>` +
        `Custo mínimo: <b>${Math.round(dist[tgt])} min</b> · ${path.length - 1} trecho(s) · ${ms} ms<br>` +
        `Caminho: ${path.join(' → ')}`;
    } else if (algo === 'bfs') {
      const t0 = performance.now();
      const { level, prev } = jsBFS(src);
      const ms = (performance.now() - t0).toFixed(1);
      path = (tgt in level) ? rebuildPath(prev, src, tgt) : null;
      if (path) info = `<b style="color:#38bdf8">BFS</b> ${src} → ${tgt}<br>` +
        `Menos escalas: <b>${level[tgt]} salto(s)</b> · custo ${Math.round(pathCost(path))} min · ${ms} ms<br>` +
        `Visitados: ${Object.keys(level).length} nós · Caminho: ${path.join(' → ')}`;
      if (path) {
        // Bônus "Camadas BFS": colore todos os nós visitados pela camada
        applyDimAll(); stopPulse();
        const byLayer = {};
        Object.entries(level).forEach(([id, lv]) => { (byLayer[lv] = byLayer[lv] || []).push(id); });
        Object.entries(byLayer).forEach(([lv, ids]) => {
          const c = LAYER_COLORS[Math.min(lv, LAYER_COLORS.length - 1)];
          nodesDS.update(ids.map(id => ({ id, color: c, opacity: 0.85 })));
        });
        const lg = document.getElementById('bfs-layer-legend');
        lg.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">Camadas BFS de ' + src + '</div>' +
          Object.keys(byLayer).map(lv =>
            `<div class="legend-item"><div class="dot" style="background:${LAYER_COLORS[Math.min(lv, LAYER_COLORS.length - 1)]}"></div>` +
            `<span>Camada ${lv} (${byLayer[lv].length} nós)</span></div>`).join('');
        lg.style.display = 'block';
        // Destaque do caminho por cima das camadas
        const eids = [];
        for (let i = 0; i < path.length - 1; i++) {
          const eid = edgeLookup[path[i] + '|' + path[i + 1]];
          if (eid !== undefined) {
            eids.push(eid);
            edgesDS.update([{ id: eid, color: { color: '#38bdf8', opacity: 1 }, width: 5 }]);
          }
        }
        startPulse(path, eids, '#38bdf8');
        network.fit({ nodes: path, animation: { duration: 800 } });
        resBox.style.display = 'block';
        resBox.innerHTML = info;
        return; // visual próprio do BFS já aplicado
      }
    } else { // dfs
      const t0 = performance.now();
      const r = jsDFS(src, tgt);
      const ms = (performance.now() - t0).toFixed(1);
      path = r.path;
      if (path) info = `<b style="color:#a78bfa">DFS</b> ${src} → ${tgt}<br>` +
        `Percurso encontrado com <b>${path.length - 1} trecho(s)</b> (não necessariamente mínimo)<br>` +
        `Custo: ${Math.round(pathCost(path))} min · visitados ${r.visitedCount} nós · ${ms} ms`;
    }

    resBox.style.display = 'block';
    if (!path) { resBox.innerHTML = `Sem caminho de ${src} para ${tgt}.`; return; }
    resBox.innerHTML = info;
    const algoColor = algo === 'dijkstra' ? '#22c55e' : '#a78bfa';
    highlightPath(path, algoColor);
  });

  // ── Região Comum (Gestalt): áreas de fundo por região ───────────
  // Desenha um casco convexo translúcido atrás dos nós de cada região
  // visível, antes da renderização do grafo (beforeDrawing).
  let showHulls = true;
  document.getElementById('hulls-toggle').addEventListener('change', function () {
    showHulls = this.checked;
    network.redraw();
  });

  function hexToRgba(hex, alpha) {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
  }

  // Casco convexo 2D (monotone chain)
  function convexHull(pts) {
    if (pts.length < 3) return pts;
    const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const pt of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
      lower.push(pt);
    }
    const upper = [];
    for (const pt of [...p].reverse()) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
      upper.push(pt);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  network.on('beforeDrawing', ctx => {
    if (!showHulls) return;
    const PAD = 45; // afastamento do casco em relação aos nós
    allRegions.forEach(reg => {
      if (!activeRegions.has(reg)) return;
      const ids = NODES_DATA.filter(n => n.region === reg && nodeVisible(n)).map(n => n.id);
      if (ids.length < 2) return;
      const positions = network.getPositions(ids);
      const pts = ids.map(id => positions[id]).filter(Boolean);
      if (pts.length < 2) return;
      // Centroide para expandir o casco (padding radial)
      const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length;
      const cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
      const hull = convexHull(pts).map(q => {
        const dx = q.x - cx, dy = q.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        return { x: q.x + (dx / d) * PAD, y: q.y + (dy / d) * PAD };
      });
      if (hull.length < 2) return;
      const col = REG_COLORS[reg] || '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(hull[0].x, hull[0].y);
      for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i].x, hull[i].y);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(col, 0.06);
      ctx.strokeStyle = hexToRgba(col, 0.22);
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  });

  // ── Barra de hover (nós e arestas) ──────────────────────────────
  const hoverBar = document.getElementById('hover-bar');
  const HOVER_DEFAULT = 'Passe o mouse sobre um aeroporto ou conexão para ver detalhes';
  network.on('hoverNode', p => {
    const n = nodeById[p.node];
    if (n) hoverBar.textContent =
      `${n.id} — ${n.city}  |  Região: ${n.region}  |  Grau: ${n.degree}  |  Densidade Ego: ${n.egoDensity.toFixed(4)}`;
  });
  network.on('hoverEdge', p => {
    const e = EDGES_DATA.find(x => x.id === p.edge);
    if (e) hoverBar.textContent =
      `${e.from} ↔ ${e.to}  |  ${EDG_LABELS[e.tipo] || e.tipo}  |  Peso: ${Math.round(e.weight)} min  |  ${e.justification}`;
  });
  network.on('blurNode', () => { hoverBar.textContent = HOVER_DEFAULT; });
  network.on('blurEdge', () => { hoverBar.textContent = HOVER_DEFAULT; });

  // ── Inicialização ───────────────────────────────────────────────
  buildRegionLegend();
  applyFilters();
</script>
</body>
</html>
"""


def generate_interactive_graph(graph, ego_data, out_path, mandatory_paths=None):
    """
    Gera o grafo interativo. mandatory_paths: {"REC->POA": [nós do caminho], ...}
    (caminhos mínimos já calculados pelo Dijkstra de src/graphs/dijkstra.py).
    """
    ego_map = {item["aeroporto"]: item for item in ego_data}

    # ── Posições iniciais por região (Lei da Proximidade — Gestalt) ──
    # Cada região recebe um centro num círculo; os nós nascem em espiral
    # determinística ao redor do centro da sua região. A física do layout
    # parte desse arranjo, então os clusters regionais permanecem agrupados.
    regions_sorted = sorted({n.region for n in graph.nodes.values()})
    region_center = {}
    radius = 650
    for i, reg in enumerate(regions_sorted):
        angle = 2 * math.pi * i / max(len(regions_sorted), 1)
        region_center[reg] = (radius * math.cos(angle), radius * math.sin(angle))

    region_counter = {reg: 0 for reg in regions_sorted}
    golden = math.pi * (3 - math.sqrt(5))  # ângulo áureo: espalha sem sobrepor

    # ── Nós: tamanho ∝ grau (Hierarquia Visual), cor por região (Similaridade)
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
        cx, cy = region_center.get(node.region, (0.0, 0.0))
        j = region_counter[node.region] = region_counter.get(node.region, 0) + 1
        spread = 42 * math.sqrt(j)
        nodes.append({
            "id":         iata,
            "label":      iata,
            "titleHtml":  tooltip,
            "color":      color,
            "size":       size,
            "region":     node.region,
            "city":       node.city,
            "degree":     degree,
            "egoDensity": ego_density,
            "x":          round(cx + spread * math.cos(j * golden), 1),
            "y":          round(cy + spread * math.sin(j * golden), 1),
        })

    # ── Arestas: espessura ∝ peso (Conectividade/Gestalt) ──────────
    raw_edges = []
    seen = set()
    for u in graph.adjacency_list:
        for edge in graph.adjacency_list[u]:
            pair = tuple(sorted((u, edge.target)))
            if pair in seen:
                continue
            seen.add(pair)
            raw_edges.append(edge)

    weights = [e.weight for e in raw_edges] or [1.0]
    w_min, w_max = min(weights), max(weights)
    w_span = (w_max - w_min) or 1.0

    edges = []
    for edge_id, edge in enumerate(raw_edges):
        tipo = edge.connection_type
        col = EDGE_COLORS.get(tipo, "#64748b")
        # Espessura proporcional ao peso da aresta (0.6 a 3.2 px)
        width = round(0.6 + 2.6 * (edge.weight - w_min) / w_span, 2)
        edges.append({
            "id":            edge_id,
            "from":          edge.source,
            "to":            edge.target,
            "titleHtml":     (
                f"<b>{edge.source} &harr; {edge.target}</b><br>"
                f"<b>Tipo:</b> {EDGE_LABELS.get(tipo, tipo)}<br>"
                f"<b>Peso:</b> {edge.weight:.0f} min<br>"
                f"{edge.justification}"
            ),
            "color":         {"color": col, "highlight": "#ffffff", "hover": "#ffffff"},
            "width":         width,
            "weight":        edge.weight,
            "tipo":          tipo,
            "justification": edge.justification,
        })

    # ── Caminhos obrigatórios com rótulo e custo ───────────────────
    edge_weight = {}
    for e in edges:
        edge_weight[(e["from"], e["to"])] = e["weight"]
        edge_weight[(e["to"], e["from"])] = e["weight"]

    paths_json = {}
    for key, path_nodes in (mandatory_paths or {}).items():
        cost = sum(
            edge_weight.get((path_nodes[i], path_nodes[i + 1]), 0)
            for i in range(len(path_nodes) - 1)
        )
        src, tgt = path_nodes[0], path_nodes[-1]
        src_city = graph.nodes[src].city if src in graph.nodes else src
        tgt_city = graph.nodes[tgt].city if tgt in graph.nodes else tgt
        paths_json[key] = {
            "nodes": path_nodes,
            "cost": cost,
            "label": f"{src_city} → {tgt_city}",
        }

    html = _HTML \
        .replace("__NODES__",       json.dumps(nodes,         ensure_ascii=False)) \
        .replace("__EDGES__",       json.dumps(edges,         ensure_ascii=False)) \
        .replace("__PATHS__",       json.dumps(paths_json,    ensure_ascii=False)) \
        .replace("__REG_COLORS__",  json.dumps(REGION_COLORS, ensure_ascii=False)) \
        .replace("__EDG_COLORS__",  json.dumps(EDGE_COLORS,   ensure_ascii=False)) \
        .replace("__EDG_LABELS__",  json.dumps(EDGE_LABELS,   ensure_ascii=False)) \
        .replace("__PATH_COLORS__", json.dumps(PATH_PALETTE,  ensure_ascii=False))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Grafo interativo gerado em: {out_path}")
