import type { Parte2Data } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { DatasetTab } from "./DatasetTab";
import { GrafoTab } from "./GrafoTab";
import { AlgoritmosTab } from "./AlgoritmosTab";
import { PerformanceTab } from "./PerformanceTab";

export type Parte2Tab = "dataset" | "grafo" | "algoritmos" | "performance";


interface Props { parte2: Parte2Data | null; activeTab: Parte2Tab }

export function Parte2Page({ parte2, activeTab }: Props) {
  if (!parte2) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rede Musical Spotify" description="Parte 2: Dataset maior e comparação de algoritmos." />
        <div className="card text-sm text-neutral-500">
          <p className="font-medium text-neutral-700 mb-2">Dataset não processado ainda.</p>
          <ol className="list-decimal ml-4 space-y-1 text-xs">
            <li>Baixe o dataset: <span className="font-mono bg-neutral-100 px-1 rounded">data/dataset_parte2/README.md</span></li>
            <li>Processe: <span className="font-mono bg-neutral-100 px-1 rounded">make parte2</span></li>
            <li>Inicie o frontend: <span className="font-mono bg-neutral-100 px-1 rounded">make dev</span></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activeTab === "dataset"     && <DatasetTab     parte2={parte2} />}
      {activeTab === "grafo"       && <GrafoTab        parte2={parte2} />}
      {activeTab === "algoritmos"  && <AlgoritmosTab   parte2={parte2} />}
      {activeTab === "performance" && <PerformanceTab  parte2={parte2} />}
    </div>
  );
}
