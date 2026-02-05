import { useEffect, useState } from "react";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [queue, setQueue] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const ws = new WebSocket(`ws://localhost:8080/ws/monitor?token=${token}`);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === "snapshot") {
        setAgents(msg.data.agents || []);
        setCalls(msg.data.calls || []);
        setQueue(msg.data.queue || null);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Queue Monitor</h2>

      {queue && (
        <div>
          <b>Queue:</b> {queue.queue}<br />
          Waiting: {queue.waiting} | Agents: {queue.agentsTotal} | Missed: {queue.missed}
        </div>
      )}

      <h3>Agents</h3>
      <ul>
        {agents.map(a => (
          <li key={a.exten}>{a.exten} — {a.state}</li>
        ))}
      </ul>

      <h3>Calls</h3>
      <ul>
        {calls.map(c => (
          <li key={c.id}>
            {c.from} → {c.to} ({c.state})
          </li>
        ))}
      </ul>
    </div>
  );
}
