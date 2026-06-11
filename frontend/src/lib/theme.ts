

export const REGION_FALLBACK = "#94a3b8";

export const REGION_COLORS: Record<string, string> = {
  Norte:          "#22c55e",
  Nordeste:       "#f97316",
  Sudeste:        "#38bdf8",
  Sul:            "#a78bfa",
  "Centro-Oeste": "#facc15",
};

export const colorForRegion = (region: string): string =>
  REGION_COLORS[region] ?? REGION_FALLBACK;


export const EDGE_COLORS: Record<string, string> = {
  hub_nacional:  "#ef4444",
  hub_regional:  "#fb923c",
  regional:      "#cbd5e1",
};


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


export const CHART_PRIMARY = "#38bdf8";


export const CHART_ACCENT = "#f97316";
export const CHART_MEAN   = "#22c55e";


export const CHART_SERIES = [
  "#38bdf8", "#22c55e", "#a78bfa", "#f97316", "#facc15", "#fb7185", "#60a5fa",
];
