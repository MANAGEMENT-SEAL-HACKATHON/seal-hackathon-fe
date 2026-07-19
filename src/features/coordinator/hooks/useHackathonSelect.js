import { useState, useEffect } from 'react';
import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const useHackathonSelect = (initialHackathonId) => {
  const [hackathons, setHackathons] = useState([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState(null);
  const [isLoadingHackathons, setIsLoadingHackathons] = useState(false);

  useEffect(() => {
    if (initialHackathonId) {
      const parsed = Number(initialHackathonId);
      if (!Number.isNaN(parsed)) {
        setSelectedHackathonId(parsed);
      }
    }

    const fetchHackathons = async () => {
      setIsLoadingHackathons(true);
      try {
        const res = await axiosClient.get(`${ENDPOINTS.HACKATHONS.BASE}?size=200`);
        if (res && Array.isArray(res.items)) {
          setHackathons(res.items);
          if (!initialHackathonId && res.items.length > 0) setSelectedHackathonId(res.items[0].id);
        } else if (res && Array.isArray(res)) {
          setHackathons(res);
          if (!initialHackathonId && res.length > 0) setSelectedHackathonId(res[0].id);
        } else if (res && res.data && Array.isArray(res.data.items)) {
          setHackathons(res.data.items);
          if (!initialHackathonId && res.data.items.length > 0) setSelectedHackathonId(res.data.items[0].id);
        } else if (res && Array.isArray(res.data)) {
          setHackathons(res.data);
          if (!initialHackathonId && res.data.length > 0) setSelectedHackathonId(res.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch hackathons:", error);
      } finally {
        setIsLoadingHackathons(false);
      }
    };
    
    fetchHackathons();
  }, [initialHackathonId]);

  return {
    hackathons,
    selectedHackathonId,
    setSelectedHackathonId,
    isLoadingHackathons
  };
};
