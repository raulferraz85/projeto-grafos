import type { DataStatus } from "../lib/placeholderData";

interface Props {
  status: DataStatus;
  error?: string | null;
}

const MESSAGES: Record<Exclude<DataStatus, "live">, { title: string; body: string }> = {
  placeholder: {
    title: "Dados de demonstração",
    body: "O arquivo data.json ainda não foi gerado. Na raiz do projeto, execute ./prepare.sh e recarregue a página.",
  },
  partial: {
    title: "Métricas incompletas",
    body: "Aeroportos e conexões foram carregados, mas métricas e rotas de out/ ainda não existem. Execute ./prepare.sh na raiz do projeto.",
  },
};

export function DataBanner({ status, error }: Props) {
  if (status === "live") return null;

  const msg = MESSAGES[status];

  return (
    <div
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-medium">{msg.title}</p>
      <p className="mt-1 text-amber-900/90">{msg.body}</p>
    </div>
  );
}
