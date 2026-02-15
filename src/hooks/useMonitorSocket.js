import { useEffect, useState } from "react";

export function useMonitorSocket() {
  const [agents, setAgents] = useState({});
  const [calls, setCalls] = useState({});
  const [queues, setQueues] = useState({});

  useEffect(() => {
    console.log("🔌 useMonitorSocket: Initializing WebSocket...");
    
    const token = localStorage.getItem("accessToken");
    console.log("🔑 Token exists:", !!token);
    console.log("🔑 Token (first 20 chars):", token?.substring(0, 20));
    
    if (!token) {
      console.error("❌ No access token found in localStorage!");
      return;
    }

    const wsUrl = `ws://localhost:8080/ws/monitor?token=${token}`;
    console.log("🔌 WebSocket URL:", wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("🟢 WS connected");
    };

    ws.onmessage = (event) => {
      console.log("📨 WS message received:", event.data);
      
      try {
        const data = JSON.parse(event.data);
        console.log("📦 WS parsed data:", data);
        console.log("📦 Data type:", data.type);
        console.log("📦 Agents in data:", data.agents);
        console.log("📦 Calls in data:", data.calls);
        console.log("📦 Queues in data:", data.queues);
        
        if (data.type === "snapshot") {
          console.log("✅ Setting agents:", data.agents);
          console.log("✅ Setting calls:", data.calls);
          console.log("✅ Setting queues:", data.queues);
          
          setAgents(data.agents || {});
          setCalls(data.calls || {});
          setQueues(data.queues || {});
          
          console.log("✅ State updated!");
        } else {
          console.warn("⚠️ Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("❌ Failed to parse WS message:", err);
        console.error("❌ Raw message:", event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WS error:", error);
      console.error("❌ WS readyState:", ws.readyState);
    };

    ws.onclose = (event) => {
      console.log("🔴 WS closed");
      console.log("🔴 Close code:", event.code);
      console.log("🔴 Close reason:", event.reason);
      console.log("🔴 Was clean:", event.wasClean);
    };

    return () => {
      console.log("🔌 Cleaning up WebSocket...");
      ws.close();
    };
  }, []);



  return { agents, calls, queues };
}