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
import { CHART_MEAN, CHART_PRIMARY } from "../../lib/theme";

// Gráfico de barras reutilizável (descritivo e dinâmico) baseado em Recharts.
// Suporta barras horizontais (rankings) e verticais (histogramas), cor por
// barra, linha de referência (média) e tooltip estilizado.

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  /** Texto auxiliar exibido no tooltip. */
  sublabel?: string;
}

interface Props {
  data: BarDatum[];
  /** "horizontal" = barras deitadas (categorias no eixo Y). "vertical" = barras em pé. */
  orientation?: "horizontal" | "vertical";
  valueFormatter?: (v: number) => string;
  /** Desenha uma linha de referência na média dos valores. */
  meanLine?: boolean;
  meanLabel?: string;
  color?: string;
  height?: number;
  /** Rótulo do valor no tooltip (ex.: "grau", "rotas"). */
  valueName?: string;
  emptyMessage?: string;
}

const fmtDefault = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

function ChartTooltip({
  active,
  payload,
  valueFormatter,
  valueName,
}: {
  active?: boolean;
  payload?: any[];
  valueFormatter: (v: number) => string;
  valueName?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as BarDatum;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-neutral-800">{d.label}</p>
      {d.sublabel && <p className="text-neutral-500">{d.sublabel}</p>}
      <p className="mt-0.5 font-mono text-neutral-700">
        {valueName ? `${valueName}: ` : ""}
        <span className="font-bold">{valueFormatter(d.value)}</span>
      </p>
    </div>
  );
}

export function BarChart({
  data,
  orientation = "horizontal",
  valueFormatter = fmtDefault,
  meanLine = false,
  meanLabel = "média",
  color = CHART_PRIMARY,
  height = 280,
  valueName,
  emptyMessage = "Sem dados para os filtros atuais.",
}: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-neutral-400"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const mean = data.reduce((s, d) => s + d.value, 0) / data.length;
  const isHorizontal = orientation === "horizontal";
  const maxLabel = Math.max(...data.map((d) => d.label.length));
  const yWidth = isHorizontal ? Math.min(120, Math.max(40, maxLabel * 7)) : 40;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart
        data={data}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
      >
        {isHorizontal ? (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={valueFormatter}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={yWidth}
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: "#475569" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={valueFormatter}
              axisLine={false}
              tickLine={false}
            />
          </>
        )}

        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          content={
            <ChartTooltip valueFormatter={valueFormatter} valueName={valueName} />
          }
        />

        {meanLine && (
          <ReferenceLine
            {...(isHorizontal ? { x: mean } : { y: mean })}
            stroke={CHART_MEAN}
            strokeDasharray="5 3"
            strokeWidth={2}
            label={{
              value: `${meanLabel} ${valueFormatter(mean)}`,
              fill: "#16a34a",
              fontSize: 10,
              position: isHorizontal ? "top" : "right",
            }}
          />
        )}

        <Bar dataKey="value" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? color} />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
