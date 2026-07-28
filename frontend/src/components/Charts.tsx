import type { ReactNode } from "react";

function pathFor(values: number[], width = 500, height = 160) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 18) - 9;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function LineChart({ values, color = "#94ff70", labels, fill = false, children }: {
  values: number[]; color?: string; labels?: string[]; fill?: boolean; children?: ReactNode;
}) {
  const path = pathFor(values);
  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 500 180" role="img" aria-label="Streaming line chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".25" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map(y => <line className="grid-line" key={y} x1="0" x2="500" y1={y} y2={y} />)}
        {fill && path && <path d={`${path} L500,180 L0,180 Z`} fill={`url(#fill-${color.replace("#", "")})`} />}
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        {children}
      </svg>
      {labels && <div className="axis-labels">{labels.map(label => <span key={label}>{label}</span>)}</div>}
    </div>
  );
}

export function BarChart({ values, labels, positive = "#94ff70", negative = "#ff685f" }: {
  values: number[]; labels: string[]; positive?: string; negative?: string;
}) {
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <div className="bar-chart">
      {values.map((value, i) => (
        <div className="bar-column" key={`${labels[i]}-${i}`}>
          <div className="bar-track">
            <span className={value >= 0 ? "bar positive" : "bar negative"} style={{
              height: `${Math.max(4, Math.abs(value) / max * 48)}%`,
              background: value >= 0 ? positive : negative,
              [value >= 0 ? "bottom" : "top"]: "50%"
            }} />
          </div>
          <small>{labels[i]}</small>
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

