import type { Edge } from "../types";

export function runDijkstra(
  edges: Edge[],
  allIatas: string[],
  source: string,
  target: string,
): { path: string[]; cost: number } | null {
  if (source === target) return { path: [source], cost: 0 };

  const adj: Record<string, { node: string; weight: number }[]> = {};
  for (const iata of allIatas) adj[iata] = [];
  for (const e of edges) {
    adj[e.source]?.push({ node: e.target, weight: e.weight });
    adj[e.target]?.push({ node: e.source, weight: e.weight });
  }

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  for (const iata of allIatas) { dist[iata] = Infinity; prev[iata] = null; }
  dist[source] = 0;

  const visited = new Set<string>();
  const pq: [number, string][] = [[0, source]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === target) break;
    for (const { node: v, weight } of adj[u] ?? []) {
      if (visited.has(v)) continue;
      const alt = d + weight;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
        pq.push([alt, v]);
      }
    }
  }

  if (!isFinite(dist[target])) return null;

  const path: string[] = [];
  let curr: string | null = target;
  while (curr) { path.unshift(curr); curr = prev[curr]; }
  return { path, cost: dist[target] };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
