// src/student/features/submission/hooks/useFinalSubmission.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { resolvePreliminarySubmissionError } from '../../../../features/submissions/constants/preliminarySubmissionErrors';
import dayjs from 'dayjs';
import axiosClient from '../../../../shared/api/axiosClient';
import { personBApi } from '../../../../api/personB.api';
import { studentRoundService } from '../../round/services/studentRound.service';

const parseList = (res) => (Array.isArray(res) ? res : res?.items || res?.data || []);

const isEliminatedParticipation = (status) => {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ELIMINATED';
};

const hasSavedSlide = (submission) =>
  Boolean(
    submission?.hasSlide ??
      submission?.has_slide ??
      submission?.slideFile ??
      submission?.slide_file ??
      submission?.slideDownloadPath ??
      submission?.slide_download_path
  );

const isOnTimeSubmission = (submission) => {
  const status = String(submission?.status || '').toUpperCase();
  return ['ON_TIME', 'SUBMITTED', 'LATE_APPROVED', 'ACCEPTED'].includes(status);
};

const mapSubmission = (submission) => ({
  ...submission,
  repoUrl: submission.repo_url,
  demoUrl: submission.demo_url,
  slideFile: submission.slide_file,
  slideDownloadPath: submission.slide_download_path,
  submissionId: submission.submission_id,
  hasSlide: submission.has_slide,
});

export const useFinalSubmission = (teamId, hackathonId) => {
  const [finalRound, setFinalRound] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  const [isFinalRoundActive, setIsFinalRoundActive] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(teamId && hackathonId));
  const isSubmittingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchSubmissionData = useCallback(
    async ({ silent = false } = {}) => {
      if (!teamId || !hackathonId) {
        setFinalRound(null);
        setExistingSubmission(null);
        setIsEligible(false);
        setIsFinalRoundActive(false);
        setIsAdvanced(false);
        setIsLoading(false);
        hasLoadedRef.current = false;
        return;
      }

      // Soft refresh: keep form mounted so selected PDF / form values survive focus refetch
      if (!silent || !hasLoadedRef.current) {
        setIsLoading(true);
      }

      try {
        let finalRnd = null;
        let eliminated = false;

        try {
          const teamsRes = await axiosClient.get('/api/v1/me/teams');
          const teams = parseList(teamsRes);
          const myTeam = teams.find((item) => Number(item.teamId ?? item.id) === Number(teamId));
          if (myTeam) {
            const status =
              myTeam.participationStatus ??
              myTeam.participation_status ??
              myTeam.lotteryStatus ??
              myTeam.lottery_status;
            if (isEliminatedParticipation(status)) {
              eliminated = true;
            }
          }
        } catch {
          // optional gate for eliminated UX
        }

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
          // not in final round yet (TRP gate) or wrong hackathonId
        }

        setFinalRound(finalRnd || null);

        if (!finalRnd || eliminated) {
          setExistingSubmission(null);
          setIsEligible(false);
          setIsFinalRoundActive(false);
          setIsAdvanced(!eliminated && Boolean(finalRnd));
          hasLoadedRef.current = true;
          return;
        }

        const finalActive = Boolean(finalRnd.is_active || finalRnd.isActive);
        setIsFinalRoundActive(finalActive);
        setIsAdvanced(true);
        setIsEligible(finalActive);

        const submission = await personBApi.getFinalStudentSubmission(teamId, finalRnd.id);
        if (submission && submission.status !== 'NONE') {
          setExistingSubmission(mapSubmission(submission));
        } else {
          setExistingSubmission(null);
        }
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Lỗi fetch submission data:', error);
        setIsEligible(false);
      } finally {
        setIsLoading(false);
      }
    },
    [teamId, hackathonId]
  );

  useEffect(() => {
    void fetchSubmissionData({ silent: false });
  }, [fetchSubmissionData]);

  useEffect(() => {
    const softRefresh = () => {
      if (isSubmittingRef.current) return;
      void fetchSubmissionData({ silent: true });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        softRefresh();
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', softRefresh);
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', softRefresh);
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

  const submissionIncomplete = existingSubmission?.status === 'INCOMPLETE';
  const isRejected = String(existingSubmission?.status || '').toUpperCase() === 'REJECTED';
  const isSubmitted = Boolean(
    existingSubmission && !submissionIncomplete && !isRejected && hasSavedSlide(existingSubmission)
  );
  const canUpdateDespiteLock = isSubmitted && isOnTimeSubmission(existingSubmission);
  const isHardLocked = isLocked && !canUpdateDespiteLock;

  const submitFinalWork = async (payload) => {
    if (isSubmittingRef.current || isSubmitting) {
      return false;
    }

    if (!isFinalRoundActive) {
      message.error('Vòng Chung kết chưa mở hoặc đã kết thúc!');
      return false;
    }

    if (!isAdvanced) {
      message.error('Đội của bạn chưa đủ điều kiện tham gia Vòng Chung kết.');
      return false;
    }

    if (isHardLocked) {
      message.error('Đã quá thời gian nộp bài. Cổng nộp bài Vòng Chung kết đã đóng hoàn toàn.');
      return false;
    }

    if (isRejected) {
      message.error('Không thể nộp lại bài đã bị từ chối.');
      return false;
    }

    if (!payload.repoUrl?.trim()) {
      message.error('Vui lòng nhập link GitHub repository (bắt buộc).');
      return false;
    }

    if (!payload.slideFile && !hasSavedSlide(existingSubmission)) {
      message.error('Vui lòng tải lên file slide PDF.');
      return false;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const data = await personBApi.submitFinalStudentSubmission(teamId, finalRound.id, {
        repo_url: payload.repoUrl.trim(),
        demo_url: payload.demoUrl?.trim() || undefined,
        slide_file: payload.slideFile,
      });

      const submissionStatus = String(data?.status || '').toUpperCase();
      if (submissionStatus === 'REJECTED') {
        message.error('Bài nộp đã bị từ chối — đã quá hạn nộp Chung kết.');
        await fetchSubmissionData({ silent: true });
        return false;
      }

      const slideSaved = Boolean(
        data?.slide_file ?? data?.slide_download_path ?? data?.has_slide ?? hasSavedSlide(data)
      );
      if (!slideSaved) {
        message.error('Nộp file slide thất bại — vui lòng chọn file PDF và thử lại.');
        await fetchSubmissionData({ silent: true });
        return false;
      }

      message.success('Nộp bài Chung kết thành công!');
      message.info('Hệ thống đang kiểm tra repo công khai — có thể mất vài phút.');
      await fetchSubmissionData({ silent: true });
      return true;
    } catch (error) {
      const { message: msg } = resolvePreliminarySubmissionError(
        error,
        'Lỗi khi nộp bài. Vui lòng thử lại!'
      );
      message.error(msg);
      return false;
    } finally {
      isSubmittingRef.current = false;
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
    isHardLocked,
    isSubmitted,
    timeLeft,
    isSubmitting,
    isLoading: Boolean(teamId && hackathonId) && isLoading,
    submitFinalWork,
    refetch: () => fetchSubmissionData({ silent: false }),
  };
};
