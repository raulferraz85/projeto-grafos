import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import type { Page } from "../components/Layout";
import { formatNumber } from "../lib/format";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
  onNavigate: (page: Page) => void;
  homeTheme: "dark" | "light";
  onThemeToggle: () => void;
}

export function HomePage({ data, dataStatus, onNavigate, homeTheme, onThemeToggle }: Props) {
  const live = dataStatus === "live";
  const has2 = live && !!data.parte2;
  const dark = homeTheme === "dark";

  return (
    <div
      className={
        dark
          ? "relative isolate space-y-10 overflow-hidden"
          : "relative isolate space-y-10 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-1 text-neutral-900 shadow-sm"
      }
    >
      <div
        className={
          dark
            ? "pointer-events-none absolute inset-0 -z-10"
            : "pointer-events-none absolute inset-0 -z-10"
        }
      >
        {dark && (
          <>
            <div className="absolute left-[-8rem] top-[-6rem] h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          </>
        )}
      </div>

      <div className="flex justify-end px-2 pt-2">
        <button
          type="button"
          onClick={onThemeToggle}
          className={
            dark
              ? "rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 shadow-lg shadow-cyan-950/30 transition hover:border-cyan-500/40 hover:text-cyan-200"
              : "rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
          }
        >
          {dark ? "Voltar ao tema original" : "Ativar modo escuro"}
        </button>
      </div>

      <div className="pt-1 text-center space-y-4">
        <div className="flex justify-center">
          <span
            className={
              dark
                ? "rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300 shadow-lg shadow-cyan-950/30"
                : "rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-600"
            }
          >
            {dark ? "Dark mode" : "Tema original"}
          </span>
        </div>
        <div className="space-y-2">
          <h2 className={dark ? "text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl" : "text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl"}>
            Escolha o dataset
          </h2>
          <p className={dark ? "mx-auto max-w-2xl text-sm leading-relaxed text-slate-400" : "mx-auto max-w-2xl text-sm leading-relaxed text-neutral-600"}>
            Dois grafos, quatro algoritmos e uma interface com contraste alto para explorar a
            malha aérea e a rede musical com mais conforto visual.
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-2 sm:grid-cols-2">
        <button
          className={
            dark
              ? "group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur transition-transform transition-shadow hover:-translate-y-0.5 hover:border-cyan-500/30 hover:shadow-cyan-950/20"
              : "group cursor-pointer rounded-2xl border border-neutral-200 bg-white p-5 text-left text-neutral-900 shadow-sm transition-transform transition-shadow hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          }
          onClick={() => onNavigate("overview")}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={dark ? "text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80" : "text-xs font-semibold uppercase tracking-[0.22em] text-sky-700"}>
                Dataset 1
              </span>
              <span className={dark ? "text-xs text-slate-500 transition-colors group-hover:text-cyan-200" : "text-xs text-neutral-400 transition-colors group-hover:text-neutral-600"}>
                Explorar →
              </span>
            </div>
            <h3 className={dark ? "text-lg font-semibold text-slate-50" : "text-lg font-semibold text-neutral-900"}>Rede de Aeroportos</h3>
            <p className={dark ? "text-sm leading-relaxed text-slate-400" : "text-sm leading-relaxed text-neutral-600"}>
              Malha aérea brasileira — nós são aeroportos, arestas representam conexões com peso
              em minutos de voo (distância haversine ÷ 800 km/h + 30 min).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatMini dark={dark} label="Aeroportos" value={live ? formatNumber(data.stats.airportCount) : "128"} />
            <StatMini dark={dark} label="Conexões" value={live ? formatNumber(data.stats.edgeCount) : "426"} />
            <StatMini dark={dark} label="Regiões" value={live ? formatNumber(data.stats.regionCount) : "5"} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Grafo interativo"].map((tag) => (
              <span
                key={tag}
                className={
                  dark
                    ? "rounded-full border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                    : "rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        </button>

        <button
          className={`group rounded-2xl border p-5 text-left shadow-sm transition-transform transition-shadow ${
            dark
              ? "cursor-pointer border-slate-800 bg-slate-900/85 text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-violet-950/20"
              : "cursor-pointer border-neutral-200 bg-white text-neutral-900 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          } ${has2 ? "" : "opacity-70"}`}
          onClick={has2 ? () => onNavigate("parte2") : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={dark ? "text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80" : "text-xs font-semibold uppercase tracking-[0.22em] text-violet-700"}>
                Dataset 2
              </span>
              {has2 && (
                <span className={dark ? "text-xs text-slate-500 transition-colors group-hover:text-violet-200" : "text-xs text-neutral-400 transition-colors group-hover:text-neutral-600"}>
                  Explorar →
                </span>
              )}
            </div>
            <h3 className={dark ? "text-lg font-semibold text-slate-50" : "text-lg font-semibold text-neutral-900"}>Rede Musical Spotify</h3>
            <p className={dark ? "text-sm leading-relaxed text-slate-400" : "text-sm leading-relaxed text-neutral-600"}>
              Grafo de similaridade musical — músicas conectadas por proximidade nos features de
              áudio (k-NN). Demonstra Bellman-Ford com pesos negativos (valence − energy).
            </p>
          </div>

          {has2 && data.parte2 ? (
            <div className="grid grid-cols-3 gap-2">
              <StatMini dark={dark} label="Músicas (nós)" value={formatNumber(data.parte2.dataset.nodes)} />
              <StatMini dark={dark} label="Conexões" value={formatNumber(data.parte2.dataset.edges)} />
              <StatMini dark={dark} label="Grau médio" value={formatNumber(data.parte2.dataset.degree_mean, 1)} />
            </div>
          ) : (
            <div className={dark ? "space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100" : "space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900"}>
              <p className="font-medium">Dataset não processado.</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>
                  Baixe{" "}
                  <span className={dark ? "rounded bg-amber-500/15 px-1 font-mono text-amber-50" : "rounded bg-amber-100 px-1 font-mono text-amber-900"}>
                    spotify_tracks.csv
                  </span>{" "}
                  em{" "}
                  <span className={dark ? "rounded bg-amber-500/15 px-1 font-mono text-amber-50" : "rounded bg-amber-100 px-1 font-mono text-amber-900"}>
                    data/dataset_parte2/
                  </span>
                </li>
                <li>
                  Execute{" "}
                  <span className={dark ? "rounded bg-amber-500/15 px-1 font-mono text-amber-50" : "rounded bg-amber-100 px-1 font-mono text-amber-900"}>
                    python scripts/generate_parte2.py
                  </span>
                </li>
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Pesos negativos"].map((tag) => (
              <span
                key={tag}
                className={
                  dark
                    ? "rounded-full border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                    : "rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div className="grid gap-4 px-2 sm:grid-cols-3">
        <InfoCard
          dark={dark}
          title="4 Algoritmos"
          body="BFS, DFS, Dijkstra e Bellman-Ford implementados do zero em Python, sem bibliotecas externas de grafos."
        />
        <InfoCard
          dark={dark}
          title="2 Datasets"
          body="Grafos com características distintas: aeroportos (esparso, geográfico) e música (denso, k-NN por features de áudio)."
        />
        <InfoCard
          dark={dark}
          title="Análise comparativa"
          body="Tempo de execução, complexidade teórica e trade-offs documentados para cada algoritmo em cada dataset."
        />
      </div>
    </div>
  );
}

function StatMini({ dark, label, value }: { dark: boolean; label: string; value: string }) {
  return (
    <div className={dark ? "rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-center" : "rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-center"}>
      <p className={dark ? "text-xs text-slate-400" : "text-xs text-neutral-500"}>{label}</p>
      <p className={dark ? "mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-50" : "mt-0.5 font-mono text-sm font-semibold tabular-nums text-neutral-900"}>
        {value}
      </p>
    </div>
  );
}

function InfoCard({ dark, title, body }: { dark: boolean; title: string; body: string }) {
  return (
    <div className={dark ? "space-y-1 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/30" : "space-y-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"}>
      <p className={dark ? "text-sm font-semibold text-slate-50" : "text-sm font-semibold text-neutral-900"}>{title}</p>
      <p className={dark ? "text-xs leading-relaxed text-slate-400" : "text-xs leading-relaxed text-neutral-600"}>{body}</p>
    </div>
  );
}
