// src/features/people/hooks/usePeopleManagement.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { peopleService } from '../services/peopleService';
import { trackService } from '../../tracks/services/trackService';
import { roundService } from '../../rounds/services/roundService';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import {
  buildFinalJudgePool,
  buildMentorPool,
  buildPrelimJudgePool,
  findPersonById,
  resolvePrelimAssignmentType,
  formatJudgeRoleLabel,
  isEligibleForFinalJudge,
  isEligibleForPrelimJudge,
} from '../utils/peoplePersonnelRules';

export const usePeopleManagement = (hackathonId, onUpdated) => {
  const [mentors, setMentors] = useState([]);
  const [judges, setJudges] = useState([]);
  const [tempJudges, setTempJudges] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [trackMentors, setTrackMentors] = useState([]);
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [finalJudgeAssignments, setFinalJudgeAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assigningMentor, setAssigningMentor] = useState(false);
  const [assigningJudge, setAssigningJudge] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState(null);
  const notifyHub = async () => {
    if (typeof onUpdated === 'function') await onUpdated();
  };
  const isFinalRound = (round) =>
    Boolean(round?.isFinal ?? round?.is_final) ||
    String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL' ||
    /chung\s*kết|final/i.test(String(round?.name || ''));

  const fetchBaseData = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) setIsLoading(true);
    try {
      const [rRes, tRes, mRes, jRes, tempRes] = await Promise.all([
        roundService.listByHackathon(hackathonId),
        trackService.listByHackathon(hackathonId),
        peopleService.getUsersByRole('MENTOR').catch(() => []),
        peopleService.getUsersByRole('JUDGE').catch(() => []),
        peopleService.getTempJudges().catch(() => []),
      ]);
      const roundList = Array.isArray(rRes) ? rRes : rRes?.items || [];
      const trackList = Array.isArray(tRes) ? tRes : tRes?.items || [];

      setRounds(roundList);
      setTracks(trackList);
      setMentors(Array.isArray(mRes) ? mRes : mRes?.items || []);
      setJudges(Array.isArray(jRes) ? jRes : jRes?.items || []);
      const rawTemp = Array.isArray(tempRes) ? tempRes : tempRes?.items || [];
      setTempJudges(
        rawTemp.map((row) => ({
          ...row,
          mustChangePassword:
            row.mustChangePassword ?? row.must_change_password ?? false,
          tokenSent:
            row.tokenSent ??
            row.token_sent ??
            row.invitation?.tokenSent ??
            row.invitation?.token_sent,
          invitation: row.invitation ?? null,
          invitationId: row.invitation?.id ?? row.invitationId ?? row.invitation_id,
          expiresAt: row.invitation?.expiresAt ?? row.invitation?.expires_at ?? row.expiresAt,
        })),
      );

      const finalRoundIds = new Set(
        roundList.filter((r) => isFinalRound(r)).map((r) => r.id),
      );

      const mentorPromises = trackList.map((track) =>
        peopleService
          .getTrackMentors(track.id)
          .then((res) => ({
            track,
            data: Array.isArray(res) ? res : res?.items || res?.content || [],
          }))
          .catch(() => ({ track, data: [] })),
      );

      const trackJudgePromises = trackList
        .filter((track) => !finalRoundIds.has(track.roundId || track.round_id))
        .map((track) =>
          peopleService
            .getTrackJudges(track.id)
            .then((res) => ({
              track,
              judges: Array.isArray(res) ? res : res?.items || res?.content || [],
            }))
            .catch(() => ({ track, judges: [] })),
        );

      const finalRoundJudgePromises = roundList
        .filter((round) => isFinalRound(round))
        .map((round) =>
          peopleService
            .getRoundJudges(round.id)
            .then((res) => ({
              round,
              judges: Array.isArray(res) ? res : res?.items || res?.content || [],
            }))
            .catch(() => ({ round, judges: [] })),
        );

      const [mentorResults, trackJResults, finalJudgeResults] = await Promise.all([
        Promise.all(mentorPromises),
        Promise.all(trackJudgePromises),
        Promise.all(finalRoundJudgePromises),
      ]);

      const allTrackMentors = [];
      mentorResults.forEach(({ track, data }) => {
        data.forEach((m) => {
          allTrackMentors.push({
            id: m.id || m.assignmentId || `${track.id}_${m.mentorId || m.mentor_id}`,
            track_id: track.id,
            track_name: track.name,
            mentor_id: m.mentorId || m.mentor_id || m.user?.id,
            mentor_name:
              m.mentorFullName ||
              m.mentor?.fullName ||
              m.mentor?.full_name ||
              m.mentor?.name ||
              m.mentorName ||
              m.fullName ||
              m.full_name ||
              m.name,
          });
        });
      });
      setTrackMentors(allTrackMentors);

      const allJudges = [];
      trackJResults.forEach(({ track, judges: trackJudges }) => {
        trackJudges.forEach((j) => {
          allJudges.push({
            id: j.id || j.assignmentId,
            track_id: track.id,
            track_name: track.name,
            round_id: track.roundId || track.round_id || null,
            target_name: track.name,
            judge_name:
              j.judgeFullName ||
              j.judge?.fullName ||
              j.judge?.full_name ||
              j.judge?.name ||
              j.user?.fullName ||
              j.user?.full_name ||
              j.judgeName ||
              j.fullName ||
              j.full_name ||
              j.name,
            person_id: j.judge?.id || j.user?.id || j.judgeId || j.userId,
            assignment_type: j.assignmentType || j.assignment_type || 'NORMAL',
          });
        });
      });
      setJudgeAssignments(allJudges);

      const allFinalJudges = [];
      finalJudgeResults.forEach(({ round, judges: roundJudges }) => {
        roundJudges.forEach((j) => {
          allFinalJudges.push({
            id: j.id || j.assignmentId,
            round_id: round.id,
            target_name: round.name,
            judge_name:
              j.judgeFullName ||
              j.judge?.fullName ||
              j.judge?.full_name ||
              j.judge?.name ||
              j.user?.fullName ||
              j.user?.full_name ||
              j.judgeName ||
              j.fullName ||
              j.full_name ||
              j.name,
            person_id: j.judge?.id || j.user?.id || j.judgeId || j.userId,
            assignment_type: j.assignmentType || j.assignment_type || 'NORMAL',
          });
        });
      });
      setFinalJudgeAssignments(allFinalJudges);
    } catch {
      message.error('Không tải được danh sách nhân sự. Thử tải lại trang.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [hackathonId]);

  /** Chỉ refetch assignment tables — không gọi refreshSetupSnapshot (tránh chậm). */
  const refreshAssignmentsOnly = useCallback(async () => {
    await fetchBaseData({ silent: true });
  }, [fetchBaseData]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  const mentorPool = useMemo(
    () => buildMentorPool(mentors, judges),
    [mentors, judges]
  );

  const prelimJudgePool = useMemo(
    () => buildPrelimJudgePool(mentors, judges),
    [mentors, judges]
  );

  const finalJudgePool = useMemo(
    () => buildFinalJudgePool(judges, tempJudges, 'FINAL_EXTERNAL'),
    [judges, tempJudges],
  );

  const getFinalJudgePoolForType = useCallback(
    (assignmentType = 'FINAL_EXTERNAL') => buildFinalJudgePool(judges, tempJudges, assignmentType),
    [judges, tempJudges],
  );

  const mentorIdsByTrack = useMemo(() => {
    const map = new Map();
    trackMentors.forEach((row) => {
      const tid = Number(row.track_id);
      const mid = Number(row.mentor_id);
      if (!Number.isFinite(tid) || !Number.isFinite(mid)) return;
      if (!map.has(tid)) map.set(tid, new Set());
      map.get(tid).add(mid);
    });
    return map;
  }, [trackMentors]);

  const judgeIdsByTrack = useMemo(() => {
    const map = new Map();
    judgeAssignments.forEach((row) => {
      if (row.track_id == null) return;
      const tid = Number(row.track_id);
      const jid = Number(row.person_id);
      if (!Number.isFinite(tid) || !Number.isFinite(jid)) return;
      if (!map.has(tid)) map.set(tid, new Set());
      map.get(tid).add(jid);
    });
    return map;
  }, [judgeAssignments]);

  const createTempJudge = async (values, onSuccess) => {
    setIsLoading(true);
    try {
      const result = await peopleService.createTempJudge({ ...values, hackathonId });
      const tokenSent =
        result?.invitation?.tokenSent ??
        result?.data?.invitation?.tokenSent ??
        true;
      if (tokenSent === false) {
        message.warning(
          'Đã tạo tài khoản giám khảo nhưng email chưa gửi được. Vui lòng liên hệ giám khảo thủ công.',
        );
      } else {
        message.success('Đã gửi lời mời giám khảo khách mời.');
      }
      await fetchBaseData({ silent: true });
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const assignMentor = async (values, onSuccess) => {
    const blockReason = getMentorAssignBlockReason(values.mentor_id, values.track_id);
    if (blockReason) {
      message.warning(`Không thể gán: người này ${blockReason}.`);
      return;
    }
    setAssigningMentor(true);
    try {
      await peopleService.assignMentorToTrack({
        mentorId: values.mentor_id,
        trackId: values.track_id,
      });
      message.success('Đã gán mentor cho bảng đấu.');
      await refreshAssignmentsOnly();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setAssigningMentor(false);
    }
  };

  const removeMentor = async (assignmentId) => {
    setRemovingAssignmentId(assignmentId);
    try {
      await peopleService.removeMentorAssignment(assignmentId);
      message.success('Đã gỡ mentor khỏi bảng đấu.');
      await refreshAssignmentsOnly();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  const assignJudge = async (values, onSuccess) => {
    setAssigningJudge(true);
    try {
      const trackId = values.track_id ? parseInt(values.track_id, 10) : null;
      const selectedTrack = trackId ? tracks.find((item) => item.id === trackId) : null;
      const finalRoundIdFromTrack = selectedTrack?.roundId || selectedTrack?.round_id;
      const finalRoundIdFromForm = values.round_id ? parseInt(values.round_id, 10) : null;
      const finalRoundId = finalRoundIdFromTrack || finalRoundIdFromForm;
      const isFinalTrack = Boolean(selectedTrack?.isFinal ?? selectedTrack?.is_final);
      const isFinalFlow = Boolean(values.is_final_assignment) || isFinalTrack || Boolean(finalRoundIdFromForm);

      const blockReason = isFinalFlow
        ? getFinalJudgeAssignBlockReason(values.person_id, { trackId, roundId: finalRoundId })
        : getPrelimJudgeAssignBlockReason(values.person_id, trackId);
      if (blockReason) {
        message.warning(`Không thể gán: người này ${blockReason}.`);
        return;
      }

      const person = findPersonById(values.person_id, [prelimJudgePool, finalJudgePool, mentors, judges, tempJudges]);
      if (!person) {
        message.error('Không tìm thấy thông tin giám khảo đã chọn.');
        return;
      }

      const rawFinalType = String(values.assignment_type || 'FINAL_EXTERNAL').toUpperCase();
      const assignmentType = isFinalFlow
        ? rawFinalType === 'NORMAL'
          ? 'NORMAL'
          : 'FINAL_EXTERNAL'
        : resolvePrelimAssignmentType();

      if (isFinalFlow && finalRoundId) {
        if (!isEligibleForFinalJudge(person, assignmentType)) {
          message.error(
            assignmentType === 'NORMAL'
              ? 'Chung kết Giám khảo nội bộ chỉ gán giám khảo INTERNAL.'
              : 'Chung kết FINAL_EXTERNAL chỉ gán giám khảo khách đã duyệt.',
          );
          return;
        }
        await peopleService.assignFinalRoundJudge({
          roundId: finalRoundId,
          judgeId: values.person_id,
          assignmentType,
        });
        message.success(
          `Đã gán giám khảo Chung kết (${
            assignmentType === 'NORMAL' ? 'Giám khảo nội bộ' : formatJudgeRoleLabel(assignmentType)
          }).`,
        );
      } else {
        if (!isEligibleForPrelimJudge(person)) {
          message.error('Sơ loại chỉ gán giám khảo/mentor nội bộ.');
          return;
        }
        await peopleService.assignJudge({
          judgeId: values.person_id,
          trackId: trackId || undefined,
          assignmentType,
        });
        message.success(`Đã gán giám khảo Sơ loại (${formatJudgeRoleLabel(assignmentType)}).`);
      }
      await refreshAssignmentsOnly();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setAssigningJudge(false);
    }
  };

  const removeJudge = async (assignmentId) => {
    setRemovingAssignmentId(assignmentId);
    try {
      await peopleService.removeJudgeAssignment(assignmentId);
      message.success('Đã gỡ giám khảo.');
      await refreshAssignmentsOnly();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  const resendInvitation = async (invitationId) => {
    if (!invitationId) {
      message.warning('Không có mã lời mời để gửi lại');
      return;
    }
    setIsLoading(true);
    try {
      await peopleService.resendInvitation(invitationId);
      message.success('Đã gửi lại email mời giám khảo');
      await fetchBaseData({ silent: true });
    } catch (error) {
      message.error(getTeamErrorMessage(error) || 'Không thể gửi lại email');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeInvitation = async (invitationId) => {
    if (!invitationId) {
      message.warning('Không có mã lời mời để thu hồi');
      return;
    }
    setIsLoading(true);
    try {
      await peopleService.revokeInvitation(invitationId);
      message.success('Đã thu hồi lời mời giám khảo');
      await fetchBaseData({ silent: true });
    } catch (error) {
      message.error(getTeamErrorMessage(error) || 'Không thể thu hồi lời mời');
    } finally {
      setIsLoading(false);
    }
  };

  const isMentorBlockedForTrack = (mentorId, trackId) =>
    Boolean(judgeIdsByTrack.get(Number(trackId))?.has(Number(mentorId)));

  const isJudgeBlockedForTrack = (judgeId, trackId) =>
    Boolean(mentorIdsByTrack.get(Number(trackId))?.has(Number(judgeId)));

  const isAlreadyMentorOnTrack = (mentorId, trackId) =>
    Boolean(mentorIdsByTrack.get(Number(trackId))?.has(Number(mentorId)));

  const isAlreadyJudgeOnTrack = (judgeId, trackId) =>
    Boolean(judgeIdsByTrack.get(Number(trackId))?.has(Number(judgeId)));

  const trackRoundId = (trackId) => {
    const track = tracks.find((item) => Number(item.id) === Number(trackId));
    return track?.roundId ?? track?.round_id ?? null;
  };

  const trackNameById = (trackId) => {
    const track = tracks.find((item) => Number(item.id) === Number(trackId));
    return track?.name || `bảng #${trackId}`;
  };

  /** Mentor đã gán bảng khác trong cùng vòng (hoặc bất kỳ bảng khác nếu thiếu roundId). */
  const findMentorOnOtherTrackInSameRound = (mentorId, trackId) => {
    const roundId = trackRoundId(trackId);
    return (
      trackMentors.find((row) => {
        if (Number(row.mentor_id) !== Number(mentorId)) return false;
        const otherTrackId = Number(row.track_id);
        if (!Number.isFinite(otherTrackId) || otherTrackId === Number(trackId)) return false;
        if (!roundId) return true;
        return Number(trackRoundId(otherTrackId)) === Number(roundId);
      }) || null
    );
  };

  const findJudgeOnOtherPrelimTrackInSameRound = (judgeId, trackId) => {
    const roundId = trackRoundId(trackId);
    return (
      judgeAssignments.find((row) => {
        if (Number(row.person_id) !== Number(judgeId)) return false;
        const otherTrackId = Number(row.track_id);
        if (!Number.isFinite(otherTrackId) || otherTrackId === Number(trackId)) return false;
        const otherRound =
          row.round_id != null ? Number(row.round_id) : Number(trackRoundId(otherTrackId));
        if (!roundId || !Number.isFinite(otherRound)) return true;
        return otherRound === Number(roundId);
      }) || null
    );
  };

  const isJudgeOnOtherPrelimTrackInSameRound = (judgeId, trackId) =>
    Boolean(findJudgeOnOtherPrelimTrackInSameRound(judgeId, trackId));

  const isAlreadyJudgeOnFinalRound = (judgeId, roundId) =>
    finalJudgeAssignments.some(
      (row) => Number(row.round_id) === Number(roundId) && Number(row.person_id) === Number(judgeId),
    );

  /** Lý do không cho chọn khi gán mentor vào bảng */
  const getMentorAssignBlockReason = (personId, trackId) => {
    if (!trackId || !personId) return null;
    if (isAlreadyMentorOnTrack(personId, trackId)) return 'đã là mentor cùng bảng';
    const otherMentor = findMentorOnOtherTrackInSameRound(personId, trackId);
    if (otherMentor) {
      const name = otherMentor.track_name || trackNameById(otherMentor.track_id);
      return `đã là mentor bảng «${name}»`;
    }
    if (isMentorBlockedForTrack(personId, trackId)) return 'đang là giám khảo cùng bảng';
    return null;
  };

  /** Lý do không cho chọn khi gán giám khảo Sơ loại */
  const getPrelimJudgeAssignBlockReason = (personId, trackId) => {
    if (!trackId || !personId) return null;
    if (isAlreadyJudgeOnTrack(personId, trackId)) return 'đã là giám khảo cùng bảng';
    const otherJudge = findJudgeOnOtherPrelimTrackInSameRound(personId, trackId);
    if (otherJudge) {
      const name = otherJudge.track_name || otherJudge.target_name || trackNameById(otherJudge.track_id);
      return `đã là giám khảo bảng «${name}»`;
    }
    if (isJudgeBlockedForTrack(personId, trackId)) return 'đang là mentor cùng bảng';
    return null;
  };

  /** Lý do không cho chọn khi gán giám khảo CK */
  const getFinalJudgeAssignBlockReason = (personId, { trackId, roundId } = {}) => {
    if (!personId) return null;
    if (roundId && isAlreadyJudgeOnFinalRound(personId, roundId)) {
      return 'đã gán giám khảo vòng này';
    }
    if (trackId && isJudgeBlockedForTrack(personId, trackId)) {
      return 'đang là mentor cùng bảng';
    }
    return null;
  };

  return {
    mentors,
    judges,
    tempJudges,
    tracks,
    rounds,
    trackMentors,
    judgeAssignments,
    finalJudgeAssignments,
    isLoading,
    assigningMentor,
    assigningJudge,
    removingAssignmentId,
    createTempJudge,
    assignMentor,
    removeMentor,
    assignJudge,
    removeJudge,
    resendInvitation,
    revokeInvitation,
    mentorPool,
    prelimJudgePool,
    finalJudgePool,
    getFinalJudgePoolForType,
    isMentorBlockedForTrack,
    isJudgeBlockedForTrack,
    getMentorAssignBlockReason,
    getPrelimJudgeAssignBlockReason,
    getFinalJudgeAssignBlockReason,
  };
};
