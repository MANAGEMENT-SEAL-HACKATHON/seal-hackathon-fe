import { useEffect, useState } from 'react';
import { Alert, Button, Card, Select, Space, message } from 'antd';
import { studentPortalService } from '../../portal/services/studentPortal.service';
import { trackService } from '../../../../features/tracks/services/trackService';
import { roundService } from '../../../../features/rounds/services/roundService';
import { getRoundId, isPreliminaryRound, unwrapRoundList } from '../../../../shared/utils/roundUtils';

const StudentRelotteryTrackCard = ({ hackathonId, teamId, team, onChanged }) => {
  const [tracks, setTracks] = useState([]);
  const [prelimRoundId, setPrelimRoundId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(team?.trackId ?? null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLeader = Boolean(team?.canTransferLeader);
  const hasTrack = Boolean(team?.trackId);

  useEffect(() => {
    if (!hackathonId || !isLeader || !hasTrack) return undefined;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      trackService.listByHackathon(hackathonId),
      roundService.listByHackathon(hackathonId),
    ])
      .then(([trackRes, roundRes]) => {
        if (cancelled) return;
        const trackList = Array.isArray(trackRes) ? trackRes : trackRes?.items || [];
        setTracks(trackList);

        const rounds = unwrapRoundList(roundRes);
        const prelim = rounds.find(
          (round) => isPreliminaryRound(round) && !(round?.isActive ?? round?.is_active)
        );
        setPrelimRoundId(getRoundId(prelim));
      })
      .catch(() => {
        if (!cancelled) {
          setTracks([]);
          setPrelimRoundId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hackathonId, isLeader, hasTrack]);

  const handleRelottery = async () => {
    if (!teamId || !prelimRoundId || !selectedTrackId) {
      message.warning('Thiếu thông tin vòng hoặc track.');
      return;
    }
    if (Number(selectedTrackId) === Number(team?.trackId)) {
      message.info('Track đã được chọn.');
      return;
    }
    setSubmitting(true);
    try {
      await studentPortalService.relotteryTrackAsStudent(teamId, prelimRoundId, selectedTrackId);
      message.success('Đã đổi track thành công.');
      onChanged?.(selectedTrackId);
    } catch (error) {
      message.error(error?.message || 'Không thể đổi track. Vòng thi có thể đã bắt đầu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLeader || !hasTrack || !hackathonId || !teamId) return null;
  if (!prelimRoundId) return null;

  return (
    <Card size="small" title="Đổi track (re-lottery)" style={{ marginBottom: 16 }}>
      <Alert
        type="warning"
        showIcon
        message="Chỉ trước khi vòng Sơ loại bắt đầu"
        description="Leader có thể đổi track đã bốc thăm khi vòng thi chưa active."
        style={{ marginBottom: 12 }}
      />
      <Space wrap>
        <Select
          style={{ minWidth: 240 }}
          placeholder="Chọn track mới"
          loading={loading}
          value={selectedTrackId ?? undefined}
          onChange={setSelectedTrackId}
          options={tracks.map((t) => ({
            value: t.id,
            label: t.name ?? t.trackName ?? `Track #${t.id}`,
          }))}
        />
        <Button type="primary" loading={submitting} onClick={handleRelottery}>
          Xác nhận đổi track
        </Button>
      </Space>
    </Card>
  );
};

export default StudentRelotteryTrackCard;
