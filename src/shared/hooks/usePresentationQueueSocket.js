import { useEffect, useRef, useState, useCallback } from 'react';
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

const SILENT_MS = 5000;
const FALLBACK_POLL_MS = 3000;
const INVALIDATE_DEBOUNCE_MS = 400;

/**
 * Subscribe presentation queue + TIMER_PHASE + CONTROLLER_CHANGED + SCORING_UNLOCKED.
 * Invalidate is debounced 300–500ms (WS-DB-01 client).
 */
export function usePresentationQueueSocket(roundId, onInvalidate, trackId = null, options = {}) {
  const onInvalidateRef = useRef(onInvalidate);
  const onTimerPhaseRef = useRef(options.onTimerPhase);
  const onControllerChangedRef = useRef(options.onControllerChanged);
  const onScoringUnlockedRef = useRef(options.onScoringUnlocked);
  const onFallbackPollRef = useRef(options.onFallbackPoll);
  const [connected, setConnected] = useState(false);
  const [syncFallback, setSyncFallback] = useState(false);
  const lastMessageAtRef = useRef(Date.now());
  const fallbackIntervalRef = useRef(null);
  const silentCheckRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
  }, [onInvalidate]);

  useEffect(() => {
    onTimerPhaseRef.current = options.onTimerPhase;
    onControllerChangedRef.current = options.onControllerChanged;
    onScoringUnlockedRef.current = options.onScoringUnlocked;
    onFallbackPollRef.current = options.onFallbackPoll;
  }, [
    options.onTimerPhase,
    options.onControllerChanged,
    options.onScoringUnlocked,
    options.onFallbackPoll,
  ]);

  const stopFallback = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    setSyncFallback(false);
  }, []);

  const startFallback = useCallback(() => {
    if (fallbackIntervalRef.current) return;
    setSyncFallback(true);
    fallbackIntervalRef.current = setInterval(() => {
      onFallbackPollRef.current?.();
    }, FALLBACK_POLL_MS);
    onFallbackPollRef.current?.();
  }, []);

  const markMessage = useCallback(() => {
    lastMessageAtRef.current = Date.now();
    stopFallback();
  }, [stopFallback]);

  const scheduleInvalidate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onInvalidateRef.current?.();
    }, INVALIDATE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!roundId) {
      setConnected(false);
      stopFallback();
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
        markMessage();
        const topics = [
          `/topic/rounds/${roundId}/presentation-queue`,
          `/topic/rounds/${roundId}/scoring`,
        ];
        if (trackId) {
          topics.push(`/topic/rounds/${roundId}/tracks/${trackId}/presentation-queue`);
          topics.push(`/topic/rounds/${roundId}/tracks/${trackId}/scoring`);
        }
        topics.forEach((topic) => {
          client.subscribe(topic, (frame) => {
            markMessage();
            let body = null;
            try {
              body = frame?.body ? JSON.parse(frame.body) : null;
            } catch {
              body = null;
            }
            if (body?.type === 'TIMER_PHASE') {
              onTimerPhaseRef.current?.(body);
              return;
            }
            if (body?.type === 'CONTROLLER_CHANGED') {
              onControllerChangedRef.current?.(body);
              scheduleInvalidate();
              return;
            }
            if (body?.type === 'SCORING_UNLOCKED') {
              onScoringUnlockedRef.current?.(body);
              scheduleInvalidate();
              return;
            }
            scheduleInvalidate();
          });
        });
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onWebSocketClose: () => {
        setConnected(false);
      },
      onStompError: () => {
        setConnected(false);
      },
    });

    client.activate();

    silentCheckRef.current = setInterval(() => {
      const silentFor = Date.now() - lastMessageAtRef.current;
      if (silentFor >= SILENT_MS) {
        startFallback();
      }
    }, 1000);

    return () => {
      setConnected(false);
      stopFallback();
      if (silentCheckRef.current) {
        clearInterval(silentCheckRef.current);
        silentCheckRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      client.deactivate();
    };
  }, [roundId, trackId, markMessage, startFallback, stopFallback, scheduleInvalidate]);

  return { connected, syncFallback };
}

export default usePresentationQueueSocket;
