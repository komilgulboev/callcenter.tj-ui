import React, { useEffect, useState } from "react";
import { useMonitorSocket } from "../../hooks/useMonitorSocket";
import { useTranslation } from "react-i18next";

// =========================
// API helper
// =========================
async function apiAction(path, params) {
  const token = localStorage.getItem("accessToken");
  const qs = new URLSearchParams(params).toString();

  const res = await fetch(`http://localhost:8080${path}?${qs}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "API error");
  }
}

// =========================
// DASHBOARD
// =========================
export default function Dashboard() {
  const { agents, calls, queues } = useMonitorSocket();
  const [, forceTick] = useState(0);
  const { t } = useTranslation("dashboard");
  
  // 🔥 ЛОКАЛЬНЫЙ СТЕЙТ для немедленной очистки после Hangup
  const [clearedCalls, setClearedCalls] = useState(new Set());
  
  // 👤 СТЕЙТ для информации об агентах (имя, фамилия)
  const [agentsInfo, setAgentsInfo] = useState({});

  // ⏱ обновляем таймер раз в секунду
  useEffect(() => {
    const t = setInterval(() => forceTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 👤 Загружаем информацию об агентах (имя, фамилия)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    
    fetch("http://localhost:8080/api/agents/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load agents info");
        return res.json();
      })
      .then((data) => {
        const infoMap = {};
        (data.agents || []).forEach((agent) => {
          infoMap[agent.username] = {
            firstName: agent.firstName || "",
            lastName: agent.lastName || "",
          };
        });
        setAgentsInfo(infoMap);
        console.log("👤 Agents info loaded:", infoMap);
      })
      .catch((err) => {
        console.error("❌ Failed to load agents info:", err);
      });
  }, []); // Загружаем один раз при монтировании

  // 🔍 Логируем calls для отладки
  useEffect(() => {
    if (calls && Object.keys(calls).length > 0) {
      console.log("📞 CALLS from WebSocket:", calls);
      Object.entries(calls).forEach(([id, call]) => {
        console.log(`  - Call ID: ${id}`, call);
      });
    }
  }, [calls]);

  // 🧹 Очищаем clearedCalls когда звонки обновляются от WebSocket
  useEffect(() => {
    if (calls) {
      setClearedCalls(prev => {
        const newSet = new Set(prev);
        // Удаляем из очищенных те, которые уже исчезли из WebSocket
        prev.forEach(callId => {
          if (!calls[callId]) {
            newSet.delete(callId);
          }
        });
        return newSet;
      });
    }
  }, [calls]);

  const agentList = Object.values(agents || {});
  const callsMap = calls || {};
  const queueList = Object.values(queues || {});
  const mainQueue = queueList[0]; // 1 tenant = 1 queue

  // 🔥 ФУНКЦИЯ HANGUP с локальной очисткой
  const handleHangup = async (agent, call) => {
    console.log("🔍 HANGUP CLICK:");
    console.log("  Agent:", agent.name);
    console.log("  Agent callId:", agent.callId);
    console.log("  Call object:", call);
    console.log("  Call ID from object:", call?.id);
    
    const callIdToUse = call?.id || agent.callId;
    
    if (!callIdToUse) {
      console.error("❌ No callId available!");
      alert("Error: No call ID available");
      return;
    }
    
    console.log("  Using callId:", callIdToUse);
    
    try {
      await apiAction("/api/actions/hangup", { callId: callIdToUse });
      console.log("✅ Hangup successful");
      
      // 🔥 НЕМЕДЛЕННО помечаем звонок как завершённый
      setClearedCalls(prev => new Set(prev).add(callIdToUse));
      console.log("🧹 Call marked as cleared:", callIdToUse);
      
    } catch (err) {
      console.error("❌ Hangup failed:", err);
      alert(`Hangup failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>

      {/* ========================= */}
      {/* QUEUE SUMMARY */}
      {/* ========================= */}
      <QueueSummary queue={mainQueue} agents={agents} />

      {/* ========================= */}
      {/* QUEUE STATISTICS */}
      {/* ========================= */}      

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>{t("dashboard:call")}</th>
            <th style={th}>{t("dashboard:agents")}</th>
            <th style={th}>{t("dashboard:inCall")}</th>
            <th style={th}>{t("dashboard:waiting")}</th>
            <th style={th}>{t("dashboard:sla")}</th>
          </tr>
        </thead>

        <tbody>
          {queueList.length === 0 ? (
            <tr>
              <td colSpan={5} style={td}>{t("dashboard:noqueue")}</td>
            </tr>
          ) : (
            queueList.map(q => (
              <tr key={q.name}>
                <td style={td}>{q.name}</td>
                <td style={td}>{q.agents}</td>
                <td style={td}>{q.inCall}</td>
                <td style={td}>{q.waiting}</td>
                <td style={td}>{(q.sla * 100).toFixed(1)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ========================= */}
      {/* AGENTS */}
      {/* ========================= */}
      
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>{t("dashboard:agents")}</th>
            <th style={th}>{t("dashboard:name")}</th>  {/* 👤 НОВАЯ КОЛОНКА */}
            <th style={th}>{t("dashboard:status")}</th>
            <th style={th}>{t("dashboard:call")}</th>
            <th style={th}>{t("dashboard:actions")}</th>
          </tr>
        </thead>

        <tbody>
          {agentList.length === 0 ? (
            <tr>
              <td colSpan={5} style={td}>No agents</td>
            </tr>
          ) : (
            agentList.map(a => {
              // 👤 Получаем информацию об агенте
              const info = agentsInfo[a.name] || {};
              const fullName = info.firstName && info.lastName
                ? `${info.firstName} ${info.lastName}`
                : info.firstName || info.lastName || "-";
              
              // 🔥 Игнорируем звонки которые мы уже завершили
              const isCallCleared = a.callId && clearedCalls.has(a.callId);
              
              const call =
                a.callId && callsMap?.[a.callId] && !isCallCleared
                  ? callsMap[a.callId]
                  : null;

              // 🔥 ЛЕЧИМ ЗАЛИПШИЙ in-call
              let safeStatus = a.status;
              if (a.status === "in-call" && (!call || isCallCleared)) {
                safeStatus = "idle";
              }

              const duration =
                call?.startedAt
                  ? formatDuration(call.startedAt)
                  : "";

              return (
                <tr key={a.name}>
                  <td style={td}>{a.name}</td>
                  <td style={td}>{fullName}</td>  {/* 👤 ИМЯ И ФАМИЛИЯ */}

                  <td style={td}>
                    <StatusBadge status={safeStatus} />
                  </td>

                  <td style={td}>
                    {call
                      ? `${call.from} → ${call.to} (${duration})`
                      : isCallCleared
                        ? "-"
                        : a.callId 
                          ? `Call ID: ${a.callId}`
                          : "-"}
                  </td>

                  <td style={td}>
                    <Actions 
                      agent={a} 
                      call={call} 
                      onHangup={handleHangup}
                      isCallCleared={isCallCleared}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// =========================
// QUEUE SUMMARY
// =========================
function QueueSummary({ queue, agents }) {
  const { t } = useTranslation("dashboard");

  if (!queue) return null;

  let paused = 0;
  Object.values(agents || {}).forEach(a => {
    if (a.status === "paused") paused++;
  });

  const total = queue.agents || 0;
  const inCall = queue.inCall || 0;
  const available = Math.max(total - inCall - paused, 0);

  return (
    <div style={{
      display: "flex",
      gap: 18,
      alignItems: "center",
      padding: "10px 14px",
      borderRadius: 8,
      marginBottom: 20,
      background: "var(--panel-bg, rgba(0,0,0,0.05))",
      color: "var(--text-color, inherit)",
    }}>
      <strong>📞 {t("queue")} {queue.name}</strong>
      <span>👥 {total}</span>
      <span style={{ color: "#43a047" }}>🟢 {available}</span>
      <span style={{ color: "#e53935" }}>🔴 {inCall}</span>
      <span style={{ color: "#1976d2" }}>⏸ {paused}</span>

      {queue.waiting > 0 && (
        <span style={{ color: "#fb8c00" }}>
          ⏳ {queue.waiting} {t("waiting")}
        </span>
      )}
    </div>
  );
}


// =========================
// ACTIONS
// =========================
function Actions({ agent, call, onHangup, isCallCleared }) {
  const isPaused = agent.status === "paused";
  const isInCall = agent.status === "in-call" && !isCallCleared;

  return (
    <>
      {/* PAUSE */}
      <IconButton
        title={isPaused ? "Unpause" : "Pause"}
        onClick={() =>
          apiAction("/api/actions/pause", { agent: agent.name })
        }
      >
        {isPaused ? "🕒" : "⏸"}
      </IconButton>

      {/* ❌ HANGUP */}
      {isInCall && (
        <IconButton
          title="Hangup"
          onClick={() => onHangup(agent, call)}
        >
          ❌
        </IconButton>
      )}

    </>
  );
}

function IconButton({ children, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        marginRight: 6,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 16,
      }}
    >
      {children}
    </button>
  );
}

// =========================
// HELPERS
// =========================
function formatDuration(startedAt) {
  const sec = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function StatusBadge({ status }) {
  const colors = {
    "in-call": "#e53935",
    ringing: "#fb8c00",
    idle: "#43a047",
    offline: "#757575",
    paused: "#1976d2",
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        background: colors[status] || "#9e9e9e",
        color: "#fff",
        fontSize: 12,
        minWidth: 70,
        display: "inline-block",
        textAlign: "center",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

// =========================
// STYLES
// =========================
const th = { borderBottom: "1px solid #ddd", padding: 8 };
const td = { borderBottom: "1px solid #eee", padding: 8 };