// src/student/features/submission/hooks/useFinalSubmission.js
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { resolveProgressionError } from '../../../../features/rounds/constants/progressionErrors';
import dayjs from 'dayjs';
import axiosClient from '../../../../shared/api/axiosClient';
import { studentSubmissionService } from '../services/studentSubmission.service';
import { studentRoundService } from '../../round/services/studentRound.service';

const parseList = (res) => (Array.isArray(res) ? res : res?.items || res?.data || []);

const isAdvancedParticipation = (status) => {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ADVANCED';
};

const isEliminatedParticipation = (status) => {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ELIMINATED';
};

const checkTeamAdvancedToFinal = async (hackathonId, teamId, teamData) => {
  try {
    const teamsRes = await axiosClient.get('/api/v1/me/teams');
    const teams = parseList(teamsRes);
    const myTeam = teams.find((item) => Number(item.teamId ?? item.id) === Number(teamId));
    if (myTeam) {
      const status = myTeam.lotteryStatus ?? myTeam.lottery_status ?? myTeam.participationStatus;
      if (isEliminatedParticipation(status)) {
        return false;
      }
      if (isAdvancedParticipation(status)) {
        return true;
      }
    }
  } catch {
    // fallback below
  }

  try {
    const rankingsRes = await axiosClient.get(`/api/v1/me/hackathons/${hackathonId}/rankings`);
    const rankings = parseList(rankingsRes);
    const myEntry = rankings.find(
      (item) => Number(item.teamId ?? item.team_id) === Number(teamId)
    );
    if (myEntry) {
      const advancedFlag =
        myEntry.isAdvanced ??
        myEntry.is_advanced ??
        (myEntry.qualificationStatus === 'ADVANCED' ||
          myEntry.participationStatus === 'ADVANCED' ||
          myEntry.participation_status === 'ADVANCED');
      return Boolean(advancedFlag);
    }
  } catch {
    // rankings only available when hackathon FINISHED/PENDING_CONFIRM
  }

  const teamStatus = String(teamData?.status || '').toUpperCase();
  if (teamStatus === 'ELIMINATED') {
    return false;
  }

  return false;
};

export const useFinalSubmission = (teamId, hackathonId) => {
  const [finalRound, setFinalRound] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  const [isFinalRoundActive, setIsFinalRoundActive] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubmissionData = useCallback(async () => {
    if (!teamId || !hackathonId) return;
    setIsLoading(true);
    try {
      let finalRnd = null;

      try {
        const studentFinal = await studentRoundService.getFinalRound(hackathonId);
        const data = studentFinal?.data || studentFinal;
        if (data?.roundId || data?.id) {
          finalRnd = {
            id: data.roundId ?? data.id,
            name: data.name ?? data.roundName,
            is_active: data.isActive ?? data.is_active,
            isActive: data.isActive ?? data.is_active,
            scoring_locked: data.scoringLocked ?? data.scoring_locked,
            scoringLocked: data.scoringLocked ?? data.scoring_locked,
            submission_deadline: data.submissionDeadline ?? data.submission_deadline,
            submissionDeadline: data.submissionDeadline ?? data.submission_deadline,
          };
        }
      } catch {
        // not advanced or no final round yet
      }

      setFinalRound(finalRnd || null);
      setExistingSubmission(null);

      if (!finalRnd) {
        setIsEligible(false);
        setIsFinalRoundActive(false);
        setIsAdvanced(false);
        return;
      }

      const finalActive = Boolean(finalRnd.is_active || finalRnd.isActive);
      setIsFinalRoundActive(finalActive);

      const teamDetail = await axiosClient.get(`/api/v1/teams/${teamId}`);
      const teamData = teamDetail?.data || teamDetail;

      const advanced = await checkTeamAdvancedToFinal(hackathonId, teamId, teamData);
      setIsAdvanced(advanced);
      setIsEligible(finalActive && advanced);

      const teamSubmissions = await axiosClient
        .get(`/api/v1/me/teams/${teamId}/submissions`)
        .catch(() => []);
      const subs = parseList(teamSubmissions);
      const finalSub = subs.find(
        (s) => Number(s.roundId ?? s.round_id) === Number(finalRnd.id)
      );
      if (finalSub) {
        setExistingSubmission(finalSub);
      }
    } catch (error) {
      console.error('Lỗi fetch submission data:', error);
      setIsEligible(false);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, hackathonId]);

  useEffect(() => {
    fetchSubmissionData();
  }, [fetchSubmissionData]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchSubmissionData();
      }
    };
    const refreshOnFocus = () => {
      void fetchSubmissionData();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [fetchSubmissionData]);

  const calculateDeadline = useCallback(() => {
    if (!finalRound?.submissionDeadline && !finalRound?.submission_deadline) return;

    const deadline = dayjs(finalRound.submissionDeadline || finalRound.submission_deadline);
    const now = dayjs();

    if (now.isAfter(deadline)) {
      setIsLocked(true);
      setTimeLeft('ĐÃ HẾT HẠN');
      return;
    }

    const diff = deadline.diff(now, 'second');
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    setIsLocked(false);
    setTimeLeft(`${h} giờ ${m} phút ${s} giây`);
  }, [finalRound]);

  useEffect(() => {
    calculateDeadline();
    const timer = setInterval(calculateDeadline, 1000);
    return () => clearInterval(timer);
  }, [calculateDeadline]);

  const submitFinalWork = async (payload) => {
    if (!isFinalRoundActive) {
      message.error('Vòng Chung kết chưa mở hoặc đã kết thúc!');
      return false;
    }

    if (!isAdvanced) {
      message.error('Đội của bạn chưa đủ điều kiện tham gia Vòng Chung kết.');
      return false;
    }

    const isRejectedSubmission =
      String(existingSubmission?.status || '').toUpperCase() === 'REJECTED';
    if (isRejectedSubmission) {
      message.error('Không thể nộp lại bài đã bị từ chối.');
      return false;
    }

    if (!payload.slideFile) {
      const hasExistingSlide = Boolean(
        existingSubmission?.hasSlide ??
          existingSubmission?.has_slide ??
          existingSubmission?.slideFile ??
          existingSubmission?.slide_file ??
          existingSubmission?.slideDownloadPath ??
          existingSubmission?.slide_download_path
      );
      if (!hasExistingSlide) {
        message.error('Vui lòng tải lên file slide PDF.');
        return false;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await studentSubmissionService.submitMultipart({
        teamId,
        roundId: finalRound.id,
        repoUrl: payload.repoUrl,
        demoUrl: payload.demoUrl,
        reportUrl: payload.reportUrl,
        slideFile: payload.slideFile,
        lateReason: payload.lateReason,
      });
      const data = res?.data || res;
      const submissionStatus = String(data?.status || '').toUpperCase();
      if (submissionStatus === 'REJECTED') {
        message.error('Bài nộp đã bị từ chối (REJECTED) — đã quá hạn nộp Chung kết.');
        await fetchSubmissionData();
        return false;
      }
      if (submissionStatus === 'LATE_PENDING') {
        message.warning('Đã ghi nhận bài nộp muộn (LATE_PENDING) — chờ Ban tổ chức duyệt.');
        await fetchSubmissionData();
        return true;
      }
      const slideSaved = Boolean(
        data?.slideFile ??
          data?.slide_file ??
          data?.slideDownloadPath ??
          data?.slide_download_path ??
          res?.slideFile ??
          res?.slide_file ??
          res?.slideDownloadPath ??
          res?.slide_download_path
      );
      if (!slideSaved) {
        message.error('Nộp file slide thất bại — vui lòng chọn file PDF và thử lại.');
        await fetchSubmissionData();
        return false;
      }
      message.success('Nộp bài Chung kết thành công!');
      message.info('Hệ thống đang kiểm tra repo công khai — có thể mất vài phút.');
      await fetchSubmissionData();
      return true;
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, 'Lỗi khi nộp bài. Vui lòng thử lại!');
      message.error(msg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    finalRound,
    existingSubmission,
    isEligible,
    isFinalRoundActive,
    isAdvanced,
    isLocked,
    timeLeft,
    isSubmitting,
    isLoading,
    submitFinalWork,
  };
};
