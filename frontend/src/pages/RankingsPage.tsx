import { useState } from "react";
import type { RankItem, Rankings } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatMetric, formatNumber, formatPercentMetric } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";

interface Props {
  rankings: Rankings;
  dataStatus: DataStatus;
}

type Tab = "connected" | "density" | "ego";

const TABS: { id: Tab; label: string }[] = [
  { id: "connected", label: "Mais conectados" },
  { id: "density", label: "Maior densidade local" },
  { id: "ego", label: "Maior ego-rede" },
];

export function RankingsPage({ rankings, dataStatus }: Props) {
  const [tab, setTab] = useState<Tab>("connected");
  const empty = dataStatus !== "live";

  const items: RankItem[] =
    tab === "connected"
      ? rankings.topConnected
      : tab === "density"
        ? rankings.topDensity
        : rankings.topEgoSize;

  const formatValue = (value: number) =>
    tab === "density" ? formatPercentMetric(value, 1) : formatMetric(value);

  const highlightIata = (iata: string) => (empty || iata === "—" ? EM_DASH : iata);
  const highlightValue = (value: number, asPercent = false) =>
    empty ? EM_DASH : asPercent ? formatPercentMetric(value, 1) : formatNumber(value);

  return (
    <div>
      <PageHeader
        title="Rankings"
        description="Aeroportos com maior grau, densidade da ego-rede e tamanho da ego-rede."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="card">
          <p className="text-xs text-neutral-500">Mais conectado</p>
          <p className="mt-1 font-mono text-xl font-semibold">
            {highlightIata(rankings.mostConnected.iata)}
          </p>
          <p className="text-sm text-neutral-600">
            grau {highlightValue(rankings.mostConnected.value)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-neutral-500">Maior densidade ego-rede</p>
          <p className="mt-1 font-mono text-xl font-semibold">
            {highlightIata(rankings.highestLocalDensity.iata)}
          </p>
          <p className="text-sm text-neutral-600">
            {highlightValue(rankings.highestLocalDensity.value, true)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "btn-primary" : "btn"}
          >
            {t.label}
          </button>
        ))}
      </div>

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
                Rankings indisponíveis até gerar{" "}
                <code className="rounded bg-neutral-100 px-1 text-xs">out/ego_aeroportos.csv</code>.
              </EmptyTableRow>
            ) : (
              items.map((item, idx) => (
                <tr key={item.iata}>
                  <td className="text-neutral-500">{idx + 1}</td>
                  <td className="font-mono font-medium">{item.iata}</td>
                  <td>{item.city || EM_DASH}</td>
                  <td>{item.region || EM_DASH}</td>
                  <td className="font-mono">{formatValue(item.value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
