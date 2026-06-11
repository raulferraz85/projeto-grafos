// ──────────────────────────────────────────────────────────────────────────
// Tokens de cor unificados do projeto.
// Fonte única de verdade para regiões, tipos de conexão, gêneros, algoritmos
// e séries de gráficos. Substitui as definições duplicadas/divergentes que
// existiam em format.ts, GraphPage.tsx, AirportsPage.tsx e Parte2Page.tsx.
// ──────────────────────────────────────────────────────────────────────────

export const REGION_FALLBACK = "#94a3b8";

/** Cor canônica por região (mapeamento já usado no grafo e na tabela). */
export const REGION_COLORS: Record<string, string> = {
  Norte: "#22c55e",
  Nordeste: "#f97316",
  Sudeste: "#38bdf8",
  Sul: "#a78bfa",
  "Centro-Oeste": "#facc15",
};

export const colorForRegion = (region: string): string =>
  REGION_COLORS[region] ?? REGION_FALLBACK;

/** Cor por tipo de conexão (arestas da rede de aeroportos). */
export const EDGE_COLORS: Record<string, string> = {
  hub_nacional: "#ef4444",
  hub_regional: "#fb923c",
  regional: "#cbd5e1",
};

/** Cor por algoritmo (usada na Parte 2 e em comparativos). */
export const ALG_COLORS = {
  BFS: "#38bdf8",
  DFS: "#a78bfa",
  Dijkstra: "#22c55e",
  "Bellman-Ford": "#f97316",
} as const;

/** Paleta determinística para gêneros musicais (hash → cor). */
export const GENRE_PALETTE = [
  "#38bdf8", "#22c55e", "#f97316", "#a78bfa", "#facc15",
  "#fb7185", "#34d399", "#60a5fa", "#f472b6", "#fbbf24",
  "#4ade80", "#c084fc", "#fb923c", "#818cf8", "#2dd4bf",
  "#e879f9", "#86efac", "#93c5fd", "#fca5a5", "#6ee7b7",
];

export const genreColor = (genre: string): string => {
  let h = 0;
  for (let i = 0; i < genre.length; i++) h = genre.charCodeAt(i) + ((h << 5) - h);
  return GENRE_PALETTE[Math.abs(h) % GENRE_PALETTE.length];
};

/** Cor base usada por gráficos quando não há cor por categoria. */
export const CHART_PRIMARY = "#38bdf8";

/** Cor de destaque (picos, médias, valor selecionado). */
export const CHART_ACCENT = "#f97316";
export const CHART_MEAN = "#22c55e";

/** Sequência de cores para séries genéricas de gráficos. */
export const CHART_SERIES = [
  "#38bdf8", "#22c55e", "#a78bfa", "#f97316", "#facc15", "#fb7185", "#60a5fa",
];
