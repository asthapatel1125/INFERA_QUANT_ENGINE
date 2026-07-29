import { useState, type MouseEvent, type ReactNode } from "react";

function pathFor(values: number[], width = 500, height = 160, domain?: [number, number]) {
  if (!values.length) return "";
  const min = domain?.[0] ?? Math.min(...values);
  const max = domain?.[1] ?? Math.max(...values);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 18) - 9;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function LineChart({
  values, color = "#94ff70", labels, fill = false, children, interactive = false,
  pointLabels, pointNames, domain, xAxisLabel, yAxisLabel, seriesName = "Value",
  extraSeries = [], valueFormatter = value => value.toFixed(3)
}: {
  values: number[]; color?: string; labels?: string[]; fill?: boolean; children?: ReactNode;
  interactive?: boolean; pointLabels?: string[]; pointNames?: string[]; domain?: [number, number];
  xAxisLabel?: string; yAxisLabel?: string; seriesName?: string;
  extraSeries?: { name: string; values: number[]; color: string }[];
  valueFormatter?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const allValues = [...values, ...extraSeries.flatMap(series => series.values)];
  const min = domain?.[0] ?? Math.min(...allValues, 0);
  const max = domain?.[1] ?? Math.max(...allValues, 1);
  const range = max - min || 1;
  const chartDomain: [number, number] = [min, max];
  const path = pathFor(values, 500, 160, chartDomain);
  const hoverX = hovered === null ? 0 : hovered / Math.max(values.length - 1, 1) * 500;
  const hoverY = hovered === null ? 0 : 160 - ((values[hovered] - min) / range) * 142 - 9;
  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!interactive || !values.length) return;
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    setHovered(Math.round(ratio * (values.length - 1)));
  };
  return (
    <div className={`chart-wrap ${interactive ? "interactive-chart" : ""}`}>
      {yAxisLabel && <span className="chart-y-title">{yAxisLabel}</span>}
      <svg viewBox="0 0 500 180" role="img" aria-label="Streaming line chart" preserveAspectRatio="none"
        onMouseMove={onMove} onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".25" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map(y => <line className="grid-line" key={y} x1="0" x2="500" y1={y} y2={y} />)}
        {fill && path && <path d={`${path} L500,180 L0,180 Z`} fill={`url(#fill-${color.replace("#", "")})`} />}
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        {extraSeries.map(series => <path key={series.name} d={pathFor(series.values, 500, 160, chartDomain)}
          fill="none" stroke={series.color} strokeWidth="2.1" vectorEffect="non-scaling-stroke" />)}
        {interactive && hovered !== null && <>
          <line className="chart-crosshair" x1={hoverX} x2={hoverX} y1="0" y2="180" />
          <line className="chart-crosshair" x1="0" x2="500" y1={hoverY} y2={hoverY} />
          <circle cx={hoverX} cy={hoverY} r="4" fill={color} stroke="#08100c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>}
        {children}
      </svg>
      {yAxisLabel && <div className="chart-y-axis" aria-hidden="true">
        <span>{valueFormatter(max)}</span><span>{valueFormatter((min + max) / 2)}</span><span>{valueFormatter(min)}</span>
      </div>}
      {interactive && hovered !== null && <div className="chart-hover-card"
        style={{ left: `${hovered / Math.max(values.length - 1, 1) * 100}%` }}>
        {pointNames?.[hovered] && <strong>{pointNames[hovered]}</strong>}
        <span><b>X</b> {pointLabels?.[hovered] ?? `Sample ${hovered + 1}`}</span>
        <span><b>Y</b> {seriesName} {valueFormatter(values[hovered])}</span>
        {extraSeries.map(series => <span key={series.name}><b>Y</b> {series.name} {valueFormatter(series.values[hovered])}</span>)}
      </div>}
      {labels && <div className="axis-labels">{labels.map(label => <span key={label}>{label}</span>)}</div>}
      {xAxisLabel && <span className="chart-x-title">{xAxisLabel}</span>}
    </div>
  );
}

export function BarChart({ values, labels, positive = "#94ff70", negative = "#ff685f", interactive = false }: {
  values: number[]; labels: string[]; positive?: string; negative?: string; interactive?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <div className="bar-chart" onMouseLeave={() => setHovered(null)}>
      {values.map((value, i) => (
        <div className="bar-column" key={`${labels[i]}-${i}`} onMouseEnter={() => interactive && setHovered(i)}>
          <div className="bar-track">
            <span className={value >= 0 ? "bar positive" : "bar negative"} style={{
              height: `${Math.max(4, Math.abs(value) / max * 48)}%`,
              background: value >= 0 ? positive : negative,
              [value >= 0 ? "bottom" : "top"]: "50%"
            }} />
          </div>
          <small>{labels[i]}</small>
          {interactive && hovered === i && <div className="bar-hover-card"><strong>Strike {labels[i]}</strong><span>GEX {value < 0 ? "−" : ""}${Math.abs(value / 1e6).toFixed(2)}M</span></div>}
        </div>
      ))}
    </div>
  );
}

export function Gauge({ value, label, signed = false, color = "#94ff70" }: {
  value: number; label: string; signed?: boolean; color?: string;
}) {
  const normalized = signed ? (value + 1) / 2 : value;
  const circumference = 251.2;
  return (
    <div className="gauge">
      <svg viewBox="0 0 100 62" role="img" aria-label={`${label}: ${value}`}>
        <path d="M10 52 A40 40 0 0 1 90 52" fill="none" stroke="#222c31" strokeWidth="7" pathLength="100" />
        <path d="M10 52 A40 40 0 0 1 90 52" fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" pathLength="100" strokeDasharray={`${normalized * 100} 100`} />
      </svg>
      <strong>{signed && value > 0 ? "+" : ""}{value.toFixed(2)}</strong>
      <span>{label}</span>
    </div>
  );
}
