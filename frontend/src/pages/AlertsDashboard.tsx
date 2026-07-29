import { BellRing, Filter, RadioTower } from "lucide-react";
import { Card } from "../components/Card";
import type { Alert } from "../types";

export function AlertsDashboard({ alerts, live }: { alerts: Alert[]; live: Alert | null }) {
  const rows = live?.active && !alerts.some(x => x.timestamp === live.timestamp) ? [live, ...alerts] : alerts;
  return (
    <div className="dashboard-grid alerts-layout">
      <Card className="wide-card" title="Signal alerts" eyebrow="Validated opportunities" action={<button className="filter-button" title="Filter the alert history"><Filter size={14} /> Filter</button>}>
        <div className="alerts-table-wrap">
          <table>
            <thead><tr><th>Timestamp</th><th>Tier</th><th>Direction</th><th>Zone</th><th>Precision</th><th>Explosion</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((alert, index) => (
                <tr key={`${alert.timestamp}-${index}`}>
                  <td><span className="alert-time"><i />{new Date(alert.timestamp).toLocaleTimeString()}</span></td>
                  <td><b className={`tier ${alert.tier?.toLowerCase()}`}>{alert.tier?.replace("_", " ")}</b></td>
                  <td><strong className={alert.direction === "LONG" ? "green" : "red"}>{alert.direction}</strong></td>
                  <td>{alert.zone.replace("_", " ")}</td>
                  <td>{alert.precision.toFixed(2)}</td><td>{alert.explosion.toFixed(2)}</td>
                </tr>
              )) : <tr><td colSpan={6}><div className="empty-state"><BellRing /><b>Monitoring for validated setups</b><span>Alerts appear when zone, direction, precision, and microstructure align.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Alert criteria" eyebrow="Engine guardrails">
        <div className="criteria-list">
          <div><span>Zone stability</span><b>≥ 0.50</b></div><div><span>Precision score</span><b>≥ 0.60</b></div>
          <div><span>|Direction score|</span><b>≥ 0.40</b></div><div><span>Quote alignment</span><b>Required</b></div>
        </div>
        <div className="monitoring"><RadioTower /><span><b>Engine monitoring</b><small>Every 1.5 seconds</small></span></div>
      </Card>
    </div>
  );
}
