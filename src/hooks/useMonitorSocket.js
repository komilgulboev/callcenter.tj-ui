import { useEffect, useRef, useState } from "react";

export function useMonitorSocket() {
  const [agents, setAgents] = useState({});
  const [calls, setCalls] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // ❗ BACKEND PORT
    const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

    const ws = new WebSocket(
      `${WS_BASE}/ws/monitor?token=${encodeURIComponent(token)}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🟢 WS connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "snapshot") {
          setAgents(msg.agents || {});
          setCalls(msg.calls || {});
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    ws.onclose = () => {
      console.log("🔴 WS disconnected");
    };

    ws.onerror = (e) => {
      console.error("WS error", e);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { agents, calls };
}
