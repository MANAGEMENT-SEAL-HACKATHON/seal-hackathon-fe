/**
 * Single gate for round activation (FE mirror of BE RoundActivationServiceImpl).
 * @returns {{ ok: boolean, reasons: string[], warnings: string[] }}
 */
export const canActivateRound = (round, ctx = {}) => {
  const reasons = [];
  const warnings = [];
  if (!round) {
    return { ok: false, reasons: ['Không tìm thấy vòng thi'], warnings };
  }

  if (round.is_active || round.isActive) {
    return { ok: false, reasons: ['Vòng thi đã được kích hoạt'], warnings };
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
  const criteriaDetailByTrack = ctx.criteriaByTrack || {};
  const judgesByTrack = ctx.judgeCountByTrack || {};
  const tracksMissingTiebreaker = ctx.tracksMissingTiebreaker || [];

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

    const trackCriteria = criteriaDetailByTrack[trackId];
    if (Array.isArray(trackCriteria) && trackCriteria.length > 0) {
      const hasTiebreaker = trackCriteria.some(
        (c) => c.is_tiebreaker_priority || c.isTiebreakerPriority,
      );
      if (!hasTiebreaker) {
        warnings.push(`Bảng «${track.name}» chưa chọn tiêu chí phụ phân xử đồng điểm`);
      }
    }
  }

  for (const gap of tracksMissingTiebreaker) {
    const name = gap?.trackName || gap?.track_name || gap?.name || 'bảng';
    warnings.push(`Bảng «${name}» chưa chọn tiêu chí phụ phân xử đồng điểm`);
  }

  if (!round.is_final && !round.isFinal) {
    const totalTeams =
      ctx.totalTeamsInRound ??
      Object.values(teamsByTrack).reduce((sum, n) => sum + (n || 0), 0);
    if (!tracks.length && !totalTeams) {
      reasons.push('Không có đội tham gia vòng thi này');
    }
  }

  return { ok: reasons.length === 0, reasons, warnings };
};

export const getActivateRoundTooltip = (round, ctx) => {
  const { ok, reasons, warnings } = canActivateRound(round, ctx);
  if (ok && warnings.length === 0) return 'Kích hoạt vòng thi';
  const parts = [];
  if (!ok) parts.push(reasons.join(' · '));
  if (warnings.length) parts.push(warnings.join(' · '));
  return parts.join(' · ') || 'Kích hoạt vòng thi';
};
