import { useEffect, useState } from "react";
import type { ReactNode } from "react";


export function AnimatedNumber({ target, duration = 1200, decimals = 0 }: {
  target: number; duration?: number; decimals?: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  if (decimals > 0) return <>{current.toFixed(decimals)}</>;
  return <>{Math.round(current).toLocaleString("pt-BR")}</>;
}


export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-bold text-neutral-800 border-b-2 border-neutral-200 pb-2">
      {children}
    </h2>
  );
}


export function Badge({ children, color }: {
  children: ReactNode;
  color: "green" | "red" | "amber";
}) {
  const cls = {
    green: "bg-green-100 text-green-700",
    red:   "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  }[color];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}
