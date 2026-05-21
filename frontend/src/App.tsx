import { useState } from "react";
import { useData } from "./hooks/useData";
import { Layout, type Page } from "./components/Layout";
import { DataBanner } from "./components/DataBanner";
import { OverviewPage } from "./pages/OverviewPage";
import { RankingsPage } from "./pages/RankingsPage";
import { RoutesPage } from "./pages/RoutesPage";
import { GraphPage } from "./pages/GraphPage";
import { AirportsPage } from "./pages/AirportsPage";

export default function App() {
  const { data, loading, error, status } = useData();
  const [page, setPage] = useState<Page>("overview");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-600">
        Carregando dados…
      </div>
    );
  }

  return (
    <Layout data={data} page={page} onPageChange={setPage} dataStatus={status}>
      <DataBanner status={status} error={error} />
      {page === "overview" && <OverviewPage data={data} dataStatus={status} />}
      {page === "rankings" && <RankingsPage rankings={data.rankings} dataStatus={status} />}
      {page === "routes" && <RoutesPage data={data} dataStatus={status} />}
      {page === "graph" && <GraphPage data={data} dataStatus={status} />}
      {page === "airports" && <AirportsPage airports={data.airports} dataStatus={status} />}
    </Layout>
  );
}
