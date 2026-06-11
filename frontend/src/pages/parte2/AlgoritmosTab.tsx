import type { Parte2Data, BfsResult, DijkstraResult, BellmanFordCase } from "../../types";

import { EM_DASH, formatNumber } from "../../lib/format";

import { SectionTitle, Badge } from "./_shared";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";


const ALGO_CARDS = [
  {
    name: "BFS",
    fullName: "Breadth-First Search",
    complexity: "O(V + E)",
    space: "O(V)",
    color: { border: "border-sky-300", bg: "bg-sky-50", badge: "bg-sky-100 text-sky-700", title: "text-sky-800" },
    useCase: "Caminho mínimo por nº de saltos, componentes conexas",
    supports: { negWeights: false, cycleDetect: false },
  },
  {
    name: "DFS",
    fullName: "Depth-First Search",
    complexity: "O(V + E)",
    space: "O(V)",
    color: { border: "border-violet-300", bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700", title: "text-violet-800" },
    useCase: "Detecção de ciclos, ordenação topológica, componentes fortemente conexas",
    supports: { negWeights: false, cycleDetect: true },
  },
  {
    name: "Dijkstra",
    fullName: "Dijkstra's Algorithm",
    complexity: "O((V+E) log V)",
    space: "O(V)",
    color: { border: "border-emerald-300", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", title: "text-emerald-800" },
    useCase: "Caminho mais curto com pesos ≥ 0, roteamento GPS",
    supports: { negWeights: false, cycleDetect: false },
  },
  {
    name: "Bellman-Ford",
    fullName: "Bellman-Ford Algorithm",
    complexity: "O(V × E)",
    space: "O(V)",
    color: { border: "border-orange-300", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", title: "text-orange-800" },
    useCase: "Caminhos com pesos negativos, detecção de ciclos negativos",
    supports: { negWeights: true, cycleDetect: true },
  },
];


function AlgoFlashcard({ card }: { card: typeof ALGO_CARDS[0] }) {
  const c = card.color;
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`font-bold text-lg ${c.title}`}>{card.name}</p>
          <p className="text-xs text-neutral-500">{card.fullName}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-mono font-bold shrink-0 ${c.badge}`}>
          {card.complexity}
        </span>
      </div>
      <p className="text-xs text-neutral-600 leading-relaxed">{card.useCase}</p>
      <div className="flex gap-2 text-[10px]">
        <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${card.supports.negWeights ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          <FontAwesomeIcon icon={card.supports.negWeights ? faCheck : faXmark} /> pesos neg.
        </span>
        <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${card.supports.cycleDetect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          <FontAwesomeIcon icon={card.supports.cycleDetect ? faCheck : faXmark} /> ciclos
        </span>
      </div>
    </div>
  );
}

function BfsPyramidChart({ result, label }: { result: BfsResult; label: string }) {
  const sizes = result.layer_sizes.slice(0, 15);
  if (sizes.length === 0) return null;
  const maxC = Math.max(...sizes, 1);

  const W = 280; const H = 200;
  const PL = 32; const PR = 8; const PT = 10; const PB = 28;
  const iW = W - PL - PR; const iH = H - PT - PB;
  const bW = iW / sizes.length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold text-neutral-700 mb-1 truncate">{label}</p>
      <p className="text-[10px] text-neutral-400 mb-3 truncate">{result.source_genre} · {formatNumber(result.visited)} nós</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map((f) => {
          const y = PT + iH * (1 - f);
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={PL + iW} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PL - 3} y={y + 3} textAnchor="end" fontSize={7} fill="#94a3b8">{Math.round(f * maxC)}</text>
            </g>
          );
        })}
        {sizes.map((count, i) => {
          const x = PL + i * bW;
          const bH = (count / maxC) * iH;
          const y = PT + iH - bH;
          const isPeak = count === maxC;
          return (
            <g key={i}>
              <rect x={x + 1} y={y} width={bW - 2} height={bH}
                fill={isPeak ? "#fb923c" : "#38bdf8"} rx={2} />
              {bH > 14 && (
                <text x={x + bW / 2} y={y + 10} textAnchor="middle" fontSize={7} fill="white" fontWeight="700">
                  {count > 999 ? `${(count/1000).toFixed(1)}k` : count}
                </text>
              )}
              <text x={x + bW / 2} y={H - 4} textAnchor="middle" fontSize={7} fill="#94a3b8">{i}</text>
            </g>
          );
        })}
        <text x={PL + iW / 2} y={H} textAnchor="middle" fontSize={8} fill="#64748b">camada</text>
      </svg>
      <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
        <span>tempo: {result.time_ms.toFixed(1)} ms</span>
        <span>{result.max_layer} camadas</span>
      </div>
    </div>
  );
}

function DijkstraJourney({ result }: { result: DijkstraResult }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-emerald-800">
          {result.hops} salto{result.hops !== 1 ? "s" : ""} · custo {result.cost.toFixed(4)}
        </p>
        <span className="text-[10px] text-emerald-600 font-mono">{result.time_ms.toFixed(1)} ms</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {result.path_labels.map((lbl, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="rounded-lg bg-white border border-emerald-200 shadow-sm px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 max-w-36 truncate" title={lbl}>
              {lbl}
            </span>
            {i < result.path_labels.length - 1 && (
              <span className="text-emerald-400 text-xs font-bold">→</span>
            )}
          </span>
        ))}
        {result.path_labels.length >= 8 && (
          <span className="text-emerald-400 text-xs">…</span>
        )}
      </div>
    </div>
  );
}

function BellmanFordSection({
  negWeightCase, negCycleCase,
}: {
  negWeightCase: BellmanFordCase;
  negCycleCase: BellmanFordCase;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle>Bellman-Ford — Pesos Negativos</SectionTitle>
      <p className="text-sm text-neutral-600">
        Dois casos demonstrados: (1) grafo mood-score (pesos negativos, sem ciclos negativos — DAG);
        (2) grafo sintético com ciclo negativo detectado.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-amber-800 text-sm">Caso 1 — Pesos Negativos Sem Ciclo</h3>
            {negWeightCase.error ? (
              <Badge color="red">Erro</Badge>
            ) : (
              <Badge color={negWeightCase.negative_cycle ? "red" : "green"}>
                {negWeightCase.negative_cycle ? "Ciclo!" : <span className="flex items-center gap-1">Sem ciclo <FontAwesomeIcon icon={faCheck} /></span>}
              </Badge>
            )}
          </div>
          {negWeightCase.error ? (
            <p className="text-xs text-red-600">{negWeightCase.error}</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <dt className="text-neutral-500">Arestas mood</dt>
                <dd className="font-mono">{formatNumber(negWeightCase.total_mood_edges ?? 0)}</dd>
                <dt className="text-neutral-500">Arestas negativas</dt>
                <dd className="font-mono text-amber-700">
                  {formatNumber(negWeightCase.negative_edges_count ?? 0)}{" "}
                  <span className="text-neutral-400">({negWeightCase.pct_negative?.toFixed(1)}%)</span>
                </dd>
                <dt className="text-neutral-500">Custo encontrado</dt>
                <dd className="font-mono font-bold">
                  {negWeightCase.cost != null ? negWeightCase.cost.toFixed(4) : EM_DASH}
                </dd>
                <dt className="text-neutral-500">Tempo</dt>
                <dd className="font-mono">{negWeightCase.time_ms?.toFixed(1)} ms</dd>
              </dl>
              {negWeightCase.path_labels && negWeightCase.path_labels.length > 0 && (
                <div className="text-xs text-neutral-600">
                  <p className="font-semibold mb-1">Caminho:</p>
                  <div className="flex flex-wrap gap-1">
                    {negWeightCase.path_labels.map((lbl, i) => (
                      <span key={i} className="bg-white rounded px-1.5 py-0.5 text-[10px] border border-amber-200 truncate max-w-32" title={lbl}>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {negWeightCase.description && (
                <p className="text-[10px] text-neutral-400 leading-relaxed">{negWeightCase.description}</p>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-red-800 text-sm">Caso 2 — Ciclo Negativo Detectado</h3>
            <Badge color={negCycleCase.negative_cycle_detected ? "green" : "red"}>
              {negCycleCase.negative_cycle_detected ? <span className="flex items-center gap-1">Detectado <FontAwesomeIcon icon={faCheck} /></span> : "Não detectado"}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-neutral-500">Nós no grafo</dt>
            <dd className="font-mono">{negCycleCase.graph_nodes ?? EM_DASH}</dd>
            <dt className="text-neutral-500">Ciclo negativo</dt>
            <dd className="font-mono font-bold text-red-700">S1→S2→S3→S1 = −3.5</dd>
            <dt className="text-neutral-500">Tempo</dt>
            <dd className="font-mono">{negCycleCase.time_ms?.toFixed(3)} ms</dd>
          </dl>
          {negCycleCase.graph_edges_directed && (
            <div className="text-xs">
              <p className="font-semibold text-neutral-600 mb-1">Arestas do grafo sintético:</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {negCycleCase.graph_edges_directed.map((e, i) => (
                  <span key={i} className={`font-mono ${e.weight < 0 ? "text-red-600 font-bold" : "text-neutral-600"}`}>
                    {e.from}→{e.to}: {e.weight > 0 ? "+" : ""}{e.weight}
                  </span>
                ))}
              </div>
            </div>
          )}
          {negCycleCase.description && (
            <p className="text-[10px] text-neutral-400 leading-relaxed">{negCycleCase.description}</p>
          )}
        </div>
      </div>
    </section>
  );
}


export function AlgoritmosTab({ parte2 }: { parte2: Parte2Data }) {
  const sample = parte2.graph_sample;
  const labels = ["Hub (maior grau)", "Mediano", "Periférico (menor grau)"];

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SectionTitle>Algoritmos Implementados</SectionTitle>
        <p className="text-sm text-neutral-600">
          Os quatro algoritmos de travessia e caminho mínimo implementados do zero. Cada cartão traz a
          complexidade de tempo/espaço, o caso de uso típico e se o algoritmo suporta pesos negativos e
          detecção de ciclos — os critérios que decidem qual usar em cada cenário.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ALGO_CARDS.map((c) => (
            <AlgoFlashcard key={c.name} card={c} />
          ))}
        </div>
      </section>

      {parte2.bfs_results.length > 0 && parte2.dfs_results.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>BFS vs DFS — Comparação Lado a Lado</SectionTitle>
          <p className="text-sm text-neutral-600">
            Mesmas 3 fontes, dois algoritmos distintos. BFS explora por camadas (largura);
            DFS mergulha em profundidade e detecta ciclos via back-edges.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sky-800">BFS — Busca em Largura</h3>
                <span className="rounded-full bg-sky-100 text-sky-700 text-xs px-2 py-0.5 font-medium">O(V+E)</span>
              </div>
              <ul className="text-xs text-sky-700 space-y-1">
                <li className="flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="text-green-600 shrink-0" /> Garante caminho mínimo por número de saltos</li>
                <li className="flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="text-green-600 shrink-0" /> Explora em camadas (distâncias crescentes)</li>
                <li className="flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} className="text-red-500 shrink-0" /> Não considera pesos das arestas</li>
              </ul>
              <div className="space-y-2">
                {parte2.bfs_results.map((r, i) => (
                  <div key={r.source} className="rounded-lg bg-white border border-sky-200 p-2 text-xs">
                    <div className="flex justify-between font-medium text-neutral-700 mb-1">
                      <span className="truncate max-w-36">{labels[i] ?? `Fonte ${i+1}`}</span>
                      <span className="font-mono text-sky-600 shrink-0">{r.time_ms.toFixed(1)} ms</span>
                    </div>
                    <div className="flex gap-3 text-neutral-500">
                      <span>visitados: <strong className="text-neutral-700">{formatNumber(r.visited)}</strong></span>
                      <span>camadas: <strong className="text-neutral-700">{r.max_layer}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-violet-800">DFS — Busca em Profundidade</h3>
                <span className="rounded-full bg-violet-100 text-violet-700 text-xs px-2 py-0.5 font-medium">O(V+E)</span>
              </div>
              <ul className="text-xs text-violet-700 space-y-1">
                <li className="flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="text-green-600 shrink-0" /> Detecta ciclos via back-edges</li>
                <li className="flex items-center gap-1.5"><FontAwesomeIcon icon={faCheck} className="text-green-600 shrink-0" /> Classifica arestas (Tree/Back/Forward/Cross)</li>
                <li className="flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} className="text-red-500 shrink-0" /> Não garante caminho mínimo</li>
              </ul>
              <div className="space-y-2">
                {parte2.dfs_results.map((r, i) => (
                  <div key={r.source} className="rounded-lg bg-white border border-violet-200 p-2 text-xs">
                    <div className="flex justify-between font-medium text-neutral-700 mb-1">
                      <span className="truncate max-w-36">{labels[i] ?? `Fonte ${i+1}`}</span>
                      <span className="font-mono text-violet-600 shrink-0">{r.time_ms.toFixed(1)} ms</span>
                    </div>
                    <div className="flex gap-3 text-neutral-500">
                      <span>visitados: <strong className="text-neutral-700">{formatNumber(r.visited)}</strong></span>
                      <span>back-edges: <strong className={r.has_cycle ? "text-amber-600" : "text-green-700"}>{r.back_edges}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {parte2.bfs_results.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>BFS — Distribuição por Camadas</SectionTitle>
          <p className="text-sm text-neutral-600">
            Cada barra representa quantos nós foram descobertos naquela camada BFS. O hub alcança mais nós
            por camada devido ao seu alto grau de saída.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {parte2.bfs_results.map((r, i) => (
              <BfsPyramidChart key={r.source} result={r} label={labels[i] ?? `Fonte ${i+1}`} />
            ))}
          </div>
        </section>
      )}

      {parte2.dijkstra_results.filter((r) => r.reachable && r.path_labels.length > 1).length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Dijkstra — Jornada Musical</SectionTitle>
          <p className="text-sm text-neutral-600">
            Caminho mais curto (soma de distâncias euclidianas) entre pares de músicas. Cada parada é um gênero
            intermediário na "viagem" musical.
          </p>
          <div className="space-y-4">
            {parte2.dijkstra_results.filter((r) => r.reachable && r.path_labels.length > 1).slice(0, 3).map((r, i) => (
              <DijkstraJourney key={i} result={r} />
            ))}
          </div>
        </section>
      )}

      <BellmanFordSection
        negWeightCase={parte2.bellman_ford_results.negative_weight_case}
        negCycleCase={parte2.bellman_ford_results.negative_cycle_case}
      />
    </div>
  );
}
