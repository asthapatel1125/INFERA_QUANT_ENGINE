import { useEffect, useState } from "react";
import { streamUrl } from "../lib/api";
import type { StreamChannel } from "../types";

export function useStream<T>(channel: StreamChannel) {
  const [data, setData] = useState<T | null>(null);
  const [history, setHistory] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(streamUrl(channel));
    source.addEventListener(channel, (event) => {
      const packet = JSON.parse((event as MessageEvent).data) as T;
      setData(packet);
      setHistory((items) => [...items.slice(-199), packet]);
      setConnected(true);
    });
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, [channel]);

  return { data, history, connected };
}
