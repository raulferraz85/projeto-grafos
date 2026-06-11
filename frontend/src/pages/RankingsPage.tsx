import { useMemo, useState } from "react";
import type { Airport, RankItem, Rankings } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatMetric, formatPercentMetric } from "../lib/format";
import { colorForRegion, REGION_COLORS } from "../lib/theme";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";
import { Tabs } from "../components/ui/Tabs";
import { StatCard, type Accent } from "../components/ui/Card";
import { ChartCard, LegendDot } from "../components/charts/ChartCard";
import { BarChart, type BarDatum } from "../components/charts/BarChart";

interface Props {
  rankings: Rankings;
  airports: Airport[];
  dataStatus: DataStatus;
}

type Tab = "connected" | "density" | "ego";

const TABS = [
  { id: "connected" as const, label: "Mais conectados" },
  { id: "density" as const,   label: "Maior densidade local" },
  { id: "ego" as const,       label: "Maior ego-rede" },
];

const TAB_ACCENT: Record<Tab, Accent> = {
  connected: "sky",
  density:   "emerald",
  ego:       "violet",
};

const MAX_DEGREE = 43; // grau máximo do grafo (BEL)

export function RankingsPage({ rankings, airports, dataStatus }: Props) {
  const [tab, setTab]           = useState<Tab>("connected");
  const [minDegree, setMinDegree] = useState(0);
  const empty = dataStatus !== "live";

  // Recomputa o ranking dinamicamente a partir da lista completa de aeroportos.
  // O filtro de grau mínimo só se aplica na aba "density".
  const items: RankItem[] = useMemo(() => {
    if (empty) return [];

    const filtered =
      tab === "density"
        ? airports.filter((a) => a.degree >= minDegree)
        : airports;

    const sorted =
      tab === "connected"
        ? [...filtered].sort((a, b) => b.degree - a.degree)
        : tab === "density"
          ? [...filtered].sort((a, b) => b.egoDensity - a.egoDensity)
          : [...filtered].sort((a, b) => b.egoSize - a.egoSize);

    return sorted.slice(0, 10).map((a) => ({
      iata:   a.iata,
      city:   a.city,
      region: a.region,
      value:
        tab === "connected"
          ? a.degree
          : tab === "density"
            ? a.egoDensity
            : a.egoSize,
    }));
  }, [airports, tab, minDegree, empty]);

  const formatValue = (v: number) =>
    tab === "density" ? formatPercentMetric(v, 1) : formatMetric(v);

  const visibleCount = empty ? 0 : airports.filter((a) => a.degree >= minDegree).length;

  // Dados do gráfico — barras horizontais coloridas por região.
  // Recharts posiciona o primeiro item no topo, então mantemos a ordem do ranking (#1 no topo).
  const chartData: BarDatum[] = useMemo(
    () =>
      items.map((it) => ({
        label: it.iata,
        value: it.value,
        color: colorForRegion(it.region),
        sublabel: `${it.city || EM_DASH} · ${it.region || EM_DASH}`,
      })),
    [items],
  );

  // Regiões realmente presentes no top-10 atual (para a legenda do gráfico).
  const chartRegions = useMemo(
    () => Array.from(new Set(items.map((i) => i.region).filter(Boolean))),
    [items],
  );

  const TAB_META = {
    connected: { label: "mais conectado",  unit: (v: number) => `grau ${formatMetric(v)}`, valueName: "grau", chartFmt: (v: number) => formatMetric(v) },
    density:   { label: "maior densidade", unit: (v: number) => formatPercentMetric(v, 1), valueName: "densidade", chartFmt: (v: number) => formatPercentMetric(v, 1) },
    ego:       { label: "maior ego-rede",  unit: (v: number) => `${formatMetric(v)} nós`,  valueName: "tamanho ego", chartFmt: (v: number) => formatMetric(v) },
  } as const;
  const card1 = items[0] ?? null;
  const card2 = items[1] ?? null;
  const accent = TAB_ACCENT[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rankings"
        description="Aeroportos com maior grau, densidade da ego-rede e tamanho da ego-rede."
      />

      {/* Highlight cards — sempre no formato da aba ativa */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          accent={accent}
          label={`1º ${TAB_META[tab].label}`}
          value={empty || !card1 ? EM_DASH : card1.iata}
          sub={empty || !card1 ? EM_DASH : `${card1.city} · ${TAB_META[tab].unit(card1.value)}`}
        />
        <StatCard
          accent="slate"
          label={`2º ${TAB_META[tab].label}`}
          value={empty || !card2 ? EM_DASH : card2.iata}
          sub={empty || !card2 ? EM_DASH : `${card2.city} · ${TAB_META[tab].unit(card2.value)}`}
        />
      </div>

      {/* Tabs (filtro de categoria) */}
      <Tabs items={TABS} active={tab} onChange={setTab} />

      {/* Degree threshold filter — só aparece na aba de densidade */}
      {tab === "density" && <div className="rounded-xl border-2 border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700">
            Limiar de grau mínimo
            <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 font-mono text-sm font-semibold text-neutral-900">
              ≥ {minDegree}
            </span>
          </label>
          <span className="text-xs text-neutral-500">
            {visibleCount} de {airports.length} aeroportos
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={MAX_DEGREE}
          step={1}
          value={minDegree}
          onChange={(e) => setMinDegree(Number(e.target.value))}
          className="w-full accent-neutral-900"
        />
        <div className="mt-1 flex justify-between text-xs text-neutral-400">
          <span>0 — todos os aeroportos</span>
          <span>{MAX_DEGREE} — apenas BEL</span>
        </div>

        {minDegree < 4 && (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <strong>Nota:</strong> aeroportos com grau ≤ 3 frequentemente exibem densidade ego de 100%
            porque seus poucos vizinhos são hubs nacionais já interligados entre si — formando
            triângulos completos. Aumente o limiar para ver aeroportos com densidade genuinamente alta.
          </p>
        )}
      </div>}

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>IATA</th>
              <th>Cidade</th>
              <th>Região</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyTableRow colSpan={5}>
                {empty
                  ? <>Rankings indisponíveis até gerar <code className="rounded bg-neutral-100 px-1 text-xs">out/ego_aeroportos.csv</code>.</>
                  : `Nenhum aeroporto com grau ≥ ${minDegree}.`}
              </EmptyTableRow>
            ) : (
              items.map((item, idx) => (
                <tr key={item.iata}>
                  <td className="text-neutral-500">{idx + 1}</td>
                  <td className="font-mono font-medium">{item.iata}</td>
                  <td>{item.city || EM_DASH}</td>
                  <td>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: colorForRegion(item.region) }}
                      />
                      {item.region || EM_DASH}
                    </span>
                  </td>
                  <td className="font-mono">{formatValue(item.value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Gráfico descritivo e dinâmico — reage à aba e ao slider */}
      <ChartCard
        title={`Top ${items.length || 10} — ${TAB_META[tab].label}`}
        description={
          tab === "density"
            ? `Comparação visual do top-10 por densidade ego (grau ≥ ${minDegree}). Cor por região; linha tracejada = média do top-10.`
            : "Comparação visual do top-10 da categoria selecionada. Cor por região; linha tracejada = média do top-10."
        }
        legend={chartRegions.map((r) => (
          <LegendDot key={r} color={REGION_COLORS[r] ?? "#94a3b8"}>{r}</LegendDot>
        ))}
      >
        <BarChart
          data={chartData}
          orientation="horizontal"
          valueFormatter={TAB_META[tab].chartFmt}
          valueName={TAB_META[tab].valueName}
          meanLine
          height={Math.max(220, chartData.length * 30)}
          emptyMessage={empty ? "Gere os dados para visualizar o ranking." : "Nenhum aeroporto para os filtros atuais."}
        />
      </ChartCard>
    </div>
  );
}
