import type { AppData } from "../types";

/** Marcador interno — não é uma data real. */
export const PLACEHOLDER_GENERATED_AT = "__placeholder__";

export const PLACEHOLDER_DATA: AppData = {
  generatedAt: PLACEHOLDER_GENERATED_AT,
  global: { order: 0, size: 0, density: 0 },
  regions: [],
  airports: [],
  edges: [],
  routes: [],
  rankings: {
    mostConnected: { iata: "—", value: 0 },
    highestLocalDensity: { iata: "—", value: 0 },
    topConnected: [],
    topDensity: [],
    topEgoSize: [],
  },
  stats: {
    connectionTypes: [],
    regionCount: 0,
    airportCount: 0,
    edgeCount: 0,
    routeCount: 0,
  },
};

export type DataStatus = "live" | "partial" | "placeholder";

export function isValidAppData(raw: unknown): raw is AppData {
  if (!raw || typeof raw !== "object") return false;
  const d = raw as AppData;
  return (
    typeof d.generatedAt === "string" &&
    d.global != null &&
    Array.isArray(d.regions) &&
    Array.isArray(d.airports) &&
    Array.isArray(d.edges) &&
    Array.isArray(d.routes) &&
    d.rankings != null &&
    d.stats != null
  );
}

/** Métricas de `out/` ainda não foram geradas (só estrutura em `data/`). */
export function isPartialData(data: AppData): boolean {
  const hasMetrics =
    (data.global?.order ?? 0) > 0 ||
    data.regions.length > 0 ||
    data.routes.some((r) => r.origin && r.destination);
  return !hasMetrics;
}

export function getDataStatus(data: AppData): DataStatus {
  if (data.generatedAt === PLACEHOLDER_GENERATED_AT) return "placeholder";
  if (data.airports.length === 0 && data.edges.length === 0 && isPartialData(data)) {
    return "placeholder";
  }
  if (isPartialData(data)) return "partial";
  return "live";
}
