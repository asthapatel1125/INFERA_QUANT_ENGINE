import { useEffect, useState } from "react";
import { Layout, type Page } from "./components/Layout";
import { useStream } from "./hooks/useStream";
import { api } from "./lib/api";
import { AlertsDashboard } from "./pages/AlertsDashboard";
import { DealerFlowDashboard } from "./pages/DealerFlowDashboard";
import { Settings } from "./pages/Settings";
import { SignalDashboard } from "./pages/SignalDashboard";
import { VolMicroDashboard } from "./pages/VolMicroDashboard";
import { ZoneDashboard } from "./pages/ZoneDashboard";
import type { Alert, Exposure, Microstructure, SignalScores, Zone } from "./types";

function initialPage(): Page {
  const hash = window.location.hash.slice(1) as Page;
  return ["zone", "dealer", "micro", "signals", "alerts", "settings"].includes(hash) ? hash : "zone";
}

export default function App() {
  const [page, setPageState] = useState<Page>(initialPage);
  const zones = useStream<Zone>("zones");
  const exposures = useStream<Exposure>("exposures");
  const micro = useStream<Microstructure>("micro");
  const scores = useStream<SignalScores>("scores");
  const alert = useStream<Alert>("alerts");
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => { api.alerts().then(setAlerts).catch(() => undefined); }, []);
  useEffect(() => {
    if (alert.data?.active) setAlerts(items => items.some(x => x.timestamp === alert.data!.timestamp) ? items : [alert.data!, ...items].slice(0, 50));
  }, [alert.data]);

  const setPage = (next: Page) => { window.location.hash = next; setPageState(next); };
  const connected = zones.connected || exposures.connected || micro.connected || scores.connected;

  return (
    <Layout page={page} setPage={setPage} connected={connected} symbol={zones.data?.symbol || "QQQ"}>
      {page === "zone" && <ZoneDashboard zone={zones.data} history={zones.history} />}
      {page === "dealer" && <DealerFlowDashboard data={exposures.data} />}
      {page === "micro" && <VolMicroDashboard data={micro.data} history={micro.history} />}
      {page === "signals" && <SignalDashboard scores={scores.data} zone={zones.data} alert={alert.data} />}
      <div style={{ display: page === "alerts" ? "contents" : "none" }}>
        <AlertsDashboard alerts={alerts} live={alert.data} spot={zones.data?.spot ?? null} exposure={exposures.data} />
      </div>
      {page === "settings" && <Settings />}
    </Layout>
  );
}
