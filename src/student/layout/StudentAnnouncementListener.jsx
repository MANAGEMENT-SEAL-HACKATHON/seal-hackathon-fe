/**
 * Global student listener for hackathon announcements (GĐ4 publish / GĐ6 confirm).
 * Mounted in StudentLayout so toast hiện không cần F5.
 */
import { useCallback, useEffect, useState } from 'react';
import { notification } from 'antd';
import { useHackathonAnnouncementSocket } from '../../shared/hooks/useHackathonAnnouncementSocket';
import { studentTeamService } from '../features/team/services/studentTeam.service';
import { studentHackathonService } from '../features/hackathon/services/studentHackathon.service';

const StudentAnnouncementListener = () => {
  const [hackathonId, setHackathonId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const teams = await studentTeamService.getMyTeams();
        const active = (teams || []).find(
          (t) => t.currentMember?.isAccepted && ['PENDING', 'ACTIVE'].includes(t.status),
        );
        let id = active?.hackathonId;
        if (!id) {
          const ongoing = await studentHackathonService.getRegisteredHackathons('ONGOING');
          id = ongoing?.[0]?.id;
        }
        if (!id) {
          const pending = await studentHackathonService.getRegisteredHackathons('PENDING_CONFIRM');
          id = pending?.[0]?.id;
        }
        if (!id) {
          const finished = await studentHackathonService.getRegisteredHackathons('FINISHED');
          id = finished?.[0]?.id;
        }
        if (!cancelled) setHackathonId(id || null);
      } catch {
        if (!cancelled) setHackathonId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAnnouncement = useCallback((payload) => {
    const title = payload?.title || 'Thông báo mới từ Ban tổ chức';
    const description = payload?.message || payload?.body || 'Kết quả / thông báo đã được cập nhật.';
    notification.success({
      message: title,
      description,
      placement: 'topRight',
      duration: 8,
      key: `announcement-${payload?.timestamp || Date.now()}`,
    });
    window.dispatchEvent(new CustomEvent('hackathon-announcement', { detail: payload }));
  }, []);

  useHackathonAnnouncementSocket(hackathonId, onAnnouncement);
  return null;
};

export default StudentAnnouncementListener;
