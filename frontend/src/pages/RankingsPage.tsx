import { useMemo, useState } from "react";
import type { Airport, RankItem, Rankings } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatMetric, formatPercentMetric } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";

interface Props {
  rankings: Rankings;
  airports: Airport[];
  dataStatus: DataStatus;
}

type Tab = "connected" | "density" | "ego";

const TABS: { id: Tab; label: string }[] = [
  { id: "connected", label: "Mais conectados" },
  { id: "density",   label: "Maior densidade local" },
  { id: "ego",       label: "Maior ego-rede" },
];

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


  // Cards de destaque: top-1 e top-2 da aba atual (mesmo formato da tabela)
  const TAB_META = {
    connected: { label: "mais conectado",    unit: (v: number) => `grau ${formatMetric(v)}` },
    density:   { label: "maior densidade",   unit: (v: number) => formatPercentMetric(v, 1) },
    ego:       { label: "maior ego-rede",    unit: (v: number) => `${formatMetric(v)} nós` },
  } as const;
  const card1 = items[0] ?? null;
  const card2 = items[1] ?? null;

  return (
    <div>
      <PageHeader
        title="Rankings"
        description="Aeroportos com maior grau, densidade da ego-rede e tamanho da ego-rede."
      />

      {/* Highlight cards — sempre no formato da aba ativa */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="card">
          <p className="text-xs text-neutral-500">1º {TAB_META[tab].label}</p>
          <p className="mt-1 font-mono text-xl font-semibold">
            {empty || !card1 ? EM_DASH : card1.iata}
          </p>
          <p className="text-sm text-neutral-600">
            {empty || !card1 ? EM_DASH : TAB_META[tab].unit(card1.value)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-neutral-500">2º {TAB_META[tab].label}</p>
          <p className="mt-1 font-mono text-xl font-semibold">
            {empty || !card2 ? EM_DASH : card2.iata}
          </p>
          <p className="text-sm text-neutral-600">
            {empty || !card2 ? EM_DASH : TAB_META[tab].unit(card2.value)}
          </p>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Degree threshold filter — só aparece na aba de densidade */}
      {tab === "density" && <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
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
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
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
