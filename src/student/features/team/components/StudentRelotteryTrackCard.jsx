import { useEffect, useState } from 'react';
import { Alert, Button, Card, Select, Space, message } from 'antd';
import { studentPortalService } from '../../portal/services/studentPortal.service';
import { teamService } from '../../../../features/teams/services/teamService';
import { getRoundId, isPreliminaryRound } from '../../../../shared/utils/roundUtils';
import { getTeamErrorMessage } from '../../../../shared/constants/teamErrors';

const StudentRelotteryTrackCard = ({ hackathonId, teamId, team, onChanged }) => {
  const [tracks, setTracks] = useState([]);
  const [prelimRoundId, setPrelimRoundId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(team?.trackId ?? null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorState, setErrorState] = useState(null);

  const isLeader = Boolean(team?.canTransferLeader || team?.isCurrentUserLeader);
  const hasTrack = Boolean(team?.trackId);

  useEffect(() => {
    if (!hackathonId || !teamId || !isLeader || !hasTrack) return undefined;
    let cancelled = false;
    setLoading(true);
    setErrorState(null);

    Promise.all([
      studentPortalService.listSelectableFallTracks(hackathonId),
      teamService.getJourney(teamId).catch(() => null),
    ])
      .then(([trackListRes, journeyRes]) => {
        if (cancelled) return;
        const trackList = Array.isArray(trackListRes) ? trackListRes : trackListRes?.items || [];
        setTracks(trackList);

        // Lấy roundId từ team/journey hiện có hoặc từ metadata track trả về (Không gọi coordinator-only /rounds)
        let foundRoundId = team?.roundId ?? team?.preliminaryRoundId ?? null;

        if (!foundRoundId && journeyRes?.steps) {
          const steps = Array.isArray(journeyRes.steps) ? journeyRes.steps : [];
          const prelim = steps.find(
            (round) => isPreliminaryRound(round) && !(round?.isActive ?? round?.is_active)
          );
          if (prelim) {
            foundRoundId = getRoundId(prelim);
          }
        }

        if (!foundRoundId && trackList.length > 0) {
          const firstTrack = trackList[0];
          foundRoundId = firstTrack?.roundId ?? firstTrack?.round_id ?? null;
        }

        if (foundRoundId) {
          setPrelimRoundId(foundRoundId);
        } else {
          setPrelimRoundId(null);
          setErrorState('Không thể xác định vòng Sơ loại hoặc vòng thi đã bắt đầu (Active).');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTracks([]);
          setPrelimRoundId(null);
          setErrorState('Không thể tải danh sách track.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hackathonId, teamId, isLeader, hasTrack, team]);

  if (!isLeader || !hasTrack || !hackathonId || !teamId) return null;
  if (team?.isPrelimReadOnly || team?.isAdvanced || team?.isEliminatedFromFinal) return null;
  if (!prelimRoundId && !loading && errorState) {
    return null; // Ẩn card nếu không đủ dữ liệu hoặc vòng thi đã active theo đúng Plan, không gọi API sai quyền
  }
  if (!prelimRoundId && !loading) return null;

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
            label: t.name ?? t.trackName ?? `Hạng mục #${t.id}`,
          }))}
        />
        <Button type="primary" loading={submitting} onClick={handleRelottery}>
          Xác nhận đổi track
        </Button>
      </Space>
    </Card>
  );

  async function handleRelottery() {
    if (!teamId || !prelimRoundId || !selectedTrackId) {
      message.warning('Thiếu thông tin vòng hoặc track.');
      return;
    }
    if (Number(selectedTrackId) === Number(team?.trackId)) {
      message.info('Bảng đấu đã được chọn.');
      return;
    }
    setSubmitting(true);
    try {
      await studentPortalService.relotteryTrackAsStudent(teamId, prelimRoundId, selectedTrackId);
      message.success('Đã đổi bảng đấu thành công.');
      onChanged?.(selectedTrackId);
    } catch (error) {
      message.error(getTeamErrorMessage(error) || 'Không thể đổi bảng đấu. Vòng thi có thể đã bắt đầu.');
    } finally {
      setSubmitting(false);
    }
  }
};

export default StudentRelotteryTrackCard;
