export interface GlobalMetrics {
  order: number;
  size: number;
  density: number;
}

export interface RegionMetrics {
  region: string;
  order: number;
  size: number;
  density: number;
}

export interface Airport {
  iata: string;
  city: string;
  region: string;
  degree: number;
  egoOrder: number;
  egoSize: number;
  egoDensity: number;
  neighbors: string[];
}

export interface Edge {
  source: string;
  target: string;
  connectionType: string;
  justification: string;
  weight: number;
}

export interface Route {
  origin: string;
  destination: string;
  cost: number;
  path: string[];
  hops: number;
  reachable: boolean;
}

export interface RankItem {
  iata: string;
  city: string;
  region: string;
  value: number;
}

export interface Rankings {
  mostConnected: { iata: string; value: number };
  highestLocalDensity: { iata: string; value: number };
  topConnected: RankItem[];
  topDensity: RankItem[];
  topEgoSize: RankItem[];
}

export interface Stats {
  connectionTypes: { type: string; count: number }[];
  regionCount: number;
  airportCount: number;
  edgeCount: number;
  routeCount: number;
}

// ── Parte 2 — Rede Musical Spotify ───────────────────────────────

export interface Parte2Dataset {
  name: string;
  source: string;
  nodes: number;
  edges: number;
  type: string;
  weighted: boolean;
  degree_min: number;
  degree_max: number;
  degree_mean: number;
  degree_median: number;
}

export interface BfsResult {
  source: string;
  source_label: string;
  source_genre: string;
  visited: number;
  max_layer: number;
  layer_sizes: number[];
  time_ms: number;
  note?: string;
}

export interface DfsResult {
  source: string;
  source_label: string;
  source_genre: string;
  visited: number;
  back_edges: number;
  has_cycle: boolean | null;
  time_ms: number;
  note?: string;
}

export interface DijkstraResult {
  source: string;
  source_label: string;
  target: string;
  target_label: string;
  cost: number;
  hops: number;
  path_labels: string[];
  reachable: boolean;
  time_ms: number;
}

export interface BellmanFordCase {
  source?: string;
  source_label?: string;
  target?: string;
  target_label?: string;
  cost?: number | null;
  path_labels?: string[];
  negative_cycle?: boolean;
  negative_edges_count?: number;
  total_mood_edges?: number;
  pct_negative?: number;
  time_ms: number;
  description?: string;
  // negative cycle case
  graph_nodes?: number;
  graph_edges_directed?: { from: string; to: string; weight: number }[];
  negative_cycle_detected?: boolean;
  error?: string;
}

export interface Parte2Performance {
  bfs_avg_ms: number;
  dfs_avg_ms: number;
  dijkstra_avg_ms: number;
  bellman_ford_avg_ms: number;
}

export interface MusicGraphNode {
  id: string;
  label: string;
  genre: string;
  degree: number;
}

export interface MusicGraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface MusicGraphSample {
  nodes: MusicGraphNode[];
  edges: MusicGraphEdge[];
}

export interface Parte2Data {
  dataset: Parte2Dataset;
  bfs_results: BfsResult[];
  dfs_results: DfsResult[];
  dijkstra_results: DijkstraResult[];
  bellman_ford_results: {
    negative_weight_case: BellmanFordCase;
    negative_cycle_case: BellmanFordCase;
  };
  performance_summary: Parte2Performance;
  graph_sample?: MusicGraphSample;
}

// ── AppData ───────────────────────────────────────────────────────

export interface AppData {
  generatedAt: string;
  global: GlobalMetrics;
  regions: RegionMetrics[];
  airports: Airport[];
  edges: Edge[];
  routes: Route[];
  rankings: Rankings;
  stats: Stats;
  parte2?: Parte2Data | null;
}
