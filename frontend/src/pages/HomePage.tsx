
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
      <div className="pt-1 text-center space-y-4">
        <div className="flex justify-center">
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-600">
            Teoria dos Grafos · CESAR
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Escolha o dataset
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-neutral-600">
            Dois grafos, quatro algoritmos e uma interface clara para explorar a malha aérea e a
            rede musical.
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-2 sm:grid-cols-2">
        <button
          className="group cursor-pointer rounded-2xl border border-neutral-200 bg-white p-5 text-left text-neutral-900 shadow-sm transition-transform transition-shadow hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          onClick={() => onNavigate("overview")}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Dataset 1
              </span>
              <span className="text-xs text-neutral-400 transition-colors group-hover:text-neutral-600">
                Explorar →
              </span>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Rede de Aeroportos</h3>
            <p className="text-sm leading-relaxed text-neutral-600">
              Malha aérea brasileira — nós são aeroportos, arestas representam conexões com peso
              em minutos de voo (distância haversine ÷ 800 km/h + 30 min).
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatMini label="Aeroportos" value={live ? formatNumber(data.stats.airportCount) : "128"} />
            <StatMini label="Conexões" value={live ? formatNumber(data.stats.edgeCount) : "426"} />
            <StatMini label="Regiões" value={live ? formatNumber(data.stats.regionCount) : "5"} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Grafo interativo"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>

        <button
          className={`group rounded-2xl border border-neutral-200 bg-white p-5 text-left text-neutral-900 shadow-sm transition-transform transition-shadow hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md ${
            has2 ? "cursor-pointer" : "opacity-70"
          }`}
          onClick={has2 ? () => onNavigate("p2-dataset") : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
                Dataset 2
              </span>
              {has2 && (
                <span className="text-xs text-neutral-400 transition-colors group-hover:text-neutral-600">
                  Explorar →
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Rede Musical Spotify</h3>
            <p className="text-sm leading-relaxed text-neutral-600">
              Grafo de similaridade musical — músicas conectadas por proximidade nos features de
              áudio (k-NN). Demonstra Bellman-Ford com pesos negativos (valence − energy).
            </p>
          </div>

          {has2 && data.parte2 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatMini label="Músicas (nós)" value={formatNumber(data.parte2.dataset.nodes)} />
              <StatMini label="Conexões" value={formatNumber(data.parte2.dataset.edges)} />
              <StatMini label="Grau médio" value={formatNumber(data.parte2.dataset.degree_mean, 1)} />
            </div>
          ) : (
            <div className="mt-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
              <p className="font-medium">Dataset não processado.</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>
                  Baixe{" "}
                  <span className="rounded bg-amber-100 px-1 font-mono text-amber-900">
                    spotify_tracks.csv
                  </span>{" "}
                  em{" "}
                  <span className="rounded bg-amber-100 px-1 font-mono text-amber-900">
                    data/dataset_parte2/
                  </span>
                </li>
                <li>
                  Execute{" "}
                  <span className="rounded bg-amber-100 px-1 font-mono text-amber-900">
                    python scripts/generate_parte2.py
                  </span>
                </li>
              </ol>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Pesos negativos"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div className="grid gap-4 px-2 sm:grid-cols-3">
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
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-center">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-neutral-900">
        {value}
      </p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="text-xs leading-relaxed text-neutral-600">{body}</p>
    </div>
  );
}
