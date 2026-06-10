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
    <div className="space-y-10">
      <div className="pt-4 text-center space-y-2">
        <h2 className="text-2xl font-semibold text-neutral-800">Escolha o dataset</h2>
        <p className="text-sm text-neutral-500">
          Dois grafos, quatro algoritmos: BFS · DFS · Dijkstra · Bellman-Ford
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Dataset 1 — Aeroportos */}
        <button
          className="card text-left space-y-4 hover:shadow-md transition-shadow group cursor-pointer"
          onClick={() => onNavigate("overview")}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Dataset 1
              </span>
              <span className="text-xs text-neutral-300 group-hover:text-neutral-500 transition-colors">
                Explorar →
              </span>
            </div>
            <h3 className="text-lg font-semibold text-neutral-800">Rede de Aeroportos</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Malha aérea brasileira — nós são aeroportos, arestas representam conexões com peso
              em minutos de voo (distância haversine ÷ 800 km/h + 30 min).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatMini
              label="Aeroportos"
              value={live ? formatNumber(data.stats.airportCount) : "128"}
            />
            <StatMini
              label="Conexões"
              value={live ? formatNumber(data.stats.edgeCount) : "426"}
            />
            <StatMini
              label="Regiões"
              value={live ? formatNumber(data.stats.regionCount) : "5"}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Grafo interativo"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Dataset 2 — Spotify */}
        <button
          className={`card text-left space-y-4 transition-shadow group ${
            has2 ? "hover:shadow-md cursor-pointer" : "opacity-70 cursor-default"
          }`}
          onClick={has2 ? () => onNavigate("parte2") : undefined}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Dataset 2
              </span>
              {has2 && (
                <span className="text-xs text-neutral-300 group-hover:text-neutral-500 transition-colors">
                  Explorar →
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-neutral-800">Rede Musical Spotify</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
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
            <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700 space-y-1">
              <p className="font-medium">Dataset não processado.</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>
                  Baixe{" "}
                  <span className="rounded bg-amber-100 px-1 font-mono">spotify_tracks.csv</span>{" "}
                  em{" "}
                  <span className="rounded bg-amber-100 px-1 font-mono">data/dataset_parte2/</span>
                </li>
                <li>
                  Execute{" "}
                  <span className="rounded bg-amber-100 px-1 font-mono">make parte2</span>
                </li>
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Pesos negativos"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      {/* Info row */}
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
    <div className="rounded-lg bg-neutral-50 px-3 py-2 text-center">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-neutral-800">
        {value}
      </p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card space-y-1">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <p className="text-xs leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}
