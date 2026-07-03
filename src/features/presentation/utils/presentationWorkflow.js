// src/features/presentation/utils/presentationWorkflow.js
// Timer advance: FE uses PATCH /api/v1/presentation/queue/next (canonical).
// POST /api/v1/presentation/timer/next is not wired — avoid duplicate control paths.
export const COORD_TIMER_WARN_KEY = 'seal_coord_timer_warn_ack';

export const getPresentationRoleHints = ({ role, isController, scoringLocked }) => {
  const normalizedRole = String(role || '').toUpperCase();
  const isCoordinator = ['COORDINATOR', 'ADMIN'].includes(normalizedRole);
  const isJudge = ['JUDGE', 'TEMP_JUDGE', 'MENTOR'].includes(normalizedRole);

  if (isCoordinator) {
    return {
      showShuffle: true,
      showTimerControls: true,
      warningMessage:
        'Luồng chuẩn: Judge (presentation controller) điều khiển timer/next từ Live Scoring. Coordinator chỉ nên dùng khi hỗ trợ vận hành.',
    };
  }

  if (isJudge) {
    return {
      showShuffle: false,
      showTimerControls: Boolean(isController),
      warningMessage: isController
        ? null
        : 'Bạn không phải presentation controller của track này — chỉ xem hàng đợi.',
    };
  }

  return {
    showShuffle: false,
    showTimerControls: false,
    warningMessage: scoringLocked ? 'Vòng đã khóa chấm điểm.' : null,
  };
};

export const shouldWarnShuffleWhenLocked = (scoringLocked) => Boolean(scoringLocked);

export const getShuffleLockedWarning = () =>
  'Round đã khóa chấm điểm — BE có thể từ chối xáo trộn. Bạn vẫn muốn thử?';

export const getTimerPhaseBanner = (phase) => {
  switch (phase) {
    case 'SETUP':
      return { type: 'info', text: 'Pha SETUP — sẵn sàng bắt đầu timer thuyết trình.' };
    case 'IDLE':
      return { type: 'warning', text: 'Timer IDLE — bấm Bắt đầu timer khi đội đầu đã PRESENTING.' };
    case 'PRESENTING':
      return { type: 'success', text: 'Đang thuyết trình.' };
    case 'QA':
      return { type: 'success', text: 'Pha Hỏi & Đáp.' };
    case 'PAUSED':
      return { type: 'warning', text: 'Timer đang tạm dừng.' };
    default:
      return null;
  }
};
