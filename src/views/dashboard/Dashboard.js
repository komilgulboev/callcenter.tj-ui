import React, { useEffect, useState } from "react";
import { useMonitorSocket } from "../../hooks/useMonitorSocket";
import { useTranslation } from "react-i18next";

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

export default function Dashboard() {
  const { agents, calls, queues } = useMonitorSocket();
  const [, forceTick] = useState(0);
  const { t } = useTranslation("dashboard");
  
  const [clearedCalls, setClearedCalls] = useState(new Set());
  const [agentsInfo, setAgentsInfo] = useState({});

  useEffect(() => {
    const t = setInterval(() => forceTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const agentKeys = Object.keys(agents || {});
    
    if (agentKeys.length === 0) return;
    if (agentKeys.every(key => agentsInfo[key])) return;
    
    const token = localStorage.getItem("accessToken");
    
    fetch("http://localhost:8080/api/agents/info", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          console.error("❌ Failed to load agents info, status:", res.status);
          throw new Error("Failed to load agents info");
        }
        return res.json();
      })
      .then((data) => {
        const infoMap = {};
        (data.agents || []).forEach((agent) => {
          infoMap[agent.sipno] = {
            firstName: agent.firstName || "",
            lastName: agent.lastName || "",
          };
        });
        setAgentsInfo(infoMap);
      })
      .catch((err) => {
        console.error("❌ Failed to load agents info:", err);
      });
  }, [agents]);

  useEffect(() => {
    if (calls) {
      setClearedCalls(prev => {
        const newSet = new Set(prev);
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
  const mainQueue = queueList[0];

  const totalAgents = agentList.length;
  const onlineAgents = agentList.filter(a => a.status !== 'offline').length;
  const pausedAgents = agentList.filter(a => a.status === 'paused').length;
  
  const inCallAgents = agentList.filter(a => {
    if (a.status !== 'in-call' && a.status !== 'ringing') return false;
    if (!a.callId) return false;
    return callsMap[a.callId] && !clearedCalls.has(a.callId);
  }).length;
  
  const availableAgents = agentList.filter(a => 
    a.status === 'idle' || (a.status === 'ringing' && !callsMap[a.callId])
  ).length;

  const waitingCalls = Object.values(callsMap).filter(call => {
    if (clearedCalls.has(call.id)) return false;
    const hasAgentHandling = agentList.some(agent => 
      agent.callId === call.id && (agent.status === 'ringing' || agent.status === 'in-call')
    );
    return !hasAgentHandling;
  });

  const handleHangup = async (agent, call) => {
    const callIdToUse = call?.id || agent.callId;
    
    if (!callIdToUse) {
      console.error("❌ No callId available!");
      alert("Error: No call ID available");
      return;
    }
    
    try {
      await apiAction("/api/actions/hangup", { callId: callIdToUse });
      setClearedCalls(prev => new Set(prev).add(callIdToUse));
    } catch (err) {
      console.error("❌ Hangup failed:", err);
      alert(`Hangup failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Общая статистика */}
      <QueueSummary 
        queue={mainQueue} 
        totalAgents={totalAgents}
        onlineAgents={onlineAgents}
        availableAgents={availableAgents}
        inCallAgents={inCallAgents}
        pausedAgents={pausedAgents}
        waitingCalls={waitingCalls.length}
      />

      {/* Таблица очередей */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            <th style={th}>{t("queue")}</th>
            <th style={th}>{t("agentsOnline")}</th>
            <th style={th}>{t("oncall")}</th>
            <th style={th}>{t("waiting")}</th>
            <th style={th}>{t("sla")}</th>
          </tr>
        </thead>
        <tbody>
          {queueList.length === 0 ? (
            <tr>
              <td colSpan={5} style={td}>{t("noqueues")}</td>
            </tr>
          ) : (
            queueList.map(q => (
              <tr key={q.name}>
                <td style={td}>{q.name}</td>
                <td style={td}>{onlineAgents}</td>
                <td style={td}>{inCallAgents}</td>
                <td style={td}>{waitingCalls.length}</td>
                <td style={td}>{(q.sla * 100).toFixed(1)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Таблица ожидающих звонков */}
      {waitingCalls.length > 0 && (
        <>
          <h3 style={{ marginTop: 24, marginBottom: 12 }}>
            📞 {t("waitingCalls")} ({waitingCalls.length})
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>{t("phoneNumber")}</th>
                <th style={th}>{t("callStatus")}</th>
                <th style={th}>{t("queue")}</th>
                <th style={th}>{t("customerInfo")}</th>
                <th style={th}>{t("waitTime")}</th>
              </tr>
            </thead>
            <tbody>
              {waitingCalls.map(call => (
                <tr key={call.id}>
                  <td style={td}>
                    <strong>{call.from}</strong>
                  </td>
                  <td style={td}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "#fb8c00",
                      color: "#fff",
                      fontSize: 12,
                    }}>
                      {t("inWaiting")}
                    </span>
                  </td>
                  <td style={td}>{call.to}</td>
                  <td style={td}>-</td>
                  <td style={td}>
                    {formatWaitTime(call.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Таблица агентов */}
      <h3 style={{ marginTop: 24, marginBottom: 12 }}>👥 {t("agents")}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>{t("agent")}</th>
            <th style={th}>{t("name")}</th>
            <th style={th}>{t("ip")}</th>
            <th style={th}>{t("status")}</th>
            <th style={th}>{t("call")}</th>
            <th style={th}>{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {agentList.length === 0 ? (
            <tr>
              <td colSpan={6} style={td}>{t("noagents")}</td>
            </tr>
          ) : (
            agentList.map(a => {
              const info = agentsInfo[a.name] || {};
              const fullName = info.firstName && info.lastName
                ? `${info.firstName} ${info.lastName}`
                : info.firstName || info.lastName || "-";
              
              const isCallCleared = a.callId && clearedCalls.has(a.callId);
              const callExists = a.callId && callsMap[a.callId];
              const call = callExists && !isCallCleared ? callsMap[a.callId] : null;

              let safeStatus = a.status;
              if ((a.status === "in-call" || a.status === "ringing") && !call) {
                safeStatus = "idle";
              }

              const duration = call?.startedAt ? formatDuration(call.startedAt) : "";

              return (
                <tr key={a.name}>
                  <td style={td}>{a.name}</td>
                  <td style={td}>{fullName}</td>
                  <td style={td}>{a.ipAddress || "-"}</td>
                  <td style={td}>
                    <StatusBadge status={safeStatus} t={t} />
                  </td>
                  <td style={td}>
                    {call
                      ? `${call.from} → ${call.to} (${duration})`
                      : "-"}
                  </td>
                  <td style={td}>
                    <Actions 
                      agent={a} 
                      call={call} 
                      onHangup={handleHangup}
                      safeStatus={safeStatus}
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

function QueueSummary({ 
  queue, 
  totalAgents, 
  onlineAgents,
  availableAgents, 
  inCallAgents, 
  pausedAgents,
  waitingCalls 
}) {
  const { t } = useTranslation("dashboard");
  if (!queue) return null;

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
      <span>👥 {t("total")}: {totalAgents}</span>
      <span>🌐 {t("online")}: {onlineAgents}</span>
      <span style={{ color: "#43a047" }}>🟢 {t("available")}: {availableAgents}</span>
      <span style={{ color: "#e53935" }}>🔴 {t("oncall")}: {inCallAgents}</span>
      <span style={{ color: "#1976d2" }}>⏸ {t("pause")}: {pausedAgents}</span>
      {waitingCalls > 0 && (
        <span style={{ color: "#fb8c00" }}>
          ⏳ {t("waiting")}: {waitingCalls}
        </span>
      )}
    </div>
  );
}

function Actions({ agent, call, onHangup, safeStatus }) {
  const { t } = useTranslation("dashboard");
  const isPaused = safeStatus === "paused";
  const isInCall = safeStatus === "in-call" && call;

  return (
    <>
      <IconButton
        title={isPaused ? t("unpause") : t("pause")}
        onClick={() => apiAction("/api/actions/pause", { agent: agent.name })}
      >
        {isPaused ? "🕒" : "⏸"}
      </IconButton>
      {isInCall && (
        <IconButton title={t("hangup")} onClick={() => onHangup(agent, call)}>
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

function formatDuration(startedAt) {
  const sec = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatWaitTime(startedAt) {
  const sec = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  if (sec < 60) {
    return `${sec}с`;
  }
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins}м ${secs}с`;
}

function StatusBadge({ status, t }) {
  const colors = {
    "in-call": "#e53935",
    ringing: "#fb8c00",
    idle: "#43a047",
    offline: "#757575",
    paused: "#1976d2",
  };

  // Мапинг статусов на ключи переводов
  const statusKeys = {
    "idle": "statusIdle",
    "in-call": "statusInCall",
    "ringing": "statusRinging",
    "offline": "statusOffline",
    "paused": "statusPaused",
  };

  const translationKey = statusKeys[status] || "statusIdle";

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
      }}
    >
      {t(translationKey)}
    </span>
  );
}

const th = { borderBottom: "1px solid #ddd", padding: 8 };
const td = { borderBottom: "1px solid #eee", padding: 8 };