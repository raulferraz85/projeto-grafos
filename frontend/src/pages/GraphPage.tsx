import { useMemo, useState } from "react";
import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, colorForRegion } from "../lib/format";
import { PageHeader } from "../components/PageHeader";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
}

interface PositionedNode {
  iata: string;
  region: string;
  x: number;
  y: number;
  degree: number;
}

const WIDTH = 800;
const HEIGHT = 500;
const PADDING = 40;

export function GraphPage({ data, dataStatus }: Props) {
  const { airports, edges, routes } = data;
  const emptyGraph = airports.length === 0;

  const positions = useMemo(() => {
    const regions = Array.from(new Set(airports.map((a) => a.region)));
    const groups: Record<string, typeof airports> = {};
    for (const r of regions) groups[r] = [];
    for (const a of airports) groups[a.region].push(a);

    const radius = Math.min(WIDTH, HEIGHT) / 2 - PADDING;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const map = new Map<string, PositionedNode>();

    regions.forEach((region, regionIdx) => {
      const list = groups[region];
      const sectorStart = (regionIdx / regions.length) * Math.PI * 2 - Math.PI / 2;
      const sectorWidth = (Math.PI * 2) / regions.length;

      list.forEach((a, i) => {
        const t = list.length === 1 ? 0.5 : i / (list.length - 1);
        const angle = sectorStart + sectorWidth * (0.15 + 0.7 * t);
        const innerRadius = radius * 0.85;
        map.set(a.iata, {
          iata: a.iata,
          region: a.region,
          degree: a.degree,
          x: cx + Math.cos(angle) * innerRadius,
          y: cy + Math.sin(angle) * innerRadius,
        });
      });
    });

    return map;
  }, [airports]);

  const [routeIdx, setRouteIdx] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const selectedRoute = routes[routeIdx];
  const highlightedEdges = useMemo(() => {
    if (!selectedRoute) return new Set<string>();
    const set = new Set<string>();
    const path = selectedRoute.path;
    for (let i = 0; i < path.length - 1; i++) {
      set.add([path[i], path[i + 1]].sort().join("|"));
    }
    return set;
  }, [selectedRoute]);

  const highlightedNodes = useMemo(
    () => new Set(selectedRoute?.path ?? []),
    [selectedRoute]
  );

  const airport = hovered ? airports.find((a) => a.iata === hovered) : null;

  return (
    <div>
      <PageHeader
        title="Grafo"
        description="Visualização da malha aérea. Selecione uma rota para destacar o caminho."
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">
            Destacar rota
          </span>
          <select
            className="input font-mono"
            value={routeIdx}
            onChange={(e) => setRouteIdx(Number(e.target.value))}
            disabled={routes.length === 0}
          >
            {routes.length === 0 ? (
              <option value={0}>{EM_DASH} Nenhuma rota</option>
            ) : (
              routes.map((r, idx) => (
                <option key={idx} value={idx}>
                  {r.origin} → {r.destination}
                  {r.reachable ? ` (${r.cost})` : ""}
                </option>
              ))
            )}
          </select>
        </label>

        {!emptyGraph && (
          <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
            {Array.from(new Set(airports.map((a) => a.region).filter(Boolean))).map(
              (r) => (
                <span key={r} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: colorForRegion(r) }}
                  />
                  {r}
                </span>
              )
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden p-2">
        {emptyGraph ? (
          <div
            className="flex items-center justify-center text-sm text-neutral-500"
            style={{ minHeight: HEIGHT }}
          >
            Grafo indisponível. Execute{" "}
            <code className="mx-1 rounded bg-neutral-100 px-1 text-xs">./prepare.sh</code> para
            carregar aeroportos e conexões.
          </div>
        ) : (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
            <rect width={WIDTH} height={HEIGHT} fill="#fafafa" />

            {edges.map((e, i) => {
              const a = positions.get(e.source);
              const b = positions.get(e.target);
              if (!a || !b) return null;
              const key = [e.source, e.target].sort().join("|");
              const highlighted = highlightedEdges.has(key);
              return (
                <line
                  key={`${i}-${key}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={highlighted ? "#171717" : "#d4d4d4"}
                  strokeWidth={highlighted ? 2.5 : 1}
                />
              );
            })}

            {Array.from(positions.values()).map((n) => {
              const inPath = highlightedNodes.has(n.iata);
              const isHover = hovered === n.iata;
              const r = 6 + Math.min(n.degree, 6);
              return (
                <g
                  key={n.iata}
                  transform={`translate(${n.x},${n.y})`}
                  onMouseEnter={() => setHovered(n.iata)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={r}
                    fill={colorForRegion(n.region)}
                    stroke={inPath || isHover ? "#171717" : "#fff"}
                    strokeWidth={inPath || isHover ? 2 : 1}
                  />
                  <text
                    y={-r - 4}
                    textAnchor="middle"
                    style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}
                  >
                    {n.iata}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {airport && (
        <p className="mt-3 text-sm text-neutral-600">
          <span className="font-mono font-medium text-neutral-900">{airport.iata}</span>
          {" — "}
          {airport.city || EM_DASH}, {airport.region || EM_DASH} · grau{" "}
          {airport.degree}
        </p>
      )}

      {selectedRoute && selectedRoute.path.length > 0 && (
        <p className="mt-2 font-mono text-sm text-neutral-700">
          {selectedRoute.origin} → {selectedRoute.destination}:{" "}
          {selectedRoute.path.join(" → ")}
        </p>
      )}

      {dataStatus === "partial" && !emptyGraph && routes.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          Malha carregada; rotas para destacar caminhos aparecem após gerar out/.
        </p>
      )}
    </div>
  );
}
