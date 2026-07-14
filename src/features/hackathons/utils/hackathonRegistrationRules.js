import dayjs from 'dayjs';

export const isRegistrationClosedEarly = (hackathon) =>
  Boolean(hackathon?.registration_closed_early_at ?? hackathon?.registrationClosedEarlyAt);

/** Giai đoạn đăng ký đã đóng (sớm hoặc quá hạn). */
export const isRegistrationPeriodEnded = (hackathon) => {
  if (!hackathon) return false;
  if (isRegistrationClosedEarly(hackathon)) return true;
  const regEnd = hackathon.registration_end ?? hackathon.registrationEnd;
  if (!regEnd) return false;
  return dayjs().startOf('day').isAfter(dayjs(regEnd).startOf('day'));
};

/**
 * Coordinator được bốc thăm khi đăng ký đã kết thúc.
 * Kết thúc sớm → ngay; hết hạn tự nhiên → từ ngày sau registrationEnd.
 */
export const canRunLottery = (hackathon) => {
  if (!hackathon) return false;
  if (isRegistrationClosedEarly(hackathon)) return true;
  const regEnd = hackathon.registration_end ?? hackathon.registrationEnd;
  if (!regEnd) return false;
  return dayjs().startOf('day').isAfter(dayjs(regEnd).startOf('day'));
};

export const getLotteryGateReason = (hackathon, activeTeams = [], selectedRound = null) => {
  if (selectedRound && (selectedRound.is_active || selectedRound.isActive)) {
    return 'Vòng thi đã được kích hoạt, không thể bốc thăm lại.';
  }

  if (hackathon?.status && hackathon.status !== 'ONGOING') {
    return 'Bốc thăm chỉ thực hiện khi hackathon đã mở đăng ký và đang diễn ra (sau bước Mở đăng ký ở tab Đánh giá).';
  }

  const regEnd = hackathon?.registration_end ?? hackathon?.registrationEnd;
  if (!regEnd && !isRegistrationClosedEarly(hackathon)) {
    return 'Chưa có ngày kết thúc đăng ký.';
  }

  if (!canRunLottery(hackathon)) {
    return 'Khóa đội và bốc thăm chỉ từ ngày hôm sau khi kết thúc đăng ký (hoặc dùng «Kết thúc đăng ký sớm»).';
  }

  if (activeTeams.length === 0) {
    return 'Chưa có đội đã duyệt để bốc thăm.';
  }

  const isTeamLocked = (team) => !!(team?.isLocked ?? team?.is_locked);
  const unlockedTeams = activeTeams.filter((t) => !isTeamLocked(t));
  if (unlockedTeams.length > 0) {
    return `Còn ${unlockedTeams.length} đội chưa bị khóa. Hãy đợi hệ thống khóa sau khi hết hạn đăng ký, hoặc dùng «Kết thúc đăng ký sớm».`;
  }

  return '';
};
