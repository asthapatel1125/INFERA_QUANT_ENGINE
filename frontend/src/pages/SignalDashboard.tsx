import { CheckCircle2, Crosshair, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "../components/Card";
import { Gauge } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Alert, SignalScores, Zone } from "../types";

export function SignalDashboard({ scores, zone, alert }: { scores: SignalScores | null; zone: Zone | null; alert: Alert | null }) {
  if (!scores || !zone) return <Skeleton className="hero-skeleton" />;
  const direction = scores.direction_score >= 0 ? "LONG" : "SHORT";
  return (
    <>
      <div className="gauge-grid">
        <Card><Gauge value={scores.direction_score} label="Direction score" signed color={scores.direction_score >= 0 ? "#94ff70" : "#ff685f"} /></Card>
        <Card><Gauge value={scores.explosion_score} label="Explosion score" color="#ffb454" /></Card>
        <Card><Gauge value={scores.precision_score} label="Precision score" color="#60a5fa" /></Card>
      </div>
      <div className="dashboard-grid signal-grid">
        <Card className="signal-callout">
          <div className="signal-icon"><Crosshair /></div><span className="eyebrow">Composite signal</span>
          <h2>{direction} BIAS</h2><p>{scores.precision_score >= .6 ? "The engine sees aligned dealer positioning and market quality." : "Conditions are forming, but precision remains below the alert threshold."}</p>
          <div className="confidence"><span>Composite confidence</span><b>{Math.round(scores.precision_score * 100)}%</b><div><i style={{ width: `${scores.precision_score * 100}%` }} /></div></div>
        </Card>
        <Card title="Signal context" eyebrow="Validation stack">
          <div className="context-list">
            <div><ShieldCheck /><span><b>Zone regime</b><small>{zone.zone.replace("_", " ")}</small></span><em>{Math.round(zone.stability * 100)}%</em></div>
            <div><Sparkles /><span><b>Micro confirmation</b><small>Quote-side alignment</small></span><em>{alert?.micro_confirmed ? "PASS" : "WAIT"}</em></div>
            <div><CheckCircle2 /><span><b>Alert threshold</b><small>Precision ≥ 0.60</small></span><em>{scores.precision_score >= .6 ? "PASS" : "WAIT"}</em></div>
          </div>
        </Card>
      </div>
    </>
  );
}

