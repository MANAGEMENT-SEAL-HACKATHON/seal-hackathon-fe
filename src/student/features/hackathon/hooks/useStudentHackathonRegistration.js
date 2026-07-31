import { useCallback, useEffect, useState } from 'react';
import { studentHackathonService } from '../services/studentHackathon.service';

export const useStudentHackathonRegistration = () => {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [registrationBlocked, setRegistrationBlocked] = useState({});

  const fetchHackathons = useCallback(async () => {
    try {
      setLoading(true);
      const items = await studentHackathonService.browse('ONGOING');
      setHackathons(items);
    } catch {
      setHackathons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHackathons();
  }, [fetchHackathons]);

  const register = async (hackathonId, shirtPrefs) => {
    setActionLoading(true);
    try {
      await studentHackathonService.register(hackathonId, shirtPrefs);
      await fetchHackathons();
      return { success: true };
    } catch (error) {
      const code = error?.code || error?.response?.data?.error?.code;
      if (code === 'INVALID_STATE') {
        setRegistrationBlocked((prev) => ({ ...prev, [hackathonId]: true }));
      }
      return { success: false, error };
    } finally {
      setActionLoading(false);
    }
  };

  const unregister = async (hackathonId) => {
    setActionLoading(true);
    try {
      await studentHackathonService.unregister(hackathonId);
      await fetchHackathons();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setActionLoading(false);
    }
  };

  return {
    hackathons,
    loading,
    actionLoading,
    registrationBlocked,
    register,
    unregister,
    refetch: fetchHackathons,
  };
};
