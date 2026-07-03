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
 * Subscribe presentation queue updates for a round (and optional track).
 * Calls onInvalidate when the server broadcasts queue changes.
 */
export function usePresentationQueueSocket(roundId, onInvalidate, trackId = null) {
  const onInvalidateRef = useRef(onInvalidate);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
  }, [onInvalidate]);

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
        const topics = [`/topic/rounds/${roundId}/presentation-queue`];
        if (trackId) {
          topics.push(`/topic/rounds/${roundId}/tracks/${trackId}/presentation-queue`);
        }
        topics.forEach((topic) => {
          client.subscribe(topic, () => {
            onInvalidateRef.current?.();
          });
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
  }, [roundId, trackId]);

  return { connected };
}

export default usePresentationQueueSocket;
