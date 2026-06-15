import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import axiosClient from '../../../../shared/api/axiosClient';

export const useFinalSubmission = (teamId, hackathonId) => {
  const [finalRound, setFinalRound] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. LẤY THÔNG TIN VÒNG CHUNG KẾT & TRẠNG THÁI NỘP BÀI TỪ BACKEND
  const fetchSubmissionData = useCallback(async () => {
    if (!teamId || !hackathonId) return;
    setIsLoading(true);
    try {
      // 1.1 Lấy danh sách vòng thi, tìm vòng Chung kết (is_final = true)
      const roundsRes = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/rounds`);
      const rounds = Array.isArray(roundsRes) ? roundsRes : roundsRes?.items || roundsRes?.data || [];
      const finalRnd = rounds.find(r => r.is_final || r.isFinal || r.roundType === 'FINAL');
      
      setFinalRound(finalRnd);

      if (!finalRnd) {
         setIsEligible(false);
         return;
      }

      // 1.2 Lấy chi tiết Team để xem trạng thái (ACTIVE = Được đi tiếp, ELIMINATED = Bị loại)
      const teamDetail = await axiosClient.get(`/api/v1/teams/${teamId}`);
      const teamData = teamDetail?.data || teamDetail;
      
      if (teamData?.status === 'ACTIVE') {
         setIsEligible(true);
      } else {
         setIsEligible(false); // Nếu là ELIMINATED, không đủ điều kiện nộp bài
      }

      // 1.3 Lấy lịch sử nộp bài (FR-U-20)
      const teamSubmissions = await axiosClient.get(`/api/v1/me/teams/${teamId}/submissions`).catch(() => []);
      const subs = Array.isArray(teamSubmissions) ? teamSubmissions : teamSubmissions?.items || teamSubmissions?.data || [];
      
      // Tìm bài nộp thuộc về vòng Chung kết
      const finalSub = subs.find(s => s.roundId === finalRnd.id || s.round_id === finalRnd.id);
      if (finalSub) {
         setExistingSubmission(finalSub);
      }

    } catch (error) {
      console.error("Lỗi fetch submission data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, hackathonId]);

  useEffect(() => {
    fetchSubmissionData();
  }, [fetchSubmissionData]);

  // 2. TÍNH TOÁN ĐẾM NGƯỢC THỜI GIAN THEO DEADLINE CHUNG KẾT
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

  // 3. API NỘP BÀI CHUNG KẾT
  const submitFinalWork = async (payload) => {
    if (isLocked) {
      message.error('Đã hết hạn nộp bài! Hệ thống tự động từ chối (REJECTED).');
      return false;
    }
    
    setIsSubmitting(true);
    try {
      // Gọi API POST /api/v1/submissions theo chuẩn Backend
      await axiosClient.post('/api/v1/submissions', {
         teamId: teamId,
         roundId: finalRound.id, // Vòng Chung kết dùng roundId trực tiếp (không dùng trackId)
         repoUrl: payload.repoUrl,
         demoUrl: payload.demoUrl,
         slideUrl: payload.slideUrl, // URL Slide (Bắt buộc theo DB Schema)
         reportUrl: payload.reportUrl
      });
      message.success('Nộp bài Chung kết thành công!');
      await fetchSubmissionData(); // Load lại trạng thái để khóa Form
      return true;
    } catch (error) {
      const code = error?.code || error?.response?.data?.error?.code;
      if (code === 'ROUND_NOT_ACTIVE') {
         message.error("Vòng Chung kết chưa mở hoặc đã kết thúc!");
      } else {
         message.error(error?.response?.data?.message || error?.message || 'Lỗi khi nộp bài. Vui lòng thử lại!');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    finalRound,
    existingSubmission,
    isEligible,
    isLocked,
    timeLeft,
    isSubmitting,
    isLoading,
    submitFinalWork
  };
};