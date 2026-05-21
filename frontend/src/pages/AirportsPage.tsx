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

type SortKey = "iata" | "city" | "degree" | "egoDensity" | "egoSize";

export function AirportsPage({ airports, dataStatus }: Props) {
  const regions = useMemo(
    () => Array.from(new Set(airports.map((a) => a.region).filter(Boolean))).sort(),
    [airports]
  );
  const maxDegree = useMemo(
    () => Math.max(...airports.map((a) => a.degree), 1),
    [airports]
  );

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [minDegree, setMinDegree] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("degree");
  const [sortDesc, setSortDesc] = useState(true);

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
        const va = a[sortKey];
        const vb = b[sortKey];
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb));
        return sortDesc ? -cmp : cmp;
      });
  }, [airports, query, region, minDegree, sortKey, sortDesc]);

  const egoUnavailable = dataStatus !== "live";

  return (
    <div>
      <PageHeader
        title="Aeroportos"
        description="Lista de aeroportos com métricas de grau e ego-rede."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input min-w-[200px] flex-1"
          placeholder="Buscar IATA, cidade ou região…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          disabled={airports.length === 0}
        >
          <option value="degree">Grau</option>
          <option value="iata">IATA</option>
          <option value="city">Cidade</option>
          <option value="egoDensity">Densidade ego</option>
          <option value="egoSize">Tamanho ego</option>
        </select>
        <button
          className="btn"
          onClick={() => setSortDesc((d) => !d)}
          disabled={airports.length === 0}
        >
          {sortDesc ? "↓" : "↑"}
        </button>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm text-neutral-600">
        Grau mínimo: {minDegree}
        <input
          type="range"
          min={0}
          max={maxDegree}
          value={minDegree}
          onChange={(e) => setMinDegree(Number(e.target.value))}
          className="flex-1"
          disabled={airports.length === 0}
        />
      </label>

      <p className="mb-2 text-xs text-neutral-500">
        {airports.length === 0 ? EM_DASH : filtered.length} aeroportos
        {egoUnavailable && airports.length > 0 && " · métricas ego após ./prepare.sh"}
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>IATA</th>
              <th>Cidade</th>
              <th>Região</th>
              <th>Grau</th>
              <th>Ordem ego</th>
              <th>Densidade ego</th>
              <th>Vizinhos</th>
            </tr>
          </thead>
          <tbody>
            {airports.length === 0 ? (
              <EmptyTableRow colSpan={7}>
                Nenhum aeroporto em data.json. Execute{" "}
                <code className="rounded bg-neutral-100 px-1 text-xs">./prepare.sh</code>.
              </EmptyTableRow>
            ) : filtered.length === 0 ? (
              <EmptyTableRow colSpan={7}>Nenhum aeroporto corresponde aos filtros.</EmptyTableRow>
            ) : (
              filtered.map((a) => (
                <tr key={a.iata}>
                  <td className="font-mono font-medium">{a.iata}</td>
                  <td>{a.city || EM_DASH}</td>
                  <td>{a.region || EM_DASH}</td>
                  <td>{a.degree}</td>
                  <td>
                    {egoUnavailable && a.egoOrder === 0 ? EM_DASH : a.egoOrder}
                  </td>
                  <td>
                    {egoUnavailable && a.egoDensity === 0
                      ? EM_DASH
                      : formatPercentMetric(a.egoDensity, 0)}
                  </td>
                  <td className="max-w-[200px] truncate font-mono text-xs text-neutral-600">
                    {a.neighbors.length > 0 ? a.neighbors.join(", ") : EM_DASH}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
