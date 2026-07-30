/**
 * Single gate for round activation (FE mirror of BE RoundActivationServiceImpl).
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export const canActivateRound = (round, ctx = {}) => {
  const reasons = [];
  if (!round) {
    return { ok: false, reasons: ['Không tìm thấy vòng thi'] };
  }

  if (round.is_active || round.isActive) {
    return { ok: false, reasons: ['Vòng thi đã được kích hoạt'] };
  }

  const tracks = (ctx.tracks || []).filter(
    (t) =>
      (t.round_id ?? t.roundId) === round.id &&
      String(t.status || '').toUpperCase() !== 'CANCELLED',
  );

  if (!tracks.length) {
    reasons.push('Chưa có bảng đấu active cho vòng thi này');
  }

  const teamsByTrack = ctx.teamsByTrack || {};
  const criteriaByTrack = ctx.criteriaCountByTrack || {};
  const judgesByTrack = ctx.judgeCountByTrack || {};
  const declinedJudgeGaps = ctx.declinedJudgeGaps || [];

  for (const track of tracks) {
    const trackId = track.id;
    const criteriaCount =
      track.criteria_count ?? track.criteriaCount ?? criteriaByTrack[trackId];
    // null/undefined = chưa nạp count → không kết luận «thiếu» (tránh false negative)
    if (criteriaCount !== undefined && criteriaCount !== null && Number(criteriaCount) <= 0) {
      reasons.push(`Bảng «${track.name}» chưa có tiêu chí`);
    }
    const judgeCount = track.judge_count ?? track.judgeCount ?? judgesByTrack[trackId];
    if (judgeCount !== undefined && judgeCount !== null && Number(judgeCount) <= 0) {
      reasons.push(`Bảng «${track.name}» chưa có giám khảo`);
    }
    const teamCount = teamsByTrack[trackId] ?? track.team_count ?? track.teamCount ?? 0;
    if (!teamCount) {
      reasons.push(`Bảng «${track.name}» chưa có đội tham gia`);
    }
  }

  for (const gap of declinedJudgeGaps) {
    const name = gap?.trackName || gap?.track_name || gap?.name || 'bảng';
    reasons.push(`Bảng «${name}» thiếu giám khảo do từ chối phân công — cần gán lại`);
  }

  if (!round.is_final && !round.isFinal) {
    const totalTeams =
      ctx.totalTeamsInRound ??
      Object.values(teamsByTrack).reduce((sum, n) => sum + (n || 0), 0);
    if (!tracks.length && !totalTeams) {
      reasons.push('Không có đội tham gia vòng thi này');
    }
  }

  return { ok: reasons.length === 0, reasons };
};

export const getActivateRoundTooltip = (round, ctx) => {
  const { ok, reasons } = canActivateRound(round, ctx);
  if (ok) return 'Kích hoạt vòng thi';
  return reasons.join(' · ');
};
