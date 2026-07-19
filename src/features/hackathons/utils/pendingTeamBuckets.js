import dayjs from 'dayjs';

/**
 * Phân loại đội PENDING trước bốc thăm — không gộp 1 số duy nhất.
 * @returns {{ awaitingApproval: any[], inGrace: any[], blockedOther: any[],
 *   earliestGraceDeadlineAt: string|null, total: number }}
 */
export const classifyPendingTeams = (pendingTeams = [], now = dayjs()) => {
  const awaitingApproval = [];
  const inGrace = [];
  const blockedOther = [];
  let earliestGraceDeadlineAt = null;

  for (const team of pendingTeams || []) {
    const submitted = Boolean(team.formationSubmittedAt ?? team.formation_submitted_at);
    if (submitted) {
      awaitingApproval.push(team);
      continue;
    }
    const deadlineRaw = team.formationGraceDeadlineAt ?? team.formation_grace_deadline_at;
    if (deadlineRaw && dayjs(deadlineRaw).isAfter(now)) {
      inGrace.push(team);
      if (!earliestGraceDeadlineAt || dayjs(deadlineRaw).isBefore(dayjs(earliestGraceDeadlineAt))) {
        earliestGraceDeadlineAt = deadlineRaw;
      }
    } else {
      blockedOther.push(team);
    }
  }

  return {
    awaitingApproval,
    inGrace,
    blockedOther,
    earliestGraceDeadlineAt,
    total: awaitingApproval.length + inGrace.length + blockedOther.length,
  };
};

/** Ghép message gate từ buckets PENDING. */
export const formatPendingTeamsGateReason = (buckets) => {
  if (!buckets || buckets.total <= 0) return '';
  const parts = [];
  if (buckets.awaitingApproval.length > 0) {
    parts.push(
      `${buckets.awaitingApproval.length} đội đã xác nhận — đang chờ bạn duyệt`,
    );
  }
  if (buckets.inGrace.length > 0) {
    let gracePart = `${buckets.inGrace.length} đội chưa xác nhận — còn trong 24h suy nghĩ`;
    if (buckets.earliestGraceDeadlineAt) {
      gracePart += ` (hạn gần nhất ${dayjs(buckets.earliestGraceDeadlineAt).format('DD/MM/YYYY HH:mm')})`;
    }
    parts.push(gracePart);
  }
  if (buckets.blockedOther.length > 0) {
    parts.push(`${buckets.blockedOther.length} đội cần xem lại / từ chối`);
  }
  return `Còn ${buckets.total} đội đang chờ xử lý: ${parts.join('; ')}. Hãy duyệt hoặc từ chối hết trước khi bốc thăm.`;
};
