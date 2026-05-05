import { useState, useEffect, useRef } from 'react';
import { getWsUrl, getAuthToken, API_CONFIG } from '../api';

/**
 * Хук для подключения к WebSocket монитора
 * Автоматически переподключается при обрыве соединения
 * 
 * @returns {Object} { agents, calls, queues }
 */
export function useMonitorSocket() {
  const [agents, setAgents] = useState({});
  const [calls, setCalls] = useState({});
  const [queues, setQueues] = useState({});
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('🔌 useMonitorSocket: Initializing WebSocket...');
    
    const token = getAuthToken();
    if (!token) {
      console.log('🔑 No token found, skipping WebSocket connection');
      return;
    }

    console.log('🔑 Token exists: true');

    const connectWebSocket = () => {
      // Формируем WebSocket URL с токеном
      const wsUrl = `${getWsUrl(API_CONFIG.ENDPOINTS.WS_MONITOR)}?token=${token}`;
      console.log('🔌 WebSocket URL:', wsUrl);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('🟢 WS connected');
        };

        ws.onmessage = (event) => {
          console.log('📨 WS message received:', event.data);

          try {
            const data = JSON.parse(event.data);
            console.log('📦 WS parsed data:', data);
            console.log('📦 Data type:', data.type);
            console.log('📦 Agents in data:', data.agents);
            console.log('📦 Calls in data:', data.calls);
            console.log('📦 Queues in data:', data.queues);

            if (data.type === 'snapshot') {
              console.log('✅ Setting agents:', data.agents);
              console.log('✅ Setting calls:', data.calls);
              console.log('✅ Setting queues:', data.queues);

              setAgents(data.agents || {});
              setCalls(data.calls || {});
              setQueues(data.queues || {});

              console.log('✅ State updated!');
            }
          } catch (err) {
            console.error('❌ WS parse error:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WS error:', error);
        };

        ws.onclose = () => {
          console.log('🔴 WS disconnected');
          wsRef.current = null;

          // Автоматическое переподключение через N секунд
          console.log(`🔄 Reconnecting in ${API_CONFIG.TIMEOUTS.WS_RECONNECT / 1000}s...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, API_CONFIG.TIMEOUTS.WS_RECONNECT);
        };
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
      }
    };

    connectWebSocket();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { agents, calls, queues };
}