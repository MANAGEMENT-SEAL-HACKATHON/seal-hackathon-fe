import { useCallback, useEffect, useState } from 'react';
import { teamService } from '../../teams/services/teamService';
import { mapMatchmakingTeam, mapOrphanUser } from '../../teams/mappers/matchmaking.mapper';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const useTeamRadar = (hackathonId) => {
  const [orphans, setOrphans] = useState([]);
  const [incompleteTeams, setIncompleteTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRadar = useCallback(async () => {
    if (!hackathonId) {
      setOrphans([]);
      setIncompleteTeams([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [orphanRes, teamRes] = await Promise.all([
        teamService.getOrphans(hackathonId),
        teamService.getIncompleteTeams(hackathonId),
      ]);
      setOrphans(unwrapList(orphanRes).map(mapOrphanUser).filter(Boolean));
      setIncompleteTeams(unwrapList(teamRes).map(mapMatchmakingTeam).filter(Boolean));
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu Radar');
      setOrphans([]);
      setIncompleteTeams([]);
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    fetchRadar();
  }, [fetchRadar]);

  return {
    orphans,
    incompleteTeams,
    loading,
    error,
    refetch: fetchRadar,
  };
};
