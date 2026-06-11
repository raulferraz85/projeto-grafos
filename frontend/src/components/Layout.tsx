import type { ReactNode } from "react";
import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatDateTime } from "../lib/format";

export type Page =
  | "home"
  | "overview"
  | "rankings"
  | "routes"
  | "graph"
  | "airports"
  | "p2-dataset"
  | "p2-grafo"
  | "p2-algoritmos"
  | "p2-performance";

const PART1_PAGES: { id: Page; label: string }[] = [
  { id: "overview",  label: "Visão geral" },
  { id: "rankings",  label: "Rankings" },
  { id: "routes",    label: "Rotas" },
  { id: "graph",     label: "Grafo" },
  { id: "airports",  label: "Aeroportos" },
];

const PART2_PAGES: { id: Page; label: string }[] = [
  { id: "p2-dataset",     label: "Dataset" },
  { id: "p2-grafo",       label: "Grafo" },
  { id: "p2-algoritmos",  label: "Algoritmos" },
  { id: "p2-performance", label: "Performance" },
];

const PART1_IDS = new Set<Page>(["overview", "rankings", "routes", "graph", "airports"]);

interface Props {
  data: AppData;
  page: Page;
  onPageChange: (page: Page) => void;
  dataStatus: DataStatus;
  children: ReactNode;
}

export function Layout({ data, page, onPageChange, dataStatus, children }: Props) {
  const isHome = page === "home";
  const inPart1 = PART1_IDS.has(page);
  const navPages = inPart1 ? PART1_PAGES : PART2_PAGES;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
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
              <h1 className="text-lg font-semibold">
                {isHome
                  ? "Projeto Grafos"
                  : inPart1
                  ? "Parte 1 - Rede de Aeroportos"
                  : "Parte 2 - Rede Musical Spotify"}
              </h1>
            </div>
          </div>

          {!isHome && (
            <nav className="flex flex-wrap items-center gap-1">
              {navPages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPageChange(p.id)}
                  className={page === p.id ? "nav-link nav-link-active" : "nav-link"}
                >
                  {p.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-neutral-500">
          Projeto Grafos · CESAR · BFS · DFS · Dijkstra · Bellman-Ford ·{" "}
          <span className="text-neutral-400">
            Parte 1: Rede de Aeroportos · Parte 2: Spotify
          </span>
        </div>
      </footer>
    </div>
  );
}
