import type { ReactNode } from "react";
import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatDateTime } from "../lib/format";

export type Page = "home" | "overview" | "rankings" | "routes" | "graph" | "airports" | "parte2";

const PART1_PAGES: { id: Page; label: string }[] = [
  { id: "overview",  label: "Visão geral" },
  { id: "rankings",  label: "Rankings" },
  { id: "routes",    label: "Rotas" },
  { id: "graph",     label: "Grafo" },
  { id: "airports",  label: "Aeroportos" },
];

const PART2_PAGES: { id: Page; label: string }[] = [
  { id: "parte2", label: "Rede Musical" },
];

const PART1_IDS = new Set<Page>(["overview", "rankings", "routes", "graph", "airports"]);
const PART2_IDS = new Set<Page>(["parte2"]);

interface Props {
  data: AppData;
  page: Page;
  onPageChange: (page: Page) => void;
  dataStatus: DataStatus;
  homeTheme: "dark" | "light";
  children: ReactNode;
}

export function Layout({ data, page, onPageChange, dataStatus, homeTheme, children }: Props) {
  const updatedLabel = dataStatus === "live" ? formatDateTime(data.generatedAt) : EM_DASH;
  const isHome = page === "home";
  const isDarkHome = isHome && homeTheme === "dark";
  const inPart1 = PART1_IDS.has(page);
  const inPart2 = PART2_IDS.has(page);
  const shellClassName = isDarkHome
    ? "flex min-h-screen flex-col bg-slate-950 text-slate-100"
    : "flex min-h-screen flex-col";

  return (
    <div className={shellClassName}>
      <header
        className={
          isDarkHome
            ? "border-b border-slate-800/80 bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-slate-950/75"
            : "border-b border-neutral-200 bg-white"
        }
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            {!isHome && (
              <button
                onClick={() => onPageChange("home")}
                className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
              >
                ← Início
              </button>
            )}
            <div>
              <h1 className={isDarkHome ? "text-lg font-semibold text-slate-50" : "text-lg font-semibold"}>
                {isHome
                  ? "Projeto Grafos"
                  : inPart1
                  ? "Rede de Aeroportos"
                  : "Rede Musical Spotify"}
              </h1>
              <p className={isDarkHome ? "text-xs text-slate-400" : "text-xs text-neutral-500"}>
                {isHome ? (
                  "CESAR · Teoria dos Grafos · BFS · DFS · Dijkstra · Bellman-Ford"
                ) : (
                  <>
                    Brasil · atualizado em {updatedLabel}
                    {dataStatus !== "live" && (
                      <span className="ml-1 text-amber-700">· pré-visualização</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          {!isHome && (
            <nav className="flex flex-wrap items-center gap-1">
              {inPart1 && (
                <>
                  <span className="mr-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider select-none">
                    Aeroportos
                  </span>
                  {PART1_PAGES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPageChange(p.id)}
                      className={page === p.id ? "nav-link nav-link-active" : "nav-link"}
                    >
                      {p.label}
                    </button>
                  ))}
                </>
              )}
              {inPart2 && (
                <>
                  <span className="mr-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider select-none">
                    Spotify
                  </span>
                  {PART2_PAGES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPageChange(p.id)}
                      className={page === p.id ? "nav-link nav-link-active" : "nav-link"}
                    >
                      {p.label}
                    </button>
                  ))}
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className={isDarkHome ? "border-t border-slate-800/80 bg-slate-950" : "border-t border-neutral-200 bg-white"}>
        <div className={isDarkHome ? "mx-auto max-w-5xl px-4 py-4 text-xs text-slate-400" : "mx-auto max-w-5xl px-4 py-4 text-xs text-neutral-500"}>
          Projeto Grafos · CESAR · BFS · DFS · Dijkstra · Bellman-Ford ·{" "}
          <span className={isDarkHome ? "text-slate-500" : "text-neutral-400"}>
            Parte 1: Rede de Aeroportos · Parte 2: Spotify
          </span>
        </div>
      </footer>
    </div>
  );
}
