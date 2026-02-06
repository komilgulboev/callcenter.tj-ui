import React, { useEffect, useState } from "react";
import { useMonitorSocket } from "../../hooks/useMonitorSocket";

export default function Dashboard() {
  const { agents, calls } = useMonitorSocket();

  const agentList = Object.values(agents || {});

  // 🔁 принудительный ререндер раз в секунду
  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      forceTick((v) => v + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>📊 Agents Monitor</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 16,
        }}
      >
        <thead>
          <tr>
            <th style={th}>Agent</th>
            <th style={th}>Status</th>
            <th style={th}>Call</th>
          </tr>
        </thead>

        <tbody>
          {agentList.length === 0 ? (
            <tr key="no-agents">
              <td colSpan={3} style={td}>
                No agents
              </td>
            </tr>
          ) : (
            agentList.map((a, idx) => {
              const name = a.name || `unknown-${idx}`;
              const call = a.callId ? calls[a.callId] : null;

              return (
                <tr key={`agent-${name}`}>
                  <td style={td}>{name}</td>

                  <td style={td}>
                    <StatusBadge status={a.status} />
                  </td>

                  <td style={td}>
                    {call
                      ? `${call.from} → ${call.to} (${formatDuration(
                          call.startedAt
                        )})`
                      : "-"}
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
// HELPERS
// =========================

function formatDuration(startedAt) {
  if (!startedAt) return "";

  const sec = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 1000
  );

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return `${mm}:${ss}`;
}

function StatusBadge({ status }) {
  let color = "#9e9e9e";

  switch (status) {
    case "in-call":
      color = "#e53935";
      break;
    case "ringing":
      color = "#fb8c00";
      break;
    case "idle":
      color = "#43a047";
      break;
    case "offline":
      color = "#757575";
      break;
  }

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 6,
        color: "#fff",
        backgroundColor: color,
        fontSize: 12,
        textTransform: "capitalize",
        minWidth: 70,
        display: "inline-block",
        textAlign: "center",
      }}
    >
      {status || "unknown"}
    </span>
  );
}

// =========================
// STYLES
// =========================

const th = {
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  padding: 8,
};

const td = {
  borderBottom: "1px solid #eee",
  padding: 8,
};
