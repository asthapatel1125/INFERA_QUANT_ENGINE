import { Droplets, Radio, ScanLine, Waves } from "lucide-react";
import { Card } from "../components/Card";
import { BarChart, LineChart } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Microstructure } from "../types";

const times = (history: Microstructure[]) => history.map(item =>
  new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
const domain = (values: number[], floor?: number, ceiling?: number): [number, number] => {
  const low = floor ?? Math.min(...values);
  const high = ceiling ?? Math.max(...values);
  const pad = (high - low || Math.max(Math.abs(high), 1)) * .08;
  return [low - pad, high + pad];
};
const Reason = ({ children }: { children: React.ReactNode }) =>
  <div className="micro-reason"><b>Live interpretation</b><span>{children}</span></div>;

export function VolMicroDashboard({ data, history }: { data: Microstructure | null; history: Microstructure[] }) {
  if (!data) return <Skeleton className="hero-skeleton" />;
  const labels = times(history);
  const imbalance = history.map(x => x.quote_imbalance);
  const microprices = history.map(x => x.microprice);
  const tape = history.map(x => x.tape_speed);
  return (
    <div className="vol-micro-page">
      <div className="metric-strip micro-totals">
        <div><span>Microprice</span><strong>{data.microprice.toFixed(2)}</strong><em>{(data.microprice - data.midprice).toFixed(3)} vs mid</em><small>Ideal: within ±0.01 of midpoint</small><p>{data.microprice >= data.midprice ? "Buy-side fair-value pressure." : "Sell-side fair-value pressure."}</p></div>
        <div><span>Quote imbalance</span><strong className={data.quote_imbalance >= 0 ? "green" : "red"}>{data.quote_imbalance > 0 ? "+" : ""}{data.quote_imbalance.toFixed(3)}</strong><em>{data.quote_imbalance >= 0 ? "bid dominant" : "ask dominant"}</em><small>Balanced ideal: −0.10 to +0.10</small><p>{Math.abs(data.quote_imbalance) > .10 ? "Directional queue pressure is elevated." : "Order-book pressure is balanced."}</p></div>
        <div><span>Spread regime</span><strong>{data.spread_regime}</strong><em>{data.spread.toFixed(3)} points</em><small>Ideal: TIGHT, ≤ 0.02 points</small><p>{data.spread_regime === "WIDE" ? "Execution friction is elevated." : "Execution conditions are acceptable."}</p></div>
        <div><span>Liquidity</span><strong>{Math.round(data.liquidity_score * 100)}</strong><em className={data.liquidity_score >= .65 ? "up" : "down"}>{data.liquidity_score >= .65 ? "healthy" : "thin"}</em><small>Ideal score: 65–100</small><p>{data.liquidity_score >= .65 ? "Depth can better absorb orders." : "Price impact risk is elevated."}</p></div>
      </div>
      <div className="dashboard-grid">
        <Card title="Quote imbalance" eyebrow="NBBO pressure" action={<Radio size={20} className="green" />}>
          <LineChart values={imbalance} color={data.quote_imbalance >= 0 ? "#94ff70" : "#ff685f"} fill interactive
            pointLabels={labels} domain={[-1, 1]} seriesName="Imbalance" xAxisLabel="X · Stream time" yAxisLabel="Y · Imbalance (−1 to +1)" />
          <Reason>{data.quote_imbalance < -.10 ? "Ask-side size dominates; downside pressure is confirmed while the reading remains below −0.10." : data.quote_imbalance > .10 ? "Bid-side size dominates; upside pressure is confirmed while above +0.10." : "The book is inside its balanced range."}</Reason>
        </Card>
        <Card title="Microprice" eyebrow="Fair-value pressure">
          <LineChart values={microprices} color="#60a5fa" fill interactive pointLabels={labels}
            domain={domain(microprices)} seriesName="QQQ" valueFormatter={value => value.toFixed(2)}
            xAxisLabel="X · Stream time" yAxisLabel="Y · QQQ price" />
          <Reason>Microprice is {Math.abs(data.microprice - data.midprice).toFixed(3)} points from midpoint; values above midpoint favor buyers and values below favor sellers.</Reason>
        </Card>
        <Card title="Volatility surface" eyebrow="Term structure" className="wide-card">
          <div className="surface-axis"><span>Y · Implied volatility</span><BarChart values={data.term_structure.map(x => x.iv)} labels={data.term_structure.map(x => x.expiry)} positive="#d98cff" interactive /><b>X · Expiration date</b></div>
          <Reason>Ideal structure is smooth and gradually rising. Current front-to-back slope is {data.iv_slope >= 0 ? "positive" : "negative"} ({data.iv_slope.toFixed(4)}); abrupt peaks indicate event or liquidity concentration.</Reason>
        </Card>
        <Card title="Market quality" eyebrow="Live diagnostics">
          <div className="quality-list">
            <div><Droplets /><span><b>Liquidity score</b><small>Ideal: 0.65–1.00</small></span><strong>{data.liquidity_score.toFixed(2)}</strong></div>
            <div><Waves /><span><b>Vol-of-vol</b><small>Ideal: 0.00–0.05</small></span><strong>{data.vol_of_vol.toFixed(3)}</strong></div>
            <div><ScanLine /><span><b>Sweep monitor</b><small>Ideal: CLEAR; detected at ≥3× average size</small></span><strong className={data.sweep_detected ? "red" : "green"}>{data.sweep_detected ? "DETECTED" : "CLEAR"}</strong></div>
          </div>
          <Reason>{data.sweep_detected ? "An unusually large trade was detected. Combine it with quote direction before treating it as directional." : "No large sweep is currently distorting normal market quality."}</Reason>
        </Card>
        <Card title="Tape speed" eyebrow="Trades per minute">
          <div className="big-stat">{data.tape_speed.toFixed(1)}<small> TPM</small></div>
          <LineChart values={tape} color="#ffb454" interactive pointLabels={labels} domain={domain(tape, 0)}
            seriesName="Tape speed" xAxisLabel="X · Stream time" yAxisLabel="Y · Trades per minute" />
          <Reason>Reference: below 30 TPM is slow, 30–60 is normal, and above 60 is fast. Current activity is {data.tape_speed > 60 ? "fast" : data.tape_speed < 30 ? "slow" : "normal"}.</Reason>
        </Card>
      </div>
    </div>
  );
}
