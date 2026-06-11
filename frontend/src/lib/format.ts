
export const EM_DASH = "—";

export const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export const formatPercent = (value: number, digits = 1) =>
  `${formatNumber(value * 100, digits)}%`;


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
