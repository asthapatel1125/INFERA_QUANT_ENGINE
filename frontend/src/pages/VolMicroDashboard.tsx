import { Droplets, Radio, ScanLine, Waves } from "lucide-react";
import { Card } from "../components/Card";
import { BarChart, LineChart } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Microstructure } from "../types";

export function VolMicroDashboard({ data, history }: { data: Microstructure | null; history: Microstructure[] }) {
  if (!data) return <Skeleton className="hero-skeleton" />;
  return (
    <>
      <div className="metric-strip">
        <div><span>Microprice</span><strong>{data.microprice.toFixed(2)}</strong><em>{(data.microprice - data.midprice).toFixed(3)} vs mid</em></div>
        <div><span>Quote imbalance</span><strong className={data.quote_imbalance >= 0 ? "green" : "red"}>{data.quote_imbalance > 0 ? "+" : ""}{data.quote_imbalance.toFixed(3)}</strong><em>{data.quote_imbalance >= 0 ? "bid dominant" : "ask dominant"}</em></div>
        <div><span>Spread regime</span><strong>{data.spread_regime}</strong><em>{data.spread.toFixed(3)} points</em></div>
        <div><span>Liquidity</span><strong>{Math.round(data.liquidity_score * 100)}</strong><em className="up">healthy</em></div>
      </div>
      <div className="dashboard-grid">
        <Card title="Quote imbalance" eyebrow="NBBO pressure" action={<Radio size={16} className="green" />}>
          <LineChart values={history.map(x => x.quote_imbalance)} color={data.quote_imbalance >= 0 ? "#94ff70" : "#ff685f"} fill />
        </Card>
        <Card title="Microprice" eyebrow="Fair-value pressure">
          <LineChart values={history.map(x => x.microprice)} color="#60a5fa" fill />
        </Card>
        <Card title="Volatility surface" eyebrow="Term structure" className="wide-card">
          <BarChart values={data.term_structure.map(x => x.iv)} labels={data.term_structure.map(x => x.expiry)} positive="#d98cff" />
        </Card>
        <Card title="Market quality" eyebrow="Live diagnostics">
          <div className="quality-list">
            <div><Droplets /><span><b>Liquidity score</b><small>Depth and spread composite</small></span><strong>{data.liquidity_score.toFixed(2)}</strong></div>
            <div><Waves /><span><b>Vol-of-vol</b><small>Surface instability</small></span><strong>{data.vol_of_vol.toFixed(2)}</strong></div>
            <div><ScanLine /><span><b>Sweep monitor</b><small>3× average trade filter</small></span><strong className={data.sweep_detected ? "red" : "green"}>{data.sweep_detected ? "DETECTED" : "CLEAR"}</strong></div>
          </div>
        </Card>
        <Card title="Tape speed" eyebrow="Trades per minute">
          <div className="big-stat">{data.tape_speed.toFixed(1)}<small> TPM</small></div>
          <LineChart values={history.map(x => x.tape_speed)} color="#ffb454" />
        </Card>
      </div>
    </>
  );
}

