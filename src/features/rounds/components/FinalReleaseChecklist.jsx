import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Tag } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { roundService } from '../services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { mapRoundToFE } from '../mappers/roundMapper';
import { mapTrackToFE } from '../../tracks/mappers/trackMapper';

/**
 * CK không upload PDF riêng — tái dùng đề PDF của các bảng đấu sơ loại.
 * Checklist chỉ xác nhận sẵn sàng phát (flip problemReleasedAt).
 */
const FinalReleaseChecklist = ({ roundId, onReadyChange }) => {
  const [round, setRound] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const res = await roundService.getById(roundId);
      const mapped = mapRoundToFE(res);
      setRound(mapped);
      const hackathonId = mapped?.hackathon_id ?? mapped?.hackathonId;
      if (hackathonId) {
        const trackList = await trackService.listByHackathon(hackathonId);
        const items = Array.isArray(trackList) ? trackList : trackList?.items || [];
        setTracks(items.map(mapTrackToFE).filter((t) => !t.is_final));
      } else {
        setTracks([]);
      }
    } catch {
      setRound(null);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tracksWithPdf = useMemo(
    () =>
      tracks.filter(
        (t) => t.problem_statement_filename || t.problem_statement_url || t.problemStatementFilename,
      ),
    [tracks],
  );

  const isReady = tracks.length > 0 && tracksWithPdf.length === tracks.length;

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 12 }}
        message="Chung kết sử dụng lại đề sơ loại"
        description={
          <span style={{ fontSize: 13 }}>
            Không upload đề PDF riêng cho vòng Chung kết. Mỗi đội tiếp tục làm đề của{' '}
            <strong>bảng đấu sơ loại</strong> đã phân (ví dụ Train AI / RAG AI). Bấm «Phát đề» chỉ mở quyền
            tải đề cho đội đã vào CK.
          </span>
        }
      />

      <div style={{ padding: '8px 0' }}>
        <strong>{round?.name || 'Vòng Chung kết'}</strong>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && <Tag>Đang tải bảng đấu…</Tag>}
          {!loading && tracks.length === 0 && (
            <Tag color="warning">Chưa tìm thấy bảng đấu sơ loại</Tag>
          )}
          {!loading &&
            tracks.map((t) => {
              const hasPdf = Boolean(
                t.problem_statement_filename || t.problem_statement_url || t.problemStatementFilename,
              );
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>{t.name || `Track #${t.id}`}</span>
                  {hasPdf ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      {t.problem_statement_filename || 'Có PDF'}
                    </Tag>
                  ) : (
                    <Tag color="error">Thiếu PDF</Tag>
                  )}
                </div>
              );
            })}
        </div>
        {!loading && isReady && (
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginTop: 12 }}>
            Sẵn sàng phát đề (tái dùng PDF sơ loại)
          </Tag>
        )}
      </div>
    </div>
  );
};

export default FinalReleaseChecklist;
