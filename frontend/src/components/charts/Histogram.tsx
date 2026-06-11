import {
  Bar,
  BarChart as RBarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_ACCENT, CHART_MEAN, CHART_PRIMARY } from "../../lib/theme";

// Histograma reutilizável: recebe valores brutos, divide em faixas (bins) e
// renderiza barras verticais com linha de média. Destaca a barra de pico.

interface Props {
  values: number[];
  bins?: number;
  valueFormatter?: (v: number) => string;
  color?: string;
  height?: number;
  meanLine?: boolean;
  /** Rótulo do eixo X (grandeza medida). */
  xLabel?: string;
  emptyMessage?: string;
}

interface Bucket {
  label: string;
  count: number;
  start: number;
  end: number;
}

const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v));

function HistTooltip({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: any[];
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const b = payload[0].payload as Bucket;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-neutral-800">
        {valueFormatter(b.start)} – {valueFormatter(b.end)}
      </p>
      <p className="mt-0.5 font-mono text-neutral-700">
        <span className="font-bold">{fmtInt(b.count)}</span> nós
      </p>
    </div>
  );
}

export function Histogram({
  values,
  bins = 12,
  valueFormatter = fmtInt,
  color = CHART_PRIMARY,
  height = 220,
  meanLine = true,
  xLabel,
  emptyMessage = "Sem dados para os filtros atuais.",
}: Props) {
  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-neutral-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;

  // Caso degenerado: todos os valores iguais → uma única faixa.
  const span = max - min || 1;
  const n = max === min ? 1 : bins;
  const width = span / n;

  const buckets: Bucket[] = Array.from({ length: n }, (_, i) => {
    const start = min + i * width;
    const end = i === n - 1 ? max : start + width;
    return { label: valueFormatter(start), count: 0, start, end };
  });

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    buckets[idx].count++;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const meanIdx = Math.min(Math.floor((mean - min) / width), n - 1);
  const meanLabel = buckets[meanIdx]?.label;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={buckets} margin={{ top: 8, right: 12, bottom: xLabel ? 22 : 8, left: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          label={
            xLabel
              ? { value: xLabel, position: "insideBottom", offset: -12, fontSize: 11, fill: "#64748b" }
              : undefined
          }
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          content={<HistTooltip valueFormatter={valueFormatter} />}
        />
        {meanLine && meanLabel !== undefined && (
          <ReferenceLine
            x={meanLabel}
            stroke={CHART_MEAN}
            strokeDasharray="5 3"
            strokeWidth={2}
            label={{ value: `média ${valueFormatter(mean)}`, fill: "#16a34a", fontSize: 10, position: "top" }}
          />
        )}
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive>
          {buckets.map((b, i) => (
            <Cell key={i} fill={b.count === maxCount ? CHART_ACCENT : color} />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
