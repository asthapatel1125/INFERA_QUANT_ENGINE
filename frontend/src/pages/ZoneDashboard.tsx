import { ArrowUpRight, CircleDot, Clock3, ShieldCheck } from "lucide-react";
import { Card } from "../components/Card";
import { LineChart } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Zone } from "../types";

const zoneColor: Record<string, string> = {
  TREND: "#94ff70", EXPANSION: "#ffb454", COMPRESSION: "#60a5fa",
  REVERSAL: "#d98cff", DEAD: "#78878d", PRE_TREND: "#b7f59e", PRE_REVERSAL: "#e6b4ff"
};

export function ZoneDashboard({ zone, history }: { zone: Zone | null; history: Zone[] }) {
  if (!zone) return <div className="dashboard-grid"><Skeleton className="hero-skeleton" /><Skeleton /><Skeleton /></div>;
  const color = zoneColor[zone.zone] || "#94ff70";
  return (
    <>
      <div className="metric-strip">
        <div><span>SPX spot</span><strong>5,242.80</strong><em className="up">+0.42%</em></div>
        <div><span>Current regime</span><strong style={{ color }}>{zone.zone.replace("_", " ")}</strong><em>sample {zone.candidate_samples}/3</em></div>
        <div><span>Zone stability</span><strong>{Math.round(zone.stability * 100)}%</strong><em className="up">confirmed</em></div>
        <div><span>Session</span><strong>Regular</strong><em>12:42:08 ET</em></div>
      </div>
      <div className="dashboard-grid zone-grid">
        <Card className="zone-hero">
          <div className="zone-visual">
            <div className="zone-ring" style={{ "--zone-color": color, "--progress": `${zone.stability * 360}deg` } as React.CSSProperties}>
              <div><span>Active zone</span><strong>{zone.zone.replace("_", " ")}</strong><small>{Math.round(zone.stability * 100)}% stable</small></div>
            </div>
            <div className="zone-copy"><span className="eyebrow">Regime classification</span><h2>Price discovery is<br />favoring continuation.</h2>
              <p>Liquidity and microstructure are aligned with the active directional regime. Transition risk remains contained.</p>
              <div className="zone-tags"><span><ShieldCheck size={14} /> Structure confirmed</span><span><CircleDot size={14} /> Low transition risk</span></div>
            </div>
          </div>
        </Card>
        <Card title="Regime stability" eyebrow="Live confidence" action={<span className="chart-value">{zone.stability.toFixed(2)}</span>}>
          <LineChart values={history.map(item => item.stability)} color={color} fill />
          <div className="chart-foot"><span>09:30</span><span>Now</span></div>
        </Card>
        <Card title="Zone distribution" eyebrow="Today's session">
          <div className="distribution">
            {[["Trend", 48, "#94ff70"], ["Compression", 26, "#60a5fa"], ["Expansion", 18, "#ffb454"], ["Reversal", 8, "#d98cff"]].map(([name, value, shade]) => (
              <div key={String(name)}><span><i style={{ background: shade }} />{name}</span><b>{value}%</b><div><i style={{ width: `${value}%`, background: shade }} /></div></div>
            ))}
          </div>
        </Card>
        <Card title="Regime timeline" eyebrow="Session map" className="wide-card" action={<button className="text-button">View history <ArrowUpRight size={14} /></button>}>
          <div className="regime-timeline">
            {history.length ? history.map((item, index) => <i key={index} style={{ background: zoneColor[item.zone] || "#78878d", flex: 1 }} title={item.zone} />) :
              <><i style={{ background: "#60a5fa", flex: 3 }} /><i style={{ background: "#94ff70", flex: 5 }} /></>}
          </div>
          <div className="timeline-labels"><span><Clock3 size={12} /> 09:30</span><span>11:00</span><span>12:30</span><span>Now</span></div>
        </Card>
      </div>
    </>
  );
}

