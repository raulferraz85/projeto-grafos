
export function ChartTooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      {children}
    </div>
  );
}
