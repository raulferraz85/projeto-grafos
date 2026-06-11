import type { ReactNode } from "react";

// Cartões padronizados no estilo vibrante (rounded-xl + acento de cor).
// Base única para toda a aplicação.

export type Accent = "sky" | "emerald" | "violet" | "orange" | "rose" | "slate";

const ACCENT_STYLES: Record<Accent, { border: string; bg: string; icon: string; val: string }> = {
  sky:     { border: "border-sky-200",     bg: "bg-sky-50",     icon: "text-sky-500",     val: "text-sky-700" },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", icon: "text-emerald-500", val: "text-emerald-700" },
  violet:  { border: "border-violet-200",  bg: "bg-violet-50",  icon: "text-violet-500",  val: "text-violet-700" },
  orange:  { border: "border-orange-200",  bg: "bg-orange-50",  icon: "text-orange-500",  val: "text-orange-700" },
  rose:    { border: "border-rose-200",    bg: "bg-rose-50",    icon: "text-rose-500",    val: "text-rose-700" },
  slate:   { border: "border-neutral-200", bg: "bg-white",      icon: "text-neutral-500", val: "text-neutral-900" },
};

interface CardProps {
  children: ReactNode;
  accent?: Accent;
  className?: string;
}

export function Card({ children, accent = "slate", className }: CardProps) {
  const c = ACCENT_STYLES[accent];
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: Accent;
  icon?: ReactNode;
}

export function StatCard({ label, value, sub, accent = "slate", icon }: StatCardProps) {
  const c = ACCENT_STYLES[accent];
  return (
    <div className={`flex items-start gap-3 rounded-xl border-2 ${c.border} ${c.bg} p-4`}>
      {icon && <div className={`shrink-0 rounded-lg bg-white p-2 ${c.icon}`}>{icon}</div>}
      <div className="min-w-0">
        <p className="truncate text-xs text-neutral-500">{label}</p>
        <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${c.val}`}>{value}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-neutral-500">{sub}</p>}
      </div>
    </div>
  );
}
