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
 * Student/Coord subscribe `/topic/hackathons/{id}/announcements`
 * (GĐ4 publish + GĐ6 confirm).
 */
export function useHackathonAnnouncementSocket(hackathonId, onAnnouncement) {
  const onAnnouncementRef = useRef(onAnnouncement);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onAnnouncementRef.current = onAnnouncement;
  }, [onAnnouncement]);

  useEffect(() => {
    if (!hackathonId) {
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
        client.subscribe(`/topic/hackathons/${hackathonId}/announcements`, (message) => {
          try {
            const payload = JSON.parse(message.body);
            onAnnouncementRef.current?.(payload);
          } catch {
            onAnnouncementRef.current?.();
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
  }, [hackathonId]);

  return { connected };
}
