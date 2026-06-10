import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Parte2Data,
  BfsResult,
  DfsResult,
  DijkstraResult,
  BellmanFordCase,
  Parte2Performance,
  MusicGraphSample,
  MusicGraphNode,
} from "../types";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";
import { EM_DASH, formatNumber } from "../lib/format";
import { runBFS, runDFS, runDijkstra, runBellmanFord, type AdjList } from "../lib/music-algorithms";

// ── vis-network loader ─────────────────────────────────────────────────────
const VIS_SCRIPT = "https://unpkg.com/vis-network@9.1.2/standalone/umd/vis-network.min.js";
const VIS_CSS    = "https://unpkg.com/vis-network@9.1.2/styles/vis-network.min.css";
function visReady(): boolean {
  const v = (window as any).vis;
  return !!(v?.DataSet && v?.Network);
}
function loadVisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (visReady()) { resolve(); return; }
    const existing = document.querySelector(`script[src="${VIS_SCRIPT}"]`) as HTMLScriptElement | null;
    const finish = () => (visReady() ? resolve() : reject(new Error("vis missing after load")));
    if (existing) { existing.addEventListener("load", finish, { once: true }); return; }
    const s = document.createElement("script");
    s.src = VIS_SCRIPT; s.onload = finish;
    s.onerror = () => reject(new Error("Failed to load vis-network"));
    document.head.appendChild(s);
  });
}
function loadVisCss() {
  if (document.querySelector(`link[href="${VIS_CSS}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = VIS_CSS;
  document.head.appendChild(l);
}

// ── Genre colours ─────────────────────────────────────────────────────────
const GENRE_PALETTE = [
  "#38bdf8","#22c55e","#f97316","#a78bfa","#facc15",
  "#fb7185","#34d399","#60a5fa","#f472b6","#fbbf24",
  "#4ade80","#c084fc","#fb923c","#818cf8","#2dd4bf",
  "#e879f9","#86efac","#93c5fd","#fca5a5","#6ee7b7",
];
function genreColor(genre: string): string {
  let h = 0;
  for (let i = 0; i < genre.length; i++) h = genre.charCodeAt(i) + ((h << 5) - h);
  return GENRE_PALETTE[Math.abs(h) % GENRE_PALETTE.length];
}

// ── Types ─────────────────────────────────────────────────────────────────
type TabId = "dataset" | "grafo" | "algoritmos" | "performance";
type AlgKey = "BFS" | "DFS" | "Dijkstra" | "Bellman-Ford";
interface DemoResult {
  alg: AlgKey; source: string; target?: string;
  visitedNodes: string[]; pathNodes: string[];
  cost?: number; hasCycle?: boolean; timeMs: number;
}
interface HighlightState { ids: string[]; color: string }

// ── Entry point ───────────────────────────────────────────────────────────
interface Props { parte2: Parte2Data | null }

export function Parte2Page({ parte2 }: Props) {
  const [tab, setTab] = useState<TabId>("dataset");

  if (!parte2) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rede Musical Spotify" description="Parte 2: Dataset maior e comparação de algoritmos." />
        <div className="card text-sm text-neutral-500">
          <p className="font-medium text-neutral-700 mb-2">Dataset não processado ainda.</p>
          <ol className="list-decimal ml-4 space-y-1 text-xs">
            <li>Baixe o dataset: <span className="font-mono bg-neutral-100 px-1 rounded">data/dataset_parte2/README.md</span></li>
            <li>Processe: <span className="font-mono bg-neutral-100 px-1 rounded">make parte2</span></li>
            <li>Inicie o frontend: <span className="font-mono bg-neutral-100 px-1 rounded">make dev</span></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Feature 2: Hero banner */}
      <HeroBanner dataset={parte2.dataset} />

      {/* Feature 1: Tab navigation */}
      <TabBar active={tab} onChange={setTab} />

      {tab === "dataset"     && <DatasetTab     parte2={parte2} />}
      {tab === "grafo"       && <GrafoTab        parte2={parte2} />}
      {tab === "algoritmos"  && <AlgoritmosTab   parte2={parte2} />}
      {tab === "performance" && <PerformanceTab  parte2={parte2} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Feature 2: Hero Banner
// ══════════════════════════════════════════════════════════════════════════

function HeroBanner({ dataset }: { dataset: Parte2Data["dataset"] }) {
  return (
    <div className="rounded-2xl bg-slate-900 px-8 py-10 text-white mb-6">
      <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">
        Projeto Final · Teoria dos Grafos — Parte 2
      </p>
      <h1 className="text-3xl font-bold mb-1">Rede Musical Spotify</h1>
      <p className="text-slate-400 text-sm mb-8 truncate">{dataset.source}</p>
      <div className="grid grid-cols-3 gap-6">
        <div className="text-center">
          <p className="text-4xl font-extrabold tabular-nums text-sky-400">
            <AnimatedNumber target={dataset.nodes} />
          </p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">músicas</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-extrabold tabular-nums text-emerald-400">
            <AnimatedNumber target={dataset.edges} />
          </p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">conexões</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-extrabold tabular-nums text-violet-400">4</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">algoritmos</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Feature 3: Animated counter
// ══════════════════════════════════════════════════════════════════════════

function AnimatedNumber({ target, duration = 1200, decimals = 0 }: {
  target: number; duration?: number; decimals?: number;
}) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  if (decimals > 0) return <>{current.toFixed(decimals)}</>;
  return <>{Math.round(current).toLocaleString("pt-BR")}</>;
}

// ══════════════════════════════════════════════════════════════════════════
// Feature 1: Tab bar
// ══════════════════════════════════════════════════════════════════════════

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "dataset",     label: "Dataset",     emoji: "📊" },
  { id: "grafo",       label: "Grafo",       emoji: "🌐" },
  { id: "algoritmos",  label: "Algoritmos",  emoji: "🧮" },
  { id: "performance", label: "Performance", emoji: "⚡" },
];

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-8">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
            active === t.id
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <span className="hidden sm:inline">{t.emoji} </span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Dataset Tab — Features 3, 4, 5, 6
// ══════════════════════════════════════════════════════════════════════════

function DatasetTab({ parte2 }: { parte2: Parte2Data }) {
  const { dataset } = parte2;
  const sample = parte2.graph_sample;
  return (
    <div className="space-y-10">
      {/* Feature 5: Cards with icons */}
      <section className="space-y-4">
        <SectionTitle>Métricas do Grafo</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <IconStatCard label="Músicas (nós)"     value={dataset.nodes}       icon="node"   color="sky"     />
          <IconStatCard label="Conexões (arestas)" value={dataset.edges}       icon="edge"   color="emerald" />
          <IconStatCard label="Grau médio"         value={dataset.degree_mean} decimals={1} icon="degree" color="violet" />
          <IconStatCard label="Grau máximo"        value={dataset.degree_max}  icon="speed"  color="orange"  />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 space-y-1.5">
          <p><span className="font-semibold text-neutral-800">Fonte:</span> {dataset.source}</p>
          <p>
            <span className="font-semibold text-neutral-800">Tipo:</span> Grafo <strong>dirigido</strong> ponderado ·
            i→j: j é vizinho k-NN de i no espaço de áudio
          </p>
          <p>
            <span className="font-semibold text-neutral-800">Pesos:</span> Distância euclidiana dos features{" "}
            <span className="font-mono text-xs bg-white border border-neutral-200 px-1.5 py-0.5 rounded">
              energy · danceability · acousticness · instrumentalness · valence · tempo
            </span>{" "}
            normalizados para [0, 1]
          </p>
          <p>
            <span className="font-semibold text-neutral-800">Grau:</span> min {dataset.degree_min} ·
            mediana {dataset.degree_median} · médio {formatNumber(dataset.degree_mean, 1)} · max {dataset.degree_max}
          </p>
        </div>
      </section>

      {/* Feature 4: Degree histogram */}
      {sample && sample.nodes.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Distribuição de Graus (top-200 nós)</SectionTitle>
          <p className="text-sm text-neutral-600">
            Histograma dos graus de saída dos 200 nós mais conectados. Barra laranja = pico. Linha verde = média.
          </p>
          <DegreeHistogram nodes={sample.nodes} mean={dataset.degree_mean} />
        </section>
      )}

      {/* Feature 6: Example connections */}
      {sample && sample.edges.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Exemplos de Conexões</SectionTitle>
          <p className="text-sm text-neutral-600">
            Amostras reais de arestas — cada conexão indica que a música destino é k-NN da origem no espaço de áudio.
          </p>
          <ConnectionsTable sample={sample} />
        </section>
      )}
    </div>
  );
}

// Feature 5 — SVG icons
function NodeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="4" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" />
      <line x1="6" y1="7" x2="9.5" y2="10.5" /><line x1="18" y1="7" x2="14.5" y2="10.5" /><line x1="6" y1="17" x2="9.5" y2="13.5" />
    </svg>
  );
}
function EdgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="5" cy="12" r="3" /><circle cx="19" cy="12" r="3" />
      <line x1="8" y1="12" x2="16" y2="12" /><polyline points="13,9 16,12 13,15" />
    </svg>
  );
}
function DegreeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="5" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="19" />
      <line x1="5" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="19" y2="12" />
      <line x1="7.1" y1="7.1" x2="9.9" y2="9.9" /><line x1="14.1" y1="14.1" x2="16.9" y2="16.9" />
      <line x1="16.9" y1="7.1" x2="14.1" y2="9.9" /><line x1="9.9" y1="14.1" x2="7.1" y2="16.9" />
    </svg>
  );
}
function SpeedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 2a10 10 0 0 1 10 10" /><path d="M2 12a10 10 0 0 0 10 10" />
      <path d="M12 12l4-6" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

const COLOR_STYLES = {
  sky:     { border: "border-sky-200",     bg: "bg-sky-50",     icon: "text-sky-500",     val: "text-sky-700" },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", icon: "text-emerald-500", val: "text-emerald-700" },
  violet:  { border: "border-violet-200",  bg: "bg-violet-50",  icon: "text-violet-500",  val: "text-violet-700" },
  orange:  { border: "border-orange-200",  bg: "bg-orange-50",  icon: "text-orange-500",  val: "text-orange-700" },
};
const ICONS = { node: NodeIcon, edge: EdgeIcon, degree: DegreeIcon, speed: SpeedIcon };

function IconStatCard({ label, value, decimals, icon, color }: {
  label: string; value: number; decimals?: number;
  icon: keyof typeof ICONS; color: keyof typeof COLOR_STYLES;
}) {
  const c = COLOR_STYLES[color];
  const Icon = ICONS[icon];
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 flex items-start gap-3`}>
      <div className={`rounded-lg p-2 bg-white ${c.icon} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 truncate">{label}</p>
        <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${c.val}`}>
          <AnimatedNumber target={value} decimals={decimals ?? 0} />
        </p>
      </div>
    </div>
  );
}

// Feature 4: SVG histogram
function DegreeHistogram({ nodes, mean }: { nodes: MusicGraphNode[]; mean: number }) {
  const degrees = nodes.map((n) => n.degree);
  const maxDeg = Math.max(...degrees, 1);
  const N = 12;
  const bSize = Math.ceil(maxDeg / N);
  const buckets: number[] = Array(N).fill(0);
  for (const d of degrees) buckets[Math.min(Math.floor(d / bSize), N - 1)]++;
  const maxC = Math.max(...buckets, 1);
  const meanFrac = Math.min(mean / (N * bSize), 1);

  const W = 600; const H = 180;
  const PL = 36; const PR = 16; const PT = 16; const PB = 36;
  const iW = W - PL - PR; const iH = H - PT - PB;
  const bW = iW / N;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PT + iH * (1 - f);
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={PL + iW} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#94a3b8">
                {Math.round(f * maxC)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {buckets.map((count, i) => {
          const x = PL + i * bW;
          const bH = (count / maxC) * iH;
          const y = PT + iH - bH;
          const isPeak = count === maxC;
          return (
            <g key={i}>
              <rect x={x + 2} y={y} width={bW - 4} height={bH}
                fill={isPeak ? "#fb923c" : "#38bdf8"} rx={2} opacity={0.9} />
              {bH > 16 && (
                <text x={x + bW / 2} y={y + 11} textAnchor="middle" fontSize={9} fill="white" fontWeight="700">
                  {count}
                </text>
              )}
              <text x={x + bW / 2} y={H - PB + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">
                {i * bSize}
              </text>
            </g>
          );
        })}

        {/* Mean line */}
        {(() => {
          const mx = PL + meanFrac * iW;
          return (
            <>
              <line x1={mx} y1={PT} x2={mx} y2={PT + iH} stroke="#22c55e" strokeWidth={2} strokeDasharray="5,3" />
              <rect x={mx + 3} y={PT + 2} width={52} height={13} rx={2} fill="#f0fdf4" />
              <text x={mx + 5} y={PT + 11} fontSize={9} fill="#16a34a" fontWeight="700">
                média={mean.toFixed(1)}
              </text>
            </>
          );
        })()}

        {/* Axis labels */}
        <text x={PL + iW / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="#64748b">Grau de saída</text>
        <text x={10} y={PT + iH / 2} textAnchor="middle" fontSize={9} fill="#64748b"
          transform={`rotate(-90,10,${PT + iH / 2})`}>Nós</text>
      </svg>
      <div className="flex items-center gap-5 mt-1 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-sky-400" />Frequência
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-orange-400" />Pico
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-green-500" />Média
        </span>
      </div>
    </div>
  );
}

// Feature 6: Connection examples table
function ConnectionsTable({ sample }: { sample: MusicGraphSample }) {
  const nodeMap = useMemo(
    () => Object.fromEntries(sample.nodes.map((n) => [n.id, n])),
    [sample.nodes],
  );
  const examples = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof sample.edges = [];
    for (const e of sample.edges) {
      if (out.length >= 8) break;
      const k = `${e.source}|${e.target}`;
      if (!seen.has(k) && nodeMap[e.source] && nodeMap[e.target]) {
        seen.add(k); out.push(e);
      }
    }
    return out;
  }, [sample.edges, nodeMap]);

  function connType(e: typeof sample.edges[0]) {
    const s = nodeMap[e.source]; const t = nodeMap[e.target];
    if (!s || !t) return "similar_audio";
    if (s.genre === t.genre) return "same_genre";
    if (e.weight < 0.1) return "very_similar";
    return "similar_audio";
  }
  const TYPE_STYLE: Record<string, string> = {
    same_genre:    "bg-emerald-100 text-emerald-700",
    very_similar:  "bg-sky-100 text-sky-700",
    similar_audio: "bg-neutral-100 text-neutral-600",
  };
  const TYPE_LABEL: Record<string, string> = {
    same_genre: "Mesmo gênero", very_similar: "Muito similar", similar_audio: "Áudio similar",
  };
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Música origem</th>
            <th>Música destino</th>
            <th>Tipo</th>
            <th>Peso</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((e, i) => {
            const s = nodeMap[e.source]; const t = nodeMap[e.target];
            const ct = connType(e);
            return (
              <tr key={i}>
                <td className="text-xs">
                  <span className="block truncate max-w-44" title={s?.label}>{s?.label.split(" — ")[0] ?? e.source}</span>
                  <span className="text-neutral-400 text-[10px]">{s?.genre}</span>
                </td>
                <td className="text-xs">
                  <span className="block truncate max-w-44" title={t?.label}>{t?.label.split(" — ")[0] ?? e.target}</span>
                  <span className="text-neutral-400 text-[10px]">{t?.genre}</span>
                </td>
                <td>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_STYLE[ct]}`}>
                    {TYPE_LABEL[ct]}
                  </span>
                </td>
                <td className="font-mono text-sm">{e.weight.toFixed(4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Grafo Tab — Features 7, 8, 9, 14
// ══════════════════════════════════════════════════════════════════════════

function GrafoTab({ parte2 }: { parte2: Parte2Data }) {
  const sample = parte2.graph_sample;
  const [darkMode, setDarkMode] = useState(true);
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);

  if (!sample) return <div className="text-sm text-neutral-400">Amostra do grafo não disponível.</div>;

  const toggleGenre = (g: string) => {
    setFilterGenre((prev) => (prev === g ? null : g));
    setHighlight(null);
  };
  const applyHighlight = (h: HighlightState | null) => {
    setHighlight(h);
    if (h) setFilterGenre(null);
  };

  return (
    <div className="space-y-8">
      {/* Features 7, 8, 9: enhanced vis-network */}
      <MusicGraphSection
        sample={sample}
        dijkstraResults={parte2.dijkstra_results}
        darkMode={darkMode}
        filterGenre={filterGenre}
        highlight={highlight}
        onToggleDark={() => setDarkMode((d) => !d)}
        onFilterGenre={toggleGenre}
        onSetHighlight={applyHighlight}
      />

      {/* Feature 14: interactive demo with vis-network highlight */}
      <AlgorithmDemoSection
        sample={sample}
        onHighlight={applyHighlight}
        onClearHighlight={() => setHighlight(null)}
      />
    </div>
  );
}

// Feature 7, 8, 9: Enhanced vis-network
interface GraphSectionProps {
  sample: MusicGraphSample;
  dijkstraResults: DijkstraResult[];
  darkMode: boolean;
  filterGenre: string | null;
  highlight: HighlightState | null;
  onToggleDark: () => void;
  onFilterGenre: (g: string) => void;
  onSetHighlight: (h: HighlightState | null) => void;
}

function MusicGraphSection({
  sample, dijkstraResults, darkMode, filterGenre, highlight,
  onToggleDark, onFilterGenre, onSetHighlight,
}: GraphSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef   = useRef<any>(null);
  const nodesRef     = useRef<any>(null);
  const origColors   = useRef<Record<string, string>>({});
  const [loaded, setLoaded]   = useState(visReady());
  const [selected, setSelected] = useState<MusicGraphNode | null>(null);
  const [pairIdx, setPairIdx] = useState(-1);

  const nodeById = useMemo(
    () => Object.fromEntries(sample.nodes.map((n) => [n.id, n])),
    [sample.nodes],
  );
  const genres = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of sample.nodes) m[n.genre] = (m[n.genre] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [sample.nodes]);

  useEffect(() => {
    if (visReady()) { setLoaded(true); return; }
    loadVisCss();
    loadVisScript().then(() => setLoaded(true)).catch(console.error);
  }, []);

  // Re-init on dark mode toggle
  useEffect(() => {
    if (!loaded || !containerRef.current || sample.nodes.length === 0) return;
    const vis = (window as any).vis;
    if (!vis?.DataSet || !vis?.Network) return;

    const bg = darkMode ? "#0f172a" : "#ffffff";
    const edgeColor = darkMode ? "#334155" : "#cbd5e1";
    const fontColor = darkMode ? "#e2e8f0" : "#1e293b";
    const strokeColor = darkMode ? "#0f172a" : "#fff";

    const nodeData = sample.nodes.map((n) => {
      const color = genreColor(n.genre);
      origColors.current[n.id] = color;
      return {
        id: n.id,
        label: n.label.split(" — ")[0].slice(0, 18),
        title: `<b>${n.label}</b><br>Gênero: ${n.genre}<br>Grau: ${n.degree}`,
        color: { background: color, border: darkMode ? "#1e293b" : "#e2e8f0", highlight: { background: color, border: "#f97316" } },
        size: Math.max(6, 6 + n.degree * 0.08),
        font: { color: fontColor, size: 9, strokeWidth: 2, strokeColor },
      };
    });

    const edgeData = sample.edges.map((e, i) => ({
      id: i, from: e.source, to: e.target,
      color: { color: edgeColor, opacity: 0.5 },
      width: 0.8,
      arrows: { to: { enabled: true, scaleFactor: 0.4 } },
    }));

    networkRef.current?.destroy();
    nodesRef.current = new vis.DataSet(nodeData);
    const edgesDs = new vis.DataSet(edgeData);

    networkRef.current = new vis.Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesDs },
      {
        nodes: { shape: "dot", borderWidth: 1 },
        edges: { smooth: { type: "continuous", roundness: 0.2 } },
        physics: {
          stabilization: { iterations: 120, updateInterval: 30 },
          barnesHut: { gravitationalConstant: -5000, springLength: 90, springConstant: 0.02, damping: 0.1 },
        },
        interaction: { hover: true, tooltipDelay: 80 },
        background: { color: bg },
      },
    );
    networkRef.current.on("click", (params: any) => {
      if (params.nodes.length > 0) setSelected(nodeById[params.nodes[0]] ?? null);
    });
    return () => { networkRef.current?.destroy(); networkRef.current = null; };
  }, [loaded, sample, nodeById, darkMode]);

  // Apply visual highlight / genre filter
  useEffect(() => {
    if (!nodesRef.current || !loaded) return;
    const fontColor = darkMode ? "#e2e8f0" : "#1e293b";
    const strokeColor = darkMode ? "#0f172a" : "#fff";
    const dimBg = darkMode ? "#1e293b" : "#e2e8f0";

    nodesRef.current.update(
      sample.nodes.map((n) => {
        let bg = origColors.current[n.id];
        let opacity = 1;
        let border = darkMode ? "#1e293b" : "#e2e8f0";
        let borderWidth = 1;

        if (highlight && highlight.ids.length > 0) {
          if (highlight.ids.includes(n.id)) {
            bg = highlight.color; border = "#fff"; borderWidth = 3;
          } else {
            bg = dimBg; opacity = 0.1;
          }
        } else if (filterGenre) {
          if (n.genre !== filterGenre) { bg = dimBg; opacity = 0.1; }
        }

        return {
          id: n.id,
          color: { background: bg, border, highlight: { background: bg, border: "#f97316" } },
          opacity, borderWidth,
          font: { color: fontColor, size: 9, strokeWidth: 2, strokeColor },
        };
      }),
    );
  }, [highlight, filterGenre, loaded, sample.nodes, darkMode]);

  // Feature 9: Handle Dijkstra path selection
  function selectPair(idx: number) {
    setPairIdx(idx);
    if (idx < 0) { onSetHighlight(null); return; }
    const r = dijkstraResults[idx];
    if (!r) return;
    const ids = new Set<string>([r.source, r.target]);
    for (const lbl of r.path_labels) {
      const found = sample.nodes.find((n) => n.label.startsWith(lbl) || lbl.startsWith(n.label.slice(0, lbl.length)));
      if (found) ids.add(found.id);
    }
    onSetHighlight({ ids: Array.from(ids), color: "#22c55e" });
  }

  const borderCls = darkMode ? "border-slate-700" : "border-neutral-200";
  const bgCls     = darkMode ? "bg-slate-900"    : "bg-white";

  return (
    <section className="space-y-4">
      <SectionTitle>Grafo da Rede Musical (top-200 nós)</SectionTitle>
      <p className="text-sm text-neutral-600">
        Grafo <strong>dirigido</strong> — nós coloridos por gênero, tamanho proporcional ao grau.
        Clique em um nó para detalhes.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Feature 7: Dark/light toggle */}
        <button
          onClick={onToggleDark}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            darkMode
              ? "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700"
              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          {darkMode ? "☀ Tema claro" : "🌙 Tema escuro"}
        </button>

        {/* Feature 9: Dijkstra path dropdown */}
        <select
          value={pairIdx}
          onChange={(e) => selectPair(Number(e.target.value))}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 outline-none focus:border-neutral-400"
        >
          <option value={-1}>— Ver caminho Dijkstra —</option>
          {dijkstraResults.filter((r) => r.reachable).map((r, i) => (
            <option key={i} value={i}>
              {r.source_label.slice(0, 22)}… → {r.target_label.slice(0, 22)}… ({r.hops}s)
            </option>
          ))}
        </select>

        {(highlight || filterGenre) && (
          <button
            onClick={() => { onSetHighlight(null); onFilterGenre(""); setPairIdx(-1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50"
          >
            ↺ Limpar filtro
          </button>
        )}
      </div>

      <div className="flex gap-4 min-h-0">
        {/* Graph */}
        <div
          ref={containerRef}
          className={`flex-1 rounded-xl border-2 ${borderCls} ${bgCls} overflow-hidden transition-colors`}
          style={{ height: 480 }}
        >
          {!loaded && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Carregando vis-network…
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-56 shrink-0 flex flex-col gap-3">
          {selected ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-3 space-y-2 text-xs">
              <p className="font-semibold text-sm text-neutral-800 leading-tight">{selected.label.split(" — ")[0]}</p>
              <p className="text-neutral-500 text-[10px]">{selected.label.split(" — ")[1] ?? ""}</p>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-white text-[10px] font-medium"
                style={{ background: genreColor(selected.genre) }}
              >
                {selected.genre}
              </span>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                <dt className="text-neutral-400">Grau saída</dt>
                <dd className="font-mono">{selected.degree}</dd>
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs text-neutral-400 text-center py-5">
              Clique em um nó
            </div>
          )}

          {/* Feature 8: Full genre legend with filter */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs overflow-y-auto" style={{ maxHeight: 370 }}>
            <p className="font-semibold text-neutral-600 mb-2">Gêneros — clique para filtrar</p>
            <div className="space-y-0.5">
              {genres.map(([g, count]) => (
                <button
                  key={g}
                  onClick={() => onFilterGenre(g)}
                  className={`w-full flex items-center gap-2 rounded px-1.5 py-1 text-left transition-all hover:bg-neutral-50 ${
                    filterGenre === g ? "bg-neutral-100 ring-1 ring-neutral-300" : ""
                  }`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: genreColor(g) }} />
                  <span className="flex-1 truncate text-neutral-700">{g}</span>
                  <span className="text-neutral-400 tabular-nums shrink-0">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Feature 14: Interactive demo with vis-network highlight
function buildAdjList(sample: MusicGraphSample): AdjList {
  const adj: AdjList = {};
  for (const n of sample.nodes) adj[n.id] = [];
  for (const e of sample.edges) {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push({ to: e.target, weight: e.weight });
  }
  return adj;
}

function AlgorithmDemoSection({
  sample, onHighlight, onClearHighlight,
}: {
  sample: MusicGraphSample;
  onHighlight: (h: HighlightState) => void;
  onClearHighlight: () => void;
}) {
  const [alg, setAlg] = useState<AlgKey>("BFS");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adj = useMemo(() => buildAdjList(sample), [sample]);
  const nodeOptions = useMemo(
    () => sample.nodes.map((n) => ({ id: n.id, label: (n.label.slice(0, 48) + (n.label.length > 48 ? "…" : "")) })),
    [sample.nodes],
  );
  const needsTarget = alg === "Dijkstra" || alg === "Bellman-Ford";

  const ALG_COLORS: Record<AlgKey, string> = {
    "BFS": "#38bdf8", "DFS": "#a78bfa", "Dijkstra": "#22c55e", "Bellman-Ford": "#f97316",
  };

  function run() {
    setError(null); setResult(null);
    if (!sourceId) { setError("Selecione um nó de origem."); return; }
    if (needsTarget && !targetId) { setError("Selecione um nó de destino."); return; }
    const t0 = performance.now();
    try {
      let visitedNodes: string[] = [];
      let pathNodes: string[] = [];
      let cost: number | undefined;
      let hasCycle: boolean | undefined;

      if (alg === "BFS") {
        const levels = runBFS(adj, sourceId);
        visitedNodes = Object.keys(levels).sort((a, b) => levels[a] - levels[b]);
      } else if (alg === "DFS") {
        const r = runDFS(adj, sourceId);
        visitedNodes = r.visited; hasCycle = r.hasCycle;
      } else if (alg === "Dijkstra") {
        const r = runDijkstra(adj, sourceId, targetId);
        if (r) { pathNodes = r.path; cost = r.cost; visitedNodes = r.path; }
        else { setError("Destino não alcançável."); return; }
      } else {
        const nodes = sample.nodes.map((n) => n.id);
        const edges = sample.edges.map((e) => ({ from: e.source, to: e.target, weight: e.weight }));
        const r = runBellmanFord(nodes, edges, sourceId);
        hasCycle = r.hasCycle;
        const d = r.distances[targetId];
        if (d !== undefined && isFinite(d)) {
          cost = d;
          visitedNodes = Object.keys(r.distances).filter((k) => isFinite(r.distances[k]));
        } else { setError("Destino não alcançável (custo = ∞)."); return; }
      }

      const timeMs = performance.now() - t0;
      const res: DemoResult = { alg, source: sourceId, target: targetId || undefined, visitedNodes, pathNodes, cost, hasCycle, timeMs };
      setResult(res);

      // Highlight in vis-network
      const highlightIds = pathNodes.length > 0 ? pathNodes : visitedNodes.slice(0, 60);
      onHighlight({ ids: highlightIds, color: ALG_COLORS[alg] });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  const sourceNode = sample.nodes.find((n) => n.id === sourceId);
  const targetNode = sample.nodes.find((n) => n.id === targetId);

  const algBadgeColor: Record<AlgKey, string> = {
    "BFS": "bg-sky-100 text-sky-700",
    "DFS": "bg-violet-100 text-violet-700",
    "Dijkstra": "bg-green-100 text-green-700",
    "Bellman-Ford": "bg-orange-100 text-orange-700",
  };

  return (
    <section className="space-y-4">
      <SectionTitle>Demo Interativo — Algoritmos no Browser</SectionTitle>
      <p className="text-sm text-neutral-600">
        Execute os algoritmos implementados em TypeScript diretamente no browser. Os nós visitados ficam
        destacados no grafo acima.
      </p>

      <div className="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-5 space-y-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-neutral-500">Algoritmo</label>
            <select
              value={alg}
              onChange={(e) => { setAlg(e.target.value as AlgKey); setResult(null); setError(null); onClearHighlight(); }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none focus:border-neutral-400"
            >
              {(["BFS", "DFS", "Dijkstra", "Bellman-Ford"] as AlgKey[]).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-52">
            <label className="text-xs font-semibold text-neutral-500">Nó de origem</label>
            <select
              value={sourceId}
              onChange={(e) => { setSourceId(e.target.value); setResult(null); onClearHighlight(); }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none focus:border-neutral-400"
            >
              <option value="">Selecionar…</option>
              {nodeOptions.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
          </div>
          {needsTarget && (
            <div className="flex flex-col gap-1 min-w-52">
              <label className="text-xs font-semibold text-neutral-500">Nó de destino</label>
              <select
                value={targetId}
                onChange={(e) => { setTargetId(e.target.value); setResult(null); onClearHighlight(); }}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none focus:border-neutral-400"
              >
                <option value="">Selecionar…</option>
                {nodeOptions.filter((n) => n.id !== sourceId).map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={run}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            ▶ Executar
          </button>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        {result && (
          <div className="space-y-4 border-t border-neutral-200 pt-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${algBadgeColor[result.alg]}`}>{result.alg}</span>
              {sourceNode && <span className="text-neutral-600">origem: <strong>{sourceNode.label.split(" — ")[0]}</strong></span>}
              {targetNode && <span className="text-neutral-600">destino: <strong>{targetNode.label.split(" — ")[0]}</strong></span>}
              <span className="font-mono text-neutral-400 ml-auto">{result.timeMs.toFixed(2)} ms</span>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
              <dt className="text-neutral-500">Nós visitados</dt>
              <dd className="font-mono font-bold text-base">{result.visitedNodes.length}</dd>
              {result.cost !== undefined && (
                <>
                  <dt className="text-neutral-500">Custo</dt>
                  <dd className="font-mono font-bold text-base">{result.cost.toFixed(4)}</dd>
                </>
              )}
              {result.hasCycle !== undefined && (
                <>
                  <dt className="text-neutral-500">Ciclo?</dt>
                  <dd className={`font-bold ${result.hasCycle ? "text-amber-600" : "text-green-700"}`}>
                    {result.hasCycle ? "Detectado" : "Não"}
                  </dd>
                </>
              )}
              {result.pathNodes.length > 0 && (
                <>
                  <dt className="text-neutral-500">Saltos</dt>
                  <dd className="font-mono font-bold text-base">{result.pathNodes.length - 1}</dd>
                </>
              )}
            </dl>

            {result.pathNodes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-600 mb-2">Caminho encontrado:</p>
                <div className="flex flex-wrap gap-1 items-center">
                  {result.pathNodes.map((id, i) => {
                    const n = sample.nodes.find((x) => x.id === id);
                    return (
                      <span key={i} className="flex items-center gap-1">
                        <span
                          className="rounded-lg px-2 py-0.5 text-[10px] font-medium text-white max-w-36 truncate"
                          style={{ background: ALG_COLORS[result.alg] }}
                          title={n?.label ?? id}
                        >
                          {n?.label.split(" — ")[0] ?? id}
                        </span>
                        {i < result.pathNodes.length - 1 && <span className="text-neutral-300 text-xs">→</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Algoritmos Tab — Features 10, 11, 12, 13
// ══════════════════════════════════════════════════════════════════════════

function AlgoritmosTab({ parte2 }: { parte2: Parte2Data }) {
  const sample = parte2.graph_sample;
  const nodeMap = useMemo(
    () => sample ? Object.fromEntries(sample.nodes.map((n) => [n.id, n])) : {},
    [sample],
  );
  const labels = ["Hub (maior grau)", "Mediano", "Periférico (menor grau)"];

  return (
    <div className="space-y-10">
      {/* Feature 10: Algorithm flashcards */}
      <section className="space-y-4">
        <SectionTitle>Algoritmos Implementados</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ALGO_CARDS.map((c) => (
            <AlgoFlashcard key={c.name} card={c} />
          ))}
        </div>
      </section>

      {/* Feature 13: BFS vs DFS side-by-side */}
      {parte2.bfs_results.length > 0 && parte2.dfs_results.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>BFS vs DFS — Comparação Lado a Lado</SectionTitle>
          <p className="text-sm text-neutral-600">
            Mesmas 3 fontes, dois algoritmos distintos. BFS explora por camadas (largura);
            DFS mergulha em profundidade e detecta ciclos via back-edges.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* BFS column */}
            <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sky-800">BFS — Busca em Largura</h3>
                <span className="rounded-full bg-sky-100 text-sky-700 text-xs px-2 py-0.5 font-medium">O(V+E)</span>
              </div>
              <ul className="text-xs text-sky-700 space-y-1">
                <li>✓ Garante caminho mínimo por número de saltos</li>
                <li>✓ Explora em camadas (distâncias crescentes)</li>
                <li>✗ Não considera pesos das arestas</li>
              </ul>
              <div className="space-y-2">
                {parte2.bfs_results.map((r, i) => (
                  <div key={r.source} className="rounded-lg bg-white border border-sky-200 p-2 text-xs">
                    <div className="flex justify-between font-medium text-neutral-700 mb-1">
                      <span className="truncate max-w-36">{labels[i] ?? `Fonte ${i+1}`}</span>
                      <span className="font-mono text-sky-600 shrink-0">{r.time_ms.toFixed(1)} ms</span>
                    </div>
                    <div className="flex gap-3 text-neutral-500">
                      <span>visitados: <strong className="text-neutral-700">{formatNumber(r.visited)}</strong></span>
                      <span>camadas: <strong className="text-neutral-700">{r.max_layer}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DFS column */}
            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-violet-800">DFS — Busca em Profundidade</h3>
                <span className="rounded-full bg-violet-100 text-violet-700 text-xs px-2 py-0.5 font-medium">O(V+E)</span>
              </div>
              <ul className="text-xs text-violet-700 space-y-1">
                <li>✓ Detecta ciclos via back-edges</li>
                <li>✓ Classifica arestas (Tree/Back/Forward/Cross)</li>
                <li>✗ Não garante caminho mínimo</li>
              </ul>
              <div className="space-y-2">
                {parte2.dfs_results.map((r, i) => (
                  <div key={r.source} className="rounded-lg bg-white border border-violet-200 p-2 text-xs">
                    <div className="flex justify-between font-medium text-neutral-700 mb-1">
                      <span className="truncate max-w-36">{labels[i] ?? `Fonte ${i+1}`}</span>
                      <span className="font-mono text-violet-600 shrink-0">{r.time_ms.toFixed(1)} ms</span>
                    </div>
                    <div className="flex gap-3 text-neutral-500">
                      <span>visitados: <strong className="text-neutral-700">{formatNumber(r.visited)}</strong></span>
                      <span>back-edges: <strong className={r.has_cycle ? "text-amber-600" : "text-green-700"}>{r.back_edges}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature 11: BFS layer pyramid charts */}
      {parte2.bfs_results.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>BFS — Distribuição por Camadas</SectionTitle>
          <p className="text-sm text-neutral-600">
            Cada barra representa quantos nós foram descobertos naquela camada BFS. O hub alcança mais nós
            por camada devido ao seu alto grau de saída.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {parte2.bfs_results.map((r, i) => (
              <BfsPyramidChart key={r.source} result={r} label={labels[i] ?? `Fonte ${i+1}`} />
            ))}
          </div>
        </section>
      )}

      {/* Feature 12: Dijkstra musical journey */}
      {parte2.dijkstra_results.filter((r) => r.reachable && r.path_labels.length > 1).length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Dijkstra — Jornada Musical</SectionTitle>
          <p className="text-sm text-neutral-600">
            Caminho mais curto (soma de distâncias euclidianas) entre pares de músicas. Cada parada é um gênero
            intermediário na "viagem" musical.
          </p>
          <div className="space-y-4">
            {parte2.dijkstra_results.filter((r) => r.reachable && r.path_labels.length > 1).slice(0, 3).map((r, i) => (
              <DijkstraJourney key={i} result={r} />
            ))}
          </div>
        </section>
      )}

      {/* Bellman-Ford section */}
      <BellmanFordSection
        negWeightCase={parte2.bellman_ford_results.negative_weight_case}
        negCycleCase={parte2.bellman_ford_results.negative_cycle_case}
      />
    </div>
  );
}

// Feature 10: Algorithm flashcards
const ALGO_CARDS = [
  {
    name: "BFS",
    fullName: "Breadth-First Search",
    complexity: "O(V + E)",
    space: "O(V)",
    color: { border: "border-sky-300", bg: "bg-sky-50", badge: "bg-sky-100 text-sky-700", title: "text-sky-800" },
    useCase: "Caminho mínimo por nº de saltos, componentes conexas",
    supports: { negWeights: false, cycleDetect: false },
  },
  {
    name: "DFS",
    fullName: "Depth-First Search",
    complexity: "O(V + E)",
    space: "O(V)",
    color: { border: "border-violet-300", bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700", title: "text-violet-800" },
    useCase: "Detecção de ciclos, ordenação topológica, componentes fortemente conexas",
    supports: { negWeights: false, cycleDetect: true },
  },
  {
    name: "Dijkstra",
    fullName: "Dijkstra's Algorithm",
    complexity: "O((V+E) log V)",
    space: "O(V)",
    color: { border: "border-emerald-300", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", title: "text-emerald-800" },
    useCase: "Caminho mais curto com pesos ≥ 0, roteamento GPS",
    supports: { negWeights: false, cycleDetect: false },
  },
  {
    name: "Bellman-Ford",
    fullName: "Bellman-Ford Algorithm",
    complexity: "O(V × E)",
    space: "O(V)",
    color: { border: "border-orange-300", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", title: "text-orange-800" },
    useCase: "Caminhos com pesos negativos, detecção de ciclos negativos",
    supports: { negWeights: true, cycleDetect: true },
  },
];

function AlgoFlashcard({ card }: { card: typeof ALGO_CARDS[0] }) {
  const c = card.color;
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`font-bold text-lg ${c.title}`}>{card.name}</p>
          <p className="text-xs text-neutral-500">{card.fullName}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-mono font-bold shrink-0 ${c.badge}`}>
          {card.complexity}
        </span>
      </div>
      <p className="text-xs text-neutral-600 leading-relaxed">{card.useCase}</p>
      <div className="flex gap-2 text-[10px]">
        <span className={`rounded px-1.5 py-0.5 font-medium ${card.supports.negWeights ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {card.supports.negWeights ? "✓" : "✗"} pesos neg.
        </span>
        <span className={`rounded px-1.5 py-0.5 font-medium ${card.supports.cycleDetect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {card.supports.cycleDetect ? "✓" : "✗"} ciclos
        </span>
      </div>
    </div>
  );
}

// Feature 11: BFS pyramid chart (SVG)
function BfsPyramidChart({ result, label }: { result: BfsResult; label: string }) {
  const sizes = result.layer_sizes.slice(0, 15);
  if (sizes.length === 0) return null;
  const maxC = Math.max(...sizes, 1);

  const W = 280; const H = 200;
  const PL = 32; const PR = 8; const PT = 10; const PB = 28;
  const iW = W - PL - PR; const iH = H - PT - PB;
  const bW = iW / sizes.length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold text-neutral-700 mb-1 truncate">{label}</p>
      <p className="text-[10px] text-neutral-400 mb-3 truncate">{result.source_genre} · {formatNumber(result.visited)} nós</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map((f) => {
          const y = PT + iH * (1 - f);
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={PL + iW} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PL - 3} y={y + 3} textAnchor="end" fontSize={7} fill="#94a3b8">{Math.round(f * maxC)}</text>
            </g>
          );
        })}
        {sizes.map((count, i) => {
          const x = PL + i * bW;
          const bH = (count / maxC) * iH;
          const y = PT + iH - bH;
          const isPeak = count === maxC;
          return (
            <g key={i}>
              <rect x={x + 1} y={y} width={bW - 2} height={bH}
                fill={isPeak ? "#fb923c" : "#38bdf8"} rx={2} />
              {bH > 14 && (
                <text x={x + bW / 2} y={y + 10} textAnchor="middle" fontSize={7} fill="white" fontWeight="700">
                  {count > 999 ? `${(count/1000).toFixed(1)}k` : count}
                </text>
              )}
              <text x={x + bW / 2} y={H - 4} textAnchor="middle" fontSize={7} fill="#94a3b8">{i}</text>
            </g>
          );
        })}
        <text x={PL + iW / 2} y={H} textAnchor="middle" fontSize={8} fill="#64748b">camada</text>
      </svg>
      <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
        <span>tempo: {result.time_ms.toFixed(1)} ms</span>
        <span>{result.max_layer} camadas</span>
      </div>
    </div>
  );
}

// Feature 12: Dijkstra journey cards
function DijkstraJourney({ result }: { result: DijkstraResult }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-emerald-800">
          {result.hops} salto{result.hops !== 1 ? "s" : ""} · custo {result.cost.toFixed(4)}
        </p>
        <span className="text-[10px] text-emerald-600 font-mono">{result.time_ms.toFixed(1)} ms</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {result.path_labels.map((lbl, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="rounded-lg bg-white border border-emerald-200 shadow-sm px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 max-w-36 truncate" title={lbl}>
              {lbl}
            </span>
            {i < result.path_labels.length - 1 && (
              <span className="text-emerald-400 text-xs font-bold">→</span>
            )}
          </span>
        ))}
        {result.path_labels.length >= 8 && (
          <span className="text-emerald-400 text-xs">…</span>
        )}
      </div>
    </div>
  );
}

// Bellman-Ford section (reused in Algoritmos tab)
function BellmanFordSection({
  negWeightCase, negCycleCase,
}: {
  negWeightCase: BellmanFordCase;
  negCycleCase: BellmanFordCase;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle>Bellman-Ford — Pesos Negativos</SectionTitle>
      <p className="text-sm text-neutral-600">
        Dois casos demonstrados: (1) grafo mood-score (pesos negativos, sem ciclos negativos — DAG);
        (2) grafo sintético com ciclo negativo detectado.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Case 1 */}
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-amber-800 text-sm">Caso 1 — Pesos Negativos Sem Ciclo</h3>
            {negWeightCase.error ? (
              <Badge color="red">Erro</Badge>
            ) : (
              <Badge color={negWeightCase.negative_cycle ? "red" : "green"}>
                {negWeightCase.negative_cycle ? "Ciclo!" : "Sem ciclo ✓"}
              </Badge>
            )}
          </div>
          {negWeightCase.error ? (
            <p className="text-xs text-red-600">{negWeightCase.error}</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-neutral-500">Arestas mood</dt>
                <dd className="font-mono">{formatNumber(negWeightCase.total_mood_edges ?? 0)}</dd>
                <dt className="text-neutral-500">Arestas negativas</dt>
                <dd className="font-mono text-amber-700">
                  {formatNumber(negWeightCase.negative_edges_count ?? 0)}{" "}
                  <span className="text-neutral-400">({negWeightCase.pct_negative?.toFixed(1)}%)</span>
                </dd>
                <dt className="text-neutral-500">Custo encontrado</dt>
                <dd className="font-mono font-bold">
                  {negWeightCase.cost != null ? negWeightCase.cost.toFixed(4) : EM_DASH}
                </dd>
                <dt className="text-neutral-500">Tempo</dt>
                <dd className="font-mono">{negWeightCase.time_ms?.toFixed(1)} ms</dd>
              </dl>
              {negWeightCase.path_labels && negWeightCase.path_labels.length > 0 && (
                <div className="text-xs text-neutral-600">
                  <p className="font-semibold mb-1">Caminho:</p>
                  <div className="flex flex-wrap gap-1">
                    {negWeightCase.path_labels.map((lbl, i) => (
                      <span key={i} className="bg-white rounded px-1.5 py-0.5 text-[10px] border border-amber-200 truncate max-w-32" title={lbl}>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {negWeightCase.description && (
                <p className="text-[10px] text-neutral-400 leading-relaxed">{negWeightCase.description}</p>
              )}
            </>
          )}
        </div>

        {/* Case 2 */}
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-red-800 text-sm">Caso 2 — Ciclo Negativo Detectado</h3>
            <Badge color={negCycleCase.negative_cycle_detected ? "green" : "red"}>
              {negCycleCase.negative_cycle_detected ? "Detectado ✓" : "Não detectado"}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-neutral-500">Nós no grafo</dt>
            <dd className="font-mono">{negCycleCase.graph_nodes ?? EM_DASH}</dd>
            <dt className="text-neutral-500">Ciclo negativo</dt>
            <dd className="font-mono font-bold text-red-700">S1→S2→S3→S1 = −3.5</dd>
            <dt className="text-neutral-500">Tempo</dt>
            <dd className="font-mono">{negCycleCase.time_ms?.toFixed(3)} ms</dd>
          </dl>
          {negCycleCase.graph_edges_directed && (
            <div className="text-xs">
              <p className="font-semibold text-neutral-600 mb-1">Arestas do grafo sintético:</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {negCycleCase.graph_edges_directed.map((e, i) => (
                  <span key={i} className={`font-mono ${e.weight < 0 ? "text-red-600 font-bold" : "text-neutral-600"}`}>
                    {e.from}→{e.to}: {e.weight > 0 ? "+" : ""}{e.weight}
                  </span>
                ))}
              </div>
            </div>
          )}
          {negCycleCase.description && (
            <p className="text-[10px] text-neutral-400 leading-relaxed">{negCycleCase.description}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Performance Tab — Features 15, 16, 17
// ══════════════════════════════════════════════════════════════════════════

function PerformanceTab({ parte2 }: { parte2: Parte2Data }) {
  return (
    <div className="space-y-10">
      {/* Feature 15: Log scale chart */}
      <section className="space-y-4">
        <SectionTitle>Comparação de Desempenho (escala logarítmica)</SectionTitle>
        <p className="text-sm text-neutral-600">
          Escala log₁₀ — permite visualizar a diferença de ordens de grandeza entre algoritmos.
          Bellman-Ford (O(V×E)) é dramaticamente mais lento que BFS/DFS (O(V+E)).
        </p>
        <LogPerformanceChart perf={parte2.performance_summary} />
      </section>

      {/* Feature 16: Complexity table */}
      <section className="space-y-4">
        <SectionTitle>Tabela de Complexidades</SectionTitle>
        <ComplexityTable perf={parte2.performance_summary} />
      </section>

      {/* Feature 17: Insights cards */}
      <section className="space-y-4">
        <SectionTitle>O Que o Grafo Revelou</SectionTitle>
        <InsightsCards parte2={parte2} />
      </section>
    </div>
  );
}

// Feature 15: Log scale performance chart
function LogPerformanceChart({ perf }: { perf: Parte2Performance }) {
  const entries = [
    { label: "BFS",          ms: perf.bfs_avg_ms,          color: "#38bdf8", desc: "O(V+E)" },
    { label: "DFS",          ms: perf.dfs_avg_ms,          color: "#a78bfa", desc: "O(V+E)" },
    { label: "Dijkstra",     ms: perf.dijkstra_avg_ms,     color: "#22c55e", desc: "O((V+E)logV)" },
    { label: "Bellman-Ford", ms: perf.bellman_ford_avg_ms, color: "#f97316", desc: "O(V×E)" },
  ];
  const logVals = entries.map((e) => Math.log10(Math.max(e.ms, 0.001)));
  const maxLog = Math.max(...logVals, 0.1);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      {entries.map((e, i) => {
        const logV = logVals[i];
        const pct = (logV / maxLog) * 100;
        const ratio = e.ms / Math.max(perf.bfs_avg_ms, 0.001);
        return (
          <div key={e.label} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm">
            <div>
              <span className="font-bold text-neutral-800">{e.label}</span>
              <p className="text-[10px] text-neutral-400 font-mono">{e.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-neutral-100 relative">
                <div
                  className="h-full rounded-lg transition-all"
                  style={{ width: `${Math.max(pct, 3)}%`, background: e.color }}
                />
                <span className="absolute right-2 top-0.5 text-[10px] text-neutral-500 font-medium">
                  {ratio >= 10 ? `${ratio.toFixed(0)}×` : ratio >= 2 ? `${ratio.toFixed(1)}×` : "base"}
                </span>
              </div>
            </div>
            <span className="font-mono text-sm font-bold tabular-nums text-right">{e.ms.toFixed(2)} ms</span>
          </div>
        );
      })}
      <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-3">
        Largura das barras em escala log₁₀(ms). O multiplicador mostra quantas vezes mais lento que BFS.
      </p>
    </div>
  );
}

// Feature 16: Complexity table
const COMPLEXITY_DATA = [
  {
    alg: "BFS",
    time: "O(V + E)",
    space: "O(V)",
    negWeights: false,
    cycleDetect: false,
    ideal: "Caminho mínimo por saltos, BFS multi-source",
    color: "bg-sky-50 border-sky-200",
  },
  {
    alg: "DFS",
    time: "O(V + E)",
    space: "O(V)",
    negWeights: false,
    cycleDetect: true,
    ideal: "Detecção de ciclos, ord. topológica, SCC",
    color: "bg-violet-50 border-violet-200",
  },
  {
    alg: "Dijkstra",
    time: "O((V+E) log V)",
    space: "O(V)",
    negWeights: false,
    cycleDetect: false,
    ideal: "Caminhos mínimos com pesos ≥ 0 (GPS, redes)",
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    alg: "Bellman-Ford",
    time: "O(V × E)",
    space: "O(V)",
    negWeights: true,
    cycleDetect: true,
    ideal: "Pesos negativos, detecção de ciclos negativos",
    color: "bg-orange-50 border-orange-200",
  },
];

function ComplexityTable({ perf }: { perf: Parte2Performance }) {
  const msMap: Record<string, number> = {
    "BFS": perf.bfs_avg_ms, "DFS": perf.dfs_avg_ms,
    "Dijkstra": perf.dijkstra_avg_ms, "Bellman-Ford": perf.bellman_ford_avg_ms,
  };
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="text-white">Algoritmo</th>
            <th className="text-white">Tempo</th>
            <th className="text-white">Espaço</th>
            <th className="text-white">Pesos neg.</th>
            <th className="text-white">Detecta ciclos</th>
            <th className="text-white">ms (neste dataset)</th>
            <th className="text-white">Caso de uso ideal</th>
          </tr>
        </thead>
        <tbody>
          {COMPLEXITY_DATA.map((row, i) => (
            <tr key={row.alg} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
              <td className="font-bold text-sm">{row.alg}</td>
              <td className="font-mono text-xs">{row.time}</td>
              <td className="font-mono text-xs">{row.space}</td>
              <td>
                <span className={`text-sm font-bold ${row.negWeights ? "text-green-600" : "text-red-500"}`}>
                  {row.negWeights ? "✓" : "✗"}
                </span>
              </td>
              <td>
                <span className={`text-sm font-bold ${row.cycleDetect ? "text-green-600" : "text-red-500"}`}>
                  {row.cycleDetect ? "✓" : "✗"}
                </span>
              </td>
              <td className="font-mono text-xs font-bold">{msMap[row.alg]?.toFixed(2)} ms</td>
              <td className="text-xs text-neutral-600 max-w-48">{row.ideal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Feature 17: Insights cards
function InsightsCards({ parte2 }: { parte2: Parte2Data }) {
  const { dataset, bfs_results, dfs_results, bellman_ford_results, performance_summary } = parte2;
  const bfsBest = bfs_results.reduce((best, r) => r.visited > best.visited ? r : best, bfs_results[0] ?? { visited: 0, max_layer: 0, source_genre: "" });
  const hasCycle = dfs_results.some((r) => r.has_cycle);
  const negPct = bellman_ford_results.negative_weight_case.pct_negative ?? 0;
  const bfRatio = performance_summary.bellman_ford_avg_ms / Math.max(performance_summary.bfs_avg_ms, 0.001);

  const insights = [
    {
      color: "border-sky-400",
      icon: "🌐",
      title: "Alta Conectividade",
      body: `BFS a partir do hub alcança ${formatNumber(bfsBest.visited)} nós (${((bfsBest.visited / dataset.nodes) * 100).toFixed(0)}% do grafo) em apenas ${bfsBest.max_layer} camadas. A rede Spotify é altamente conectada por gêneros similares.`,
    },
    {
      color: "border-amber-400",
      icon: "⚠️",
      title: "Dijkstra Falha Aqui",
      body: `${negPct.toFixed(0)}% das arestas do grafo mood têm pesos negativos (valence − energy < 0). Dijkstra não pode ser usado — Bellman-Ford é necessário para garantir o caminho mínimo correto.`,
    },
    {
      color: hasCycle ? "border-red-400" : "border-green-400",
      icon: hasCycle ? "🔄" : "✅",
      title: hasCycle ? "Ciclos Detectados (k-NN)" : "DAG Mood Sem Ciclos",
      body: hasCycle
        ? `DFS detectou back-edges no grafo k-NN de similaridade — como esperado, conexões simétricas de áudio formam ciclos. O grafo mood foi construído como DAG explícito para Bellman-Ford.`
        : `O grafo mood é um DAG por construção: arestas só vão de índice menor para maior. Isso garante que Bellman-Ford converge sem ciclos negativos.`,
    },
    {
      color: "border-orange-400",
      icon: "⚡",
      title: `Bellman-Ford é ${bfRatio.toFixed(0)}× mais lento`,
      body: `Com complexidade O(V×E), Bellman-Ford leva ${performance_summary.bellman_ford_avg_ms.toFixed(0)} ms vs ${performance_summary.bfs_avg_ms.toFixed(1)} ms do BFS. Para ${formatNumber(dataset.nodes)} nós e ${formatNumber(dataset.edges)} arestas, a diferença é de ${bfRatio.toFixed(0)} vezes.`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {insights.map((ins, i) => (
        <div key={i} className={`rounded-xl border-2 ${ins.color} bg-white p-5 space-y-2`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{ins.icon}</span>
            <p className="font-bold text-neutral-800">{ins.title}</p>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">{ins.body}</p>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Shared primitives
// ══════════════════════════════════════════════════════════════════════════

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-neutral-800 border-b-2 border-neutral-200 pb-2">
      {children}
    </h2>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "amber" }) {
  const cls = {
    green: "bg-green-100 text-green-700",
    red:   "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  }[color];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}
