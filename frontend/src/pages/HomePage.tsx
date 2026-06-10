import type { AppData } from "../types";
import type { DataStatus } from "../lib/placeholderData";
import type { Page } from "../components/Layout";
import { formatNumber } from "../lib/format";

interface Props {
  data: AppData;
  dataStatus: DataStatus;
  onNavigate: (page: Page) => void;
}

export function HomePage({ data, dataStatus, onNavigate }: Props) {
  const live = dataStatus === "live";
  const has2 = live && !!data.parte2;

  return (
    <div className="relative isolate space-y-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-8rem] top-[-6rem] h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="pt-4 text-center space-y-4">
        <div className="flex justify-center">
          <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300 shadow-lg shadow-cyan-950/30">
            Dark mode
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Escolha o dataset
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-400">
            Dois grafos, quatro algoritmos e uma interface com contraste alto para explorar a
            malha aérea e a rede musical com mais conforto visual.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Dataset 1 — Aeroportos */}
        <button
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur transition-transform transition-shadow hover:-translate-y-0.5 hover:border-cyan-500/30 hover:shadow-cyan-950/20"
          onClick={() => onNavigate("overview")}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                Dataset 1
              </span>
              <span className="text-xs text-slate-500 transition-colors group-hover:text-cyan-200">
                Explorar →
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-50">Rede de Aeroportos</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Malha aérea brasileira — nós são aeroportos, arestas representam conexões com peso
              em minutos de voo (distância haversine ÷ 800 km/h + 30 min).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatMini
              label="Aeroportos"
              value={live ? formatNumber(data.stats.airportCount) : "128"}
            />
            <StatMini label="Conexões" value={live ? formatNumber(data.stats.edgeCount) : "426"} />
            <StatMini label="Regiões" value={live ? formatNumber(data.stats.regionCount) : "5"} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Grafo interativo"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Dataset 2 — Spotify */}
        <button
          className={`group rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur transition-transform transition-shadow ${
            has2
              ? "cursor-pointer hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-violet-950/20"
              : "cursor-default opacity-70"
          }`}
          onClick={has2 ? () => onNavigate("parte2") : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300/80">
                Dataset 2
              </span>
              {has2 && (
                <span className="text-xs text-slate-500 transition-colors group-hover:text-violet-200">
                  Explorar →
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-50">Rede Musical Spotify</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Grafo de similaridade musical — músicas conectadas por proximidade nos features de
              áudio (k-NN). Demonstra Bellman-Ford com pesos negativos (valence − energy).
            </p>
          </div>

          {has2 && data.parte2 ? (
            <div className="grid grid-cols-3 gap-2">
              <StatMini label="Músicas (nós)" value={formatNumber(data.parte2.dataset.nodes)} />
              <StatMini label="Conexões" value={formatNumber(data.parte2.dataset.edges)} />
              <StatMini
                label="Grau médio"
                value={formatNumber(data.parte2.dataset.degree_mean, 1)}
              />
            </div>
          ) : (
            <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100">
              <p className="font-medium">Dataset não processado.</p>
              <ol className="ml-4 list-decimal space-y-0.5 text-amber-100/90">
                <li>
                  Baixe{" "}
                  <span className="rounded bg-amber-500/15 px-1 font-mono text-amber-50">
                    spotify_tracks.csv
                  </span>{" "}
                  em{" "}
                  <span className="rounded bg-amber-500/15 px-1 font-mono text-amber-50">
                    data/dataset_parte2/
                  </span>
                </li>
                <li>
                  Execute{" "}
                  <span className="rounded bg-amber-500/15 px-1 font-mono text-amber-50">
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
                className="rounded-full border border-slate-800 bg-slate-950/70 px-2 py-0.5 text-[11px] font-medium text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard
          title="4 Algoritmos"
          body="BFS, DFS, Dijkstra e Bellman-Ford implementados do zero em Python, sem bibliotecas externas de grafos."
        />
        <InfoCard
          title="2 Datasets"
          body="Grafos com características distintas: aeroportos (esparso, geográfico) e música (denso, k-NN por features de áudio)."
        />
        <InfoCard
          title="Análise comparativa"
          body="Tempo de execução, complexidade teórica e trade-offs documentados para cada algoritmo em cada dataset."
        />
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-50">{value}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/30">
      <p className="text-sm font-semibold text-slate-50">{title}</p>
      <p className="text-xs leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
