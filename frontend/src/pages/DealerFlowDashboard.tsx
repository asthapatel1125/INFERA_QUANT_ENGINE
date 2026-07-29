import { Maximize2, Minimize2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card } from "../components/Card";
import { BarChart, LineChart } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Exposure } from "../types";

const money = (value: number) => `${value < 0 ? "−" : ""}$${Math.abs(value / 1e6).toFixed(1)}M`;
const coordinateMoney = (value: number) => `${value < 0 ? "−" : ""}$${Math.abs(value / 1e6).toFixed(2)}M`;

const benchmarks = {
  gex: "Expected/ideal: above $0 is stabilizing; near $0 is neutral.",
  dex: "Expected/ideal: near $0 is balanced; the sign shows directional dealer inventory.",
  vex: "Expected/ideal: stable and moderate versus its recent range; there is no universal dollar target.",
  tex: "Expected/ideal: near $0 means lower time-decay pressure; compare the sign and trend over time."
} as const;

const totalReason = (key: keyof typeof benchmarks, value: number) => {
  if (key === "gex") return value >= 0
    ? "Positive GEX suggests dealer hedging may dampen moves and support mean reversion."
    : "Negative GEX suggests dealer hedging may reinforce moves and increase intraday instability.";
  if (key === "dex") return `${value >= 0 ? "Positive" : "Negative"} DEX indicates ${value >= 0 ? "long" : "short"} directional dealer inventory.`;
  if (key === "vex") return `${value >= 0 ? "Positive" : "Negative"} VEX shows option inventory is ${value >= 0 ? "long" : "short"} volatility sensitivity under this model’s sign convention.`;
  return `${value >= 0 ? "Positive" : "Negative"} TEX shows ${value >= 0 ? "positive" : "negative"} time-decay exposure under this model’s sign convention.`;
};

function ReasonBox({ children }: { children: ReactNode }) {
  return <div className="dealer-reason"><b>Current interpretation</b><span>{children}</span></div>;
}

export function DealerFlowDashboard({ data }: { data: Exposure | null }) {
  const [expanded, setExpanded] = useState<"gex" | "dex" | "vol" | null>(null);
  if (!data) return <Skeleton className="hero-skeleton" />;

  const sampled = data.curve.filter((_, i) => i % 3 === 0);
  const labels = sampled.map(point => String(point.strike));
  const strikeLabels = data.curve.map(point => `Strike ${point.strike}`);
  const maxGex = Math.max(...sampled.map(point => Math.abs(point.gex)), 1);
  const lineDomain = (sets: number[][]): [number, number] => {
    const values = sets.flat();
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min || Math.max(Math.abs(max), 1)) * 0.08;
    return [min - padding, max + padding];
  };
  const dexDomain = lineDomain([data.curve.map(point => point.dex)]);
  const volDomain = lineDomain([
    data.curve.map(point => point.vex),
    data.curve.map(point => point.tex),
    data.curve.map(point => point.rex)
  ]);
  const graphClass = (name: typeof expanded) => expanded === name ? "dealer-expanded" : "";
  const expandButton = (name: Exclude<typeof expanded, null>, label: string) =>
    <button className="graph-expand" title={expanded === name ? `Minimize ${label}` : `Expand ${label}`}
      aria-label={expanded === name ? `Minimize ${label}` : `Expand ${label}`}
      onClick={() => setExpanded(expanded === name ? null : name)}>
      {expanded === name ? <Minimize2 /> : <Maximize2 />}
      <span>{expanded === name ? "Minimize" : "Expand"}</span>
    </button>;

  return (
    <div className="dealer-flow">
      <div className="metric-strip dealer-totals">
        {(["gex", "dex", "vex", "tex"] as const).map(key => <div key={key}>
          <span>{key.toUpperCase()} total</span>
          <strong>{money(data.totals[key])}</strong>
          <em className={data.totals[key] >= 0 ? "up" : "down"}>{data.totals[key] >= 0 ? "dealer long" : "dealer short"}</em>
          <small>{benchmarks[key]}</small>
          <p>{totalReason(key, data.totals[key])}</p>
        </div>)}
      </div>

      <div className="dashboard-grid">
        <Card title="Gamma exposure profile" eyebrow="By strike · all expiries"
          className={`wide-card dealer-graph-card ${graphClass("gex")}`}
          action={<div className="graph-actions"><span className="pill">Spot {data.spot.toFixed(2)}</span>{expandButton("gex", "Gamma exposure profile")}</div>}>
          <div className="dealer-chart-scroll" title="Scroll horizontally to inspect earlier strikes">
            <div className="gex-chart-inner">
              <span className="dealer-y-label">Y · Gamma exposure ($ millions)</span>
              <div className="gex-scale"><span>{coordinateMoney(maxGex)}</span><span>$0</span><span>−{coordinateMoney(maxGex)}</span></div>
              <BarChart values={sampled.map(point => point.gex)} labels={labels} interactive />
              <span className="dealer-x-label">X · Option strike</span>
            </div>
          </div>
          <div className="marker-row"><span className="put">Put wall {data.put_wall}</span><span className="flip">Gamma flip {data.gamma_flip_lower}–{data.gamma_flip_upper}</span><span className="call">Call wall {data.call_wall}</span></div>
          <ReasonBox>{data.totals.gex < 0
            ? `Dealers are short gamma (${money(data.totals.gex)}), so hedge flows can amplify price movement. The ${data.gamma_flip_lower}–${data.gamma_flip_upper} flip range is the key boundary; behavior may become more stabilizing above it.`
            : `Dealers are long gamma (${money(data.totals.gex)}), which generally supports mean reversion. Watch the put wall at ${data.put_wall}, call wall at ${data.call_wall}, and the flip range for a change in behavior.`}</ReasonBox>
        </Card>

        <Card title="Delta exposure" eyebrow="Directional inventory"
          className={`dealer-graph-card ${graphClass("dex")}`} action={expandButton("dex", "Delta exposure")}>
          <div className="dealer-chart-scroll" title="Scroll horizontally to inspect the complete strike curve">
            <div className="dealer-line-inner">
              <LineChart values={data.curve.map(point => point.dex)} color="#60a5fa" fill interactive
                pointLabels={strikeLabels} domain={dexDomain} seriesName="DEX"
                valueFormatter={coordinateMoney} xAxisLabel="X · Option strike" yAxisLabel="Y · Delta exposure ($ millions)" />
            </div>
          </div>
          <ReasonBox>{data.totals.dex < 0
            ? `Negative total DEX (${money(data.totals.dex)}) indicates net short directional inventory. Large troughs identify strikes where dealer hedge demand is most concentrated.`
            : `Positive total DEX (${money(data.totals.dex)}) indicates net long directional inventory. Peaks identify strikes carrying the strongest directional exposure.`}</ReasonBox>
        </Card>

        <Card title="Volatility Greeks" eyebrow="Vega / Theta / Rho"
          className={`dealer-graph-card ${graphClass("vol")}`} action={expandButton("vol", "Volatility Greeks")}>
          <div className="legend"><span><i className="vega" /> Vega</span><span><i className="theta" /> Theta</span><span><i className="rho" /> Rho</span></div>
          <div className="dealer-chart-scroll" title="Scroll horizontally to inspect the complete strike curve">
            <div className="dealer-line-inner">
              <LineChart values={data.curve.map(point => point.vex)} color="#d98cff" interactive
                pointLabels={strikeLabels} domain={volDomain} seriesName="Vega" valueFormatter={coordinateMoney}
                extraSeries={[
                  { name: "Theta", values: data.curve.map(point => point.tex), color: "#ffb454" },
                  { name: "Rho", values: data.curve.map(point => point.rex), color: "#60a5fa" }
                ]}
                xAxisLabel="X · Option strike" yAxisLabel="Y · Greek exposure ($ millions)" />
            </div>
          </div>
          <ReasonBox>Vega is currently {money(data.totals.vex)} and Theta is {money(data.totals.tex)}. Spikes show strikes with concentrated sensitivity; aligned Vega, Theta, and Rho peaks deserve the most attention because several hedge drivers are concentrated together.</ReasonBox>
        </Card>

        <Card title="Greek strength matrix" eyebrow={`Stability ${Math.round(data.greek_stability * 100)}%`} className="wide-card dealer-matrix-card">
          <p className="matrix-guide">Ideal reference: <b>STRONG</b> or <b>STRONGEST</b> with stability at or above 70%. “Ideal” is contextual—weak readings can still be informative when they agree with the active zone.</p>
          <div className="greek-matrix">{Object.entries(data.bands).map(([name, band]) => <div key={name}>
            <span>{name}</span><b className={`band-${band.toLowerCase()}`}>{band}</b>
            <small>Ideal: Strong + stable</small>
          </div>)}</div>
        </Card>
      </div>
    </div>
  );
}
