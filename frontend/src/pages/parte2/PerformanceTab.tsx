import type { Parte2Data, Parte2Performance } from "../../types";
import { SectionTitle } from "./_shared";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { faPython, faJs } from "@fortawesome/free-brands-svg-icons";


const COMPLEXITY_DATA = [
  {
    alg: "BFS",
    time: "O(V + E)",
    space: "O(V)",
    negWeights: false,
    cycleDetect: false,
    ideal: "Caminho mínimo por saltos, BFS multi-source",
    color: "bg-sky-50 border-sky-200",
  },
  {
    alg: "DFS",
    time: "O(V + E)",
    space: "O(V)",
    negWeights: false,
    cycleDetect: true,
    ideal: "Detecção de ciclos, ord. topológica, SCC",
    color: "bg-violet-50 border-violet-200",
  },
  {
    alg: "Dijkstra",
    time: "O((V+E) log V)",
    space: "O(V)",
    negWeights: false,
    cycleDetect: false,
    ideal: "Caminhos mínimos com pesos ≥ 0 (GPS, redes)",
    color: "bg-emerald-50 border-emerald-200",
  },
  {
    alg: "Bellman-Ford",
    time: "O(V × E)",
    space: "O(V)",
    negWeights: true,
    cycleDetect: true,
    ideal: "Pesos negativos, detecção de ciclos negativos",
    color: "bg-orange-50 border-orange-200",
  },
];


function RuntimeContextBanner({ parte2 }: { parte2: Parte2Data }) {
  const sampleSize = parte2.graph_sample?.nodes?.length ?? "~50";
  const { nodes, edges } = parte2.dataset;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="bg-slate-900 px-5 py-3">
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Como os algoritmos foram medidos
        </p>
      </div>
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faPython} className="text-lg text-neutral-600" />
            <p className="font-bold text-neutral-800 text-sm">Python — dataset real</p>
            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
              dados deste gráfico
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Nós (V)</span>
              <span className="font-mono font-bold text-neutral-800">{nodes.toLocaleString("pt-BR")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Arestas (E)</span>
              <span className="font-mono font-bold text-neutral-800">{edges.toLocaleString("pt-BR")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Granularidade</span>
              <span className="font-mono font-bold text-neutral-800">milissegundos</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Execução</span>
              <span className="font-mono font-bold text-neutral-800">offline · make parte2</span>
            </li>
          </ul>
          <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-100 pt-3">
            Os algoritmos rodaram no dataset completo com Python puro (sem bibliotecas de grafos).
            Os tempos abaixo refletem essa execução — aqui a diferença de complexidade é visível.
          </p>
        </div>


        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faJs} className="text-lg text-neutral-600" />
            <p className="font-bold text-neutral-800 text-sm">JavaScript — demo no browser</p>
            <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 uppercase tracking-wide">
              aba Grafo
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Nós (V)</span>
              <span className="font-mono font-bold text-neutral-800">{sampleSize} (amostra)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Arestas (E)</span>
              <span className="font-mono font-bold text-neutral-800">sub-grafo JSON</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Granularidade</span>
              <span className="font-mono font-bold text-neutral-800">microssegundos</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400 w-24 shrink-0">Execução</span>
              <span className="font-mono font-bold text-neutral-800">em tempo real · browser</span>
            </li>
          </ul>
          <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-100 pt-3">
            A demo interativa usa TypeScript sobre um sub-grafo de amostra carregado do JSON.
            É sempre rápida independente do algoritmo — o tamanho pequeno elimina a diferença de complexidade.
          </p>
        </div>
      </div>
      <div className="bg-amber-50 border-t border-amber-200 px-5 py-3">
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <span className="font-semibold">Por que isso importa:</span>{" "}
          Rodar BFS e Bellman-Ford no mesmo sub-grafo de {sampleSize} nós produz tempos indistinguíveis.
          Somente no dataset completo ({nodes.toLocaleString("pt-BR")} nós · {edges.toLocaleString("pt-BR")} arestas)
          a diferença entre O(V+E) e O(V×E) se torna concreta.
        </p>
      </div>
    </div>
  );
}

function LogPerformanceChart({ perf }: { perf: Parte2Performance }) {
  const entries = [
    { label: "BFS",          ms: perf.bfs_avg_ms,          color: "#38bdf8", desc: "O(V+E)" },
    { label: "DFS",          ms: perf.dfs_avg_ms,          color: "#a78bfa", desc: "O(V+E)" },
    { label: "Dijkstra",     ms: perf.dijkstra_avg_ms,     color: "#22c55e", desc: "O((V+E)logV)" },
    { label: "Bellman-Ford", ms: perf.bellman_ford_avg_ms, color: "#f97316", desc: "O(V×E)" },
  ];
  const logVals = entries.map((e) => Math.log10(Math.max(e.ms, 0.001)));
  const maxLog = Math.max(...logVals, 0.1);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      {entries.map((e, i) => {
        const logV = logVals[i];
        const pct = (logV / maxLog) * 100;
        const ratio = e.ms / Math.max(perf.bfs_avg_ms, 0.001);
        return (
          <div key={e.label} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm">
            <div>
              <span className="font-bold text-neutral-800">{e.label}</span>
              <p className="text-[10px] text-neutral-400 font-mono">{e.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-neutral-100 relative">
                <div
                  className="h-full rounded-lg transition-all"
                  style={{ width: `${Math.max(pct, 3)}%`, background: e.color }}
                />
                <span className="absolute right-2 top-0.5 text-[10px] text-neutral-500 font-medium">
                  {ratio >= 10 ? `${ratio.toFixed(0)}×` : ratio >= 2 ? `${ratio.toFixed(1)}×` : "base"}
                </span>
              </div>
            </div>
            <span className="font-mono text-sm font-bold tabular-nums text-right">{e.ms.toFixed(2)} ms</span>
          </div>
        );
      })}
      <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-3">
        Largura das barras em escala log₁₀(ms). O multiplicador mostra quantas vezes mais lento que BFS.
      </p>
    </div>
  );
}

function ComplexityTable({ perf }: { perf: Parte2Performance }) {
  const msMap: Record<string, number> = {
    "BFS": perf.bfs_avg_ms, "DFS": perf.dfs_avg_ms,
    "Dijkstra": perf.dijkstra_avg_ms, "Bellman-Ford": perf.bellman_ford_avg_ms,
  };
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="text-white">Algoritmo</th>
            <th className="text-white">Tempo</th>
            <th className="text-white">Espaço</th>
            <th className="text-white">Pesos neg.</th>
            <th className="text-white">Detecta ciclos</th>
            <th className="text-white">ms (neste dataset)</th>
            <th className="text-white">Caso de uso ideal</th>
          </tr>
        </thead>
        <tbody>
          {COMPLEXITY_DATA.map((row, i) => (
            <tr key={row.alg} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
              <td className="font-bold text-sm">{row.alg}</td>
              <td className="font-mono text-xs">{row.time}</td>
              <td className="font-mono text-xs">{row.space}</td>
              <td>
                <FontAwesomeIcon
                  icon={row.negWeights ? faCheck : faXmark}
                  className={`text-sm ${row.negWeights ? "text-green-600" : "text-red-500"}`}
                />
              </td>
              <td>
                <FontAwesomeIcon
                  icon={row.cycleDetect ? faCheck : faXmark}
                  className={`text-sm ${row.cycleDetect ? "text-green-600" : "text-red-500"}`}
                />
              </td>
              <td className="font-mono text-xs font-bold">{msMap[row.alg]?.toFixed(2)} ms</td>
              <td className="text-xs text-neutral-600 max-w-48">{row.ideal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


export function PerformanceTab({ parte2 }: { parte2: Parte2Data }) {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SectionTitle>Contexto de Execução</SectionTitle>
        <RuntimeContextBanner parte2={parte2} />
      </section>

      <section className="space-y-4">
        <SectionTitle>Comparação de Desempenho (escala logarítmica)</SectionTitle>
        <p className="text-sm text-neutral-600">
          Escala log₁₀ — permite visualizar a diferença de ordens de grandeza entre algoritmos.
          Bellman-Ford (O(V×E)) é dramaticamente mais lento que BFS/DFS (O(V+E)).
        </p>
        <LogPerformanceChart perf={parte2.performance_summary} />
      </section>

      <section className="space-y-4">
        <SectionTitle>Tabela de Complexidades</SectionTitle>
        <p className="text-sm text-neutral-600">
          Comparativo das complexidades teóricas frente ao tempo real medido neste dataset. Confirma na
          prática o que a teoria prevê: BFS e DFS (O(V+E)) são os mais rápidos, e Bellman-Ford (O(V×E))
          é o mais custoso.
        </p>
        <ComplexityTable perf={parte2.performance_summary} />
      </section>
    </div>
  );
}
