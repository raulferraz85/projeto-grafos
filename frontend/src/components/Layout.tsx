import type { ReactNode } from "react";
import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import { EM_DASH, formatDateTime } from "../lib/format";

export type Page = "overview" | "rankings" | "routes" | "graph" | "airports";

const PAGES: { id: Page; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "rankings", label: "Rankings" },
  { id: "routes", label: "Rotas" },
  { id: "graph", label: "Grafo" },
  { id: "airports", label: "Aeroportos" },
];

interface Props {
  data: AppData;
  page: Page;
  onPageChange: (page: Page) => void;
  dataStatus: DataStatus;
  children: ReactNode;
}

export function Layout({ data, page, onPageChange, dataStatus, children }: Props) {
  const updatedLabel =
    dataStatus === "live" ? formatDateTime(data.generatedAt) : EM_DASH;
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Rede de Aeroportos</h1>
            <p className="text-xs text-neutral-500">
              Brasil · atualizado em {updatedLabel}
              {dataStatus !== "live" && (
                <span className="ml-1 text-amber-700">· pré-visualização</span>
              )}
            </p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {PAGES.map((p) => (
              <button
                key={p.id}
                onClick={() => onPageChange(p.id)}
                className={page === p.id ? "nav-link nav-link-active" : "nav-link"}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-neutral-500">
          Projeto Grafos · CESAR · BFS · DFS · Dijkstra · Bellman-Ford
        </div>
      </footer>
    </div>
  );
}
