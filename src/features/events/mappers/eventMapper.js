import dayjs from 'dayjs';

export const mapEventToFE = (beData) => {
  if (!beData) return null;
  return {
    id: beData.id,
    hackathon_id: beData.hackathonId,
    title: beData.title,
    type: beData.type,
    // Đảm bảo parse đúng định dạng ngày giờ để hiển thị
    starts_at: beData.startsAt, 
    ends_at: beData.endsAt,
    is_public: beData.isPublic,
    location: beData.location,
    meet_url: beData.meetUrl,
    buffet_location: beData.buffetLocation,
    buffet_starts_at: beData.buffetStartsAt,
    buffet_ends_at: beData.buffetEndsAt,
    description: beData.description
  };
};

export const mapEventToBE = (feData) => {
  if (!feData) return null;
  const isKickoff = feData.type === 'KICKOFF';
  return {
    title: feData.title,
    type: feData.type,
    // Format lại chuẩn ISO string để gửi xuống Backend
    startsAt: feData.starts_at ? dayjs(feData.starts_at).format('YYYY-MM-DDTHH:mm:ss') : null,
    endsAt: feData.ends_at ? dayjs(feData.ends_at).format('YYYY-MM-DDTHH:mm:ss') : null,
    isPublic: !!feData.is_public,
    location: feData.location,
    meetUrl: feData.meet_url,
    buffetLocation: isKickoff && feData.buffet_location ? feData.buffet_location : null,
    buffetStartsAt: isKickoff && feData.buffet_starts_at
      ? dayjs(feData.buffet_starts_at).format('YYYY-MM-DDTHH:mm:ss')
      : null,
    buffetEndsAt: isKickoff && feData.buffet_ends_at
      ? dayjs(feData.buffet_ends_at).format('YYYY-MM-DDTHH:mm:ss')
      : null,
    description: feData.description
  };
};