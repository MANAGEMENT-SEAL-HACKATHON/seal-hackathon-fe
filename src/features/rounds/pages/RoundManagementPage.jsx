// src/features/rounds/pages/RoundManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Timeline, Tag, Card, Spin, Typography, Modal, Alert, Tooltip, Input } from 'antd';
import { Plus, Edit, Trash2, Calendar, List, BarChart3, PlayCircle, Lock, UserPlus, Trophy, FileText, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import RoundFormModal from '../components/RoundFormModal';
import { roundService } from '../services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { criteriaService } from '../../criteria/services/criteriaService';
import { mapRoundToFE, mapRoundToBE, sortRoundsByExamAt } from '../mappers/roundMapper';
import { getRoundErrorMessage } from '../../../shared/constants/roundErrors';
import { formatDate } from '../../../shared/utils/date';
import { teamService } from '../../teams/services/teamService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import {
  buildPartitionStats,
  validateAdvancementConfig,
} from '../utils/roundAdvancementRules';
import dayjs from 'dayjs';
import LiveCodingMonitor from '../components/LiveCodingMonitor';
import ScoringProgressCard from '../components/ScoringProgressCard';
import PrelimReleaseChecklist from '../components/PrelimReleaseChecklist';
import FinalReleaseChecklist from '../components/FinalReleaseChecklist';

const { Title, Text } = Typography;

const RoundManagementPage = ({ hackathonId, hackathon, onHackathonSync }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'timeline'
  const [advancementTeams, setAdvancementTeams] = useState([]);
  const [advancementTracks, setAdvancementTracks] = useState([]);
  const navigate = useNavigate();

  const fetchAdvancementData = async () => {
    try {
      const [teamsRes, tracksRes] = await Promise.all([
        teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
        trackService.listByHackathon(hackathonId),
      ]);
      setAdvancementTeams(Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || []);
      setAdvancementTracks(Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || []);
    } catch {
      setAdvancementTeams([]);
      setAdvancementTracks([]);
    }
  };

  // ==========================================
  // THÊM MỚI: State cho Bước 8 (Modal Khóa chấm điểm)
  // ==========================================
  const [isLockModalVisible, setIsLockModalVisible] = useState(false);
  const [lockingRound, setLockingRound] = useState(null);
  const [lockReason, setLockReason] = useState('');
  const [lockRequiresForce, setLockRequiresForce] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const [isReleaseModalVisible, setIsReleaseModalVisible] = useState(false);
  const [releasingRound, setReleasingRound] = useState(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [prelimReleaseReady, setPrelimReleaseReady] = useState(false);
  const [finalReleaseReady, setFinalReleaseReady] = useState(false);
  const [progressRoundId, setProgressRoundId] = useState(null);

  const activeRounds = rounds.filter((r) => r.is_active);
  const progressRound =
    activeRounds.find((r) => r.id === progressRoundId) || activeRounds[0] || null;

  useEffect(() => {
    if (activeRounds.length === 0) {
      setProgressRoundId(null);
      return;
    }
    if (!progressRoundId || !activeRounds.some((r) => r.id === progressRoundId)) {
      setProgressRoundId(activeRounds[0].id);
    }
  }, [activeRounds, progressRoundId]);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const res = await roundService.listByHackathon(hackathonId);

      const fullRounds = await Promise.all(
        (res || []).map(async (r) => {
          try {
            const detail = await roundService.getById(r.id);
            return mapRoundToFE(detail);
          } catch (e) {
            return mapRoundToFE(r);
          }
        })
      );

      setRounds(sortRoundsByExamAt(fullRounds));
    } catch (error) {
      message.error(error.message || 'Lỗi khi tải danh sách vòng thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
    fetchAdvancementData();
  }, [hackathonId]);

  const handleAdd = async () => {
    await fetchAdvancementData();
    setEditingRound(null);
    setIsModalVisible(true);
  };

  const handleEdit = async (round) => {
    await fetchAdvancementData();
    setEditingRound(round);
    setIsModalVisible(true);
  };

  const handleViewRanking = (round) => {
    if (round.scoring_locked || round.scoringLocked) {
      navigate(`/hackathons/${hackathonId}/rounds/${round.id}/results`);
    } else {
      navigate(`/hackathons/${hackathonId}/rounds/${round.id}/ranking-preview`);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await roundService.delete(id);
      message.success('Đã xóa vòng thi thành công');
      await fetchRounds();
      if (onHackathonSync) await onHackathonSync();
    } catch (error) {
      message.error(error.message || 'Lỗi khi xóa vòng thi');
      setLoading(false);
    }
  };

  // ==========================================
  // BƯỚC 1: Hàm Kích hoạt Vòng thi
  // ==========================================
  const ensureFinalRoundReadiness = async () => {
    const readiness = await hackathonService.getReadiness(hackathonId, 'FINAL_ROUND');
    const blockers = Array.isArray(readiness?.blockers) ? readiness.blockers : [];
    if (readiness?.ready === false || blockers.length > 0) {
      Modal.error({
        title: 'Chưa thể kích hoạt Chung kết',
        content: (
          <div>
            <p>Readiness FINAL_ROUND chưa đạt. Vui lòng xử lý các blocker sau:</p>
            <ul style={{ paddingLeft: 18 }}>
              {blockers.slice(0, 6).map((item, idx) => (
                <li key={`${item.code || 'BLOCKER'}-${idx}`}>
                  {item.message || item.code || 'Blocker chưa rõ chi tiết'}
                </li>
              ))}
            </ul>
          </div>
        ),
      });
      return false;
    }
    return true;
  };

  const finalizeLockScoring = async (round, payload) => {
    const result = await roundService.lockScoring(round.id, payload);
    const warnings = result?.warnings || [];
    const partialWarning = warnings.find((w) => w.code === 'PARTIAL_SCORING_BEFORE_LOCK');
    if (partialWarning) {
      message.warning(partialWarning.message || 'Còn bài chưa được chấm điểm.');
    }
    message.success(`Đã khóa chấm điểm cho ${round.name}.`);
    setIsLockModalVisible(false);
    setLockReason('');
    setLockRequiresForce(false);
    await fetchRounds();

    const isFinalLock = Boolean(round.is_final || round.isFinal);
    if (isFinalLock && hackathonId) {
      try {
        const updatedHackathon = await hackathonService.getById(hackathonId);
        const status = String(updatedHackathon?.status || '').toUpperCase();
        if (onHackathonSync) {
          await onHackathonSync();
        }
        if (status === 'PENDING_CONFIRM') {
          Modal.success({
            title: 'Đã khóa Chung kết — sẵn sàng GĐ6',
            content:
              'Hackathon đã chuyển sang trạng thái PENDING_CONFIRM. Tiếp theo: trao giải và chốt sổ kết quả.',
            okText: 'Mở kết quả & trao giải',
            onOk: () => navigate(`/hackathons/${hackathonId}/results`),
          });
        }
      } catch {
        // non-blocking
      }
    }
  };

  const handleActivateRound = (round) => {
    Modal.confirm({
      title: 'Xác nhận kích hoạt vòng thi?',
      content: `Bạn có chắc chắn muốn kích hoạt ${round.name}? Thao tác này sẽ mở cổng cho thí sinh và Giám khảo tham gia.`,
      okText: 'Kích hoạt ngay',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          if (round.is_final) {
            const ready = await ensureFinalRoundReadiness();
            if (!ready) return;
          }
          setLoading(true);
          await roundService.activate(round.id, { note: 'Kích hoạt thủ công' });
          message.success(`ROUND_STARTED: ${round.name} đã được kích hoạt thành công!`);
          fetchRounds();
        } catch (error) {
          message.error(getRoundErrorMessage(error) || 'Lỗi khi kích hoạt vòng thi. Hãy kiểm tra lại tiêu chí và bảng đấu.');
          setLoading(false);
        }
      }
    });
  };

  const handleOpenLockScoring = async (record) => {
    setLockingRound(record);
    setLockReason('');
    setLockRequiresForce(false);
    try {
      const progress = await roundService.getScoringProgress(record.id);
      const pending =
        progress?.pendingSubmissions ??
        progress?.data?.pendingSubmissions ??
        0;
      if (pending > 0) {
        setLockRequiresForce(true);
        setIsLockModalVisible(true);
        return;
      }
      setIsLocking(true);
      await finalizeLockScoring(record, { force: false });
    } catch (error) {
      message.error('Lỗi khi khóa chấm điểm. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleLockScoring = async () => {
    if (lockRequiresForce && !lockReason.trim()) {
      return message.warning('Vui lòng nhập lý do khóa chấm điểm (force lock).');
    }

    setIsLocking(true);
    try {
      await finalizeLockScoring(lockingRound, {
        force: lockRequiresForce,
        reason: lockRequiresForce ? lockReason.trim() : undefined,
      });
    } catch (error) {
      message.error('Lỗi khi khóa chấm điểm. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleReleaseProblem = async () => {
    const isFinal = Boolean(releasingRound?.is_final);
    if (isFinal && !finalReleaseReady) {
      return message.warning('Vui lòng upload PDF đề Chung kết trước khi phát.');
    }
    if (!isFinal && !prelimReleaseReady) {
      return message.warning('Mọi bảng đấu phải có PDF đề bài trước khi phát.');
    }
    setIsReleasing(true);
    try {
      await roundService.releaseProblem(releasingRound.id, null);
      message.success(
        isFinal
          ? `Đã phát đề Chung kết cho ${releasingRound.name}. Sinh viên vào trang đội để tải đề.`
          : `Đã phát đề Sơ loại — mỗi đội nhận đề theo bảng đấu của mình.`,
      );
      setIsReleaseModalVisible(false);
      setPrelimReleaseReady(false);
      setFinalReleaseReady(false);
      fetchRounds();
    } catch (error) {
      message.error(error?.message || 'Không thể phát đề. Vui lòng thử lại.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleModalFinish = async (values) => {
    try {
      setLoading(true);

      const isActivating = values.is_active && (!editingRound || !editingRound.is_active);

      if (isActivating) {
        if (!editingRound) {
          Modal.error({
            title: 'Không thể kích hoạt vòng thi mới',
            content: 'Vòng thi mới tạo chưa có bảng đấu và tiêu chí đánh giá. Vui lòng lưu vòng thi ở trạng thái "Ngưng hoạt động" trước, sau đó cấu hình các bảng đấu và tiêu chí đánh giá bên trong rồi mới kích hoạt.',
          });
          setLoading(false);
          return;
        }

        const roundId = editingRound.id;
        const isFinal = values.is_final;

        if (isFinal) {
          const summary = await criteriaService.getWeightSummaryByRound(roundId);
          const items = summary?.items || [];
          if (items.length === 0) {
            Modal.error({
              title: 'Không thể kích hoạt vòng thi',
              content: 'Vòng Chung kết chưa có tiêu chí đánh giá nào. Vui lòng tạo tiêu chí đánh giá cho vòng thi này trước.',
            });
            setLoading(false);
            return;
          }
          const totalWeight = summary?.total || 0;
          if (Math.abs(totalWeight - 1) > 0.001) {
            Modal.error({
              title: 'Không thể kích hoạt vòng thi',
              content: `Tổng trọng số các tiêu chí của vòng Chung kết phải bằng 1.0 (100%). Hiện tại đang là: ${(totalWeight * 100).toFixed(1)}%.`,
            });
            setLoading(false);
            return;
          }
          const ready = await ensureFinalRoundReadiness();
          if (!ready) {
            setLoading(false);
            return;
          }
        } else {
          const [teamsRes, tracksRes] = await Promise.all([
            teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
            trackService.listByHackathon(hackathonId),
          ]);
          const freshTeams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || [];
          const freshTracks = Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || [];
          const partitions = buildPartitionStats(freshTeams, freshTracks, {
            requireLocked: hackathon?.status === 'ONGOING',
          });
          const advancementCheck = validateAdvancementConfig({
            topNAdvance: values.top_n_advance,
            minTeamsFinal: values.min_teams_final,
            partitions,
            requirePartitions: hackathon?.status === 'ONGOING',
          });

          if (!advancementCheck.valid) {
            Modal.error({
              title: 'Chưa thể kích hoạt Sơ loại',
              content: (
                <div>
                  <p>Kiểm tra lại luật đi tiếp theo số đội thực tế sau lottery:</p>
                  <ul style={{ paddingLeft: 18 }}>
                    {advancementCheck.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 13, marginTop: 8 }}>
                    Gợi ý: chỉnh Top N mỗi bảng ≤ số đội ít nhất trong từng bảng, rồi lưu lại trước khi kích hoạt.
                  </p>
                </div>
              ),
            });
            setLoading(false);
            return;
          }

          const tracks = await trackService.listByRound(roundId);
          if (!tracks || tracks.length === 0) {
            Modal.error({
              title: 'Không thể kích hoạt vòng thi',
              content: 'Vòng thi chưa có bảng đấu nào. Thêm ít nhất một bảng đấu trước.',
            });
            setLoading(false);
            return;
          }

          for (const track of tracks) {
            if (track.status === 'CANCELLED') continue;

            const summary = await criteriaService.getWeightSummaryByTrack(track.id);
            const items = summary?.items || [];
            if (items.length === 0) {
              Modal.error({
                title: 'Không thể kích hoạt vòng thi',
                content: `Bảng đấu "${track.name}" chưa có tiêu chí đánh giá nào. Vui lòng cấu hình tiêu chí cho bảng đấu này trước.`,
              });
              setLoading(false);
              return;
            }

            const totalWeight = summary?.total || 0;
            if (Math.abs(totalWeight - 1) > 0.001) {
              Modal.error({
                title: 'Không thể kích hoạt vòng thi',
                content: `Tổng trọng số các tiêu chí của bảng đấu "${track.name}" phải bằng 1.0 (100%). Hiện tại đang là: ${(totalWeight * 100).toFixed(1)}%.`,
              });
              setLoading(false);
              return;
            }
          }
        }
      }

      if (editingRound) {
        values.sequenceOrder = editingRound.sequenceOrder || editingRound.sequence_order || 1;
      } else {
        values.sequenceOrder = rounds.length + 1;
      }

      const { problem_file: problemFileListValue, ...roundValues } = values;
      const payload = mapRoundToBE(roundValues);
      let roundId = editingRound?.id;
      let createdOrUpdatedRound;

      if (editingRound) {
        createdOrUpdatedRound = await roundService.update(editingRound.id, payload);
        roundId = editingRound.id;
      } else {
        createdOrUpdatedRound = await roundService.createByHackathon(hackathonId, payload);
        roundId = createdOrUpdatedRound.id;
      }

      const problemFile = problemFileListValue?.[0]?.originFileObj ?? problemFileListValue?.[0];
      if (problemFile && roundId && !editingRound?.problem_released_at && roundValues.is_final) {
        try {
          await roundService.uploadProblemStatement(roundId, problemFile);
        } catch (uploadError) {
          message.warning(uploadError?.message || 'Đã lưu vòng thi nhưng chưa upload được file đề bài.');
        }
      }

      if (roundValues.is_active && (!editingRound || !editingRound.is_active)) {
        try {
          await roundService.activate(roundId, { note: 'Kích hoạt từ giao diện cấu hình' });
          message.success(editingRound ? 'Đã cập nhật và kích hoạt vòng thi thành công' : 'Đã tạo và kích hoạt vòng thi thành công');
        } catch (actError) {
          Modal.error({
            title: 'Không thể kích hoạt vòng thi',
            content: (
              <div>
                <p>Vòng thi chưa đủ điều kiện để hoạt động. Vui lòng kiểm tra lại:</p>
                <div style={{ padding: '8px', backgroundColor: 'var(--ant-color-error-bg)', border: '1px solid var(--ant-color-error-border)', borderRadius: '4px', color: 'var(--ant-color-error)' }}>
                  <Text strong type="danger" style={{ display: 'block', marginBottom: '8px' }}>
                    <InfoCircleOutlined /> Lỗi: Tiến độ chia bảng / Giám khảo không hợp lệ
                  </Text>
                  {actError.response?.data?.message || actError.response?.data?.error?.message || actError.message || 'Thiếu tiêu chí đánh giá hoặc chưa phân công giám khảo'}
                </div>
                <p style={{ marginTop: 8, fontSize: '13px' }}>Vòng thi đã được lưu thành công ở trạng thái "Ngưng hoạt động". Bạn hãy cấu hình đầy đủ tiêu chí trước khi bật kích hoạt nhé.</p>
              </div>
            )
          });
        }
      } else {
        message.success(editingRound ? 'Đã cập nhật vòng thi thành công' : 'Đã tạo vòng thi mới thành công');
      }

      setIsModalVisible(false);
      await fetchRounds();
      if (onHackathonSync) await onHackathonSync();
    } catch (error) {
      message.error(getRoundErrorMessage(error));
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Ngày giờ thi',
      dataIndex: 'exam_at',
      key: 'exam_at',
      width: 180,
      render: (val) => (val ? formatDate(val) : '-'),
    },
    {
      title: 'Tên vòng thi',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.is_final && <Tag color="gold" style={{ marginLeft: 8 }}>Chung kết</Tag>}
        </div>
      ),
    },
    {
      title: 'Thời gian nộp bài',
      key: 'period',
      render: (_, record) => (
        <div style={{ fontSize: 13 }}>
          <div>Mở: {record.submission_open ? formatDate(record.submission_open) : '-'}</div>
          <div>Hạn chót: {record.submission_deadline ? formatDate(record.submission_deadline) : '-'}</div>
        </div>
      ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'coding_duration_hours',
      key: 'duration',
      render: (val) => val ? `${val}h` : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const isEnded = record.submission_deadline && dayjs().isAfter(dayjs(record.submission_deadline));
        
        // BƯỚC 8: Hiển thị Badge Đã khóa chấm điểm
        if (record.scoring_locked || record.scoringLocked) {
          return <Tag color="red" icon={<Lock size={12} style={{marginRight: 4}}/>}>Đã khóa chấm điểm</Tag>;
        }

        if (isEnded) {
          return <Tag color="red">Đã kết thúc</Tag>;
        }
        return (
          <Tag color={record.is_active ? 'green' : 'default'}>
            {record.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        const isEnded = record.submission_deadline && dayjs().isAfter(dayjs(record.submission_deadline));
        const isLocked = record.scoring_locked || record.scoringLocked;

        // Đã khóa chấm thì chỉ cho xem xếp hạng
        if (isLocked) {
          return (
            <Space size="middle">
              <Tooltip title="Xếp hạng">
                <Button
                  type="text"
                  style={{ color: 'var(--ant-color-primary)' }}
                  icon={<Trophy size={16} />}
                  onClick={() => handleViewRanking(record)}
                />
              </Tooltip>
              <Text type="secondary" style={{ fontSize: 13 }}>Đã đóng sổ (Locked)</Text>
            </Space>
          );
        }

        // Nếu vòng thi ĐANG HOẠT ĐỘNG
        if (record.is_active) {
          const hasReleasedProblem = Boolean(record.problem_released_at);
          return (
            <Space size="middle">
              <Tooltip title="Xếp hạng tạm">
                <Button
                  type="text"
                  style={{ color: 'var(--ant-color-primary)' }}
                  icon={<BarChart3 size={16} />}
                  onClick={() => handleViewRanking(record)}
                />
              </Tooltip>

              {!hasReleasedProblem && (
                <Tooltip title="Phát đề bài">
                  <Button
                    type="text"
                    style={{ color: 'var(--ant-color-warning)' }}
                    icon={<FileText size={16} />}
                    onClick={() => {
                      setReleasingRound(record);
                      setPrelimReleaseReady(false);
                      setFinalReleaseReady(false);
                      setIsReleaseModalVisible(true);
                    }}
                  />
                </Tooltip>
              )}

              <Tooltip title="Mở hàng đợi thuyết trình">
                <Button
                  type="text"
                  style={{ color: 'var(--ant-color-primary)' }}
                  icon={<History size={16} />}
                  onClick={() => {
                    navigate(`${ROUTES.PRESENTATION_QUEUE}?roundId=${record.id}`);
                  }}
                />
              </Tooltip>

              {(record.scoring_locked || record.scoringLocked) && !record.is_final && (
                <Tooltip title="Công bố & chuyển vòng">
                  <Button
                    type="text"
                    style={{ color: 'var(--ant-color-success)' }}
                    icon={<Trophy size={16} />}
                    onClick={() => navigate(`/hackathons/${hackathonId}/rounds/${record.id}/results`)}
                  />
                </Tooltip>
              )}

              {(record.scoring_locked || record.scoringLocked) && record.is_final && (
                <Tooltip title="Kết quả Chung kết & chốt sổ">
                  <Button
                    type="text"
                    style={{ color: 'var(--ant-color-success)' }}
                    icon={<Trophy size={16} />}
                    onClick={() => navigate(`/hackathons/${hackathonId}/results`)}
                  />
                </Tooltip>
              )}

              <Tooltip title="Phân công Giám khảo">
                <Button 
                  type="text" 
                  style={{ color: 'var(--ant-color-purple)' }} 
                  icon={<UserPlus size={16} />} 
                  onClick={() => {
                    const peopleTab = document.querySelector('.ant-tabs-tab[data-node-key="people"]');
                    if (peopleTab) {
                      peopleTab.click();
                      message.success(`Đã chuyển sang Tab Nhân sự để phân công Giám khảo.`);
                    } else {
                      message.info(`Vui lòng chuyển sang Tab Nhân sự để phân công.`);
                    }
                  }} 
                />
              </Tooltip>

              <Tooltip title="Khóa chấm điểm">
                <Button type="text" danger icon={<Lock size={16} />} onClick={() => handleOpenLockScoring(record)} />
              </Tooltip>
            </Space>
          );
        }

        // Nếu vòng thi NGƯNG HOẠT ĐỘNG
        return (
          <Space size="middle">
            <Tooltip title="Xếp hạng tạm">
              <Button
                type="text"
                style={{ color: 'var(--ant-color-primary)' }}
                icon={<BarChart3 size={16} />}
                onClick={() => handleViewRanking(record)}
              />
            </Tooltip>

            {!isEnded && !isLocked && (
              <>
                <Tooltip title="Sửa vòng thi">
                  <Button
                    type="text"
                    icon={<Edit size={16} />}
                    onClick={() => handleEdit(record)}
                  />
                </Tooltip>

                {/* BƯỚC 1: Nút Play Kích hoạt vòng thi */}
                <Tooltip title="Kích hoạt Vòng thi">
                  <Button type="text" style={{ color: 'var(--ant-color-success)' }} icon={<PlayCircle size={16} />} onClick={() => handleActivateRound(record)} />
                </Tooltip>

                <Tooltip title="Phân công Giám khảo">
                  <Button 
                    type="text" 
                    style={{ color: 'var(--ant-color-purple)' }} 
                    icon={<UserPlus size={16} />} 
                    onClick={() => {
                      const peopleTab = document.querySelector('.ant-tabs-tab[data-node-key="people"]');
                      if (peopleTab) {
                        peopleTab.click();
                        message.success(`Đã chuyển sang Tab Nhân sự để phân công Giám khảo.`);
                      } else {
                        message.info(`Vui lòng chuyển sang Tab Nhân sự để phân công.`);
                      }
                    }} 
                  />
                </Tooltip>

                <Popconfirm
                  title="Xóa vòng thi"
                  description="Bạn có chắc chắn muốn xóa vòng thi này?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                   <Button type="text" danger icon={<Trash2 size={16} />} />
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  if (loading && rounds.length === 0) {
    return <Card style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></Card>;
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Vòng thi"
        description={<span style={{ fontSize: 12 }}>Tạo Sơ loại + Chung kết. Số đội đi tiếp nhập dự tính trước, xác nhận lại trước khi mở thi.</span>}
      />
      {/* ========================================== */}
      {/* THÊM MỚI (BƯỚC 2): Hiển thị Banner Đếm ngược */}
      {/* ========================================== */}
      {activeRounds.length > 0 && <LiveCodingMonitor activeRound={progressRound} />}
      {activeRounds.length > 1 && (
        <div style={{ marginBottom: 8 }}>
          <Typography.Text type="secondary" style={{ marginRight: 8 }}>
            Tiến độ chấm — chọn vòng:
          </Typography.Text>
          <Space wrap>
            {activeRounds.map((r) => (
              <Button
                key={r.id}
                size="small"
                type={progressRoundId === r.id ? 'primary' : 'default'}
                onClick={() => setProgressRoundId(r.id)}
              >
                {r.name}
              </Button>
            ))}
          </Space>
        </div>
      )}
      {progressRound && <ScoringProgressCard round={progressRound} />}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Space>
          <Button.Group style={{ marginRight: 16 }}>
            <Button
              icon={<List size={16} />}
              type={viewMode === 'table' ? 'primary' : 'default'}
              onClick={() => setViewMode('table')}
            >
              Bảng
            </Button>
            <Button
              icon={<Calendar size={16} />}
              type={viewMode === 'timeline' ? 'primary' : 'default'}
              onClick={() => setViewMode('timeline')}
            >
              Dòng thời gian
            </Button>
          </Button.Group>

          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={handleAdd}
          >
            Thêm vòng thi
          </Button>
        </Space>
      </div>

      {viewMode === 'table' ? (
        <Table scroll={{ x: 'max-content' }}
          columns={columns}
          dataSource={rounds}
          rowKey="id"
          pagination={false}
          loading={loading}
        />
      ) : (
        <Card loading={loading}>
          <Timeline
            mode="left"
            items={rounds.map(round => ({
              label: round.exam_at ? formatDate(round.exam_at) : 'Chưa thiết lập',
              children: (
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {round.name}
                      {round.is_final && <Tag color="gold" style={{ marginLeft: 8 }}>Chung kết</Tag>}
                    </Title>
                    {(() => {
                      const isEnded = round.submission_deadline && dayjs().isAfter(dayjs(round.submission_deadline));
                      if (round.scoring_locked || round.scoringLocked) {
                        return <Tag color="red" icon={<Lock size={12} style={{marginRight: 4}}/>}>Đã khóa chấm</Tag>;
                      }
                      if (isEnded) return <Tag color="blue">Đã kết thúc</Tag>;
                      return (
                        <Tag color={round.is_active ? 'green' : 'default'}>
                          {round.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                        </Tag>
                      );
                    })()}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text type="secondary">Thi: {round.exam_at ? formatDate(round.exam_at) : '-'}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">
                      Nộp bài: {round.submission_open ? formatDate(round.submission_open) : '-'}
                      {' → '}
                      {round.submission_deadline ? formatDate(round.submission_deadline) : '-'}
                    </Text>
                  </div>
                  <Space>
                    <Tooltip title={round.scoring_locked || round.scoringLocked ? "Xếp hạng" : "Xếp hạng tạm"}>
                      <Button
                        size="small"
                        type="text"
                        style={{ color: 'var(--ant-color-primary)' }}
                        icon={round.scoring_locked || round.scoringLocked ? <Trophy size={14} /> : <BarChart3 size={14} />}
                        onClick={() => handleViewRanking(round)}
                      />
                    </Tooltip>
                    {!round.is_active && !(round.scoring_locked || round.scoringLocked) && (
                      <Button size="small" icon={<Edit size={14} />} onClick={() => handleEdit(round)}>Sửa</Button>
                    )}
                  </Space>
                </div>
              ),
            }))}
          />
          {rounds.length === 0 && <div>Không tìm thấy vòng thi nào.</div>}
        </Card>
      )}

      {isModalVisible && (
        <RoundFormModal
          visible={isModalVisible}
          title={editingRound ? 'Sửa vòng thi' : 'Thêm vòng thi'}
          initialValues={editingRound}
          existingRounds={rounds}
          hackathon={hackathon}
          advancementTeams={advancementTeams}
          advancementTracks={advancementTracks}
          onCancel={() => setIsModalVisible(false)}
          onFinish={handleModalFinish}
        />
      )}

      {/* ========================================== */}
      {/* BƯỚC 8: Modal Nhập lý do khóa điểm */}
      {/* ========================================== */}
      <Modal
        title={<span><Lock size={18} style={{ color: 'var(--ant-color-error)', marginRight: 8, verticalAlign: 'middle' }}/> Khóa chấm điểm Vòng thi</span>}
        open={isLockModalVisible}
        onOk={handleLockScoring}
        onCancel={() => {
          setIsLockModalVisible(false);
          setLockRequiresForce(false);
          setLockReason('');
        }}
        confirmLoading={isLocking}
        okText="Xác nhận Khóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Bạn đang thực hiện khóa luồng chấm điểm của vòng: <strong>{lockingRound?.name}</strong>.</Text><br/>
          {lockRequiresForce ? (
            <>
              <Text type="danger">Còn bài chưa được chấm điểm — cần force lock kèm lý do.</Text><br/>
              <Text type="secondary">Giám khảo sẽ không thể chỉnh sửa điểm sau khi khóa.</Text>
            </>
          ) : (
            <Text type="secondary">Tất cả bài đã được chấm — khóa bình thường (không cần lý do).</Text>
          )}
        </div>
        
        {lockRequiresForce && (
        <div>
          <Text strong>Lý do khóa (force_lock_reason) <span style={{ color: 'red' }}>*</span></Text>
          <Input.TextArea 
            rows={3} 
            placeholder="Ví dụ: Đã hết thời gian chấm thi theo quy định..." 
            value={lockReason}
            onChange={(e) => setLockReason(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>
        )}
      </Modal>

      <Modal
        title={<span><FileText size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Phát đề bài</span>}
        open={isReleaseModalVisible}
        onOk={handleReleaseProblem}
        onCancel={() => {
          setIsReleaseModalVisible(false);
          setPrelimReleaseReady(false);
          setFinalReleaseReady(false);
        }}
        confirmLoading={isReleasing}
        okText="Phát đề cho sinh viên"
        cancelText="Hủy"
        okButtonProps={{
          disabled:
            releasingRound &&
            ((releasingRound.is_final && !finalReleaseReady) ||
              (!releasingRound.is_final && !prelimReleaseReady)),
        }}
        width={720}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            Phát đề cho vòng: <strong>{releasingRound?.name}</strong> (vòng đã kích hoạt).
          </Text>
        </div>
        {releasingRound?.is_final ? (
          <FinalReleaseChecklist
            roundId={releasingRound?.id}
            onReadyChange={setFinalReleaseReady}
          />
        ) : (
          <PrelimReleaseChecklist
            roundId={releasingRound?.id}
            onReadyChange={setPrelimReleaseReady}
          />
        )}
      </Modal>
    </div>
  );
};

export default RoundManagementPage;