import { useEffect, useMemo, useRef, useState } from "react";

import type { Parte2Data, MusicGraphSample, MusicGraphNode } from "../../types";

import { genreColor } from "../../lib/theme";

import { ChartCard } from "../../components/charts/ChartCard";
import { Histogram } from "../../components/charts/Histogram";
import { BarChart, type BarDatum } from "../../components/charts/BarChart";

import { useVisNetwork } from "../../hooks/useVisNetwork";

import { SectionTitle } from "./_shared";


function inSampleDegrees(sample: MusicGraphSample): Record<string, number> {
  const deg: Record<string, number> = {};
  for (const n of sample.nodes) deg[n.id] = 0;
  for (const e of sample.edges) {
    if (deg[e.source] !== undefined) deg[e.source]++;
    if (deg[e.target] !== undefined) deg[e.target]++;
  }
  return deg;
}

function genreCounts(sample: MusicGraphSample): [string, number][] {
  const counts: Record<string, number> = {};
  for (const n of sample.nodes) counts[n.genre] = (counts[n.genre] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}


function MusicGraphSection({
  sample, filterGenre,
  onFilterGenre,
}: {
  sample: MusicGraphSample;
  filterGenre: string | null;
  onFilterGenre: (g: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef   = useRef<any>(null);
  const nodesRef     = useRef<any>(null);
  const edgesRef     = useRef<any>(null);
  const origColors   = useRef<Record<string, string>>({});
  const { visReady: loaded } = useVisNetwork();
  const [selected, setSelected]           = useState<MusicGraphNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeById = useMemo(
    () => Object.fromEntries(sample.nodes.map((n) => [n.id, n])),
    [sample.nodes],
  );
  const genres = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of sample.nodes) counts[n.genre] = (counts[n.genre] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [sample.nodes]);

  useEffect(() => {
    if (!loaded || !containerRef.current || sample.nodes.length === 0) return;
    const vis = (window as any).vis;
    if (!vis?.DataSet || !vis?.Network) return;

    const edgeColor  = "#cbd5e1";
    const fontColor  = "#1e293b";
    const strokeColor = "#fff";

    const nodeData = sample.nodes.map((n) => {
      const color = genreColor(n.genre);
      origColors.current[n.id] = color;
      return {
        id: n.id,
        label: n.label.split(" — ")[0].slice(0, 18),
        title: `<b>${n.label}</b><br>Gênero: ${n.genre}<br>Grau: ${n.degree}`,
        color: { background: color, border: "#e2e8f0", highlight: { background: color, border: "#f97316" } },
        size: Math.max(6, 6 + n.degree * 0.08),
        font: { color: fontColor, size: 9, strokeWidth: 2, strokeColor },
      };
    });

    const edgeData = sample.edges.map((e, i) => ({
      id: i, from: e.source, to: e.target,
      color: { color: edgeColor, opacity: 0.5 },
      width: 0.8,
      arrows: { to: { enabled: true, scaleFactor: 0.4 } },
    }));

    networkRef.current?.destroy();
    nodesRef.current = new vis.DataSet(nodeData);
    edgesRef.current = new vis.DataSet(edgeData);

    networkRef.current = new vis.Network(
      containerRef.current,
      { nodes: nodesRef.current, edges: edgesRef.current },
      {
        nodes: { shape: "dot", borderWidth: 1 },
        edges: { smooth: { type: "continuous", roundness: 0.2 } },
        physics: {
          stabilization: { iterations: 120, updateInterval: 30 },
          barnesHut: { gravitationalConstant: -5000, springLength: 90, springConstant: 0.02, damping: 0.1 },
        },
        interaction: { hover: true, tooltipDelay: 80 },
      },
    );
    networkRef.current.on("click", (params: any) => {
      if (params.nodes.length > 0) {
        const id = params.nodes[0] as string;
        setSelected(nodeById[id] ?? null);
        setSelectedNodeId(id);
      } else {
        setSelected(null);
        setSelectedNodeId(null);
      }
    });
    return () => { networkRef.current?.destroy(); networkRef.current = null; edgesRef.current = null; };
  }, [loaded, sample, nodeById]);


  useEffect(() => {
    if (!nodesRef.current || !edgesRef.current || !loaded) return;


    const genreSet = filterGenre
      ? new Set(sample.nodes.filter((n) => n.genre === filterGenre).map((n) => n.id))
      : null;


    const neighborSet = new Set<string>();
    if (selectedNodeId && networkRef.current) {
      for (const id of networkRef.current.getConnectedNodes(selectedNodeId) as string[])
        neighborSet.add(id);
    }


    nodesRef.current.update(
      sample.nodes.map((n) => {
        const dimmed    = !!genreSet && !genreSet.has(n.id);
        const isSelected = n.id === selectedNodeId;
        const isNeighbor = !dimmed && neighborSet.has(n.id);

        const bg = dimmed ? "#e2e8f0" : origColors.current[n.id];
        const border = isSelected ? "#f97316" : isNeighbor ? "#fbbf24" : "#e2e8f0";
        const borderWidth = isSelected ? 3 : isNeighbor ? 2 : 1;

        return {
          id: n.id,
          color: { background: bg, border, highlight: { background: bg, border: "#f97316" } },
          borderWidth,
          opacity: dimmed ? 0.08 : 1,
          font: { color: "#1e293b", size: 9, strokeWidth: 2, strokeColor: "#fff" },
        };
      }),
    );


    edgesRef.current.update(
      sample.edges.map((e, i) => {
        const srcIn = !genreSet || genreSet.has(e.source);
        const tgtIn = !genreSet || genreSet.has(e.target);
        const hidden = !srcIn || !tgtIn;

        const isNeighborEdge =
          !!selectedNodeId && !hidden &&
          (e.source === selectedNodeId || e.target === selectedNodeId);

        return {
          id: i,
          hidden,
          width: isNeighborEdge ? 2.5 : 0.8,
          color: { color: isNeighborEdge ? "#f97316" : "#cbd5e1", opacity: hidden ? 0 : isNeighborEdge ? 1 : 0.5 },
          arrows: { to: { enabled: true, scaleFactor: isNeighborEdge ? 0.6 : 0.4 } },
        };
      }),
    );
  }, [filterGenre, selectedNodeId, loaded, sample.nodes, sample.edges]);

  return (
    <section className="space-y-4">
      <SectionTitle>Grafo da Rede Musical (top-200 nós)</SectionTitle>
      <p className="text-sm text-neutral-600">
        Grafo <strong>dirigido</strong> — nós coloridos por gênero, tamanho proporcional ao grau de saída.
        Clique num nó para destacar seus vizinhos diretos; clique num gênero para isolar o cluster
        (arestas entre outros gêneros são ocultadas).
      </p>

      {filterGenre && (
        <button
          onClick={() => onFilterGenre("")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50"
        >
          ↺ Limpar filtro — {filterGenre}
        </button>
      )}

      <div className="flex gap-4 min-h-0">
        <div
          ref={containerRef}
          className="flex-1 rounded-xl border-2 border-neutral-200 bg-white overflow-hidden"
          style={{ height: 500 }}
        >
          {!loaded && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Carregando vis-network…
            </div>
          )}
        </div>

        <div className="w-52 shrink-0 flex flex-col gap-3">
          {selected ? (
            <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-3 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-1">
                <p className="font-semibold text-sm text-neutral-800 leading-tight">
                  {selected.label.split(" — ")[0]}
                </p>
                <button
                  onClick={() => { setSelected(null); setSelectedNodeId(null); }}
                  className="text-neutral-400 hover:text-neutral-600 shrink-0 text-base leading-none"
                  title="Limpar seleção"
                >×</button>
              </div>
              <p className="text-neutral-500 text-[10px]">{selected.label.split(" — ")[1] ?? ""}</p>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-white text-[10px] font-medium"
                style={{ background: genreColor(selected.genre) }}
              >
                {selected.genre}
              </span>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                <dt className="text-neutral-400">Grau saída</dt>
                <dd className="font-mono">{selected.degree}</dd>
                <dt className="text-neutral-400">Vizinhos</dt>
                <dd className="font-mono">
                  {selectedNodeId && networkRef.current
                    ? (networkRef.current.getConnectedNodes(selectedNodeId) as string[]).length
                    : "—"}
                </dd>
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs text-neutral-400 text-center py-6">
              Clique em um nó para ver vizinhos
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-xs overflow-y-auto flex-1" style={{ maxHeight: 380 }}>
            <p className="font-semibold text-neutral-600 mb-2">Gêneros — clique para filtrar</p>
            <div className="space-y-0.5">
              {genres.map(([g, count]) => (
                <button
                  key={g}
                  onClick={() => onFilterGenre(g)}
                  className={`w-full flex items-center gap-2 rounded px-1.5 py-1 text-left transition-all hover:bg-neutral-50 ${
                    filterGenre === g ? "bg-neutral-100 ring-1 ring-neutral-300" : ""
                  }`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: genreColor(g) }} />
                  <span className="flex-1 truncate text-neutral-700">{g}</span>
                  <span className="text-neutral-400 tabular-nums shrink-0">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function MusicAnalysisSection({
  sample, filterGenre,
}: {
  sample: MusicGraphSample;
  filterGenre: string | null;
}) {
  const genreBars: BarDatum[] = useMemo(() => {
    const counts = genreCounts(sample).slice(0, 15);
    return counts.map(([g, c]) => ({
      label: g,
      value: c,
      color: filterGenre && g !== filterGenre ? "#e2e8f0" : genreColor(g),
      sublabel: filterGenre === g ? "gênero filtrado" : undefined,
    }));
  }, [sample, filterGenre]);

  const degreeValues = useMemo(
    () => Object.values(inSampleDegrees(sample)),
    [sample],
  );

  const totalGenres = useMemo(() => genreCounts(sample).length, [sample]);

  return (
    <section className="space-y-4">
      <SectionTitle>Análise da amostra renderizada</SectionTitle>
      <p className="text-sm text-neutral-600">
        Os gráficos abaixo descrevem os <strong>{sample.nodes.length} nós</strong> exibidos no grafo.
        Ao filtrar por gênero na legenda lateral, a barra correspondente é destacada em tempo real.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={`Gêneros mais frequentes (de ${totalGenres})`}
          description={
            filterGenre
              ? `Destacando "${filterGenre}". Cada barra é o nº de músicas do gênero na amostra.`
              : "Nº de músicas por gênero na amostra. A rede é fragmentada — muitos gêneros com poucas faixas cada."
          }
        >
          <BarChart
            data={genreBars}
            orientation="horizontal"
            valueName="músicas"
            height={Math.max(220, genreBars.length * 24)}
          />
        </ChartCard>

        <ChartCard
          title="Distribuição de grau na amostra"
          description="Quantas das conexões renderizadas tocam cada música (grau entrada + saída). Linha tracejada = grau médio."
        >
          <Histogram values={degreeValues} bins={12} xLabel="Grau na amostra" />
        </ChartCard>
      </div>
    </section>
  );
}


export function GrafoTab({ parte2 }: { parte2: Parte2Data }) {
  const sample = parte2.graph_sample;
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

  if (!sample) return <div className="text-sm text-neutral-400">Amostra do grafo não disponível.</div>;

  const toggleGenre = (g: string) => setFilterGenre((prev) => (prev === g || g === "" ? null : g));

  return (
    <div className="space-y-8">
      <MusicGraphSection
        sample={sample}
        filterGenre={filterGenre}
        onFilterGenre={toggleGenre}
      />
      <MusicAnalysisSection sample={sample} filterGenre={filterGenre} />
    </div>
  );
}
