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
  const { global, regions, stats } = data;
  const live = dataStatus === "live";

  const globalMetric = (n: number, asPercent = false) => {
    if (live) return asPercent ? formatPercentMetric(n, 2) : formatNumber(n);
    if (n === 0) return EM_DASH;
    return asPercent ? formatPercentMetric(n, 2) : formatNumber(n);
  };

  const statMetric = (n: number) => {
    if (live || n > 0) return formatNumber(n);
    return EM_DASH;
  };

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Métricas globais da malha aérea e distribuição por região."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Ordem" value={globalMetric(global.order)} />
        <StatCard label="Tamanho" value={globalMetric(global.size)} />
        <StatCard label="Densidade" value={globalMetric(global.density, true)} />
        <StatCard label="Rotas" value={statMetric(stats.routeCount)} />
      </div>

      <p className="mb-3 text-sm text-neutral-600">
        {statMetric(stats.airportCount)} aeroportos · {statMetric(stats.edgeCount)} conexões ·{" "}
        {statMetric(stats.regionCount)} regiões
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Região</th>
              <th>Aeroportos</th>
              <th>Arestas</th>
              <th>Densidade</th>
            </tr>
          </thead>
          <tbody>
            {regions.length === 0 ? (
              <EmptyTableRow colSpan={4}>
                Nenhuma métrica regional disponível. Execute{" "}
                <code className="rounded bg-neutral-100 px-1 text-xs">./prepare.sh</code> na
                raiz do projeto.
              </EmptyTableRow>
            ) : (
              regions.map((r) => (
                <tr key={r.region}>
                  <td className="font-medium">{r.region}</td>
                  <td>{formatNumber(r.order)}</td>
                  <td>{formatNumber(r.size)}</td>
                  <td>{formatPercentMetric(r.density, 1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
