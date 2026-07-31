import dayjs from 'dayjs';
import { classifyPendingTeams, formatPendingTeamsGateReason } from './pendingTeamBuckets.js';

export { classifyPendingTeams, formatPendingTeamsGateReason };

export const isRegistrationClosedEarly = (hackathon) =>
  Boolean(hackathon?.registration_closed_early_at ?? hackathon?.registrationClosedEarlyAt);

/** Chưa tới ngày mở đăng ký (registrationStart). */
export const isRegistrationNotYetOpen = (hackathon) => {
  if (!hackathon) return true;
  if (hackathon.registrationNotYetOpen === true) return true;
  if (hackathon.registrationNotYetOpen === false) return false;
  const regStart = hackathon.registration_start ?? hackathon.registrationStart;
  if (!regStart) return false;
  return dayjs().startOf('day').isBefore(dayjs(regStart).startOf('day'));
};

/** Giai đoạn đăng ký đã đóng (sớm hoặc quá hạn). */
export const isRegistrationPeriodEnded = (hackathon) => {
  if (!hackathon) return false;
  if (isRegistrationClosedEarly(hackathon)) return true;
  const regEnd = hackathon.registration_end ?? hackathon.registrationEnd;
  if (!regEnd) return false;
  return dayjs().startOf('day').isAfter(dayjs(regEnd).startOf('day'));
};

/** Cửa sổ đăng ký đang mở (đã tới start, chưa đóng). */
export const isRegistrationWindowOpen = (hackathon) => {
  if (!hackathon) return false;
  if (hackathon.registrationWindowOpen === true) return true;
  if (hackathon.registrationWindowOpen === false) return false;
  const status = String(hackathon.status || 'ONGOING').toUpperCase();
  if (status && status !== 'ONGOING' && status !== 'OPEN') return false;
  if (isRegistrationNotYetOpen(hackathon)) return false;
  return !isRegistrationPeriodEnded(hackathon);
};

/**
 * Student đủ điều kiện bấm đăng ký sự kiện này.
 * @param {object} hackathon — browse item
 * @param {{ registrationBlocked?: Record<string|number, boolean> }} [ctx]
 */
export const canStudentRegister = (hackathon, ctx = {}) => {
  if (!hackathon) return false;
  if (!isRegistrationWindowOpen(hackathon)) return false;
  if (hackathon.registered) return false;
  if (hackathon.registrationWithdrawn) return false;
  if (hackathon.registeredElsewhere) return false;
  if (ctx.registrationBlocked?.[hackathon.id]) return false;
  return true;
};

/** Countdown target: start of registrationStart day (local). */
export const getRegistrationOpenAt = (hackathon) => {
  const regStart = hackathon?.registration_start ?? hackathon?.registrationStart;
  if (!regStart) return null;
  return dayjs(regStart).startOf('day').toDate();
};

export const formatCountdownParts = (targetDate) => {
  if (!targetDate) return null;
  const distance = new Date(targetDate).getTime() - Date.now();
  if (Number.isNaN(distance) || distance <= 0) {
    return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    ended: false,
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
};

export const formatCountdownLabel = (parts) => {
  if (!parts || parts.ended) return 'Đã mở đăng ký';
  const { days, hours, minutes, seconds } = parts;
  if (days > 0) return `Còn ${days}n ${hours}g ${minutes}p để mở đăng ký`;
  if (hours > 0) return `Còn ${hours}g ${minutes}p ${seconds}s để mở đăng ký`;
  return `Còn ${minutes}p ${seconds}s để mở đăng ký`;
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

/**
 * @param {object} hackathon
 * @param {Array} activeTeams
 * @param {object|null} selectedRound
 * @param {Array} [pendingTeams] — đội PENDING (awaiting / grace / blocked)
 */
export const getLotteryGateReason = (
  hackathon,
  activeTeams = [],
  selectedRound = null,
  pendingTeams = [],
) => {
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

  const pendingBuckets = classifyPendingTeams(pendingTeams);
  if (pendingBuckets.total > 0) {
    return formatPendingTeamsGateReason(pendingBuckets);
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
