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
  resolveFinalAssignmentType,
  resolvePrelimAssignmentType,
  isEligibleForFinalJudge,
  isEligibleForPrelimJudge,
} from '../utils/peoplePersonnelRules';

export const usePeopleManagement = (hackathonId) => {
  const [mentors, setMentors] = useState([]);
  const [judges, setJudges] = useState([]);
  const [tempJudges, setTempJudges] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [trackMentors, setTrackMentors] = useState([]);
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [finalJudgeAssignments, setFinalJudgeAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const isFinalRound = (round) =>
    Boolean(round?.isFinal ?? round?.is_final) ||
    String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL' ||
    /chung\s*kết|final/i.test(String(round?.name || ''));

  const fetchBaseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rRes, tRes] = await Promise.all([
        roundService.listByHackathon(hackathonId),
        trackService.listByHackathon(hackathonId),
      ]);
      const roundList = Array.isArray(rRes) ? rRes : rRes?.items || [];
      const trackList = Array.isArray(tRes) ? tRes : tRes?.items || [];

      setRounds(roundList);
      setTracks(trackList);

      const [mRes, jRes, tempRes] = await Promise.all([
        peopleService.getUsersByRole('MENTOR').catch(() => []),
        peopleService.getUsersByRole('JUDGE').catch(() => []),
        peopleService.getTempJudges().catch(() => []),
      ]);
      setMentors(Array.isArray(mRes) ? mRes : mRes?.items || []);
      setJudges(Array.isArray(jRes) ? jRes : jRes?.items || []);
      setTempJudges(Array.isArray(tempRes) ? tempRes : tempRes?.items || []);

      const mentorPromises = trackList.map((track) =>
        peopleService
          .getTrackMentors(track.id)
          .then((res) => ({
            track,
            data: Array.isArray(res) ? res : res?.items || res?.content || [],
          }))
          .catch(() => ({ track, data: [] }))
      );
      const mentorResults = await Promise.all(mentorPromises);
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

      const finalRoundIds = new Set(
        roundList
          .filter((r) => isFinalRound(r))
          .map((r) => r.id)
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
            .catch(() => ({ track, judges: [] }))
        );

      const trackJResults = await Promise.all(trackJudgePromises);
      const allJudges = [];
      trackJResults.forEach(({ track, judges: trackJudges }) => {
        trackJudges.forEach((j) => {
          allJudges.push({
            id: j.id || j.assignmentId,
            track_id: track.id,
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

      const finalRoundJudgePromises = roundList
        .filter((round) => isFinalRound(round))
        .map((round) =>
          peopleService
            .getRoundJudges(round.id)
            .then((res) => ({
              round,
              judges: Array.isArray(res) ? res : res?.items || res?.content || [],
            }))
            .catch(() => ({ round, judges: [] }))
        );

      const finalJudgeResults = await Promise.all(finalRoundJudgePromises);
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
      setIsLoading(false);
    }
  }, [hackathonId]);

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
    () => buildFinalJudgePool(judges, tempJudges),
    [judges, tempJudges]
  );

  const mentorIdsByTrack = useMemo(() => {
    const map = new Map();
    trackMentors.forEach((row) => {
      if (!map.has(row.track_id)) map.set(row.track_id, new Set());
      map.get(row.track_id).add(row.mentor_id);
    });
    return map;
  }, [trackMentors]);

  const judgeIdsByTrack = useMemo(() => {
    const map = new Map();
    judgeAssignments.forEach((row) => {
      if (!row.track_id) return;
      if (!map.has(row.track_id)) map.set(row.track_id, new Set());
      map.get(row.track_id).add(row.person_id);
    });
    return map;
  }, [judgeAssignments]);

  const createTempJudge = async (values, onSuccess) => {
    setIsLoading(true);
    try {
      await peopleService.createTempJudge({ ...values, hackathonId });
      message.success('Đã gửi lời mời giám khảo khách mời.');
      await fetchBaseData();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const assignMentor = async (values, onSuccess) => {
    setIsLoading(true);
    try {
      await peopleService.assignMentorToTrack({
        mentorId: values.mentor_id,
        trackId: values.track_id,
      });
      message.success('Đã gán mentor cho bảng đấu.');
      await fetchBaseData();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const removeMentor = async (assignmentId) => {
    setIsLoading(true);
    try {
      await peopleService.removeMentorAssignment(assignmentId);
      message.success('Đã gỡ mentor khỏi bảng đấu.');
      await fetchBaseData();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const assignJudge = async (values, onSuccess) => {
    setIsLoading(true);
    try {
      const trackId = values.track_id ? parseInt(values.track_id, 10) : null;
      const selectedTrack = trackId ? tracks.find((item) => item.id === trackId) : null;
      const finalRoundIdFromTrack = selectedTrack?.roundId || selectedTrack?.round_id;
      const finalRoundIdFromForm = values.round_id ? parseInt(values.round_id, 10) : null;
      const finalRoundId = finalRoundIdFromTrack || finalRoundIdFromForm;
      const isFinalTrack = Boolean(selectedTrack?.isFinal ?? selectedTrack?.is_final);
      const isFinalFlow = Boolean(values.is_final_assignment) || isFinalTrack || Boolean(finalRoundIdFromForm);

      const person = findPersonById(values.person_id, [prelimJudgePool, finalJudgePool, mentors, judges, tempJudges]);
      if (!person) {
        message.error('Không tìm thấy thông tin giám khảo đã chọn.');
        return;
      }

      const assignmentType = isFinalFlow
        ? resolveFinalAssignmentType(person)
        : resolvePrelimAssignmentType(person);

      if (isFinalFlow && finalRoundId) {
        if (!isEligibleForFinalJudge(person)) {
          message.error('Chung kết chỉ gán giám khảo EXTERNAL hoặc trưởng ban (HEAD).');
          return;
        }
        await peopleService.assignFinalRoundJudge({
          roundId: finalRoundId,
          judgeId: values.person_id,
          assignmentType,
        });
        message.success(`Đã gán giám khảo Chung kết (${assignmentType}).`);
      } else {
        if (!isEligibleForPrelimJudge(person)) {
          message.error('Sơ loại chỉ gán giám khảo/mentor INTERNAL hoặc trưởng ban (HEAD).');
          return;
        }
        await peopleService.assignJudge({
          judgeId: values.person_id,
          trackId: trackId || undefined,
          assignmentType,
        });
        message.success(`Đã gán giám khảo Sơ loại (${assignmentType}).`);
      }
      await fetchBaseData();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const removeJudge = async (assignmentId) => {
    setIsLoading(true);
    try {
      await peopleService.removeJudgeAssignment(assignmentId);
      message.success('Đã gỡ giám khảo.');
      await fetchBaseData();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const patchUserDeptHead = async (userId, isDeptHead) => {
    setIsLoading(true);
    try {
      await peopleService.patchUserDeptHead(userId, isDeptHead);
      message.success(isDeptHead ? 'Đã đặt Trưởng ban' : 'Đã gỡ Trưởng ban');
      await fetchBaseData();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const isMentorBlockedForTrack = (mentorId, trackId) =>
    judgeIdsByTrack.get(trackId)?.has(mentorId);

  const isJudgeBlockedForTrack = (judgeId, trackId) =>
    mentorIdsByTrack.get(trackId)?.has(judgeId);

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
    createTempJudge,
    assignMentor,
    removeMentor,
    assignJudge,
    removeJudge,
    patchUserDeptHead,
    mentorPool,
    prelimJudgePool,
    finalJudgePool,
    isMentorBlockedForTrack,
    isJudgeBlockedForTrack,
  };
};
