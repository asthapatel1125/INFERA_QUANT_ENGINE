import {
  Activity, Bell, CandlestickChart, ChevronDown, Gauge, Layers3, Menu,
  Settings, Waves, X, Zap
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type Page = "zone" | "dealer" | "micro" | "signals" | "alerts" | "settings";

const nav = [
  { id: "zone", label: "Zone intelligence", icon: Layers3 },
  { id: "dealer", label: "Dealer flow", icon: CandlestickChart },
  { id: "micro", label: "Vol & micro", icon: Waves },
  { id: "signals", label: "Signal engine", icon: Gauge },
  { id: "alerts", label: "Alerts log", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function Layout({ page, setPage, connected, children }: {
  page: Page; setPage: (page: Page) => void; connected: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const current = nav.find(item => item.id === page);
  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Zap size={16} /></span><strong>AXIOM<span>FLOW</span></strong></div>
        <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>
        <div className="workspace">
          <span>Workspace</span>
          <button><span className="avatar">AF</span><span><b>US Index Desk</b><small>Production feed</small></span><ChevronDown size={15} /></button>
        </div>
        <nav aria-label="Primary navigation">
          <span className="nav-label">Intelligence</span>
          {nav.slice(0, 5).map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{id === "alerts" && <em>3</em>}
            </button>
          ))}
          <span className="nav-label">System</span>
          {nav.slice(5).map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setOpen(false); }}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="system-status">
          <div><span className={`status-dot ${connected ? "" : "offline"}`} />{connected ? "All systems operational" : "Reconnecting feed"}</div>
          <small>Market data · SSE · 1.5s</small>
        </div>
      </aside>
      {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div><span>SPX</span><strong>Live market terminal</strong></div>
          <div className="market-state"><Activity size={14} /><span>Market open</span><b>16:00 close</b></div>
          <button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button>
          <div className="user-avatar">AS</div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div><span className="breadcrumb">Intelligence / {current?.label}</span><h1>{current?.label}</h1></div>
            <div className="live-badge"><span />LIVE</div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

