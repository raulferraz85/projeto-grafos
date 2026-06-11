import { useMemo, useState } from "react";
import type { AppData, Route } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatNumber } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";
import { formatDuration } from "../lib/dijkstra";
import { ChartCard } from "../components/charts/ChartCard";
import { Histogram } from "../components/charts/Histogram";
import { BarChart, type BarDatum } from "../components/charts/BarChart";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

const MANDATORY = new Set(["REC-POA", "MAO-GRU"]);

function routeKey(r: Route) {
  return `${r.origin}-${r.destination}`;
}

export function RoutesPage({ data, dataStatus }: Props) {
  const { routes, airports } = data;
  const live = dataStatus === "live";

  const airportByIata = useMemo(
    () => Object.fromEntries(airports.map((a) => [a.iata, a])),
    [airports],
  );
  const cityFor = (iata: string) => airportByIata[iata]?.city ?? iata;

  const edgeLookup = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of data.edges) {
      m[`${e.source}-${e.target}`] = e.weight;
      m[`${e.target}-${e.source}`] = e.weight;
    }
    return m;
  }, [data.edges]);

  const [selectedKey, setSelectedKey] = useState<string>(
    routes[0] ? routeKey(routes[0]) : "",
  );
  const [filter, setFilter] = useState("");

  const selected = routes.find((r) => routeKey(r) === selectedKey) ?? null;

  const filtered = useMemo(
    () =>
      routes.filter((r) => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q) ||
          cityFor(r.origin).toLowerCase().includes(q) ||
          cityFor(r.destination).toLowerCase().includes(q)
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routes, filter, airportByIata],
  );

  // ── Dados dos gráficos (reagem ao filtro de busca) ────────────────────────
  const reachable = useMemo(() => filtered.filter((r) => r.reachable), [filtered]);
  const durationValues = useMemo(() => reachable.map((r) => r.cost), [reachable]);
  const hopsBars: BarDatum[] = useMemo(() => {
    const m: Record<number, number> = {};
    for (const r of reachable) m[r.hops] = (m[r.hops] ?? 0) + 1;
    return Object.keys(m)
      .map(Number)
      .sort((a, b) => a - b)
      .map((h) => ({ label: `${h} salto${h !== 1 ? "s" : ""}`, value: m[h] }));
  }, [reachable]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rotas"
        description="Caminhos mínimos pré-calculados com Dijkstra. Para pesquisar qualquer par, use a aba Grafo."
      />

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
              <Chip label="Duração"     value={selected.reachable ? formatDuration(selected.cost) : EM_DASH} />
              <Chip label="Saltos"      value={selected.reachable ? String(selected.hops) : EM_DASH} />
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
        placeholder="Filtrar por IATA ou cidade…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        disabled={!live}
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
                Execute <code className="rounded bg-neutral-100 px-1 text-xs">make pipeline</code>.
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
                    className={`cursor-pointer transition-colors ${active ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
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
                        <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">✦</span>
                      )}
                    </td>
                    <td className="font-mono">{r.reachable ? formatDuration(r.cost) : EM_DASH}</td>
                    <td className="text-neutral-600">{r.reachable ? formatNumber(r.hops, 0) : EM_DASH}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Análise visual das rotas filtradas ───────────────────────────── */}
      {live && (
        <section className="space-y-4 pt-2">
          <div>
            <h3 className="text-base font-bold text-neutral-800">Análise das rotas</h3>
            <p className="mt-0.5 text-sm text-neutral-600">
              Os gráficos refletem as {reachable.length} rotas alcançáveis exibidas na tabela e
              recalculam conforme você filtra por IATA ou cidade.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Distribuição de duração"
              description="Quantas rotas caem em cada faixa de tempo total de voo (em minutos). Barra laranja = faixa mais comum; linha tracejada = duração média."
            >
              <Histogram
                values={durationValues}
                bins={10}
                xLabel="Duração (min)"
                valueFormatter={(v) => `${Math.round(v)}`}
              />
            </ChartCard>

            <ChartCard
              title="Distribuição de saltos"
              description="Número de rotas por quantidade de escalas. Caminhos mínimos com poucos saltos indicam uma malha bem conectada por hubs."
            >
              <BarChart
                data={hopsBars}
                orientation="vertical"
                valueName="rotas"
                color="#38bdf8"
                height={240}
              />
            </ChartCard>
          </div>
        </section>
      )}

      <p className="text-xs text-neutral-400">
        ✦ Rotas obrigatórias do enunciado · Para pesquisar qualquer par dinamicamente, use a aba <strong>Grafo</strong>.
      </p>
    </div>
  );
}

// ── PathGraph ─────────────────────────────────────────────────────────────────
function PathGraph({
  path, cityFor, edgeLookup,
}: {
  path: string[];
  cityFor: (i: string) => string;
  edgeLookup: Record<string, number>;
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center">
        {path.map((iata, i) => {
          const isFirst = i === 0;
          const isLast  = i === path.length - 1;
          const weight  = i < path.length - 1 ? edgeLookup[`${iata}-${path[i + 1]}`] : undefined;
          return (
            <div key={`${iata}-${i}`} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full font-mono text-sm font-bold text-white shadow-sm ${
                  isFirst ? "bg-blue-500" : isLast ? "bg-orange-500" : "bg-neutral-500"
                }`}>
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
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />Origem</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-500" />Escala</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />Destino</span>
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
