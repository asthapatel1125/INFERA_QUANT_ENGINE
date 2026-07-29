import {
  Activity, ArrowRight, BookOpen, Check, CircleDot, Clock3, Gauge,
  GitCommitHorizontal, HelpCircle, Info, Radio, Sparkles, Waves
} from "lucide-react";
import { Card } from "../components/Card";
import { LineChart } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Zone } from "../types";

const zoneColor: Record<string, string> = {
  TREND: "#94ff70", EXPANSION: "#ffb454", COMPRESSION: "#60a5fa",
  REVERSAL: "#d98cff", DEAD: "#78878d", PRE_TREND: "#b7f59e", PRE_REVERSAL: "#e6b4ff"
};

const number = (value: number, signed = false) =>
  `${signed && value > 0 ? "+" : ""}${value.toFixed(3)}`;

const formatTime = (timestamp: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit",
  hour12: true, timeZoneName: "short"
}).format(new Date(timestamp));

const formatDateTime = (timestamp: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", month: "numeric", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true
}).format(new Date(timestamp));

function Metric({ label, value, hint, color, explanation }: {
  label: string; value: string; hint?: string; color?: string; explanation?: string;
}) {
  return <div className="zone-metric" title={explanation || `${label}: ${value}`}>
    <span>{label}</span><strong style={{ color }}>{value}</strong>{hint && <small>{hint}</small>}
  </div>;
}

function DetailList({ values }: { values: [string, string][] }) {
  return <div className="zone-detail-list">{values.map(([label, value]) =>
    <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>;
}

function HistoryTable({ history }: { history: Zone[] }) {
  return <div className="zone-table-scroll">
    <table className="zone-table">
      <thead><tr><th>Time</th><th>Greek regime</th><th>Time regime</th><th>Volatility</th><th>Micro stability</th><th>Combined score</th></tr></thead>
      <tbody>{[...history].reverse().map((item, index) =>
        <tr key={`${item.timestamp}-${index}`}>
          <td>{formatTime(item.timestamp)}</td>
          <td>{item.determination.greek_regime}</td>
          <td>{item.determination.time_regime}</td>
          <td>{item.determination.volatility_regime}</td>
          <td>{item.determination.microstructure_stability.toFixed(3)}</td>
          <td><b>{item.determination.combined_zone_score.toFixed(3)}</b></td>
        </tr>)}</tbody>
    </table>
  </div>;
}

function ZoneHistory({ history }: { history: Zone[] }) {
  const transitions = history.map((item, index) => ({ item, index })).filter(({ item }) => item.transition_flag);
  const timeLabels = history.map(item => formatTime(item.timestamp));
  return <div className="zone-stream-chart">
    <div className="tod-shading"><span>OPEN</span><span>MORNING</span><span>MIDDAY</span><span>AFTERNOON</span><span>CLOSE</span></div>
    <LineChart values={history.map(item => item.stability)} color="#94ff70" fill interactive
      domain={[0, 1]} pointLabels={timeLabels} pointNames={history.map(item => item.zone)}
      yAxisLabel="Y · Stability (0–1)" xAxisLabel="X · Sample time (Eastern)" />
    <div className="transition-overlay">{transitions.map(({ item, index }) =>
      <i key={`${item.timestamp}-${index}`} style={{ left: `${index / Math.max(history.length - 1, 1) * 100}%` }} title={`Transition: ${item.zone}`} />)}</div>
    <div className="zone-regime-strip">{history.map((item, index) =>
      <i key={`${item.timestamp}-${index}`} style={{ background: zoneColor[item.zone] || "#78878d" }} title={item.zone} />)}</div>
    <div className="chart-key"><span><i className="stability-key" /> Stability</span><span><i className="transition-key" /> Transition</span><span>Oldest</span><span>Live</span></div>
  </div>;
}

export function ZoneDashboard({ zone, history }: { zone: Zone | null; history: Zone[] }) {
  if (!zone) return <div className="dashboard-grid"><Skeleton className="hero-skeleton" /><Skeleton /><Skeleton /></div>;
  const color = zoneColor[zone.zone] || "#94ff70";
  const event = zone.change_event;
  return <>
    <section className="zone-section">
      <div className="section-heading"><div><span>01 · Zone summary</span><h2>Current classification</h2></div><em><Radio size={12} /> streaming</em></div>
      <div className="zone-summary-grid">
        <Metric label="Current zone" value={zone.zone.replace("_", " ")} hint={`${zone.symbol} · ${zone.spot.toFixed(2)}`} color={color} />
        <Metric label="Zone stability" value={zone.stability.toFixed(3)} hint={`${Math.round(zone.stability * 100)}% confidence`} explanation="Persistence score from 0 to 1. Higher means the current zone has remained consistent." />
        <Metric label="Transition flag" value={zone.transition_flag ? "TRUE" : "FALSE"} hint={`Candidate ${zone.candidate_samples}/3`} color={zone.transition_flag ? "#ffb454" : "#94ff70"} explanation="TRUE while a different candidate zone is being confirmed over three samples." />
        <Metric label="Timestamp" value={new Date(zone.timestamp).toLocaleDateString()} hint={formatTime(zone.timestamp)} explanation="Time of the most recent streamed market sample." />
        <Metric label="Current hour" value={formatTime(zone.timestamp)} hint="America/New_York" explanation="Current market time in New York, displayed in 12-hour format." />
        <Metric label="Session phase" value={zone.time_context.session_phase} hint={zone.time_context.session_bias} color="#60a5fa" explanation="Time-of-day regime used to adjust the zone decision." />
      </div>
      <Card className="zone-reason-card">
        <div className="reason-layout">
          <div className="zone-orb" style={{ "--zone-color": color, "--progress": `${zone.stability * 360}deg` } as React.CSSProperties}>
            <div><span>Active</span><strong>{zone.zone.replace("_", " ")}</strong><small>{zone.stability.toFixed(2)} stable</small></div>
          </div>
          <div><span className="eyebrow">Why this zone was chosen</span><h2>{zone.determination.greek_regime.toLowerCase()} Greeks, {zone.determination.volatility_regime.toLowerCase()} volatility, and {zone.microstructure_context.regime.toLowerCase()} market quality.</h2>
            <div className="why-list">{zone.why.map(reason => <p key={reason}><Check size={13} />{reason}</p>)}</div>
            <div className="decision-reasoning">
              <b>How the values produced this result</b>
              <span>Greek regime <strong>{zone.determination.greek_regime}</strong> sets directional and convexity pressure; volatility <strong>{zone.determination.volatility_regime}</strong> determines expansion versus compression; microstructure stability <strong>{zone.determination.microstructure_stability.toFixed(3)}</strong> measures confirmation; and the <strong>{zone.time_context.session_bias}</strong> time bias adjusts the combined score to <strong>{zone.determination.combined_zone_score.toFixed(3)}</strong>.</span>
            </div>
          </div>
        </div>
      </Card>
    </section>

    <section className="zone-section">
      <div className="section-heading"><div><span>02 · Zone change details</span><h2>Latest transition snapshot</h2></div></div>
      <Card className={`change-event ${event ? "" : "no-event"}`}>
        {event ? <>
          <div className="change-title"><div><GitCommitHorizontal /><span>Zone change event<small>{formatDateTime(event.timestamp)}</small></span></div>
            <strong style={{ color: zoneColor[event.from_zone] }}>{event.from_zone}</strong><ArrowRight /><strong style={{ color: zoneColor[event.to_zone] }}>{event.to_zone}</strong>
          </div>
          <div className="change-columns">
            <div><h4>Greeks at change</h4><DetailList values={[
              ["Gamma slope", number(event.greeks.gamma_slope, true)], ["Vanna drift", number(event.greeks.vanna_drift, true)],
              ["Charm drift", number(event.greeks.charm_drift, true)], ["Speed stability", number(event.greeks.speed_stability)],
              ["Zomma stability", number(event.greeks.zomma_stability)], ["Color stability", number(event.greeks.color_stability)]
            ]} /></div>
            <div><h4>Volatility at change</h4><DetailList values={[
              ["IV expansion", number(event.volatility.iv_expansion)], ["IV compression", number(event.volatility.iv_compression)],
              ["Vol-of-vol", number(event.volatility.vol_of_vol)], ["Term structure slope", number(event.volatility.term_structure_slope, true)]
            ]} /></div>
            <div><h4>Microstructure at change</h4><DetailList values={[
              ["Quote imbalance", number(event.microstructure.quote_imbalance, true)], ["Microprice direction", event.microstructure.microprice_direction],
              ["Sweep detected", event.microstructure.sweep_detected ? "YES" : "NO"], ["Spread regime", event.microstructure.spread_regime],
              ["Liquidity score", number(event.microstructure.liquidity_score)], ["Micro stability", number(event.microstructure.microstructure_stability)]
            ]} /></div>
            <div><h4>Time context at change</h4><DetailList values={[
              ["Current hour", formatTime(event.timestamp)], ["Session phase", event.time.session_phase], ["Session bias", event.time.session_bias]
            ]} /></div>
          </div>
        </> : <div className="waiting-event"><CircleDot /><b>No confirmed zone change yet</b><span>The engine is tracking the current candidate. This panel will freeze all causal values when the three-sample transition rule confirms a new zone.</span></div>}
      </Card>
    </section>

    <section className="zone-section">
      <div className="section-heading"><div><span>03 · Zone history graph</span><h2>Regime, stability, and transition markers</h2></div><em><Activity size={12} /> {history.length} samples</em></div>
      <Card className="wide-card"><ZoneHistory history={history} /></Card>
    </section>

    <section className="zone-section">
      <div className="section-heading"><div><span>04 · Zone determination factors</span><h2>Historical factor attribution</h2></div><small>5 rows visible · scroll for all</small></div>
      <Card className="wide-card zone-table-card"><HistoryTable history={history} /></Card>
    </section>

    <section className="zone-section">
      <div className="section-heading"><div><span>05 · Greek regime details</span><h2>Streaming higher-order signals</h2></div><em><Sparkles size={12} /> {zone.determination.greek_regime}</em></div>
      <div className="zone-six-grid">
        <Metric label="Gamma slope" value={number(zone.greeks.gamma_slope, true)} hint="Across spot" />
        <Metric label="Vanna drift" value={number(zone.greeks.vanna_drift, true)} hint="Change per sample" />
        <Metric label="Charm drift" value={number(zone.greeks.charm_drift, true)} hint="Change per sample" />
        <Metric label="Speed stability" value={number(zone.greeks.speed_stability)} hint="0 unstable · 1 stable" />
        <Metric label="Zomma stability" value={number(zone.greeks.zomma_stability)} hint="0 unstable · 1 stable" />
        <Metric label="Color stability" value={number(zone.greeks.color_stability)} hint="0 unstable · 1 stable" />
      </div>
    </section>

    <div className="dashboard-grid zone-context-grid">
      <section className="zone-section">
        <div className="section-heading"><div><span>06 · Time-of-day intelligence</span><h2>Session context</h2></div><Clock3 size={16} /></div>
        <Card><DetailList values={[["Current hour", formatTime(zone.timestamp)], ["Session phase", zone.time_context.session_phase], ["Session bias", zone.time_context.session_bias]]} />
          <div className="expected-behavior"><Info size={15} /><p><b>Expected behavior</b>{zone.time_context.expected_behavior}</p></div>
        </Card>
      </section>
      <section className="zone-section">
        <div className="section-heading"><div><span>07 · Volatility regime</span><h2>{zone.volatility_context.regime}</h2></div><Waves size={16} /></div>
        <Card><DetailList values={[
          ["IV expansion", number(zone.volatility_context.iv_expansion)], ["IV compression", number(zone.volatility_context.iv_compression)],
          ["Vol-of-vol", number(zone.volatility_context.vol_of_vol)], ["Term structure slope", number(zone.volatility_context.term_structure_slope, true)]
        ]} /></Card>
      </section>
      <section className="zone-section">
        <div className="section-heading"><div><span>08 · Microstructure details</span><h2>{zone.microstructure_context.regime}</h2></div><Gauge size={16} /></div>
        <Card><DetailList values={[
          ["Quote imbalance", number(zone.microstructure_context.quote_imbalance, true)], ["Microprice direction", zone.microstructure_context.microprice_direction],
          ["Sweep detected", zone.microstructure_context.sweep_detected ? "YES" : "NO"], ["Spread regime", zone.microstructure_context.spread_regime],
          ["Liquidity score", number(zone.microstructure_context.liquidity_score)], ["Microstructure stability", number(zone.microstructure_context.microstructure_stability)]
        ]} /></Card>
      </section>
      <section className="zone-section">
        <div className="section-heading"><div><span>09 · User interpretation</span><h2>How to read this dashboard</h2></div><HelpCircle size={16} /></div>
        <Card><div className="interpretation-list">
          {[
            ["Stability", "Below 0.40 allows a zone change; 0.50+ supports alerts; higher values mean the regime has persisted."],
            ["Greek shifts", "Gamma slope sets convexity while Vanna and Charm drift reveal changing dealer hedge pressure."],
            ["Time of day", "Opening and closing flows carry more transition risk; midday more often supports compression."],
            ["Volatility", "IV expansion favors EXPANSION, while sustained compression supports COMPRESSION."],
            ["Microstructure", "Aligned imbalance, liquidity, spread, and microprice action confirm that a zone is tradable."]
          ].map(([title, copy]) => <div key={title}><BookOpen /><p><b>{title}</b>{copy}</p></div>)}
        </div></Card>
      </section>
    </div>

    <section className="zone-section">
      <div className="section-heading"><div><span>Historical values</span><h2>Complete streamed zone ledger</h2></div><small>5 rows visible · scroll for all</small></div>
      <Card className="wide-card zone-table-card"><div className="zone-table-scroll"><table className="zone-table">
        <thead><tr><th>Timestamp</th><th>Zone</th><th>Stability</th><th>Transition</th><th>Gamma slope</th><th>IV expansion</th><th>Quote imbalance</th></tr></thead>
        <tbody>{[...history].reverse().map((item, index) => <tr key={`${item.timestamp}-ledger-${index}`}>
          <td>{formatDateTime(item.timestamp)}</td><td style={{ color: zoneColor[item.zone] }}>{item.zone}</td>
          <td>{item.stability.toFixed(3)}</td><td>{item.transition_flag ? "TRUE" : "FALSE"}</td>
          <td>{number(item.greeks.gamma_slope, true)}</td><td>{item.volatility_context.iv_expansion.toFixed(3)}</td>
          <td>{number(item.microstructure_context.quote_imbalance, true)}</td>
        </tr>)}</tbody>
      </table></div></Card>
    </section>
  </>;
}
