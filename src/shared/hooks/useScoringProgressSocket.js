import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const getWsBaseUrl = () => {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL !== undefined
      ? import.meta.env.VITE_API_BASE_URL
      : 'http://localhost:8080';
  return String(apiBase).replace(/\/$/, '');
};

const getAccessToken = () =>
  localStorage.getItem('accessToken') ||
  localStorage.getItem('token') ||
  '';

/**
 * Subscribe scoring-progress + leaderboard-preview for a round.
 * Calls onUpdate when server pushes new progress payload.
 */
export function useScoringProgressSocket(roundId, onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!roundId) {
      setConnected(false);
      return undefined;
    }

    const token = getAccessToken();
    const client = new Client({
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      webSocketFactory: () => new SockJS(`${getWsBaseUrl()}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/rounds/${roundId}/scoring-progress`, (message) => {
          try {
            const payload = JSON.parse(message.body);
            onUpdateRef.current?.(payload);
          } catch {
            onUpdateRef.current?.();
          }
        });
        client.subscribe(`/topic/rounds/${roundId}/leaderboard-preview`, () => {
          onUpdateRef.current?.();
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();

    return () => {
      setConnected(false);
      client.deactivate();
    };
  }, [roundId]);

  return { connected };
}
