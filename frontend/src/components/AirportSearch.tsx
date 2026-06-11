import { useEffect, useRef, useState } from "react";
import type { Airport } from "../types";

interface Props {
  airports: Airport[];
  value: string;
  onChange: (iata: string) => void;
  label: string;
  exclude?: string;
  placeholder?: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-100 px-0 font-semibold text-yellow-800">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function AirportSearch({ airports, value, onChange, label, exclude, placeholder }: Props) {
  const [query, setQuery]           = useState("");
  const [open, setOpen]             = useState(false);
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [cursor, setCursor]         = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = airports.find((a) => a.iata === value);


  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      const q = query.toLowerCase();
      setSuggestions(
        airports
          .filter((a) => a.iata !== exclude)
          .filter((a) =>
            a.iata.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q) ||
            a.region.toLowerCase().includes(q),
          )
          .slice(0, 8),
      );
      setCursor(0);
    }, 44);
    return () => clearTimeout(t);
  }, [query, airports, exclude]);

  function select(airport: Airport) {
    onChange(airport.iata);
    setQuery("");
    setOpen(false);
    setSuggestions([]);
  }

  function handleFocus() {
    setOpen(true);
    setQuery("");
  }

  function handleBlur() {

    setTimeout(() => { setOpen(false); setQuery(""); }, 160);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown")  { setCursor((c) => Math.min(c + 1, suggestions.length - 1)); e.preventDefault(); }
    if (e.key === "ArrowUp")    { setCursor((c) => Math.max(c - 1, 0)); e.preventDefault(); }
    if (e.key === "Enter" && suggestions[cursor]) { select(suggestions[cursor]); e.preventDefault(); }
    if (e.key === "Escape")     { setOpen(false); setQuery(""); }
  }

  const displayValue = open ? query : selected ? `${selected.iata} · ${selected.city}` : "";

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="input pr-8 font-mono"
            placeholder={placeholder ?? "Código IATA ou cidade…"}
            value={displayValue}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKey}
          />

          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
            {open ? "▲" : "▼"}
          </span>
        </div>
      </label>


      {open && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {suggestions.length === 0 ? (
            <li className="px-3 py-3 text-sm text-neutral-400">
              {query.length < 2
                ? "Digite pelo menos 2 caracteres…"
                : `Nenhum resultado para "${query}"`}
            </li>
          ) : (
            suggestions.map((a, i) => (
              <li
                key={a.iata}
                onMouseDown={() => select(a)}
                onMouseEnter={() => setCursor(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  i === cursor ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
              >
                <span className="w-10 font-mono font-bold text-neutral-900">
                  {highlight(a.iata, query)}
                </span>
                <span className="flex-1 text-neutral-600">
                  {highlight(a.city, query)}
                </span>
                <span className="text-xs text-neutral-400">{a.region}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
