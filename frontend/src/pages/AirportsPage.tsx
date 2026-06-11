import { useMemo, useState } from "react";

import type { Airport } from "../types";
import type { DataStatus } from "../lib/placeholderData";

import { EM_DASH, formatPercentMetric } from "../lib/format";
import { colorForRegion, REGION_COLORS } from "../lib/theme";
import { HUB_DEGREE_THRESHOLD } from "../lib/constants";

import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";
import { ChartCard, LegendDot } from "../components/charts/ChartCard";
import { Histogram } from "../components/charts/Histogram";
import { ScatterPlot, type ScatterPoint } from "../components/charts/ScatterPlot";
import { DonutChart, type DonutDatum } from "../components/charts/DonutChart";


interface Props {
  airports: Airport[];
  dataStatus: DataStatus;
}

type SortKey = "iata" | "city" | "degree" | "egoDensity" | "egoSize" | "egoOrder";


const HUB_THRESHOLD = HUB_DEGREE_THRESHOLD;


interface SortThProps {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDesc: boolean;
  onSort: (k: SortKey) => void;
  onToggle: () => void;
}

function SortTh({ label, k, sortKey, sortDesc, onSort, onToggle }: SortThProps) {
  const active = sortKey === k;
  return (
    <th
      className="cursor-pointer select-none hover:text-neutral-900"
      onClick={() => { if (active) onToggle(); else onSort(k); }}
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


export function AirportsPage({ airports, dataStatus }: Props) {
  const live = dataStatus === "live";


  const regions = useMemo(
    () => Array.from(new Set(airports.map((a) => a.region).filter(Boolean))).sort(),
    [airports],
  );
  const maxDegree  = useMemo(() => Math.max(...airports.map((a) => a.degree), 1), [airports]);
  const maxDensity = useMemo(() => Math.max(...airports.map((a) => a.egoDensity), 0.001), [airports]);


  const [query,        setQuery]        = useState("");
  const [region,       setRegion]       = useState("all");
  const [minDegree,    setMinDegree]    = useState(0);
  const [sortKey,      setSortKey]      = useState<SortKey>("degree");
  const [sortDesc,     setSortDesc]     = useState(true);
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


  const degreeValues = useMemo(() => filtered.map((a) => a.degree), [filtered]);

  const scatterPoints: ScatterPoint[] = useMemo(
    () =>
      filtered.map((a) => ({
        x: a.degree,
        y: a.egoDensity,
        label: a.iata,
        color: colorForRegion(a.region),
        sublabel: `${a.city || EM_DASH} · ${a.region || EM_DASH}`,
      })),
    [filtered],
  );

  const regionDonut: DonutDatum[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) if (a.region) counts[a.region] = (counts[a.region] ?? 0) + 1;
    return Object.entries(counts)
      .sort((x, y) => y[1] - x[1])
      .map(([region, count]) => ({ label: region, value: count, color: colorForRegion(region) }));
  }, [filtered]);


  function toggleRow(iata: string) {
    setExpandedIata((prev) => (prev === iata ? null : iata));
  }

  function selectNeighbor(iata: string) {
    setQuery(iata);
    setExpandedIata(iata);
  }


  return (
    <div className="space-y-4">
      <PageHeader title="Aeroportos" description="Lista completa com métricas de grau e ego-rede. Clique numa linha para ver os vizinhos." />


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


      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortTh label="IATA"          k="iata"       sortKey={sortKey} sortDesc={sortDesc} onSort={setSortKey} onToggle={() => setSortDesc((d) => !d)} />
              <SortTh label="Cidade"        k="city"       sortKey={sortKey} sortDesc={sortDesc} onSort={setSortKey} onToggle={() => setSortDesc((d) => !d)} />
              <th>Região</th>
              <SortTh label="Grau"          k="degree"     sortKey={sortKey} sortDesc={sortDesc} onSort={setSortKey} onToggle={() => setSortDesc((d) => !d)} />
              <SortTh label="Ordem ego"     k="egoOrder"   sortKey={sortKey} sortDesc={sortDesc} onSort={setSortKey} onToggle={() => setSortDesc((d) => !d)} />
              <SortTh label="Tamanho ego"   k="egoSize"    sortKey={sortKey} sortDesc={sortDesc} onSort={setSortKey} onToggle={() => setSortDesc((d) => !d)} />
              <SortTh label="Densidade ego" k="egoDensity" sortKey={sortKey} sortDesc={sortDesc} onSort={setSortKey} onToggle={() => setSortDesc((d) => !d)} />
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

                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold">{a.iata}</span>
                        {isHub && (
                          <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">hub</span>
                        )}
                      </div>
                    </td>

                    <td className="text-neutral-700">{a.city || EM_DASH}</td>


                    <td>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ background: regionColor }} />
                        {a.region || EM_DASH}
                      </span>
                    </td>


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


      <section className="space-y-4 pt-2">
        <div>
          <h3 className="text-base font-bold text-neutral-800">Análise do conjunto filtrado</h3>
          <p className="mt-0.5 text-sm text-neutral-600">
            Os gráficos abaixo recalculam em tempo real conforme você ajusta a busca, a região e o
            grau mínimo — sempre refletindo exatamente os {filtered.length} aeroportos visíveis na
            tabela.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Distribuição de grau"
            description="Quantos aeroportos caem em cada faixa de grau (número de conexões diretas). Barra laranja = faixa mais comum; linha tracejada = grau médio do conjunto."
          >
            <Histogram values={degreeValues} bins={10} xLabel="Grau (conexões)" />
          </ChartCard>

          <ChartCard
            title="Grau × densidade da ego-rede"
            description="Cada ponto é um aeroporto. Eixo X = grau; eixo Y = densidade da vizinhança. Hubs ficam à direita; aeroportos com vizinhança muito interligada ficam no topo. Cor por região."
            legend={regionDonut.map((d) => (
              <LegendDot key={d.label} color={d.color ?? "#94a3b8"}>{d.label}</LegendDot>
            ))}
          >
            <ScatterPlot
              points={scatterPoints}
              xLabel="Grau"
              yLabel="Densidade ego"
              yFormatter={(v) => `${Math.round(v * 100)}%`}
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Composição por região"
          description="Proporção dos aeroportos filtrados em cada região do país. Útil para ver se um filtro está concentrado numa região específica."
        >
          <DonutChart
            data={regionDonut}
            centerLabel="aeroportos"
            centerValue={String(filtered.length)}
          />
        </ChartCard>
      </section>
    </div>
  );
}
