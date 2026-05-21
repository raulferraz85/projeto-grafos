import { useMemo, useState } from "react";
import type { AppData, Route } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatMetric, formatNumber } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { EmptyTableRow } from "../components/EmptyTableRow";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

export function RoutesPage({ data, dataStatus }: Props) {
  const { routes, airports } = data;
  const empty = routes.length === 0;

  const airportByIata = useMemo(
    () => Object.fromEntries(airports.map((a) => [a.iata, a])),
    [airports]
  );

  const [origin, setOrigin] = useState(routes[0]?.origin ?? "");
  const [destination, setDestination] = useState(routes[0]?.destination ?? "");
  const [filter, setFilter] = useState("");

  const filtered = routes.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      r.origin.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      airportByIata[r.origin]?.city.toLowerCase().includes(q) ||
      airportByIata[r.destination]?.city.toLowerCase().includes(q)
    );
  });

  const selected = routes.find(
    (r) => r.origin === origin && r.destination === destination
  );

  return (
    <div>
      <PageHeader
        title="Rotas"
        description="Caminhos mínimos calculados com Dijkstra entre pares de aeroportos."
      />

      {empty ? (
        <div className="card mb-6 text-sm text-neutral-600">
          <p>
            Nenhuma rota calculada. Gere{" "}
            <code className="rounded bg-neutral-100 px-1 text-xs">out/distancias_rotas.csv</code>{" "}
            com{" "}
            <code className="rounded bg-neutral-100 px-1 text-xs">./prepare.sh</code>
            {dataStatus === "partial" && " (métricas de out/ ausentes)"}.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Origem</span>
              <select
                className="input font-mono"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                {uniqueOrigins(routes).map((o) => (
                  <option key={o} value={o}>
                    {o} · {airportByIata[o]?.city ?? ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Destino</span>
              <select
                className="input font-mono"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {routes
                  .filter((r) => r.origin === origin)
                  .map((r) => r.destination)
                  .filter((d, i, arr) => arr.indexOf(d) === i)
                  .map((d) => (
                    <option key={d} value={d}>
                      {d} · {airportByIata[d]?.city ?? ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {selected && (
            <div className="card mb-6">
              <RouteDetail
                route={selected}
                cityFor={(iata) => airportByIata[iata]?.city ?? iata}
              />
            </div>
          )}
        </>
      )}

      <input
        className="input mb-3"
        placeholder="Buscar por IATA ou cidade…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        disabled={empty}
      />

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Origem</th>
              <th>Destino</th>
              <th>Caminho</th>
              <th>Saltos</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyTableRow colSpan={5}>
                {empty
                  ? "Nenhuma rota em data.json. Execute o pipeline Python."
                  : "Nenhuma rota corresponde à busca."}
              </EmptyTableRow>
            ) : (
              filtered.map((r) => {
                const active = r.origin === origin && r.destination === destination;
                return (
                  <tr
                    key={`${r.origin}-${r.destination}`}
                    onClick={() => {
                      setOrigin(r.origin);
                      setDestination(r.destination);
                    }}
                    className={`cursor-pointer ${active ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                  >
                    <td className="font-mono">{r.origin}</td>
                    <td className="font-mono">{r.destination}</td>
                    <td className="max-w-xs truncate text-neutral-600">
                      {r.path.length > 0 ? r.path.join(" → ") : EM_DASH}
                    </td>
                    <td>{formatMetric(r.hops)}</td>
                    <td className="font-mono">
                      {r.reachable ? formatNumber(r.cost, 0) : EM_DASH}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function uniqueOrigins(routes: { origin: string }[]) {
  const seen = new Set<string>();
  return routes
    .filter((r) => {
      if (seen.has(r.origin)) return false;
      seen.add(r.origin);
      return true;
    })
    .map((r) => r.origin);
}

function RouteDetail({
  route,
  cityFor,
}: {
  route: Route;
  cityFor: (iata: string) => string;
}) {
  return (
    <div>
      <p className="text-sm text-neutral-600">
        Custo:{" "}
        <strong>{route.reachable ? formatNumber(route.cost, 0) : EM_DASH}</strong>
        {" · "}
        Saltos: <strong>{formatMetric(route.hops)}</strong>
        {" · "}
        Aeroportos no caminho: <strong>{formatMetric(route.path.length)}</strong>
      </p>
      {route.path.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">Caminho indisponível.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {route.path.map((iata, idx) => (
            <li key={`${iata}-${idx}`} className="flex gap-3 text-sm">
              <span className="w-6 text-neutral-400">{idx + 1}.</span>
              <span className="font-mono font-medium">{iata}</span>
              <span className="text-neutral-600">{cityFor(iata)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
