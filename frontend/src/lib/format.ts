/** Valor exibido quando não há dado disponível. */
export const EM_DASH = "—";

export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export const formatPercent = (value: number, digits = 1) =>
  `${formatNumber(value * 100, digits)}%`;

/** Número formatado ou travessão se inválido/ausente. */
export const formatMetric = (n: number | undefined | null, digits = 0) => {
  if (n == null || Number.isNaN(n)) return EM_DASH;
  return formatNumber(n, digits);
};

export const formatPercentMetric = (value: number | undefined | null, digits = 1) => {
  if (value == null || Number.isNaN(value)) return EM_DASH;
  return formatPercent(value, digits);
};

export const formatDateTime = (iso: string) => {
  if (!iso || iso === "__placeholder__") return EM_DASH;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return EM_DASH;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return EM_DASH;
  }
};

export const REGION_COLORS: Record<string, { from: string; to: string; solid: string }> = {
  Nordeste: { from: "#fb923c", to: "#f59e0b", solid: "#f97316" },
  Sudeste: { from: "#38bdf8", to: "#3b82f6", solid: "#3b82f6" },
  "Centro-Oeste": { from: "#facc15", to: "#eab308", solid: "#eab308" },
  Sul: { from: "#34d399", to: "#10b981", solid: "#10b981" },
  Norte: { from: "#a78bfa", to: "#8b5cf6", solid: "#8b5cf6" },
};

export const colorForRegion = (region: string) =>
  REGION_COLORS[region]?.solid ?? "#64748b";

export const colorPairForRegion = (region: string) =>
  REGION_COLORS[region] ?? { from: "#64748b", to: "#475569", solid: "#64748b" };
