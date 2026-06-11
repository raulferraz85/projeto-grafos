import { useMemo } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatNumber, formatPercentMetric } from "../lib/format";
import { colorForRegion, EDGE_COLORS } from "../lib/theme";
import { CONNECTION_TYPE_LABELS } from "../lib/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlaneUp, faLocationDot, faLink } from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";
import { ChartCard } from "../components/charts/ChartCard";
import { DonutChart, type DonutDatum } from "../components/charts/DonutChart";
import { BarChart, type BarDatum } from "../components/charts/BarChart";


function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}


function InsightChip({
  icon,
  label,
  value,
  sub,
}: {
  icon: IconDefinition;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card flex items-start gap-3">
      <FontAwesomeIcon icon={icon} className="text-lg text-neutral-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="mt-0.5 font-mono font-semibold">{value}</p>
        <p className="text-xs text-neutral-500">{sub}</p>
      </div>
    </div>
  );
}


interface Props {
  data: AppData;
  dataStatus: DataStatus;
}


export function OverviewPage({ data, dataStatus }: Props) {
  const { global, regions, stats, rankings } = data;
  const live = dataStatus === "live";

  const formatMetric = (n: number, pct = false) =>
    live || n > 0
      ? pct ? formatPercentMetric(n, 2) : formatNumber(n)
      : EM_DASH;


  const topRegion = live && regions.length > 0
    ? [...regions].sort((a, b) => b.density - a.density)[0]
    : null;

  const TYPE_LABEL = CONNECTION_TYPE_LABELS;


  const maxDensity = Math.max(...regions.map((r) => r.density), 0.001);


  const connectionDonut: DonutDatum[] = useMemo(
    () =>
      stats.connectionTypes.map((t) => ({
        label: TYPE_LABEL[t.type] ?? t.type,
        value: t.count,
        color: EDGE_COLORS[t.type] ?? "#94a3b8",
      })),

    [stats.connectionTypes],
  );

  const regionDensityBars: BarDatum[] = useMemo(
    () =>
      [...regions]
        .sort((a, b) => b.density - a.density)
        .map((r) => ({
          label: r.region,
          value: r.density,
          color: colorForRegion(r.region),
          sublabel: `${formatNumber(r.order)} aeroportos · ${formatNumber(r.size)} arestas`,
        })),
    [regions],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Métricas globais da malha aérea e distribuição por região."
      />


      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ordem"     value={formatMetric(global.order)} />
        <StatCard label="Tamanho"   value={formatMetric(global.size)} />
        <StatCard label="Densidade" value={formatMetric(global.density, true)} />
        <StatCard label="Pares testados" value={formatMetric(stats.routeCount)} />
      </div>


      {live && (
        <div className="grid gap-3 sm:grid-cols-3">
          <InsightChip
            icon={faPlaneUp}
            label="Hub mais conectado"
            value={rankings.mostConnected.iata}
            sub={`grau ${rankings.mostConnected.value}`}
          />
          {topRegion && (
            <InsightChip
              icon={faLocationDot}
              label="Região mais densa"
              value={topRegion.region}
              sub={formatPercentMetric(topRegion.density, 1)}
            />
          )}
          <InsightChip
            icon={faLink}
            label="Tipo de conexão dominante"
            value={TYPE_LABEL["hub_regional"] ?? "Hub regional"}
            sub={`${stats.connectionTypes.find((t) => t.type === "hub_regional")?.count ?? 0} arestas`}
          />
        </div>
      )}


      <div>
        <h3 className="text-base font-bold text-neutral-800">Métricas por região</h3>
        <p className="mt-0.5 mb-3 text-sm text-neutral-600">
          Ordem (nº de aeroportos), tamanho (nº de arestas) e densidade de cada sub-rede regional.
          A barra mostra a densidade relativa à região mais densa. Total:{" "}
          {formatMetric(stats.airportCount)} aeroportos · {formatMetric(stats.edgeCount)} conexões ·{" "}
          {formatMetric(stats.regionCount)} regiões.
        </p>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Região</th>
                <th>Aeroportos</th>
                <th>Arestas</th>
                <th>Densidade</th>
                <th className="w-32">Densidade relativa</th>
              </tr>
            </thead>
            <tbody>
              {regions.length === 0 ? (
                <EmptyTableRow colSpan={5}>
                  Nenhuma métrica regional disponível. Execute{" "}
                  <code className="rounded bg-neutral-100 px-1 text-xs">make pipeline</code>{" "}
                  na raiz do projeto.
                </EmptyTableRow>
              ) : (
                regions.map((r) => (
                  <tr key={r.region}>
                    <td className="font-medium">{r.region}</td>
                    <td>{formatNumber(r.order)}</td>
                    <td>{formatNumber(r.size)}</td>
                    <td>{formatPercentMetric(r.density, 1)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className="h-full rounded-full bg-neutral-800 transition-all"
                            style={{ width: `${(r.density / maxDensity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {live && (
        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Densidade por região"
            description="Densidade do grafo regional (fração das conexões possíveis que existem de fato). Regiões mais densas têm aeroportos mais interligados entre si. Cor por região."
          >
            <BarChart
              data={regionDensityBars}
              orientation="horizontal"
              valueName="densidade"
              valueFormatter={(v) => formatPercentMetric(v, 1)}
              height={Math.max(200, regionDensityBars.length * 40)}
            />
          </ChartCard>

          {stats.connectionTypes.length > 0 && (
            <ChartCard
              title="Composição das conexões"
              description="Proporção das arestas por tipo: hubs nacionais ligam grandes centros, hubs regionais conectam capitais a cidades médias, e voos regionais cobrem trechos locais."
            >
              <DonutChart
                data={connectionDonut}
                centerLabel="conexões"
                centerValue={formatNumber(stats.edgeCount)}
              />
            </ChartCard>
          )}
        </section>
      )}
    </div>
  );
}
