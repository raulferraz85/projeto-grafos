import { useMemo, useState } from "react";
import type { Airport } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatPercentMetric } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";

interface Props {
  airports: Airport[];
  dataStatus: DataStatus;
}

type SortKey = "iata" | "city" | "degree" | "egoDensity" | "egoSize" | "egoOrder";

const REGION_COLORS: Record<string, string> = {
  Norte:          "#22c55e",
  Nordeste:       "#f97316",
  Sudeste:        "#38bdf8",
  Sul:            "#a78bfa",
  "Centro-Oeste": "#facc15",
};

const HUB_THRESHOLD = 20;

export function AirportsPage({ airports, dataStatus }: Props) {
  const live = dataStatus === "live";

  const regions = useMemo(
    () => Array.from(new Set(airports.map((a) => a.region).filter(Boolean))).sort(),
    [airports],
  );
  const maxDegree  = useMemo(() => Math.max(...airports.map((a) => a.degree), 1), [airports]);
  const maxDensity = useMemo(() => Math.max(...airports.map((a) => a.egoDensity), 0.001), [airports]);

  const [query,      setQuery]      = useState("");
  const [region,     setRegion]     = useState("all");
  const [minDegree,  setMinDegree]  = useState(0);
  const [sortKey,    setSortKey]    = useState<SortKey>("degree");
  const [sortDesc,   setSortDesc]   = useState(true);
  const [expandedIata, setExpandedIata] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return airports
      .filter((a) => {
        if (region !== "all" && a.region !== region) return false;
        if (a.degree < minDegree) return false;
        if (!q) return true;
        return (
          a.iata.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const va = a[sortKey as keyof Airport];
        const vb = b[sortKey as keyof Airport];
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb));
        return sortDesc ? -cmp : cmp;
      });
  }, [airports, query, region, minDegree, sortKey, sortDesc]);

  const avgDegree  = filtered.length > 0 ? filtered.reduce((s, a) => s + a.degree, 0)     / filtered.length : 0;
  const avgDensity = filtered.length > 0 ? filtered.reduce((s, a) => s + a.egoDensity, 0) / filtered.length : 0;

  function toggleRow(iata: string) {
    setExpandedIata((prev) => (prev === iata ? null : iata));
  }

  function selectNeighbor(iata: string) {
    setQuery(iata);
    setExpandedIata(iata);
  }

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="cursor-pointer select-none hover:text-neutral-900"
        onClick={() => { if (active) setSortDesc((d) => !d); else { setSortKey(k); setSortDesc(true); } }}
      >
        <span className="flex items-center gap-1">
          {label}
          <span className={`text-[10px] ${active ? "text-neutral-700" : "text-neutral-300"}`}>
            {active ? (sortDesc ? "↓" : "↑") : "↕"}
          </span>
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Aeroportos" description="Lista completa com métricas de grau e ego-rede. Clique numa linha para ver os vizinhos." />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-[200px] flex-1"
          placeholder="Buscar IATA, cidade ou região…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setExpandedIata(null); }}
          disabled={airports.length === 0}
        />
        <select
          className="input w-auto"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={airports.length === 0}
        >
          <option value="all">Todas as regiões</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Degree slider */}
      <div className="flex items-center gap-3 text-sm text-neutral-600">
        <span className="whitespace-nowrap">Grau mínimo:</span>
        <span className="w-6 font-mono font-semibold text-neutral-900">{minDegree}</span>
        <input
          type="range" min={0} max={maxDegree} value={minDegree}
          onChange={(e) => setMinDegree(Number(e.target.value))}
          className="flex-1 accent-neutral-900"
          disabled={airports.length === 0}
        />
        <span className="whitespace-nowrap text-xs text-neutral-400">{maxDegree} máx</span>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="font-medium text-neutral-700">
          {airports.length === 0 ? EM_DASH : filtered.length} aeroportos
        </span>
        {live && filtered.length > 0 && (
          <>
            <span>Grau médio: <strong className="text-neutral-700">{avgDegree.toFixed(1)}</strong></span>
            <span>Densidade ego média: <strong className="text-neutral-700">{formatPercentMetric(avgDensity, 1)}</strong></span>
            <span>Hubs (grau ≥ {HUB_THRESHOLD}): <strong className="text-neutral-700">{filtered.filter((a) => a.degree >= HUB_THRESHOLD).length}</strong></span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortTh label="IATA"         k="iata" />
              <SortTh label="Cidade"       k="city" />
              <th>Região</th>
              <SortTh label="Grau"         k="degree" />
              <SortTh label="Ordem ego"    k="egoOrder" />
              <SortTh label="Tamanho ego"  k="egoSize" />
              <SortTh label="Densidade ego" k="egoDensity" />
            </tr>
          </thead>
          <tbody>
            {airports.length === 0 ? (
              <EmptyTableRow colSpan={7}>
                Nenhum aeroporto. Execute <code className="rounded bg-neutral-100 px-1 text-xs">make pipeline</code>.
              </EmptyTableRow>
            ) : filtered.length === 0 ? (
              <EmptyTableRow colSpan={7}>Nenhum aeroporto corresponde aos filtros.</EmptyTableRow>
            ) : (
              filtered.flatMap((a) => {
                const isExpanded = expandedIata === a.iata;
                const isHub = a.degree >= HUB_THRESHOLD;
                const regionColor = REGION_COLORS[a.region] ?? "#94a3b8";
                const ego = !live && a.egoOrder === 0;

                return [
                  <tr
                    key={a.iata}
                    onClick={() => toggleRow(a.iata)}
                    className={`cursor-pointer transition-colors ${isExpanded ? "bg-neutral-50" : "hover:bg-neutral-50"}`}
                  >
                    {/* IATA + hub badge */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold">{a.iata}</span>
                        {isHub && (
                          <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">hub</span>
                        )}
                      </div>
                    </td>

                    <td className="text-neutral-700">{a.city || EM_DASH}</td>

                    {/* Região + dot */}
                    <td>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: regionColor }} />
                        {a.region || EM_DASH}
                      </span>
                    </td>

                    {/* Grau + mini-bar */}
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="w-7 font-mono text-sm">{a.degree}</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-700"
                            style={{ width: `${(a.degree / maxDegree) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="font-mono text-sm">{ego ? EM_DASH : a.egoOrder}</td>
                    <td className="font-mono text-sm">{ego ? EM_DASH : a.egoSize}</td>

                    {/* Densidade ego + mini-bar */}
                    <td>
                      {ego ? EM_DASH : (
                        <div className="flex items-center gap-2">
                          <span className="w-12 font-mono text-sm">{formatPercentMetric(a.egoDensity, 1)}</span>
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full bg-neutral-400"
                              style={{ width: `${(a.egoDensity / maxDensity) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>,

                  /* Expanded neighbors row */
                  isExpanded && (
                    <tr key={`${a.iata}-detail`} className="bg-neutral-50">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 whitespace-nowrap text-xs font-medium text-neutral-500">
                            {a.neighbors.length} vizinhos:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {a.neighbors.length === 0 ? (
                              <span className="text-xs text-neutral-400">—</span>
                            ) : (
                              a.neighbors.map((n) => (
                                <button
                                  key={n}
                                  onClick={(e) => { e.stopPropagation(); selectNeighbor(n); }}
                                  className="rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono text-xs text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-100"
                                >
                                  {n}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean);
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
