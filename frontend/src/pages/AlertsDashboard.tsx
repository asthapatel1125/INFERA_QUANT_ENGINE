import { BellRing, Filter, RadioTower } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { LineChart } from "../components/Charts";
import type { Alert, Exposure } from "../types";

interface CallPoint { timestamp: string; price: number }
interface TrackedCall {
  id: string; started: string; direction: "LONG" | "SHORT"; datum: number;
  target: number; points: CallPoint[]; strongest: [string, number]; weakest: [string, number];
}

const STORAGE_KEY = "axiom-alert-call-tracks-v1";
const clock = (timestamp: string) => new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

export function AlertsDashboard({ alerts, live, spot, exposure }: {
  alerts: Alert[]; live: Alert | null; spot: number | null; exposure: Exposure | null;
}) {
  const rows = live?.active && !alerts.some(x => x.timestamp === live.timestamp) ? [live, ...alerts] : alerts;
  const [calls, setCalls] = useState<TrackedCall[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as TrackedCall[]; } catch { return []; }
  });

  useEffect(() => {
    if (!live?.active || !live.direction || spot === null || !exposure) return;
    const direction = live.direction;
    const strengths = Object.entries(exposure.band_scores || {}).sort((a, b) => b[1] - a[1]);
    const now = Date.parse(live.timestamp);
    setCalls(previous => {
      const next = previous.map(call => ({ ...call, points: [...call.points] }));
      let current = next[0];
      const stillSameCall = current && current.direction === direction && now - Date.parse(current.started) < 3_600_000;
      if (!stillSameCall) {
        current = {
          id: live.timestamp, started: live.timestamp, direction, datum: spot,
          target: spot + (direction === "LONG" ? 1.25 : -1.25), points: [],
          strongest: strengths[0] || ["unknown", 0], weakest: strengths[strengths.length - 1] || ["unknown", 0]
        };
        next.unshift(current);
      }
      if (now - Date.parse(current.started) <= 3_600_000 && current.points.at(-1)?.timestamp !== live.timestamp) {
        current.points.push({ timestamp: live.timestamp, price: spot });
        current.points = current.points.slice(-2400);
      }
      const kept = next.slice(0, 25);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
      return kept;
    });
  }, [live?.timestamp, live?.active, live?.direction, spot, exposure]);

  return (
    <div className="alerts-page">
      <div className="dashboard-grid alerts-layout">
        <Card className="wide-card" title="Signal alerts" eyebrow="Validated opportunities" action={<button className="filter-button" title="Filter the alert history"><Filter size={18} /> Filter</button>}>
          <div className="alerts-table-wrap">
            <table>
              <thead><tr><th>Timestamp</th><th>Tier</th><th>Direction</th><th>Zone</th><th>Precision</th><th>Explosion</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((alert, index) => <tr key={`${alert.timestamp}-${index}`}>
                  <td><span className="alert-time"><i />{clock(alert.timestamp)}</span></td>
                  <td><b className={`tier ${alert.tier?.toLowerCase()}`}>{alert.tier?.replace("_", " ")}</b></td>
                  <td><strong className={alert.direction === "LONG" ? "green" : "red"}>{alert.direction}</strong></td>
                  <td>{alert.zone.replace("_", " ")}</td><td>{alert.precision.toFixed(2)}</td><td>{alert.explosion.toFixed(2)}</td>
                </tr>) : <tr><td colSpan={6}><div className="empty-state"><BellRing /><b>Monitoring for validated setups</b><span>Alerts appear when zone, direction, precision, and microstructure align.</span></div></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Alert criteria" eyebrow="Engine guardrails">
          <div className="criteria-list">
            <div><span>Zone stability</span><b>≥ 0.50</b></div><div><span>Precision score</span><b>≥ 0.60</b></div>
            <div><span>|Direction score|</span><b>≥ 0.40</b></div><div><span>Quote alignment</span><b>Required</b></div>
          </div>
          <p className="criteria-explain">All four guardrails must pass simultaneously. Tier 1 additionally requires precision ≥0.80 and |direction| ≥0.70.</p>
          <div className="monitoring"><RadioTower /><span><b>Engine monitoring</b><small>Every 1.5 seconds · each call tracked for 1 hour</small></span></div>
        </Card>
      </div>

      <section className="call-tracker-section">
        <h2>One-hour call outcome tracking</h2>
        <p>Each validated call records QQQ from its datum, the ±1.25-point objective, minute highs/lows, final price, and Greek extremes. Tracking persists in this browser.</p>
        {calls.length ? calls.map(call => {
          const prices = call.points.map(point => point.price);
          const high = Math.max(...prices, call.datum);
          const low = Math.min(...prices, call.datum);
          const last = prices.at(-1) ?? call.datum;
          const favorable = call.direction === "LONG" ? last >= call.datum : last <= call.datum;
          const ended = Date.now() - Date.parse(call.started) >= 3_600_000;
          const minuteBuckets = new Map<string, number[]>();
          call.points.forEach(point => {
            const key = point.timestamp.slice(0, 16);
            minuteBuckets.set(key, [...(minuteBuckets.get(key) || []), point.price]);
          });
          const latestMinute = [...minuteBuckets.values()].at(-1) || [last];
          const minuteRows = [...minuteBuckets.entries()].slice(-60);
          return <Card key={call.id} className="call-track-card" title={`${call.direction} call · ${clock(call.started)}`} eyebrow={ended ? "1-hour stream complete" : "Streaming"}>
            <div className="call-stats">
              <div><span>Datum</span><b>{call.datum.toFixed(2)}</b></div>
              <div><span>1.25 target</span><b>{call.target.toFixed(2)}</b></div>
              <div><span>Highest high</span><b>{high.toFixed(2)} ({(high - call.datum >= 0 ? "+" : "")}{(high - call.datum).toFixed(2)})</b></div>
              <div><span>Lowest low</span><b>{low.toFixed(2)} ({(low - call.datum >= 0 ? "+" : "")}{(low - call.datum).toFixed(2)})</b></div>
              <div><span>Latest minute H / L</span><b>{Math.max(...latestMinute).toFixed(2)} / {Math.min(...latestMinute).toFixed(2)}</b></div>
              <div><span>{ended ? "Final price" : "Last price"}</span><b className={favorable ? "green" : "red"}>{last.toFixed(2)}</b></div>
            </div>
            <LineChart values={prices.length ? prices : [call.datum]} color={favorable ? "#94ff70" : "#ff685f"} interactive
              pointLabels={call.points.map(point => clock(point.timestamp))} seriesName="QQQ" valueFormatter={value => value.toFixed(2)}
              extraSeries={[{ name: "Datum", values: prices.map(() => call.datum), color: "#7d8b91" }]}
              xAxisLabel="X · Time since call" yAxisLabel="Y · QQQ price" />
            <div className="minute-extremes">
              <b>Per-minute QQQ extremes</b>
              <div><table><thead><tr><th>Minute</th><th>High (from datum)</th><th>Low (from datum)</th></tr></thead>
                <tbody>{minuteRows.map(([minute, values]) => {
                  const minuteHigh = Math.max(...values);
                  const minuteLow = Math.min(...values);
                  return <tr key={minute}><td>{clock(`${minute}:00Z`)}</td>
                    <td>{minuteHigh.toFixed(2)} ({minuteHigh - call.datum >= 0 ? "+" : ""}{(minuteHigh - call.datum).toFixed(2)})</td>
                    <td>{minuteLow.toFixed(2)} ({minuteLow - call.datum >= 0 ? "+" : ""}{(minuteLow - call.datum).toFixed(2)})</td></tr>;
                })}</tbody></table></div>
            </div>
            <div className="greek-extremes"><span>Strongest Greek: <b>{call.strongest[0]} {call.strongest[1].toFixed(3)}</b></span><span>Weakest Greek: <b>{call.weakest[0]} {call.weakest[1].toFixed(3)}</b></span></div>
          </Card>;
        }) : <div className="empty-call-tracker">Waiting for the next validated alert to begin a one-hour price stream.</div>}
      </section>
    </div>
  );
}
