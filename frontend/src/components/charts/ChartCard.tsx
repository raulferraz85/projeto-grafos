import type { ReactNode } from "react";


interface Props {
  title: string;
  description?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, legend, children, className }: Props) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 ${className ?? ""}`}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
      </div>
      {children}
      {legend && <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-500">{legend}</div>}
    </div>
  );
}


export function LegendDot({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
