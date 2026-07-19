import { useEffect, useState } from 'react';
import { Alert, Button, Card, Select, Space, message } from 'antd';
import { studentPortalService } from '../../portal/services/studentPortal.service';
import { studentHackathonService } from '../../hackathon/services/studentHackathon.service';

const isFallHackathon = (hackathon) => {
  const season = String(hackathon?.season ?? '').toUpperCase();
  return season === 'FALL' || season.includes('FALL');
};

const StudentFallTrackSelectCard = ({ hackathonId, teamId, currentTrackId, onSelected }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(currentTrackId ?? null);
  const [isFallSeason, setIsFallSeason] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);

  useEffect(() => {
    if (!hackathonId) return undefined;
    let cancelled = false;
    setLoading(true);

    studentPortalService
      .listSelectableFallTracks(hackathonId)
      .then((trackRes) => {
        if (!cancelled) {
          setTracks(Array.isArray(trackRes) ? trackRes : trackRes?.items || []);
        }
      })
      .catch(() => {
        if (!cancelled) setTracks([]);
      });

    studentHackathonService
      .getHackathonDetail(hackathonId)
      .then((hackathon) => {
        if (!cancelled) setIsFallSeason(isFallHackathon(hackathon));
      })
      .catch(() => {
        if (!cancelled) setIsFallSeason(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  const handleSelect = async () => {
    if (!selectedTrackId) {
      message.warning('Vui lòng chọn track.');
      return;
    }
    setSubmitting(true);
    try {
      await studentPortalService.selectFallTrack(selectedTrackId);
      message.success('Đã chọn track thành công.');
      onSelected?.(selectedTrackId);
    } catch (error) {
      const code = error?.code || error?.response?.data?.error?.code;
      if (code === 'NOT_IMPLEMENTED') {
        setFeatureDisabled(true);
        message.warning('Tính năng chưa bật cho mùa giải này.');
      } else {
        message.error(error?.message || 'Không thể chọn track.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!hackathonId || tracks.length === 0 || featureDisabled) return null;

  return (
    <Card size="small" title="Chọn track (Fall)" style={{ marginBottom: 16 }}>
      <Alert
        type="info"
        showIcon
        message="FR-U-15-F"
        description="Mùa Fall: leader chọn track trước khi bắt đầu vòng thi."
        style={{ marginBottom: 12 }}
      />
      <Space wrap>
        <Select
          style={{ minWidth: 240 }}
          placeholder="Chọn track"
          loading={loading}
          value={selectedTrackId ?? undefined}
          onChange={setSelectedTrackId}
          options={tracks.map((t) => ({
            value: t.id,
            label: t.name ?? t.trackName ?? `Hạng mục #${t.id}`,
          }))}
        />
        <Button type="primary" loading={submitting} onClick={handleSelect} disabled={!teamId}>
          Xác nhận track
        </Button>
      </Space>
    </Card>
  );
};

export default StudentFallTrackSelectCard;
