import { useEffect, useMemo, useRef, useState } from "react";
import type { AppData, Airport } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { PageHeader } from "../components/PageHeader";
import { AirportSearch } from "../components/AirportSearch";
import { runDijkstra, formatDuration } from "../lib/dijkstra";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

const REGION_COLORS: Record<string, string> = {
  Norte:          "#22c55e",
  Nordeste:       "#f97316",
  Sudeste:        "#38bdf8",
  Sul:            "#a78bfa",
  "Centro-Oeste": "#facc15",
};
const EDGE_COLORS: Record<string, string> = {
  hub_nacional: "#ef4444",
  hub_regional: "#fb923c",
  regional:     "#cbd5e1",
};

function originalNodeColor(region: string) {
  return REGION_COLORS[region] ?? "#94a3b8";
}

const VIS_SCRIPT =
  "https://unpkg.com/vis-network@9.1.2/standalone/umd/vis-network.min.js";
const VIS_CSS =
  "https://unpkg.com/vis-network@9.1.2/styles/vis-network.min.css";

function visAvailable(): boolean {
  const vis = (window as any).vis;
  return !!(vis?.DataSet && vis?.Network);
}

// Carrega um script externo uma única vez e resolve quando vis estiver no window
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      if (visAvailable()) resolve();
      else reject(new Error(`Script loaded but window.vis is missing: ${src}`));
    };

    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (visAvailable()) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.onload = finish;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}

type SideTab = "route" | "airport";

interface RouteResult { path: string[]; cost: number }

export function GraphPage({ data, dataStatus }: Props) {
  const live = dataStatus === "live";
  const { airports, edges } = data;

  // ── vis.js refs ────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef   = useRef<any>(null);
  const nodesRef     = useRef<any>(null);
  const edgesRef     = useRef<any>(null);
  const origColors   = useRef<Record<string, string>>({});

  const [visReady, setVisReady]   = useState(visAvailable);
  const [search, setSearch]       = useState("");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────
  const [sideTab, setSideTab]         = useState<SideTab>("route");
  const [routeOrigin, setRouteOrigin] = useState(airports[0]?.iata ?? "");
  const [routeDest,   setRouteDest]   = useState(airports[1]?.iata ?? "");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [searched,    setSearched]    = useState(false);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);

  const airportByIata = useMemo(
    () => Object.fromEntries(airports.map((a) => [a.iata, a])),
    [airports],
  );
  const allIatas = useMemo(() => airports.map((a) => a.iata), [airports]);

  const edgeLookupId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of edges) {
      m[`${e.source}|${e.target}`] = `${e.source}-${e.target}`;
      m[`${e.target}|${e.source}`] = `${e.source}-${e.target}`;
    }
    return m;
  }, [edges]);

  const mandatory = useMemo(() => {
    const MANDATORY_DEFS: Record<string, { label: string; color: string }> = {
      "REC->POA": { label: "Recife → Porto Alegre", color: "#38bdf8" },
      "MAO->GRU": { label: "Manaus → São Paulo",   color: "#f97316" },
    };
    const result: Record<string, { label: string; color: string; path: string[] }> = {};
    for (const [key, def] of Object.entries(MANDATORY_DEFS)) {
      const [origin, dest] = key.split("->");
      const route = data.routes.find((r) => r.origin === origin && r.destination === dest);
      result[key] = { ...def, path: route?.path ?? [] };
    }
    return result;
  }, [data.routes]);

  // 1. Carrega vis-network (standalone UMD expõe window.vis.DataSet e .Network)
  useEffect(() => {
    if (visAvailable()) {
      setVisReady(true);
      return;
    }
    loadCss(VIS_CSS);
    loadScript(VIS_SCRIPT)
      .then(() => setVisReady(true))
      .catch((err) => console.error("vis-network:", err));
  }, []);

  // ── Init network ───────────────────────────────────────────────
  useEffect(() => {
    if (!visReady || !containerRef.current || airports.length === 0) return;
    const vis = (window as any).vis;
    if (!vis?.DataSet || !vis?.Network) return;

    const nodeData = airports.map((a) => {
      const color = REGION_COLORS[a.region] ?? "#94a3b8";
      origColors.current[a.iata] = color;
      return {
        id: a.iata, label: a.iata,
        title: `<b>${a.iata}</b> — ${a.city}<br>Região: ${a.region}<br>Grau: ${a.degree}<br>Densidade ego: ${a.egoDensity.toFixed(4)}`,
        color: { background: color, border: "#ffffff", highlight: { background: color, border: "#1e293b" } },
        size: Math.max(8, 8 + a.degree * 0.45),
        font: { color: "#1e293b", size: 11, strokeWidth: 2, strokeColor: "#ffffff" },
      };
    });

    const seen = new Set<string>();
    const edgeData = edges.flatMap((e) => {
      const key = [e.source, e.target].sort().join("|");
      if (seen.has(key)) return [];
      seen.add(key);
      const col = EDGE_COLORS[e.connectionType] ?? "#cbd5e1";
      return [{ id: `${e.source}-${e.target}`, from: e.source, to: e.target,
        color: { color: col, highlight: col, hover: col }, width: 1,
        title: `${e.connectionType}: ${e.justification} (${Math.round(e.weight)} min)` }];
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
        interaction: { hover: true, tooltipDelay: 80, keyboard: true },
      },
    );

    // Click on node → show airport info in side panel
    networkRef.current.on("click", (params: any) => {
      if (params.nodes.length > 0) {
        const iata = params.nodes[0] as string;
        setSelectedAirport(airportByIata[iata] ?? null);
        setSideTab("airport");
      }
    });

    return () => { networkRef.current?.destroy(); networkRef.current = null; };
  }, [visReady, airports, edges, airportByIata]);

  // ── Helpers ────────────────────────────────────────────────────
  function dimAll() {
    nodesRef.current?.update(
      airports.map((a) => ({ id: a.iata, color: { background: "#e2e8f0", border: "#cbd5e1" }, opacity: 0.15 })),
    );
    edgesRef.current?.update(
      (edgesRef.current.get() as any[]).map((e: any) => ({ id: e.id, color: { color: "#e2e8f0" }, opacity: 0.08, width: 0.5 })),
    );
  }

  function resetColors() {
    if (!nodesRef.current || !edgesRef.current) return;
    nodesRef.current.update(airports.map((a) => ({
      id: a.iata,
      color: { background: origColors.current[a.iata] ?? "#94a3b8", border: "#ffffff" },
      opacity: 1,
    })));
    edgesRef.current.update(edges.map((e) => ({
      id: `${e.source}-${e.target}`,
      color: { color: EDGE_COLORS[e.connectionType] ?? "#cbd5e1" },
      opacity: 1, width: 1,
    })));
  }

  function highlightPath(path: string[], color: string) {
    if (!nodesRef.current || !edgesRef.current || path.length === 0) return;
    dimAll();
    nodesRef.current.update(path.map((id) => ({
      id, color: { background: color, border: "#ffffff" }, opacity: 1,
    })));
    const edgeUpd: any[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const eid = edgeLookupId[`${path[i]}|${path[i + 1]}`];
      if (eid) edgeUpd.push({ id: eid, color: { color }, opacity: 1, width: 5 });
    }
    edgesRef.current.update(edgeUpd);
    networkRef.current?.fit({ nodes: path, animation: { duration: 700, easingFunction: "easeInOutCubic" } });
  }

  function handleReset() {
    setRouteResult(null);
    setSearched(false);
    setActiveRoute(null);
    setSelectedAirport(null);
    resetColors();
  }

  // ── Route search ───────────────────────────────────────────────
  function handleCalculate() {
    const result = runDijkstra(edges, allIatas, routeOrigin, routeDest);
    setRouteResult(result);
    setSearched(true);
    setActiveRoute(null);
    if (result) highlightPath(result.path, "#8b5cf6");
  }

  function handleMandatory(key: string) {
    const m = mandatory[key];
    if (!m || m.path.length === 0) return;
    setActiveRoute(key);
    setSearched(false);
    setRouteResult(null);
    highlightPath(m.path, m.color);
  }

  return (
    <div className="flex flex-col gap-2" style={{ height: "calc(100vh - 145px)" }}>

      {/* ── Compact header: title + legend in one row ─────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Grafo</h2>
          <p className="text-xs text-neutral-500">Clique num nó para inspecionar. Calcule rotas e veja-as destacadas na rede.</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
          {Object.entries(REGION_COLORS).map(([r, c]) => (
            <span key={r} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />{r}
            </span>
          ))}
          <span className="flex items-center gap-1 pl-2">
            <span className="inline-block h-0.5 w-3 rounded bg-red-400" />Hub nacional
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded bg-orange-400" />Hub regional
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded bg-slate-300" />Regional
          </span>
        </div>
      </div>

      {!live ? (
        <div className="card flex flex-1 items-center justify-center text-sm text-neutral-500">
          Execute <code className="mx-1 rounded bg-neutral-100 px-1 text-xs">make pipeline</code> para carregar o grafo.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">

          {/* ── Network ────────────────────────────────────────── */}
          <div
            ref={containerRef}
            className="min-h-0 flex-1 overflow-hidden rounded-lg border border-neutral-200 bg-white"
          />

          {/* ── Side panel ─────────────────────────────────────── */}
          <div className="flex min-h-0 w-72 flex-shrink-0 flex-col rounded-lg border border-neutral-200 bg-white">

            {/* Tab bar */}
            <div className="flex border-b border-neutral-100">
              {([["route", "Rota"], ["airport", "Aeroporto"]] as [SideTab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSideTab(id)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    sideTab === id
                      ? "border-b-2 border-neutral-900 text-neutral-900"
                      : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">

              {/* ── ROUTE TAB ─────────────────────────────────── */}
              {sideTab === "route" && (
                <div className="flex flex-col gap-3">

                  {/* Mandatory quick access */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-neutral-400">Rotas obrigatórias</p>
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(mandatory).map(([key, m]) => (
                        <button
                          key={key}
                          onClick={() => handleMandatory(key)}
                          style={{ borderColor: m.color, color: m.color }}
                          className={`rounded-md border px-3 py-1.5 text-left text-xs font-semibold transition-opacity hover:opacity-75 ${
                            activeRoute === key ? "opacity-100" : "opacity-80"
                          }`}
                        >
                          ✈ {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-neutral-100" />

                  {/* Dynamic search */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-neutral-400">Pesquisar qualquer rota</p>
                    <div className="flex flex-col gap-2">
                      <AirportSearch airports={airports} value={routeOrigin} label="Origem"
                        onChange={(v) => { setRouteOrigin(v); setSearched(false); }} exclude={routeDest} />
                      <AirportSearch airports={airports} value={routeDest} label="Destino"
                        onChange={(v) => { setRouteDest(v); setSearched(false); }} exclude={routeOrigin} />
                      <button
                        onClick={handleCalculate}
                        disabled={routeOrigin === routeDest}
                        className="btn-primary w-full text-sm disabled:opacity-40"
                      >
                        Calcular caminho mínimo
                      </button>
                    </div>
                  </div>

                  {/* Result */}
                  {searched && (
                    <div className="border-t border-neutral-100 pt-3">
                      {routeResult ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Chip label="Duração"    value={formatDuration(routeResult.cost)} />
                            <Chip label="Saltos"     value={String(routeResult.path.length - 1)} />
                            <Chip label="Aeroportos" value={String(routeResult.path.length)} />
                          </div>
                          <MiniPath path={routeResult.path} cityFor={(iata) => airportByIata[iata]?.city ?? iata} />
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400">Nenhum caminho encontrado.</p>
                      )}
                    </div>
                  )}

                  {(searched || activeRoute) && (
                    <button onClick={handleReset} className="btn w-full text-xs">↺ Limpar destaque</button>
                  )}
                </div>
              )}

              {/* ── AIRPORT TAB ───────────────────────────────── */}
              {sideTab === "airport" && (
                <div className="flex flex-col gap-3">
                  {selectedAirport ? (
                    <>
                      <div>
                        <p className="font-mono text-2xl font-bold text-neutral-900">{selectedAirport.iata}</p>
                        <p className="text-sm text-neutral-600">{selectedAirport.city}</p>
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ background: REGION_COLORS[selectedAirport.region] ?? "#94a3b8" }}
                        >
                          {selectedAirport.region}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Chip label="Grau"        value={String(selectedAirport.degree)} />
                        <Chip label="Densidade ego" value={`${(selectedAirport.egoDensity * 100).toFixed(1)}%`} />
                        <Chip label="Ordem ego"   value={String(selectedAirport.egoOrder)} />
                        <Chip label="Tamanho ego" value={String(selectedAirport.egoSize)} />
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-medium text-neutral-400">
                          Vizinhos ({selectedAirport.neighbors.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedAirport.neighbors.map((n) => (
                            <button
                              key={n}
                              onClick={() => {
                                const a = airportByIata[n];
                                if (a) setSelectedAirport(a);
                              }}
                              className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700 hover:bg-neutral-200"
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setRouteOrigin(selectedAirport.iata);
                          setSideTab("route");
                        }}
                        className="btn w-full text-xs"
                      >
                        ✈ Usar como origem de rota
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-center text-neutral-400">
                      <span className="text-3xl">✈</span>
                      <p className="text-xs">Clique em qualquer nó do grafo para ver os detalhes do aeroporto.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MiniPath ──────────────────────────────────────────────────────────────────
function MiniPath({ path, cityFor }: { path: string[]; cityFor: (i: string) => string }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-0">
        {path.map((iata, i) => {
          const isFirst = i === 0;
          const isLast  = i === path.length - 1;
          return (
            <div key={`${iata}-${i}`} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold text-white shadow-sm ${
                  isFirst ? "bg-purple-500" : isLast ? "bg-orange-500" : "bg-neutral-400"
                }`}>
                  {iata}
                </div>
                <span className="mt-0.5 max-w-[44px] text-center text-[9px] leading-tight text-neutral-400">
                  {cityFor(iata)}
                </span>
              </div>
              {!isLast && (
                <div className="mx-1 flex items-center">
                  <div className="h-px w-4 bg-neutral-300" />
                  <span className="text-[9px] text-neutral-300">▶</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-2 py-1.5 text-center">
      <p className="text-[10px] text-neutral-400">{label}</p>
      <p className="font-mono text-sm font-semibold text-neutral-800">{value}</p>
    </div>
  );
}
