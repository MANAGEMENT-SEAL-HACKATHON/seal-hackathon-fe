import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { hackathonService } from '../services/hackathonService';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { roundService } from '../../rounds/services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { teamService } from '../../teams/services/teamService';
import { eventService } from '../../events/services/eventService';
import { mapHackathonToFE } from '../mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

const LAST_HACKATHON_KEY = 'seal-last-hackathon-id';

const HackathonScopeContext = createContext(null);

function extractList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.content)) return res.content;
  return [];
}

export function persistLastHackathonId(id) {
  if (id == null) return;
  try {
    localStorage.setItem(LAST_HACKATHON_KEY, String(id));
  } catch {
    // no-op
  }
}

export function readLastHackathonId() {
  try {
    const raw = localStorage.getItem(LAST_HACKATHON_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for coordinator event context.
 * Priority: URL :hackathonId / :id → ?hackathonId → localStorage last-used.
 */
export function HackathonScopeProvider({ children }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const urlResolvedId = useMemo(() => {
    const fromParams = params.hackathonId || params.id || null;
    const fromQuery = searchParams.get('hackathonId') || searchParams.get('hackathon_id');
    const candidate = fromParams || fromQuery || readLastHackathonId();
    const n = Number(candidate);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params.hackathonId, params.id, searchParams, location.pathname]);

  const [hackathonId, setHackathonIdState] = useState(urlResolvedId);
  const [hackathons, setHackathons] = useState([]);
  const [isLoadingHackathons, setIsLoadingHackathons] = useState(false);
  const [hackathon, setHackathon] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [activeTeams, setActiveTeams] = useState([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [tracksCount, setTracksCount] = useState(0);
  const [readinessData, setReadinessData] = useState(null);
  const [prizesCount, setPrizesCount] = useState(0);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const setHackathonId = useCallback(
    (id, { navigateSetup = true } = {}) => {
      const n = Number(id);
      if (!Number.isFinite(n) || n <= 0) return;
      setHackathonIdState(n);
      persistLastHackathonId(n);

      if (!navigateSetup) return;
      const path = location.pathname;
      // Keep deep links in sync when switching event from global selector.
      const setupMatch = path.match(/^\/hackathons\/(\d+)\/setup/);
      if (setupMatch && Number(setupMatch[1]) !== n) {
        const tab = searchParams.get('tab');
        navigate(`/hackathons/${n}/setup${tab ? `?tab=${tab}` : ''}`);
        return;
      }
      const analyticsMatch = path.match(/^\/coordinator\/analytics(?:\/(\d+))?/);
      if (analyticsMatch && path.startsWith('/coordinator/analytics')) {
        navigate(`/coordinator/analytics/${n}`);
        return;
      }
      if (path.startsWith('/coordinator/final-config')) {
        navigate(`/coordinator/final-config?hackathonId=${n}`);
      }
    },
    [location.pathname, navigate, searchParams],
  );

  useEffect(() => {
    if (urlResolvedId) {
      setHackathonIdState(urlResolvedId);
      persistLastHackathonId(urlResolvedId);
    }
  }, [urlResolvedId]);

  useEffect(() => {
    let cancelled = false;
    const fetchHackathons = async () => {
      setIsLoadingHackathons(true);
      try {
        const res = await axiosClient.get(`${ENDPOINTS.HACKATHONS.BASE}?size=200`);
        const list = extractList(res).map((h) => mapHackathonToFE(h));
        if (cancelled) return;
        setHackathons(list);
        if (!urlResolvedId && !hackathonId && list.length > 0) {
          setHackathonIdState(list[0].id);
          persistLastHackathonId(list[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch hackathons for scope', error);
      } finally {
        if (!cancelled) setIsLoadingHackathons(false);
      }
    };
    fetchHackathons();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; url sync handled separately
  }, []);

  const refreshSnapshot = useCallback(async () => {
    if (!hackathonId) {
      setHackathon(null);
      setRounds([]);
      setTracks([]);
      setActiveTeams([]);
      setEventsCount(0);
      setTracksCount(0);
      setReadinessData(null);
      setPrizesCount(0);
      return;
    }

    setSnapshotLoading(true);
    setTeamsLoading(true);
    try {
      const [hackData, roundsData, tracksData, eventsData, teamsRes, readiness] =
        await Promise.all([
          hackathonService.getById(hackathonId),
          roundService.listByHackathon(hackathonId),
          trackService.listByHackathon(hackathonId),
          eventService.listByHackathon(hackathonId).catch(() => []),
          teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }).catch(() => []),
          hackathonService.getReadiness(hackathonId, 'ONGOING').catch(() => null),
        ]);

      const mappedHack = mapHackathonToFE(hackData);
      const status = String(mappedHack?.status || '').toUpperCase();
      let prizeList = [];
      if (status === 'PENDING_CONFIRM' || status === 'FINISHED') {
        prizeList = extractList(
          await hackathonResultsService.getPrizes(hackathonId).catch(() => []),
        );
      }

      const roundList = extractList(roundsData);
      const fullRounds = await Promise.all(
        roundList.map(async (r) => {
          try {
            const detail = await roundService.getById(r.id);
            return mapRoundToFE(detail);
          } catch {
            return mapRoundToFE(r);
          }
        }),
      );

      const trackList = extractList(tracksData);
      const teamList = extractList(teamsRes);
      const eventList = extractList(eventsData);

      setHackathon(mappedHack);
      setRounds(fullRounds);
      setTracks(trackList);
      setTracksCount(trackList.length);
      setActiveTeams(teamList);
      setEventsCount(eventList.length);
      setReadinessData(readiness?.data ?? readiness);
      setPrizesCount(prizeList.length);
      persistLastHackathonId(hackathonId);
    } catch {
      // keep previous snapshot on soft failure
    } finally {
      setTeamsLoading(false);
      setSnapshotLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    refreshSnapshot();
  }, [refreshSnapshot]);

  const selectedHackathon = useMemo(() => {
    if (hackathon) return hackathon;
    return hackathons.find((h) => Number(h.id) === Number(hackathonId)) || null;
  }, [hackathon, hackathons, hackathonId]);

  const ctx = useMemo(
    () => ({
      hackathon,
      rounds,
      tracks,
      activeTeams,
      tracksCount,
      eventsCount,
      readinessData,
      blockers: readinessData?.blockers || [],
      prizesCount,
    }),
    [
      hackathon,
      rounds,
      tracks,
      activeTeams,
      tracksCount,
      eventsCount,
      readinessData,
      prizesCount,
    ],
  );

  const value = useMemo(
    () => ({
      hackathonId,
      setHackathonId,
      hackathon,
      selectedHackathon,
      hackathons,
      isLoadingHackathons,
      rounds,
      tracks,
      activeTeams,
      tracksCount,
      eventsCount,
      readinessData,
      prizesCount,
      snapshotLoading,
      teamsLoading,
      ctx,
      refreshSnapshot,
      hasHackathon: Boolean(hackathonId),
    }),
    [
      hackathonId,
      setHackathonId,
      hackathon,
      selectedHackathon,
      hackathons,
      isLoadingHackathons,
      rounds,
      tracks,
      activeTeams,
      tracksCount,
      eventsCount,
      readinessData,
      prizesCount,
      snapshotLoading,
      teamsLoading,
      ctx,
      refreshSnapshot,
    ],
  );

  return (
    <HackathonScopeContext.Provider value={value}>{children}</HackathonScopeContext.Provider>
  );
}

export function useHackathonScope() {
  const value = useContext(HackathonScopeContext);
  if (!value) {
    throw new Error('useHackathonScope must be used within HackathonScopeProvider');
  }
  return value;
}

/** Optional: returns null outside provider (for pages that may render without it). */
export function useHackathonScopeOptional() {
  return useContext(HackathonScopeContext);
}
