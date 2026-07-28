import { Card } from "../components/Card";
import { BarChart, LineChart } from "../components/Charts";
import { Skeleton } from "../components/Skeleton";
import type { Exposure } from "../types";

const format = (value: number) => `${value < 0 ? "−" : ""}$${Math.abs(value / 1e6).toFixed(1)}M`;

export function DealerFlowDashboard({ data }: { data: Exposure | null }) {
  if (!data) return <Skeleton className="hero-skeleton" />;
  const labels = data.curve.filter((_, i) => i % 3 === 0).map(point => String(point.strike));
  const sampled = data.curve.filter((_, i) => i % 3 === 0);
  return (
    <>
      <div className="metric-strip">
        {(["gex", "dex", "vex", "tex"] as const).map(key => <div key={key}><span>{key.toUpperCase()} total</span><strong>{format(data.totals[key])}</strong><em className={data.totals[key] >= 0 ? "up" : "down"}>{data.totals[key] >= 0 ? "dealer long" : "dealer short"}</em></div>)}
      </div>
      <div className="dashboard-grid">
        <Card title="Gamma exposure profile" eyebrow="By strike · all expiries" className="wide-card" action={<span className="pill">Spot {data.spot.toFixed(2)}</span>}>
          <BarChart values={sampled.map(p => p.gex)} labels={labels} />
          <div className="marker-row"><span className="put">Put wall {data.put_wall}</span><span className="flip">Gamma flip {data.gamma_flip_lower}–{data.gamma_flip_upper}</span><span className="call">Call wall {data.call_wall}</span></div>
        </Card>
        <Card title="Delta exposure" eyebrow="Directional inventory">
          <LineChart values={data.curve.map(p => p.dex)} color="#60a5fa" fill />
        </Card>
        <Card title="Volatility Greeks" eyebrow="Vega / Theta / Rho">
          <div className="legend"><span><i className="vega" /> Vega</span><span><i className="theta" /> Theta</span><span><i className="rho" /> Rho</span></div>
          <LineChart values={data.curve.map(p => p.vex)} color="#d98cff" />
        </Card>
        <Card title="Greek strength matrix" eyebrow={`Stability ${Math.round(data.greek_stability * 100)}%`} className="wide-card">
          <div className="greek-matrix">{Object.entries(data.bands).map(([name, band]) => <div key={name}><span>{name}</span><b className={`band-${band.toLowerCase()}`}>{band}</b></div>)}</div>
        </Card>
      </div>
    </>
  );
}

