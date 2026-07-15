import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';

/**
 * Sync FE clock to BE GET /api/v1/system/time.
 * Returns Date aligned to server (local clock + offsetMs).
 */
export function useServerNow({ refreshMs = 60000 } = {}) {
  const [offsetMs, setOffsetMs] = useState(0);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await axiosClient.get('/api/v1/system/time');
        const data = res?.data?.data ?? res?.data ?? res;
        const epoch = Number(data?.serverNowEpochMs);
        if (!cancelled && Number.isFinite(epoch)) {
          setOffsetMs(epoch - Date.now());
        }
      } catch {
        /* keep local clock */
      }
    };
    sync();
    const id = setInterval(sync, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshMs]);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const serverNow = useMemo(() => new Date(tick + offsetMs), [tick, offsetMs]);
  return { serverNow, offsetMs };
}

export default useServerNow;
