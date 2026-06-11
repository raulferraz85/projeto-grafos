import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CHART_PRIMARY } from "../../lib/theme";
import { ChartTooltip } from "./ChartTooltip";


export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  color?: string;
  sublabel?: string;
}

interface Props {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormatter?: (v: number) => string;
  yFormatter?: (v: number) => string;
  color?: string;
  height?: number;
  emptyMessage?: string;
}

const fmtDefault = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
  xFormatter,
  yFormatter,
}: {
  active?: boolean;
  payload?: any[];
  xLabel: string;
  yLabel: string;
  xFormatter: (v: number) => string;
  yFormatter: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload as ScatterPoint;
  return (
    <ChartTooltip>
      <p className="font-semibold text-neutral-800">{p.label}</p>
      {p.sublabel && <p className="text-neutral-500">{p.sublabel}</p>}
      <p className="mt-0.5 font-mono text-neutral-700">{xLabel}: {xFormatter(p.x)}</p>
      <p className="font-mono text-neutral-700">{yLabel}: {yFormatter(p.y)}</p>
    </ChartTooltip>
  );
}

export function ScatterPlot({
  points,
  xLabel,
  yLabel,
  xFormatter = fmtDefault,
  yFormatter = fmtDefault,
  color = CHART_PRIMARY,
  height = 280,
  emptyMessage = "Sem dados para os filtros atuais.",
}: Props) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-neutral-400" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 8 }}>
        <CartesianGrid stroke="#f1f5f9" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={xFormatter}
          axisLine={false}
          tickLine={false}
          label={{ value: xLabel, position: "insideBottom", offset: -14, fontSize: 11, fill: "#64748b" }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickFormatter={yFormatter}
          axisLine={false}
          tickLine={false}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
        />
        <ZAxis range={[40, 40]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ScatterTooltip
              xLabel={xLabel}
              yLabel={yLabel}
              xFormatter={xFormatter}
              yFormatter={yFormatter}
            />
          }
        />
        <Scatter data={points} fill={color} fillOpacity={0.75}>
          {points.map((p, i) => (
            <Cell key={i} fill={p.color ?? color} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
