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
 * Subscribe /topic/tracks/{trackId}/score-saved — refresh queue/scores when a judge saves.
 */
export function useScoreSavedSocket(trackId, onScoreSaved) {
  const onScoreSavedRef = useRef(onScoreSaved);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onScoreSavedRef.current = onScoreSaved;
  }, [onScoreSaved]);

  useEffect(() => {
    if (!trackId) {
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
        client.subscribe(`/topic/tracks/${trackId}/score-saved`, (message) => {
          try {
            const payload = JSON.parse(message.body);
            onScoreSavedRef.current?.(payload);
          } catch {
            onScoreSavedRef.current?.();
          }
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
  }, [trackId]);

  return { connected };
}
