import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_SERIES } from "../../lib/theme";
import { ChartTooltip } from "./ChartTooltip";


export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: DonutDatum[];
  valueFormatter?: (v: number) => string;

  centerLabel?: string;
  centerValue?: string;
  height?: number;
  emptyMessage?: string;
}

const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

function DonutTooltip({
  active,
  payload,
  total,
  valueFormatter,
}: {
  active?: boolean;
  payload?: any[];
  total: number;
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as DonutDatum;
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
  return (
    <ChartTooltip>
      <p className="font-semibold text-neutral-800">{d.label}</p>
      <p className="mt-0.5 font-mono text-neutral-700">
        <span className="font-bold">{valueFormatter(d.value)}</span> ({pct}%)
      </p>
    </ChartTooltip>
  );
}

export function DonutChart({
  data,
  valueFormatter = fmtInt,
  centerLabel,
  centerValue,
  height = 240,
  emptyMessage = "Sem dados para os filtros atuais.",
}: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-neutral-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color ?? CHART_SERIES[i % CHART_SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} valueFormatter={valueFormatter} />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="font-mono text-xl font-bold text-neutral-800">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] uppercase tracking-wide text-neutral-400">{centerLabel}</span>}
          </div>
        )}
      </div>

      <ul className="flex-1 space-y-1 text-xs">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <li key={d.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: d.color ?? CHART_SERIES[i % CHART_SERIES.length] }}
              />
              <span className="flex-1 truncate text-neutral-700">{d.label}</span>
              <span className="font-mono tabular-nums text-neutral-500">
                {valueFormatter(d.value)} · {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
