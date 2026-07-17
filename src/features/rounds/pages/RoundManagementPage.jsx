// src/features/rounds/pages/RoundManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Timeline, Tag, Card, Spin, Typography, Modal, Alert, Tooltip, Input, Progress, List } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Plus, Edit, Trash2, Calendar, List as ListIcon, BarChart3, PlayCircle, Lock, Unlock, UserPlus, Trophy, FileText, History, StopCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import RoundFormModal from '../components/RoundFormModal';
import { roundService } from '../services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { criteriaService } from '../../criteria/services/criteriaService';
import { mapRoundToFE, mapRoundToBE, sortRoundsByExamAt } from '../mappers/roundMapper';
import { mapTrackToFE } from '../../tracks/mappers/trackMapper';
import { getRoundErrorMessage } from '../../../shared/constants/roundErrors';
import { resolveUserError } from '../../../shared/errors/resolveUserError';
import CalibrationSessionManager from '../../coordinator/components/CalibrationSessionManager';
import { formatDate } from '../../../shared/utils/date';
import { teamService } from '../../teams/services/teamService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { personBApi } from '../../../api/personB.api';
import {
  buildPartitionStats,
  validateAdvancementConfig,
} from '../utils/roundAdvancementRules';
import {
  canCloseEarly as gateCanCloseEarly,
  canLockScoring as gateCanLockScoring,
  canOpenPresentationQueue,
  canReleaseProblem,
  getCloseEarlyTooltip,
  getLockScoringTooltip,
  getOpenQueueTooltip,
  getReleaseProblemTooltip,
  getProblemReleasedAt,
  isSubmissionClosed,
} from '../utils/roundLifecycleGates';
import dayjs from 'dayjs';
import LiveCodingMonitor from '../components/LiveCodingMonitor';
import ScoringProgressCard from '../components/ScoringProgressCard';
import PrelimReleaseChecklist from '../components/PrelimReleaseChecklist';
import FinalReleaseChecklist from '../components/FinalReleaseChecklist';
import ActivateScheduleModal from '../components/ActivateScheduleModal';
import { canActivateRound, getActivateRoundTooltip } from '../utils/canActivateRound';

const { Title, Text } = Typography;

const buildActivateCtx = (round, tracks, teams) => {
  const roundTracks = (tracks || []).filter(
    (t) =>
      (t.round_id ?? t.roundId) === round?.id &&
      String(t.status || '').toUpperCase() !== 'CANCELLED',
  );
  const teamsByTrack = {};
  (teams || []).forEach((t) => {
    const tid = t.track_id ?? t.trackId;
    if (tid) teamsByTrack[tid] = (teamsByTrack[tid] || 0) + 1;
  });
  return { tracks: roundTracks, teamsByTrack };
};


const hasTrackProblem = (track) =>
  Boolean(track?.problem_statement_filename || track?.problem_statement_url);

const checkReleaseReadiness = async (round) => {
  const isFinal = Boolean(round?.is_final);
  if (isFinal) {
    // CK: ready khi mọi track sơ loại (cùng hackathon) đã có PDF — không cần PDF trên round.
    const detail = await roundService.getById(round.id);
    const mapped = mapRoundToFE(detail);
    const hackathonId = mapped?.hackathon_id ?? mapped?.hackathonId ?? round.hackathon_id;
    if (!hackathonId) {
      return { ready: false, trackCount: 0, readyCount: 0, isFinal: true };
    }
    const trackRes = await trackService.listByHackathon(hackathonId);
    const tracks = (Array.isArray(trackRes) ? trackRes : trackRes?.items || []).map(mapTrackToFE);
    const readyCount = tracks.filter(hasTrackProblem).length;
    return {
      ready: tracks.length > 0 && readyCount === tracks.length,
      trackCount: tracks.length,
      readyCount,
      isFinal: true,
    };
  }
  const res = await trackService.listByRound(round.id);
  const tracks = (Array.isArray(res) ? res : res?.items || []).map(mapTrackToFE);
  const readyCount = tracks.filter(hasTrackProblem).length;
  return {
    ready: tracks.length > 0 && readyCount === tracks.length,
    trackCount: tracks.length,
    readyCount,
    isFinal: false,
  };
};

const RoundManagementPage = ({ hackathonId, hackathon, onHackathonSync }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'timeline'
  const [advancementTeams, setAdvancementTeams] = useState([]);
  const [advancementTracks, setAdvancementTracks] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromFinalConfig = searchParams.get('from') === 'final-config';
  const finalConfigBackUrl = hackathonId
    ? `/hackathons/${hackathonId}/setup?tab=final-config`
    : null;

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
  const [calibTracks, setCalibTracks] = useState([]);
  const [closeEarlyRound, setCloseEarlyRound] = useState(null);
  const [closingEarly, setClosingEarly] = useState(false);
  const [closeEarlyRosterLoading, setCloseEarlyRosterLoading] = useState(false);
  const [closeEarlyRoster, setCloseEarlyRoster] = useState({ submitted: 0, total: 0, rows: [] });
  // Re-render periodically so Stop/Lock enablement tracks local clock vs examAt/deadline
  const [, setGateClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGateClockTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!closeEarlyRound?.id || !hackathonId) {
      setCloseEarlyRoster({ submitted: 0, total: 0, rows: [] });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setCloseEarlyRosterLoading(true);
      try {
        const [subsRes, teamsRes] = await Promise.all([
          personBApi.getRoundSubmissions(closeEarlyRound.id),
          teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
        ]);
        if (cancelled) return;
        const submissions = Array.isArray(subsRes) ? subsRes : [];
        const teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || [];
        const submittedIds = new Set(
          submissions
            .map((s) => Number(s.team_id ?? s.teamId))
            .filter((id) => Number.isFinite(id)),
        );
        const rows = teams
          .map((t) => {
            const id = Number(t.id);
            const name = t.teamName || t.team_name || t.name || `Đội #${id}`;
            const submitted = submittedIds.has(id);
            const sub = submissions.find((s) => Number(s.team_id ?? s.teamId) === id);
            const late = Boolean(sub?.is_late ?? sub?.isLate);
            return { id, name, submitted, late };
          })
          .sort((a, b) => {
            if (a.submitted !== b.submitted) return a.submitted ? 1 : -1; // chưa nộp trước
            return String(a.name).localeCompare(String(b.name), 'vi');
          });
        const submitted = rows.filter((r) => r.submitted).length;
        setCloseEarlyRoster({ submitted, total: rows.length, rows });
      } catch {
        if (!cancelled) {
          setCloseEarlyRoster({ submitted: 0, total: 0, rows: [] });
        }
      } finally {
        if (!cancelled) setCloseEarlyRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [closeEarlyRound?.id, hackathonId]);
  const [activateRound, setActivateRound] = useState(null);
  const [activating, setActivating] = useState(false);

  const activeRounds = rounds.filter((r) => r.is_active);
  const activePrelimRound =
    activeRounds.find((r) => !(r.is_final || r.isFinal)) || null;
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
      message.error(getRoundErrorMessage(error) || 'Lỗi khi tải danh sách vòng thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [hackathonId]);

  useEffect(() => {
    let cancelled = false;
    const loadCalibTracks = async () => {
      if (!activePrelimRound?.id) {
        setCalibTracks([]);
        return;
      }
      try {
        const res = await trackService.listByRound(activePrelimRound.id);
        const list = (Array.isArray(res) ? res : res?.items || []).map(mapTrackToFE);
        if (!cancelled) setCalibTracks(list);
      } catch {
        if (!cancelled) setCalibTracks([]);
      }
    };
    loadCalibTracks();
    return () => {
      cancelled = true;
    };
  }, [activePrelimRound?.id]);

  useEffect(() => {
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
      message.error(getRoundErrorMessage(error) || 'Lỗi khi xóa vòng thi');
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
            title: 'Đã khóa Chung kết — sẵn sàng trao giải',
            content:
              'Hackathon đã chuyển sang trạng thái đang chờ chốt sổ điểm. Tiếp theo: trao giải và chốt sổ kết quả.',
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
    setActivateRound(round);
  };

  const confirmActivateRound = async (payload) => {
    const round = activateRound;
    if (!round?.id || activating) return;
    setActivating(true);
    try {
      const isRescheduleOnly = payload?.scheduleMode === 'RESCHEDULE';
      if (round.is_final && !isRescheduleOnly) {
        const ready = await ensureFinalRoundReadiness();
        if (!ready) return;
      }
      setLoading(true);
      await roundService.activate(round.id, payload);
      message.success(
        isRescheduleOnly
          ? `Đã dời lịch ${round.name} — vòng vẫn ở trạng thái Bản nháp.`
          : round.is_final
            ? `${round.name} đã kích hoạt — đề theo bảng sơ loại của từng đội đã mở cho sinh viên.`
            : `${round.name} đã được kích hoạt thành công!`,
      );
      setActivateRound(null);
      await fetchRounds();
      if (onHackathonSync) await onHackathonSync();
    } catch (error) {
      message.error(getRoundErrorMessage(error) || 'Lỗi khi kích hoạt vòng thi. Hãy kiểm tra lại tiêu chí và bảng đấu.');
      setLoading(false);
    } finally {
      setActivating(false);
    }
  };

  const handleCloseSubmissionEarly = async () => {
    if (!closeEarlyRound?.id) return;
    setClosingEarly(true);
    try {
      await roundService.closeSubmissionEarly(closeEarlyRound.id);
      message.success(`Đã kết thúc thời gian thi sớm cho ${closeEarlyRound.name}. Có thể xáo trộn hàng đợi và chấm điểm.`);
      setCloseEarlyRound(null);
      await fetchRounds();
      if (onHackathonSync) await onHackathonSync();
    } catch (error) {
      message.error(getRoundErrorMessage(error) || 'Không thể kết thúc thời gian thi sớm.');
    } finally {
      setClosingEarly(false);
    }
  };

  const handleOpenLockScoring = async (record) => {
    if (!isSubmissionClosed(record)) {
      message.warning(getLockScoringTooltip(record));
      return;
    }
    if (!gateCanLockScoring(record)) {
      message.warning(getLockScoringTooltip(record));
      return;
    }

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
      message.error(getRoundErrorMessage(error) || 'Lỗi khi khóa chấm điểm.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleLockScoring = async () => {
    if (lockRequiresForce && !lockReason.trim()) {
      return message.warning('Vui lòng nhập lý do khóa chấm điểm (bắt buộc khi còn bài chưa chấm).');
    }

    setIsLocking(true);
    try {
      await finalizeLockScoring(lockingRound, {
        force: lockRequiresForce,
        reason: lockRequiresForce ? lockReason.trim() : undefined,
      });
    } catch (error) {
      message.error(getRoundErrorMessage(error) || 'Lỗi khi khóa chấm điểm.');
    } finally {
      setIsLocking(false);
    }
  };

  const performRelease = async (round) => {
    const isFinal = Boolean(round?.is_final);
    setIsReleasing(true);
    try {
      await roundService.releaseProblem(round.id, null);
      message.success(
        isFinal
          ? `Đã phát đề Chung kết cho ${round.name}. Sinh viên vào trang đội để tải đề.`
          : `Đã phát đề Sơ loại — mỗi đội nhận đề theo bảng đấu của mình.`,
      );
      setIsReleaseModalVisible(false);
      setPrelimReleaseReady(false);
      setFinalReleaseReady(false);
      setReleasingRound(null);
      fetchRounds();
    } catch (error) {
      message.error(getRoundErrorMessage(error) || 'Không thể phát đề. Vui lòng thử lại.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleOpenRelease = async (record) => {
    if (record?.is_final) {
      message.info('Chung kết không cần Phát đề — đề mở theo bảng sơ loại khi kích hoạt vòng.');
      return;
    }
    if (!canReleaseProblem(record)) {
      message.warning(getReleaseProblemTooltip(record));
      return;
    }
    try {
      const readiness = await checkReleaseReadiness(record);
      if (readiness.ready) {
        Modal.confirm({
          title: 'Xác nhận phát đề',
          content: readiness.isFinal
            ? `Chung kết sẽ tái dùng đề sơ loại (${readiness.trackCount} bảng đấu đã có PDF). Phát đề cho sinh viên ngay? Thao tác này không thể hoàn tác.`
            : `Tất cả ${readiness.trackCount} bảng đấu đã có PDF đề bài. Phát đề cho sinh viên ngay? Thao tác này không thể hoàn tác.`,
          okText: 'Phát đề',
          cancelText: 'Hủy',
          onOk: () => performRelease(record),
        });
        return;
      }
      setReleasingRound(record);
      setPrelimReleaseReady(false);
      setFinalReleaseReady(false);
      setIsReleaseModalVisible(true);
    } catch {
      message.error('Không kiểm tra được trạng thái đề bài. Vui lòng thử lại.');
    }
  };

  const handleReleaseProblem = async () => {
    const isFinal = Boolean(releasingRound?.is_final);
    if (isFinal && !finalReleaseReady) {
      return message.warning('Các bảng đấu sơ loại phải có PDF đề bài trước khi phát đề CK.');
    }
    if (!isFinal && !prelimReleaseReady) {
      return message.warning('Mọi bảng đấu phải có PDF đề bài trước khi phát.');
    }
    await performRelease(releasingRound);
  };

  const handleModalFinish = async (values) => {
    try {
      setLoading(true);

      const isActivating = values.is_active && (!editingRound || !editingRound.is_active);

      if (isActivating) {
        if (!editingRound) {
          Modal.error({
            title: 'Không thể kích hoạt vòng thi mới',
            content: 'Vòng thi mới tạo chưa có bảng đấu và tiêu chí đánh giá. Vui lòng lưu vòng thi ở trạng thái "Bản nháp" trước, sau đó cấu hình các bảng đấu và tiêu chí đánh giá bên trong rồi mới kích hoạt.',
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

      const { problem_file: _problemFileListValue, ...roundValues } = values;
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

      if (roundValues.is_active && (!editingRound || !editingRound.is_active)) {
        try {
          await roundService.activate(roundId, {
            note: 'Kích hoạt từ giao diện cấu hình',
            scheduleMode: 'KEEP',
          });
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
                  {resolveUserError(actError, {
                    fallback: 'Thiếu tiêu chí đánh giá hoặc chưa phân công giám khảo',
                  })}
                </div>
                <p style={{ marginTop: 8, fontSize: '13px' }}>Vòng thi đã được lưu thành công ở trạng thái "Bản nháp". Bạn hãy cấu hình đầy đủ tiêu chí trước khi bật kích hoạt nhé.</p>
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
          {record.is_final ? (
            <Tag color="gold" style={{ marginLeft: 8 }}>Chung kết</Tag>
          ) : (
            <Tag color="blue" style={{ marginLeft: 8 }}>Sơ loại</Tag>
          )}
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
      title: 'Thời lượng thi (giờ)',
      dataIndex: 'coding_duration_hours',
      key: 'duration',
      render: (val) => val ? `${val}h` : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const isEnded = record.submission_deadline && dayjs().isAfter(dayjs(record.submission_deadline));
        const closedEarly = Boolean(record.submission_closed_early_at);
        
        // BƯỚC 8: Hiển thị Badge Đã khóa chấm điểm
        if (record.scoring_locked || record.scoringLocked) {
          return <Tag color="red" icon={<Lock size={12} style={{marginRight: 4}}/>}>Đã khóa chấm điểm</Tag>;
        }

        if (closedEarly || isEnded) {
          return <Tag color="red">{closedEarly ? 'Đã kết thúc sớm' : 'Đã kết thúc'}</Tag>;
        }
        if (record.is_active) {
          return <Tag color="green">Đang hoạt động</Tag>;
        }
        return <Tag color="default">Bản nháp</Tag>;
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
          const hasReleasedProblem = Boolean(getProblemReleasedAt(record));
          const closed = isSubmissionClosed(record);
          const allowRelease = canReleaseProblem(record);
          const allowCloseEarly = gateCanCloseEarly(record);
          const allowQueue = canOpenPresentationQueue(record);
          const allowLock = gateCanLockScoring(record);
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

              {!hasReleasedProblem && !record.is_final && (
                <Tooltip title={getReleaseProblemTooltip(record)}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      type="text"
                      disabled={!allowRelease}
                      style={{ color: allowRelease ? 'var(--ant-color-warning)' : undefined }}
                      icon={<FileText size={16} />}
                      data-testid="round-release-problem-btn"
                      onClick={() => handleOpenRelease(record)}
                    />
                  </span>
                </Tooltip>
              )}

              {!closed && (
                <Tooltip title={getCloseEarlyTooltip(record)}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      type="text"
                      danger
                      disabled={!allowCloseEarly}
                      data-testid="round-close-submission-early-btn"
                      icon={<StopCircle size={16} />}
                      onClick={() => setCloseEarlyRound(record)}
                    />
                  </span>
                </Tooltip>
              )}

              {closed && (
                <Tooltip title={getOpenQueueTooltip(record)}>
                  <Button
                    type="text"
                    style={{ color: 'var(--ant-color-primary)' }}
                    icon={<History size={16} />}
                    data-testid="round-open-presentation-queue-btn"
                    disabled={!allowQueue}
                    onClick={() => {
                      navigate(`${ROUTES.PRESENTATION_QUEUE}?roundId=${record.id}`);
                    }}
                  />
                </Tooltip>
              )}

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

              {(record.scoring_locked || record.scoringLocked) && (
                <Tooltip title="Mở khóa chấm (cần lý do)">
                  <Button
                    type="text"
                    danger
                    icon={<Unlock size={16} />}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Mở khóa chấm điểm?',
                        content: 'Judge sẽ nhận SCORING_UNLOCKED qua WebSocket.',
                        okText: 'Mở khóa',
                        onOk: async () => {
                          const reason = window.prompt('Lý do mở khóa (bắt buộc):');
                          if (!reason?.trim()) {
                            message.error('Bắt buộc lý do');
                            return;
                          }
                          await roundService.unlockScoring(record.id, { reason: reason.trim() });
                          message.success('Đã mở khóa chấm điểm');
                          await fetchRounds();
                        },
                      });
                    }}
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

              <Tooltip title={getLockScoringTooltip(record)}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    type="text"
                    danger
                    disabled={!allowLock}
                    data-testid="round-lock-scoring-btn"
                    icon={<Lock size={16} />}
                    onClick={() => handleOpenLockScoring(record)}
                  />
                </span>
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
                {(() => {
                  const activateCtx = buildActivateCtx(record, advancementTracks, advancementTeams);
                  const { ok } = canActivateRound(record, activateCtx);
                  const tip = getActivateRoundTooltip(record, activateCtx);
                  return (
                    <Tooltip title={tip}>
                      <span style={{ display: 'inline-flex' }}>
                        <Button
                          type="text"
                          data-testid="round-activate-btn"
                          disabled={!ok}
                          style={{ color: ok ? 'var(--ant-color-success)' : undefined }}
                          icon={<PlayCircle size={16} />}
                          onClick={() => handleActivateRound(record)}
                        />
                      </span>
                    </Tooltip>
                  );
                })()}

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
    <div className="round-management-page-wrapper">
      <style>{`
        .round-management-page-wrapper {
          --ant-color-primary: #818cf8 !important;
          --ant-color-primary-hover: #a78bfa !important;
          --ant-color-primary-active: #6366f1 !important;
          --ant-color-success: #10b981 !important;
          --ant-color-purple: #a78bfa !important;
        }
        .round-management-page-wrapper .ant-btn-primary {
          background: linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%) !important;
          border: none !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(135, 92, 255, 0.2) !important;
          border-radius: 8px !important;
          transition: all 0.3s ease !important;
        }
        .round-management-page-wrapper .ant-btn-primary:hover {
          background: linear-gradient(135deg, #b59dfb 0%, #76b3fc 100%) !important;
          box-shadow: 0 6px 16px rgba(135, 92, 255, 0.3) !important;
        }
        /* Group buttons styling */
        .round-management-page-wrapper .ant-btn-group .ant-btn {
          border-color: #ddd6fe !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }
        .round-management-page-wrapper .ant-btn-group .ant-btn-primary {
          background: #818cf8 !important;
          border-color: #818cf8 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .round-management-page-wrapper .ant-btn-group .ant-btn-primary:hover {
          background: #6366f1 !important;
          color: #ffffff !important;
        }
        .round-management-page-wrapper .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #f5f3ff 0%, #eff6ff 100%) !important;
          color: #4f46e5 !important;
          font-weight: 700 !important;
          border-bottom: 2.5px solid #ddd6fe !important;
        }
        .round-management-page-wrapper .ant-table {
          background: transparent !important;
        }
        .round-management-page-wrapper .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
        }
        .round-management-page-wrapper .ant-table-tbody > tr:nth-child(even) {
          background-color: #faf5ff !important;
        }
        .round-management-page-wrapper .ant-table-tbody > tr:nth-child(odd) {
          background-color: #ffffff !important;
        }
        .round-management-page-wrapper .ant-table-row:hover > td {
          background: #f3e8ff !important;
        }
        /* Custom tags styling */
        .round-management-page-wrapper .ant-tag {
          border-radius: 6px !important;
          padding: 2px 8px !important;
          font-weight: 600 !important;
        }
        .round-management-page-wrapper .ant-tag-green {
          background: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
          color: #16a34a !important;
        }
        .round-management-page-wrapper .ant-tag-red {
          background: #fee2e2 !important;
          border-color: #fca5a5 !important;
          color: #dc2626 !important;
        }
        .round-management-page-wrapper .ant-tag-gold {
          background: #f5f3ff !important;
          border-color: #ddd6fe !important;
          color: #7c3aed !important;
        }
      `}</style>
      {isFromFinalConfig && finalConfigBackUrl && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Bạn đang ở chế độ Quản lý Vòng thi từ trang cấu hình Chung kết."
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => navigate(finalConfigBackUrl)}
            >
              ← Quay lại Cấu hình Chung kết
            </Button>
          }
        />
      )}
      {rounds
        .filter(
          (r) =>
            r.is_final &&
            r.final_problem_migration_cleared_at &&
            !r.final_problem_migration_banner_dismissed_at,
        )
        .map((r) => (
          <Alert
            key={`final-pdf-migration-${r.id}`}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            message={`Đề PDF riêng trên vòng «${r.name}» đã được gỡ`}
            description="Chung kết không còn đề riêng trên vòng — mỗi đội tiếp tục đề theo bảng sơ loại của mình. Hệ thống đã xóa file PDF cũ gắn trên vòng CK."
            onClose={async () => {
              try {
                await roundService.dismissFinalProblemMigrationBanner(r.id);
                await fetchRounds();
              } catch (error) {
                message.error(getRoundErrorMessage(error) || 'Không thể ẩn thông báo.');
              }
            }}
          />
        ))}
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

      {activePrelimRound?.id &&
        calibTracks.map((track) => (
          <CalibrationSessionManager
            key={track.id}
            roundId={activePrelimRound.id}
            trackId={track.id}
            roundLabel={`Bảng ${track.name || track.id}`}
            enabled={Boolean(activePrelimRound?.is_active ?? activePrelimRound?.isActive)}
          />
        ))}

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Space>
          <Button.Group style={{ marginRight: 16 }}>
            <Button
              icon={<ListIcon size={16} />}
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
                      if (round.submission_closed_early_at) {
                        return <Tag color="orange">Đã kết thúc thi sớm</Tag>;
                      }
                      if (isEnded) return <Tag color="blue">Đã kết thúc</Tag>;
                      if (round.is_active) return <Tag color="green">Đang hoạt động</Tag>;
                      return <Tag color="default">Bản nháp</Tag>;
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

      {/* Kết thúc thời gian thi sớm — irreversible */}
      <ActivateScheduleModal
        open={Boolean(activateRound)}
        round={activateRound}
        confirmLoading={activating}
        onCancel={() => !activating && setActivateRound(null)}
        onConfirm={confirmActivateRound}
      />

      <Modal
        title="Kết thúc thời gian thi sớm?"
        open={Boolean(closeEarlyRound)}
        onOk={handleCloseSubmissionEarly}
        onCancel={() => !closingEarly && setCloseEarlyRound(null)}
        okText="Xác nhận kết thúc"
        cancelText="Hủy"
        okButtonProps={{
          danger: true,
          loading: closingEarly,
          disabled: closeEarlyRosterLoading,
        }}
        data-testid="close-submission-early-modal"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text>
            Bạn sắp kết thúc thời gian thi cho <Text strong>{closeEarlyRound?.name}</Text>.
          </Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Đóng cổng nộp bài (hạn nộp = thời điểm hiện tại)</li>
            <li>Kết thúc giờ thi — vòng chuyển sang giai đoạn chấm điểm</li>
            <li>Tiếp theo: xáo trộn hàng đợi thuyết trình → giám khảo chấm → khóa điểm</li>
          </ul>

          {closeEarlyRosterLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Spin tip="Đang tải trạng thái nộp bài..." />
            </div>
          ) : (
            <>
              <div>
                <Text strong>
                  Đã nộp: {closeEarlyRoster.submitted}/{closeEarlyRoster.total} đội
                </Text>
                <Progress
                  percent={
                    closeEarlyRoster.total > 0
                      ? Math.round((closeEarlyRoster.submitted / closeEarlyRoster.total) * 100)
                      : 0
                  }
                  status={
                    closeEarlyRoster.total > 0 &&
                    closeEarlyRoster.submitted < closeEarlyRoster.total
                      ? 'active'
                      : 'success'
                  }
                  strokeColor="#22c55e"
                  style={{ marginTop: 8 }}
                />
              </div>
              <div
                style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: '4px 0',
                }}
              >
                <List
                  size="small"
                  dataSource={closeEarlyRoster.rows}
                  locale={{ emptyText: 'Chưa có đội ACTIVE để đối chiếu' }}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '8px 12px' }}>
                      <Space>
                        {item.submitted ? (
                          <CheckCircleOutlined style={{ color: '#16a34a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#dc2626' }} />
                        )}
                        <Text style={{ color: item.submitted ? undefined : '#dc2626', fontWeight: item.submitted ? 400 : 600 }}>
                          {item.name}
                        </Text>
                        <Tag color={item.submitted ? (item.late ? 'orange' : 'success') : 'error'}>
                          {item.submitted ? (item.late ? 'Nộp muộn' : 'Đã nộp') : 'Chưa nộp'}
                        </Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}

          <Text strong style={{ color: '#cf1322' }}>
            Hành động này KHÔNG THỂ HOÀN TÁC.
          </Text>
        </Space>
      </Modal>

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
          <Text strong>Lý do khóa (bắt buộc khi còn bài chưa chấm) <span style={{ color: 'red' }}>*</span></Text>
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
        okText="Phát tất cả"
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
            roundProblemReleased={Boolean(releasingRound?.problem_released_at)}
            onReadyChange={setPrelimReleaseReady}
            onTrackReleased={fetchRounds}
          />
        )}
      </Modal>
    </div>
  );
};

export default RoundManagementPage;