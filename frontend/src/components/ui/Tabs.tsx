

export interface TabItem<T extends string> {
  id: T;
  label: string;
  emoji?: string;
}

interface Props<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ items, active, onChange, className }: Props<T>) {
  return (
    <div className={`flex gap-1 rounded-xl bg-neutral-100 p-1 ${className ?? ""}`}>
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            active === t.id
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {t.emoji && <span className="hidden sm:inline">{t.emoji} </span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}
