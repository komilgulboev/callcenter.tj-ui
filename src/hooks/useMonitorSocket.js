import { useEffect, useState } from "react"

export function useMonitorSocket(token) {
  const [agents, setAgents] = useState([])

  useEffect(() => {
    if (!token) return

    const ws = new WebSocket(
      `ws://localhost:8080/ws/monitor?token=${token}`
    )

    ws.onmessage = (e) => {
 

      const msg = JSON.parse(e.data);
  console.log("📡 WS MESSAGE:", msg); // 🔥 ОБЯЗАТЕЛЬНО

  if (msg.type === "snapshot") {
    setAgents(msg.data || []);
  }

  if (msg.type === "update") {
    setAgents((prev = []) => {
      const map = new Map(prev.map(a => [a.exten, a]));
      map.set(msg.data.exten, msg.data);
      return Array.from(map.values());
    });
  }
    }

    ws.onerror = (e) => {
      console.error("WS ERROR", e)
    }

    return () => ws.close()
  }, [token])

  return agents
}
