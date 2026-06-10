import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatNumber, formatPercentMetric } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

export function OverviewPage({ data, dataStatus }: Props) {
  const { global, regions, stats, rankings } = data;
  const live = dataStatus === "live";

  const fmt = (n: number, pct = false) =>
    live || n > 0
      ? pct ? formatPercentMetric(n, 2) : formatNumber(n)
      : EM_DASH;

  // Região com maior densidade
  const topRegion = live && regions.length > 0
    ? [...regions].sort((a, b) => b.density - a.density)[0]
    : null;

  // Total de arestas para cálculo de proporção dos tipos
  const totalEdges = stats.connectionTypes.reduce((s, t) => s + t.count, 0) || 1;

  const TYPE_LABEL: Record<string, string> = {
    hub_nacional:  "Hub nacional",
    hub_regional:  "Hub regional",
    regional:      "Voo regional",
  };
  const TYPE_COLOR: Record<string, string> = {
    hub_nacional:  "bg-red-400",
    hub_regional:  "bg-orange-400",
    regional:      "bg-slate-400",
  };

  // Densidade máxima regional (para escalar as barras)
  const maxDensity = Math.max(...regions.map((r) => r.density), 0.001);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Métricas globais da malha aérea e distribuição por região."
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ordem"     value={fmt(global.order)} />
        <StatCard label="Tamanho"   value={fmt(global.size)} />
        <StatCard label="Densidade" value={fmt(global.density, true)} />
        <StatCard label="Pares testados" value={fmt(stats.routeCount)} />
      </div>

      {/* Insight chips */}
      {live && (
        <div className="grid gap-3 sm:grid-cols-3">
          <InsightChip
            icon="✈"
            label="Hub mais conectado"
            value={rankings.mostConnected.iata}
            sub={`grau ${rankings.mostConnected.value}`}
          />
          {topRegion && (
            <InsightChip
              icon="📍"
              label="Região mais densa"
              value={topRegion.region}
              sub={formatPercentMetric(topRegion.density, 1)}
            />
          )}
          <InsightChip
            icon="🔗"
            label="Tipo de conexão dominante"
            value={TYPE_LABEL["hub_regional"] ?? "Hub regional"}
            sub={`${stats.connectionTypes.find((t) => t.type === "hub_regional")?.count ?? 0} arestas`}
          />
        </div>
      )}

      {/* Regional table */}
      <div>
        <p className="mb-3 text-sm text-neutral-600">
          {fmt(stats.airportCount)} aeroportos · {fmt(stats.edgeCount)} conexões ·{" "}
          {fmt(stats.regionCount)} regiões
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

      {/* Connection type breakdown */}
      {live && stats.connectionTypes.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Composição das conexões
          </h2>

          {/* Stacked bar */}
          <div className="mb-3 flex h-4 overflow-hidden rounded-full">
            {stats.connectionTypes.map((t) => (
              <div
                key={t.type}
                className={`${TYPE_COLOR[t.type] ?? "bg-neutral-400"} transition-all`}
                style={{ width: `${(t.count / totalEdges) * 100}%` }}
                title={`${TYPE_LABEL[t.type] ?? t.type}: ${t.count}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {stats.connectionTypes.map((t) => (
              <div key={t.type} className="flex items-center gap-2 text-sm text-neutral-600">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-sm ${TYPE_COLOR[t.type] ?? "bg-neutral-400"}`}
                />
                <span>{TYPE_LABEL[t.type] ?? t.type}</span>
                <span className="font-mono text-xs text-neutral-400">
                  {t.count} ({formatPercentMetric(t.count / totalEdges, 0)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card flex items-start gap-3">
      <span className="text-xl leading-none">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="mt-0.5 font-mono font-semibold">{value}</p>
        <p className="text-xs text-neutral-500">{sub}</p>
      </div>
    </div>
  );
}
