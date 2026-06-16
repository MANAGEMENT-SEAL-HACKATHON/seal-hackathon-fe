import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { judgeService } from '../services/judgeService';
import { criteriaService } from '../../criteria/services/criteriaService';

/**
 * Custom hook quản lý logic phòng chấm thi (Live Scoring)
 * Xử lý tải danh sách đội, tiêu chí, tính điểm và submit điểm về hệ thống.
 */
export const useLiveScoring = (assignmentId, roundId, trackId, isFinal) => {
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentScores, setCurrentScores] = useState({});
  const [comment, setComment] = useState('');

  // GĐ5: Trạng thái score_type=NORMAL theo yêu cầu để phân biệt với CALIBRATION
  const scoreType = 'NORMAL';

  const fetchScoringData = useCallback(async () => {
    const cleanParams = {};
    
    // Đóng gói tham số an toàn
    if (roundId) {
      cleanParams.roundId = roundId;
    }
    
    if (trackId) {
      cleanParams.trackId = trackId;
    }

    if (Object.keys(cleanParams).length === 0) {
      message.error("Lỗi dữ liệu: Không tìm thấy ID Vòng thi/Bảng đấu.");
      return;
    }

    setIsLoading(true);

    try {
      // ==========================================
      // 1. TẢI DANH SÁCH BÀI NỘP (ĐỘI THI)
      // ==========================================
      const resTeams = await judgeService
        .getSubmissions(cleanParams)
        .catch(() => {
          return [];
        });
        
      const rawTeamsData = Array.isArray(resTeams) 
        ? resTeams 
        : resTeams?.items || resTeams?.data || [];

      // Map dữ liệu đội thi an toàn
      const mappedTeams = rawTeamsData.map((sub) => {
        return {
          id: sub.id || sub.submissionId || sub.teamId,
          name: sub.teamName || sub.team_name || 'Đội thi',
          leader: sub.leaderName || 'Trưởng nhóm',
          status: sub.status === 'SCORED' || sub.isScoredByMe ? 'SCORED' : 'PENDING',
          totalScore: sub.totalScore || sub.weightedAverageScore || 0,
        };
      });

      // Nếu API Teams thật sự rỗng (chưa có đội nộp bài), báo lỗi nhẹ
      if (mappedTeams.length === 0) {
        console.warn("Chưa có đội thi nào nộp bài hoặc được phân công.");
      }

      setTeams(mappedTeams);
      
      // Mặc định chọn đội đầu tiên nếu có dữ liệu
      if (mappedTeams.length > 0) {
        setSelectedTeam(mappedTeams[0]);
      }

      // ==========================================
      // 2. TẢI ĐIỂM ĐÃ CHẤM (Phục hồi điểm cũ nếu có)
      // ==========================================
      if (roundId) {
        judgeService
          .getMyScores(roundId)
          .then((resScores) => {
            console.log("Dữ liệu điểm đã chấm:", resScores);
          })
          .catch(() => {
            // Bỏ qua im lặng nếu lỗi khi lấy điểm cũ để không làm gián đoạn
          });
      }

      // ==========================================
      // 3. TẢI DANH SÁCH TIÊU CHÍ (API THẬT)
      // ==========================================
      let rawCriteria = [];
      
      if (isFinal && roundId) {
        rawCriteria = await criteriaService.listByFinalRound(roundId);
      } else if (trackId) {
        rawCriteria = await criteriaService.listByTrack(trackId);
      }

      let fetchedCriteria = Array.isArray(rawCriteria) 
        ? rawCriteria 
        : rawCriteria?.items || rawCriteria?.data || [];

      // Gán 100% dữ liệu API thật vào state
      setCriteria(fetchedCriteria);

      if (fetchedCriteria.length === 0) {
        message.warning("Vòng thi/Bảng đấu này chưa được cấu hình tiêu chí chấm điểm!");
      }
    } catch (error) {
      console.error("Lỗi fetch dữ liệu chấm:", error);
      message.error("Lỗi kết nối máy chủ khi lấy dữ liệu.");
      setCriteria([]); // Xóa rỗng state để không bị lỗi UI
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, roundId, trackId, isFinal]);

  // Hook khởi chạy
  useEffect(() => {
    fetchScoringData();
  }, [fetchScoringData]);

  // Xử lý thay đổi điểm cục bộ
  const handleScoreChange = (criteriaId, value) => {
    setCurrentScores((prev) => {
      return {
        ...prev,
        [criteriaId]: value,
      };
    });
  };

  // Tính tổng điểm preview dựa trên trọng số
  const calculateTotalScore = () => {
    let total = 0;
    
    criteria.forEach((c) => {
      const rawScore = currentScores[c.id] || 0;
      total += rawScore * (c.weight || 0);
    });
    
    return total.toFixed(2);
  };

  // Xác định trạng thái có đang chấm hay không
  const isCurrentlyScoring = useMemo(() => {
    const hasScores = Object.keys(currentScores).length > 0;
    const isNotScored = selectedTeam?.status !== 'SCORED';
    
    return hasScores && isNotScored;
  }, [currentScores, selectedTeam]);

  // GỬI ĐIỂM VỀ BACKEND (Gửi Promise.all song song)
  const submitFinalScore = async () => {
    if (!selectedTeam) {
      return;
    }
    
    const missingCriteria = criteria.some((c) => {
      return currentScores[c.id] === undefined;
    });
    
    if (missingCriteria) {
      return message.warning('Vui lòng chấm tất cả các tiêu chí trước khi chốt.');
    }

    setIsSubmitting(true);
    
    try {
      // 1. Tạo mảng các API Request (Mỗi tiêu chí là một Request)
      const submitPromises = criteria.map((c) => {
        const payload = {
          submissionId: selectedTeam.id,
          criterionId: c.id,
          scoreValue: currentScores[c.id] || 0,
          comment: comment.trim(),
        };
        // Trả về promise gọi API (chưa chạy ngay)
        return judgeService.submitScore(payload);
      });

      // 2. Kích hoạt bắn TẤT CẢ API cùng một lúc
      await Promise.all(submitPromises);

      // 3. Cập nhật tiến độ ngầm
      judgeService
        .updateScoringCompletion(assignmentId, 'IN_PROGRESS')
        .catch(() => {
          // Bỏ qua lỗi ngầm
        });

      // 4. Báo thành công và cập nhật UI
      message.success(`Đã lưu toàn bộ điểm thành công!`);
      
      setTeams((prev) => {
        return prev.map((t) => {
          if (t.id === selectedTeam.id) {
            return {
              ...t,
              status: 'SCORED',
              totalScore: calculateTotalScore(),
            };
          }
          return t;
        });
      });
      
      // Reset state form
      setCurrentScores({});
      setComment('');
    } catch (error) {
      // Bắt lỗi khóa vòng thi (Locked) hoặc lỗi chung
      const status = error?.status || error?.response?.status;
      const code = error?.code;
      
      if (status === 423 || code === 423) {
        message.error("Vòng thi đã đóng sổ - không thể thao tác thêm!");
      } else {
        const errorMsg = error?.response?.data?.message || error?.message;
        message.error(errorMsg || 'Lỗi khi lưu điểm. Vui lòng thử lại!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    teams,
    criteria,
    selectedTeam,
    setSelectedTeam,
    isLoading,
    isSubmitting,
    currentScores,
    handleScoreChange,
    comment,
    setComment,
    calculateTotalScore,
    submitFinalScore,
    isCurrentlyScoring,
    scoreType,
  };
};