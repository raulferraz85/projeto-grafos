import { useEffect, useState } from "react";
import { useData } from "./hooks/useData";
import { Layout, type Page } from "./components/Layout";
import { DataBanner } from "./components/DataBanner";
import { HomePage } from "./pages/HomePage";
import { OverviewPage } from "./pages/OverviewPage";
import { RankingsPage } from "./pages/RankingsPage";
import { RoutesPage } from "./pages/RoutesPage";
import { GraphPage } from "./pages/GraphPage";
import { AirportsPage } from "./pages/AirportsPage";
import { Parte2Page } from "./pages/Parte2Page";

export default function App() {
  const { data, loading, error, status } = useData();
  const [page, setPage] = useState<Page>("home");
  const [homeTheme, setHomeTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.body.classList.toggle("theme-home", page === "home" && homeTheme === "dark");

    return () => {
      document.body.classList.remove("theme-home");
    };
  }, [page, homeTheme]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Carregando dados…
      </div>
    );
  }

  const show = (p: Page) => (page === p ? "" : "hidden");

  return (
    <Layout
      data={data}
      page={page}
      onPageChange={setPage}
      dataStatus={status}
      homeTheme={homeTheme}
    >
      {page === "home" ? (
        <HomePage
          data={data}
          dataStatus={status}
          onNavigate={setPage}
          homeTheme={homeTheme}
          onThemeToggle={() => setHomeTheme((current) => (current === "dark" ? "light" : "dark"))}
        />
      ) : (
        <>
          <DataBanner status={status} error={error} />
          <div className={show("overview")}>
            <OverviewPage data={data} dataStatus={status} />
          </div>
          <div className={show("rankings")}>
            <RankingsPage rankings={data.rankings} airports={data.airports} dataStatus={status} />
          </div>
          <div className={show("routes")}>
            <RoutesPage data={data} dataStatus={status} />
          </div>
          <div className={show("graph")}>
            <GraphPage data={data} dataStatus={status} />
          </div>
          <div className={show("airports")}>
            <AirportsPage airports={data.airports} dataStatus={status} />
          </div>
          <div className={show("parte2")}>
            <Parte2Page parte2={data.parte2 ?? null} />
          </div>
        </>
      )}
    </Layout>
  );
}
