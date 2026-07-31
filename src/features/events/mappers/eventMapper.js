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
    description: beData.description
  };
};

export const mapEventToBE = (feData) => {
  if (!feData) return null;
  return {
    title: feData.title,
    type: feData.type,
    // Format lại chuẩn ISO string để gửi xuống Backend
    startsAt: feData.starts_at ? dayjs(feData.starts_at).format('YYYY-MM-DDTHH:mm:ss') : null,
    endsAt: feData.ends_at ? dayjs(feData.ends_at).format('YYYY-MM-DDTHH:mm:ss') : null,
    isPublic: !!feData.is_public,
    location: feData.location,
    meetUrl: feData.meet_url,
    description: feData.description
  };
};
