import { useEffect, useMemo, useRef, useState } from "react";
import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { PageHeader } from "../components/PageHeader";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

const REGION_COLORS: Record<string, string> = {
  Norte:         "#22c55e",
  Nordeste:      "#f97316",
  Sudeste:       "#38bdf8",
  Sul:           "#a78bfa",
  "Centro-Oeste":"#facc15",
};

const EDGE_COLORS: Record<string, string> = {
  hub_nacional:  "#ef4444",
  hub_regional:  "#fb923c",
  regional:      "#cbd5e1",
};

function originalNodeColor(region: string) {
  return REGION_COLORS[region] ?? "#94a3b8";
}

// Carrega um script externo uma única vez e resolve a Promise quando pronto
function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

export function GraphPage({ data, dataStatus }: Props) {
  const live = dataStatus === "live";
  const { airports, edges, routes } = data;

  const containerRef   = useRef<HTMLDivElement>(null);
  const networkRef     = useRef<any>(null);
  const nodesRef       = useRef<any>(null);
  const edgesRef       = useRef<any>(null);
  const origColors     = useRef<Record<string, string>>({});

  const [visReady, setVisReady]   = useState(!!(window as any).vis);
  const [search, setSearch]       = useState("");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // Caminhos obrigatórios vindos das rotas calculadas
  const mandatoryPaths = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const r of routes) {
      const k = `${r.origin}-${r.destination}`;
      if ((k === "REC-POA" || k === "MAO-GRU") && r.path.length > 0) m[k] = r.path;
    }
    return m;
  }, [routes]);

  // Edge lookup para realçar arestas do caminho
  const edgeLookupId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of edges) {
      m[`${e.source}|${e.target}`] = `${e.source}-${e.target}`;
      m[`${e.target}|${e.source}`] = `${e.source}-${e.target}`;
    }
    return m;
  }, [edges]);

  // 1. Carrega vis.js do CDN
  useEffect(() => {
    if ((window as any).vis) { setVisReady(true); return; }
    loadCss("https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.css");
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js")
      .then(() => setVisReady(true));
  }, []);

  // 2. Inicializa a rede quando vis estiver pronto e dados disponíveis
  useEffect(() => {
    if (!visReady || !containerRef.current || airports.length === 0) return;

    const vis = (window as any).vis;

    const nodeData = airports.map((a) => {
      const color = originalNodeColor(a.region);
      origColors.current[a.iata] = color;
      return {
        id:    a.iata,
        label: a.iata,
        title: `<b>${a.iata}</b> — ${a.city}<br>Região: ${a.region}<br>Grau: ${a.degree}<br>Densidade ego: ${a.egoDensity.toFixed(4)}`,
        color: { background: color, border: "#ffffff", highlight: { background: color, border: "#1e293b" } },
        size:  Math.max(8, 8 + a.degree * 0.45),
        font:  { color: "#1e293b", size: 11, strokeWidth: 2, strokeColor: "#ffffff" },
      };
    });

    const seenEdges = new Set<string>();
    const edgeData = edges.flatMap((e) => {
      const key = [e.source, e.target].sort().join("|");
      if (seenEdges.has(key)) return [];
      seenEdges.add(key);
      const col = EDGE_COLORS[e.connectionType] ?? "#cbd5e1";
      return [{
        id:    `${e.source}-${e.target}`,
        from:  e.source,
        to:    e.target,
        color: { color: col, highlight: col, hover: col },
        width: 1,
        title: `${e.connectionType}: ${e.justification} (${Math.round(e.weight)} min)`,
      }];
    });

    nodesRef.current = new vis.DataSet(nodeData);
    edgesRef.current = new vis.DataSet(edgeData);

    networkRef.current = new vis.Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      {
        nodes:   { shape: "dot", borderWidth: 1.5 },
        edges:   { smooth: { type: "continuous", roundness: 0.15 } },
        physics: {
          stabilization: { iterations: 150, updateInterval: 25 },
          barnesHut: { gravitationalConstant: -6000, springLength: 100, springConstant: 0.02, damping: 0.09 },
        },
        interaction: { hover: true, tooltipDelay: 80, navigationButtons: false, keyboard: true },
      },
    );

    return () => { networkRef.current?.destroy(); networkRef.current = null; };
  }, [visReady, airports, edges]);

  // 3. Busca — debounce 44 ms
  useEffect(() => {
    if (!nodesRef.current || !networkRef.current) return;
    const t = setTimeout(() => {
      const q = search.trim().toLowerCase();
      if (!q) { resetColors(); return; }
      const matched = airports
        .filter((a) => a.iata.toLowerCase().includes(q) || a.city.toLowerCase().includes(q))
        .map((a) => a.iata);
      dimAll();
      nodesRef.current.update(matched.map((id) => ({ id, color: { background: "#facc15", border: "#ca8a04" }, opacity: 1 })));
      if (matched.length === 1) networkRef.current.focus(matched[0], { scale: 1.8, animation: { duration: 600 } });
    }, 44);
    return () => clearTimeout(t);
  }, [search, airports]);

  function dimAll() {
    nodesRef.current?.update(
      airports.map((a) => ({ id: a.iata, color: { background: "#e2e8f0", border: "#cbd5e1" }, opacity: 0.2 })),
    );
    edgesRef.current?.update(
      (edgesRef.current.get() as any[]).map((e: any) => ({ id: e.id, color: { color: "#e2e8f0" }, opacity: 0.1 })),
    );
  }

  function resetColors() {
    if (!nodesRef.current || !edgesRef.current) return;
    nodesRef.current.update(
      airports.map((a) => ({
        id: a.iata,
        color: { background: origColors.current[a.iata] ?? "#94a3b8", border: "#ffffff" },
        opacity: 1,
      })),
    );
    edgesRef.current.update(
      edges.map((e) => ({
        id:    `${e.source}-${e.target}`,
        color: { color: EDGE_COLORS[e.connectionType] ?? "#cbd5e1" },
        opacity: 1,
        width: 1,
      })),
    );
  }

  function highlightPath(key: string, color: string) {
    const path = mandatoryPaths[key];
    if (!path || !nodesRef.current) return;
    setActiveBtn(key);
    setSearch("");
    dimAll();
    nodesRef.current.update(path.map((id) => ({ id, color: { background: color, border: "#ffffff" }, opacity: 1 })));
    const edgeUpdates: any[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const eid = edgeLookupId[`${path[i]}|${path[i + 1]}`];
      if (eid) edgeUpdates.push({ id: eid, color: { color }, opacity: 1, width: 4 });
    }
    edgesRef.current?.update(edgeUpdates);
    networkRef.current?.fit({ nodes: path, animation: { duration: 800, easingFunction: "easeInOutCubic" } });
  }

  function handleReset() {
    setActiveBtn(null);
    setSearch("");
    resetColors();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Grafo"
        description="Visualização interativa da malha aérea. Busque aeroportos e destaque os caminhos obrigatórios."
      />

      {!live ? (
        <div className="card flex items-center justify-center py-16 text-sm text-neutral-500">
          Execute{" "}
          <code className="mx-1 rounded bg-neutral-100 px-1 text-xs">make pipeline</code>{" "}
          para carregar o grafo.
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input min-w-[220px] flex-1"
              placeholder="Buscar por IATA ou cidade…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveBtn(null); }}
            />
            <button
              onClick={() => highlightPath("REC-POA", "#38bdf8")}
              className={`btn text-sm ${activeBtn === "REC-POA" ? "btn-primary" : ""}`}
            >
              ✈ Recife → Porto Alegre
            </button>
            <button
              onClick={() => highlightPath("MAO-GRU", "#f97316")}
              className={`btn text-sm ${activeBtn === "MAO-GRU" ? "btn-primary" : ""}`}
            >
              ✈ Manaus → São Paulo
            </button>
            <button onClick={handleReset} className="btn text-sm">
              ↺ Limpar
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
            {Object.entries(REGION_COLORS).map(([r, c]) => (
              <span key={r} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {r}
              </span>
            ))}
            <span className="ml-4 flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-red-400" /> Hub nacional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-orange-400" /> Hub regional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-slate-300" /> Regional
            </span>
          </div>

          {/* Network */}
          <div
            ref={containerRef}
            className="w-full overflow-hidden rounded-lg border border-neutral-200 bg-white"
            style={{ height: "calc(100vh - 300px)", minHeight: 440 }}
          />
        </>
      )}
    </div>
  );
}
