import type { Alert, Exposure, Microstructure, SignalScores, StreamChannel, Zone } from "../types";

const base = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

export const streamUrl = (channel: StreamChannel) => `${base}/stream/${channel}`;

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const api = {
  zone: () => getJson<Zone>("/api/zones"),
  exposures: () => getJson<Exposure>("/api/exposures"),
  micro: () => getJson<Microstructure>("/api/micro"),
  signals: () => getJson<SignalScores>("/api/signals"),
  alerts: () => getJson<Alert[]>("/api/alerts?limit=50")
};

