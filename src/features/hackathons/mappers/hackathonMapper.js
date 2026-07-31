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
    registration_phase: beData.registrationPhase ?? beData.registration_phase,
  };
};

export const mapHackathonToBE = (feData) => {
  if (!feData) return null;
  const toDateTime = (value) => {
    if (!value) return null;
    const d = dayjs(value);
    return d.isValid() ? d.format('YYYY-MM-DDTHH:mm:ss') : null;
  };
  return {
    name: feData.name,
    slug: feData.slug,
    season: feData.season,
    year: feData.year ? parseInt(feData.year) : null,
    description: feData.description,
    rules: feData.rules,
    registrationStart: toDateTime(feData.registration_start),
    registrationEnd: toDateTime(feData.registration_end),
    eventStart: feData.event_start ? dayjs(feData.event_start).format('YYYY-MM-DD') : null,
    eventEnd: feData.event_end ? dayjs(feData.event_end).format('YYYY-MM-DD') : null,
    individualRankingEnabled: feData.individual_ranking_enabled,
    maxParticipants: feData.max_participants ? parseInt(feData.max_participants, 10) : null,
  };
};
