import { useMemo } from "react";
import type { Parte2Data, MusicGraphSample, Parte2DatasetAnalytics } from "../../types";
import { formatNumber } from "../../lib/format";
import { ChartCard } from "../../components/charts/ChartCard";
import { Histogram } from "../../components/charts/Histogram";
import { BarChart, type BarDatum } from "../../components/charts/BarChart";
import { DonutChart, type DonutDatum } from "../../components/charts/DonutChart";
import { AnimatedNumber, SectionTitle } from "./_shared";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faMusic, faArrowRightArrowLeft, faChartSimple, faGaugeHigh } from "@fortawesome/free-solid-svg-icons";


function inSampleDegrees(sample: MusicGraphSample): Record<string, number> {
  const deg: Record<string, number> = {};
  for (const n of sample.nodes) deg[n.id] = 0;
  for (const e of sample.edges) {
    if (deg[e.source] !== undefined) deg[e.source]++;
    if (deg[e.target] !== undefined) deg[e.target]++;
  }
  return deg;
}

const COLOR_STYLES = {
  sky:     { border: "border-sky-200",     bg: "bg-sky-50",     icon: "text-sky-500",     val: "text-sky-700" },
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50", icon: "text-emerald-500", val: "text-emerald-700" },
  violet:  { border: "border-violet-200",  bg: "bg-violet-50",  icon: "text-violet-500",  val: "text-violet-700" },
  orange:  { border: "border-orange-200",  bg: "bg-orange-50",  icon: "text-orange-500",  val: "text-orange-700" },
};

function IconStatCard({ label, value, decimals, icon, color }: {
  label: string; value: number; decimals?: number;
  icon: IconDefinition; color: keyof typeof COLOR_STYLES;
}) {
  const c = COLOR_STYLES[color];
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 flex items-start gap-3`}>
      <div className={`rounded-lg p-2 bg-white ${c.icon} shrink-0`}>
        <FontAwesomeIcon icon={icon} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 truncate">{label}</p>
        <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${c.val}`}>
          <AnimatedNumber target={value} decimals={decimals ?? 0} />
        </p>
      </div>
    </div>
  );
}


const GENRE_PALETTE = [
  "#38bdf8","#a78bfa","#34d399","#fb923c","#f472b6",
  "#facc15","#60a5fa","#4ade80","#f87171","#94a3b8",
];

function GenreCompositionSection({ analytics, totalNodes }: { analytics: Parte2DatasetAnalytics; totalNodes: number }) {
  const { donut, bars } = useMemo(() => {
    const sorted = Object.entries(analytics.genre_counts).sort((a, b) => b[1] - a[1]);
    const topN = sorted.slice(0, 9);
    const otherCount = sorted.slice(9).reduce((s, [, v]) => s + v, 0);
    if (otherCount > 0) topN.push(["outros", otherCount]);

    const donut: DonutDatum[] = topN.map(([label, value], i) => ({
      label, value, color: GENRE_PALETTE[i % GENRE_PALETTE.length],
    }));
    const bars: BarDatum[] = topN.map(([label, value], i) => ({
      label, value,
      color: GENRE_PALETTE[i % GENRE_PALETTE.length],
      sublabel: `${((value / totalNodes) * 100).toFixed(1)}%`,
    }));
    return { donut, bars };
  }, [analytics.genre_counts, totalNodes]);

  return (
    <section className="space-y-4">
      <SectionTitle>Composição por Gênero</SectionTitle>
      <p className="text-sm text-neutral-600">
        Distribuição dos <strong>{formatNumber(totalNodes)} nós</strong> do dataset completo por gênero musical.{" "}
        <span className="font-medium text-neutral-800">{analytics.cross_genre_pct}% das conexões</span> ligam
        músicas de gêneros diferentes — a similaridade de áudio supera fronteiras de gênero.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Proporção por gênero" description="Fatia de cada gênero no dataset completo.">
          <DonutChart
            data={donut}
            centerLabel="gêneros"
            centerValue={String(donut.length)}
            valueFormatter={(v) => `${v} músicas`}
          />
        </ChartCard>
        <ChartCard title="Contagem por gênero" description="Número de músicas por gênero, ordenado do maior para o menor.">
          <BarChart
            data={bars}
            orientation="horizontal"
            valueName="músicas"
            height={Math.max(200, bars.length * 36)}
          />
        </ChartCard>
      </div>
    </section>
  );
}


function EdgeWeightSection({ analytics }: { analytics: Parte2DatasetAnalytics }) {
  const bars: BarDatum[] = useMemo(
    () => analytics.edge_weight_hist.map((bin) => ({
      label: bin.bin_start.toFixed(1),
      value: bin.count,
      color: "#38bdf8",
    })),
    [analytics.edge_weight_hist],
  );

  return (
    <section className="space-y-4">
      <SectionTitle>Distribuição de Pesos das Arestas</SectionTitle>
      <p className="text-sm text-neutral-600">
        Cada aresta tem peso = distância euclidiana no espaço de áudio (0 = idênticas, 1 = opostas).
        Peso médio: <span className="font-medium text-neutral-800">{analytics.edge_weight_mean.toFixed(3)}</span>.{" "}
        <span className="font-medium text-neutral-800">{analytics.edge_weight_near_pct}% das conexões</span>{" "}
        têm peso {"< 0,2"} — músicas muito próximas no espaço de features.
      </p>
      <ChartCard
        title="Histograma de pesos — dataset completo"
        description="Concentração próxima de 0 = k-NN conecta músicas realmente similares. Cauda à direita = pares com features bem distintos que ainda são vizinhos mais próximos disponíveis."
      >
        <BarChart data={bars} orientation="vertical" valueName="arestas" height={220} />
      </ChartCard>
    </section>
  );
}


function TopHubsSection({ analytics }: { analytics: Parte2DatasetAnalytics }) {
  const maxDeg = analytics.top_hubs[0]?.degree ?? 1;
  return (
    <section className="space-y-4">
      <SectionTitle>Músicas Mais Conectadas</SectionTitle>
      <p className="text-sm text-neutral-600">
        Top 10 nós por grau total (entradas + saídas) no dataset completo — os "hubs musicais"
        que conectam diferentes regiões da rede por similaridade de áudio.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Música</th>
              <th>Artista</th>
              <th>Gênero</th>
              <th>Grau total</th>
            </tr>
          </thead>
          <tbody>
            {analytics.top_hubs.map((node, i) => {
              const [trackName, artist] = (node.label ?? "").split(" — ");
              return (
                <tr key={node.id}>
                  <td className="font-mono text-xs text-neutral-400 w-8">{i + 1}</td>
                  <td className="text-xs font-medium max-w-48">
                    <span className="block truncate" title={trackName}>{trackName}</span>
                  </td>
                  <td className="text-xs text-neutral-600 max-w-36">
                    <span className="block truncate" title={artist}>{artist ?? "—"}</span>
                  </td>
                  <td>
                    <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                      {node.genre}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-violet-400"
                          style={{ width: `${(node.degree / maxDeg) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm font-bold tabular-nums text-violet-700">
                        {node.degree}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}


export function DatasetTab({ parte2 }: { parte2: Parte2Data }) {
  const { dataset } = parte2;
  const analytics = parte2.dataset_analytics;
  const sample = parte2.graph_sample;
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SectionTitle>Métricas do Grafo</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <IconStatCard label="Músicas (nós)"      value={dataset.nodes}       icon={faMusic}                color="sky"     />
          <IconStatCard label="Conexões (arestas)" value={dataset.edges}       icon={faArrowRightArrowLeft}  color="emerald" />
          <IconStatCard label="Grau médio"          value={dataset.degree_mean} decimals={1} icon={faChartSimple} color="violet" />
          <IconStatCard label="Grau máximo"         value={dataset.degree_max}  icon={faGaugeHigh}            color="orange"  />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 space-y-1.5">
          <p><span className="font-semibold text-neutral-800">Fonte:</span> {dataset.source}</p>
          <p>
            <span className="font-semibold text-neutral-800">Tipo:</span> Grafo <strong>dirigido</strong> ponderado ·
            i→j: j é vizinho k-NN de i no espaço de áudio
          </p>
          <p>
            <span className="font-semibold text-neutral-800">Pesos:</span> Distância euclidiana dos features{" "}
            <span className="font-mono text-xs bg-white border border-neutral-200 px-1.5 py-0.5 rounded">
              energy · danceability · acousticness · instrumentalness · valence · tempo
            </span>{" "}
            normalizados para [0, 1]
          </p>
          <p>
            <span className="font-semibold text-neutral-800">Grau:</span> min {dataset.degree_min} ·
            mediana {dataset.degree_median} · médio {formatNumber(dataset.degree_mean, 1)} · max {dataset.degree_max}
          </p>
        </div>
      </section>

      {analytics && <GenreCompositionSection analytics={analytics} totalNodes={dataset.nodes} />}

      {analytics && <EdgeWeightSection analytics={analytics} />}

      {analytics && <TopHubsSection analytics={analytics} />}

      {sample && sample.nodes.length > 0 && (
        <section className="space-y-4">
          <SectionTitle>Distribuição de Grau na Amostra</SectionTitle>
          <p className="text-sm text-neutral-600">
            No grafo completo, <strong>todo nó tem grau de saída fixo = {dataset.degree_max}</strong>{" "}
            (construção k-NN). Por isso mostramos o grau dentro da{" "}
            <strong>amostra de {sample.nodes.length} nós</strong>: quantas das{" "}
            {sample.edges.length} conexões renderizadas tocam cada música.
          </p>
          <ChartCard
            title="Grau na amostra renderizada"
            description="Distribuição de grau (entrada + saída) contando apenas as arestas visíveis na amostra. Barra laranja = faixa mais frequente; linha tracejada = grau médio."
          >
            <Histogram
              values={Object.values(inSampleDegrees(sample))}
              bins={12}
              xLabel="Grau na amostra"
            />
          </ChartCard>
        </section>
      )}

    </div>
  );
}
