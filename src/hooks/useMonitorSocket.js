import { useEffect, useState } from "react";

export function useMonitorSocket() {
  const [agents, setAgents] = useState({});
  const [calls, setCalls] = useState({});
  const [queues, setQueues] = useState({});
  const [agentsInfo, setAgentsInfo] = useState({});  // ← ДОБАВИТЬ

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const ws = new WebSocket(`ws://localhost:8080/ws/monitor?token=${token}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "snapshot") {
        setAgents(data.agents || {});
        setCalls(data.calls || {});
        setQueues(data.queues || {});
      }
    };

    // ← ДОБАВИТЬ: Загрузка информации об агентах
    fetch("http://localhost:8080/api/agents/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const infoMap = {};
        (data.agents || []).forEach((agent) => {
          infoMap[agent.username] = {
            firstName: agent.firstName,
            lastName: agent.lastName,
          };
        });
        setAgentsInfo(infoMap);
      })
      .catch((err) => console.error("Failed to load agents info:", err));

    return () => ws.close();
  }, []);

  return { agents, calls, queues, agentsInfo };  // ← ДОБАВИТЬ agentsInfo
}