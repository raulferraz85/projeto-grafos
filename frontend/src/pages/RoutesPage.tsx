import { useMemo, useState } from "react";
import type { AppData, Edge, Route } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatNumber } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";
import { AirportSearch } from "../components/AirportSearch";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

type Tab = "search" | "calculated";

const MANDATORY = new Set(["REC-POA", "MAO-GRU"]);

function routeKey(r: Route) {
  return `${r.origin}-${r.destination}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ── Dijkstra (TypeScript, frontend) ───────────────────────────────────────────
function runDijkstra(
  edges: Edge[],
  allIatas: string[],
  source: string,
  target: string,
): { path: string[]; cost: number } | null {
  if (source === target) return { path: [source], cost: 0 };

  const adj: Record<string, { node: string; weight: number }[]> = {};
  for (const iata of allIatas) adj[iata] = [];
  for (const e of edges) {
    adj[e.source]?.push({ node: e.target, weight: e.weight });
    adj[e.target]?.push({ node: e.source, weight: e.weight });
  }

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  for (const iata of allIatas) { dist[iata] = Infinity; prev[iata] = null; }
  dist[source] = 0;

  const visited = new Set<string>();
  // Priority queue simples — 128 nós, instantâneo
  const pq: [number, string][] = [[0, source]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === target) break;
    for (const { node: v, weight } of adj[u] ?? []) {
      if (visited.has(v)) continue;
      const alt = d + weight;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push([alt, v]);
      }
    }
  }

  if (!isFinite(dist[target])) return null;

  const path: string[] = [];
  let curr: string | null = target;
  while (curr) { path.unshift(curr); curr = prev[curr]; }
  return { path, cost: dist[target] };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function RoutesPage({ data, dataStatus }: Props) {
  const { routes, airports, edges } = data;
  const live = dataStatus === "live";

  const airportByIata = useMemo(
    () => Object.fromEntries(airports.map((a) => [a.iata, a])),
    [airports],
  );
  const cityFor = (iata: string) => airportByIata[iata]?.city ?? iata;

  const edgeLookup = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of edges) {
      m[`${e.source}-${e.target}`] = e.weight;
      m[`${e.target}-${e.source}`] = e.weight;
    }
    return m;
  }, [edges]);

  const [tab, setTab] = useState<Tab>("search");

  // ── Search tab state ─────────────────────────────────────────────
  const [searchOrigin, setSearchOrigin] = useState(airports[0]?.iata ?? "");
  const [searchDest,   setSearchDest]   = useState(airports[1]?.iata ?? "");
  const [searchResult, setSearchResult] = useState<{
    path: string[];
    cost: number;
  } | null>(null);
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    const result = runDijkstra(edges, airports.map((a) => a.iata), searchOrigin, searchDest);
    setSearchResult(result);
    setSearched(true);
  }

  // ── Calculated tab state ─────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string>(
    routes[0] ? routeKey(routes[0]) : "",
  );
  const [filter, setFilter] = useState("");

  const selected = routes.find((r) => routeKey(r) === selectedKey) ?? null;
  const filtered = routes.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      r.origin.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      airportByIata[r.origin]?.city.toLowerCase().includes(q) ||
      airportByIata[r.destination]?.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rotas"
        description="Caminhos mínimos calculados com Dijkstra entre pares de aeroportos."
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        {(
          [
            { id: "search" as Tab,     label: "Pesquisar rota" },
            { id: "calculated" as Tab, label: "Rotas calculadas" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SEARCH TAB ───────────────────────────────────────────── */}
      {tab === "search" && (
        <div className="space-y-5">
          {!live && (
            <p className="text-sm text-neutral-500">
              Execute <code className="rounded bg-neutral-100 px-1 text-xs">make pipeline</code> para
              carregar o grafo completo.
            </p>
          )}

          {/* Airport search inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <AirportSearch
              airports={airports}
              value={searchOrigin}
              onChange={(iata) => { setSearchOrigin(iata); setSearched(false); }}
              label="Origem"
              exclude={searchDest}
            />
            <AirportSearch
              airports={airports}
              value={searchDest}
              onChange={(iata) => { setSearchDest(iata); setSearched(false); }}
              label="Destino"
              exclude={searchOrigin}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={!live || searchOrigin === searchDest}
            className="btn-primary disabled:opacity-40"
          >
            Calcular caminho mínimo
          </button>

          {/* Result */}
          {searched && (
            <div className="card space-y-4">
              {searchResult ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-semibold">{searchOrigin}</span>
                        <span className="text-neutral-400">→</span>
                        <span className="font-mono text-lg font-semibold">{searchDest}</span>
                      </div>
                      <p className="text-sm text-neutral-500">
                        {cityFor(searchOrigin)} → {cityFor(searchDest)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Chip label="Duração"    value={formatDuration(searchResult.cost)} />
                      <Chip label="Saltos"     value={String(searchResult.path.length - 1)} />
                      <Chip label="Aeroportos" value={String(searchResult.path.length)} />
                    </div>
                  </div>
                  <PathGraph
                    path={searchResult.path}
                    cityFor={cityFor}
                    edgeLookup={edgeLookup}
                  />
                  <p className="text-xs text-neutral-400">
                    Algoritmo: Dijkstra · Pesos = duração estimada do voo em minutos
                  </p>
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  Nenhum caminho encontrado entre {searchOrigin} e {searchDest}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CALCULATED TAB ───────────────────────────────────────── */}
      {tab === "calculated" && (
        <div className="space-y-5">
          {/* Detail card */}
          {selected && live && (
            <div className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold">{selected.origin}</span>
                    <span className="text-neutral-400">→</span>
                    <span className="font-mono text-lg font-semibold">{selected.destination}</span>
                    {MANDATORY.has(routeKey(selected)) && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Obrigatória
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500">
                    {cityFor(selected.origin)} → {cityFor(selected.destination)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Chip label="Duração"    value={selected.reachable ? formatDuration(selected.cost) : EM_DASH} />
                  <Chip label="Saltos"     value={selected.reachable ? String(selected.hops) : EM_DASH} />
                  <Chip label="Aeroportos" value={selected.reachable ? String(selected.path.length) : EM_DASH} />
                </div>
              </div>

              {selected.path.length > 0 ? (
                <PathGraph path={selected.path} cityFor={cityFor} edgeLookup={edgeLookup} />
              ) : (
                <p className="text-sm text-neutral-500">Caminho indisponível.</p>
              )}
            </div>
          )}

          {/* Search filter */}
          <input
            className="input"
            placeholder="Buscar por IATA ou cidade…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          {/* Table */}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Caminho</th>
                  <th>Duração</th>
                  <th>Saltos</th>
                </tr>
              </thead>
              <tbody>
                {!live ? (
                  <EmptyTableRow colSpan={5}>
                    Execute{" "}
                    <code className="rounded bg-neutral-100 px-1 text-xs">make pipeline</code>.
                  </EmptyTableRow>
                ) : filtered.length === 0 ? (
                  <EmptyTableRow colSpan={5}>Nenhuma rota encontrada.</EmptyTableRow>
                ) : (
                  filtered.map((r) => {
                    const key = routeKey(r);
                    const active = key === selectedKey;
                    return (
                      <tr
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={`cursor-pointer transition-colors ${
                          active ? "bg-neutral-100" : "hover:bg-neutral-50"
                        }`}
                      >
                        <td>
                          <span className="font-mono font-semibold">{r.origin}</span>
                          <span className="block text-xs text-neutral-400">{cityFor(r.origin)}</span>
                        </td>
                        <td>
                          <span className="font-mono font-semibold">{r.destination}</span>
                          <span className="block text-xs text-neutral-400">{cityFor(r.destination)}</span>
                        </td>
                        <td className="max-w-xs">
                          <span className="text-neutral-600">
                            {r.path.length > 0 ? r.path.join(" → ") : EM_DASH}
                          </span>
                          {MANDATORY.has(key) && (
                            <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                              ✦
                            </span>
                          )}
                        </td>
                        <td className="font-mono">
                          {r.reachable ? formatDuration(r.cost) : EM_DASH}
                        </td>
                        <td className="text-neutral-600">
                          {r.reachable ? formatNumber(r.hops, 0) : EM_DASH}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-neutral-400">
            ✦ Rotas obrigatórias do enunciado (Recife → Porto Alegre e Manaus → São Paulo).
          </p>
        </div>
      )}
    </div>
  );
}

// ── PathGraph ─────────────────────────────────────────────────────────────────
function PathGraph({
  path,
  cityFor,
  edgeLookup,
}: {
  path: string[];
  cityFor: (iata: string) => string;
  edgeLookup: Record<string, number>;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center">
        {path.map((iata, i) => {
          const isFirst = i === 0;
          const isLast  = i === path.length - 1;
          const weight  = i < path.length - 1
            ? edgeLookup[`${iata}-${path[i + 1]}`]
            : undefined;

          return (
            <div key={`${iata}-${i}`} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full font-mono text-sm font-bold text-white shadow-sm ${
                    isFirst ? "bg-blue-500" : isLast ? "bg-orange-500" : "bg-neutral-500"
                  }`}
                >
                  {iata}
                </div>
                <span className="mt-1 max-w-[72px] text-center text-xs leading-tight text-neutral-500">
                  {cityFor(iata)}
                </span>
              </div>

              {!isLast && (
                <div className="mx-2 flex min-w-[80px] flex-col items-center">
                  <span className="mb-1 text-xs text-neutral-400">
                    {weight !== undefined ? formatDuration(weight) : ""}
                  </span>
                  <div className="flex w-full items-center">
                    <div className="h-px flex-1 bg-neutral-300" />
                    <span className="text-xs text-neutral-300">▶</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />Origem
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-500" />Escala
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />Destino
        </span>
      </div>
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-center">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
