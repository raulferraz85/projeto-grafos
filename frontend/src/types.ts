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

export interface AppData {
  generatedAt: string;
  global: GlobalMetrics;
  regions: RegionMetrics[];
  airports: Airport[];
  edges: Edge[];
  routes: Route[];
  rankings: Rankings;
  stats: Stats;
}
