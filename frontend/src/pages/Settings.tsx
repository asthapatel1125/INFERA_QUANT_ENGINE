import { Card } from "../components/Card";

export function Settings() {
  return <div className="dashboard-grid"><Card title="Feed configuration" eyebrow="Environment">
    <div className="settings-form"><label>Backend URL<input value={import.meta.env.VITE_BACKEND_URL || "Same origin / development proxy"} readOnly /></label>
      <label>Stream protocol<input value="Server-Sent Events (SSE)" readOnly /></label><p>Configure production values in your Vercel project environment.</p></div>
  </Card><Card title="Risk notice" eyebrow="Important"><p className="muted-copy">Axiom Flow is analytics software. It does not place orders and should not be treated as financial advice. Validate live provider schemas and exposure sign conventions before production use.</p></Card></div>;
}

