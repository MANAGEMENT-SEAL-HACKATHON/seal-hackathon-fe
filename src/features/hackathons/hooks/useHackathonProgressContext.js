import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { hackathonService } from '../services/hackathonService';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { roundService } from '../../rounds/services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { teamService } from '../../teams/services/teamService';
import { eventService } from '../../events/services/eventService';
import { mapHackathonToFE } from '../mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
const LAST_HACKATHON_KEY = 'seal-last-hackathon-id';

function extractList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function persistLastHackathonId(id) {
  if (id == null) return;
  try {
    localStorage.setItem(LAST_HACKATHON_KEY, String(id));
  } catch {
    // no-op
  }
}

function readLastHackathonId() {
  try {
    const raw = localStorage.getItem(LAST_HACKATHON_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Resolve hackathonId from URL / query / last-used, then load progress snapshot.
 */
export function useHackathonProgressContext() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const resolvedId = useMemo(() => {
    const fromParams =
      params.hackathonId || params.id || null;
    const fromQuery = searchParams.get('hackathonId') || searchParams.get('hackathon_id');
    const candidate = fromParams || fromQuery || readLastHackathonId();
    const n = Number(candidate);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params.hackathonId, params.id, searchParams, location.pathname]);

  const [hackathonId, setHackathonIdState] = useState(resolvedId);
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

  const setHackathonId = useCallback((id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;
    setHackathonIdState(n);
    persistLastHackathonId(n);
  }, []);

  useEffect(() => {
    if (resolvedId) {
      setHackathonIdState(resolvedId);
      persistLastHackathonId(resolvedId);
    }
  }, [resolvedId]);

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
      const [hackData, roundsData, tracksData, eventsData, teamsRes, readiness, prizes] =
        await Promise.all([
          hackathonService.getById(hackathonId),
          roundService.listByHackathon(hackathonId),
          trackService.listByHackathon(hackathonId),
          eventService.listByHackathon(hackathonId).catch(() => []),
          teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }).catch(() => []),
          hackathonService.getReadiness(hackathonId, 'ONGOING').catch(() => null),
          hackathonResultsService.getPrizes(hackathonId).catch(() => []),
        ]);

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
      const prizeList = extractList(prizes);

      setHackathon(mapHackathonToFE(hackData));
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

  return {
    hackathonId,
    setHackathonId,
    hackathon,
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
  };
}
