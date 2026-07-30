import dayjs from 'dayjs';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8080';

export const resolveHackathonBannerUrl = (hackathon) => {
  if (!hackathon?.id) return null;
  const raw = hackathon.banner_url ?? hackathon.bannerUrl;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  const path = raw.startsWith('/api/') ? raw : `/api/v1/hackathons/${hackathon.id}/banner`;
  return `${API_BASE}${path}`;
};

export const mapHackathonToFE = (beData) => {
  if (!beData) return null;
  return {
    ...beData,
    registration_start: beData.registrationStart,
    registration_end: beData.registrationEnd,
    registration_closed_early_at: beData.registrationClosedEarlyAt,
    event_start: beData.eventStart,
    event_end: beData.eventEnd,
    individual_ranking_enabled: beData.individualRankingEnabled,
    banner_url: beData.bannerUrl,
    max_participants: beData.maxParticipants,
    cloned_from_hackathon_id: beData.clonedFromHackathonId,
    cloned_from_hackathon_name: beData.clonedFromHackathonName,
    cloned_at: beData.clonedAt,
  };
};

export const mapHackathonToBE = (feData) => {
  if (!feData) return null;
  return {
    name: feData.name,
    slug: feData.slug,
    season: feData.season,
    year: feData.year ? parseInt(feData.year) : null,
    description: feData.description,
    rules: feData.rules,
    registrationStart: feData.registration_start ? dayjs(feData.registration_start).format('YYYY-MM-DD') : null,
    registrationEnd: feData.registration_end ? dayjs(feData.registration_end).format('YYYY-MM-DD') : null,
    eventStart: feData.event_start ? dayjs(feData.event_start).format('YYYY-MM-DD') : null,
    eventEnd: feData.event_end ? dayjs(feData.event_end).format('YYYY-MM-DD') : null,
    individualRankingEnabled: feData.individual_ranking_enabled,
    maxParticipants: feData.max_participants ? parseInt(feData.max_participants, 10) : null,
  };
};
