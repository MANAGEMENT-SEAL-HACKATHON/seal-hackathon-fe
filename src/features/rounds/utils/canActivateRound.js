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
    return { ok: true, reasons: [] };
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
  for (const track of tracks) {
    const trackId = track.id;
    const criteriaCount = track.criteria_count ?? track.criteriaCount ?? ctx.criteriaCountByTrack?.[trackId];
    if (criteriaCount === 0 || criteriaCount == null) {
      reasons.push(`Bảng «${track.name}» chưa có tiêu chí`);
    }
    const judgeCount = track.judge_count ?? track.judgeCount ?? ctx.judgeCountByTrack?.[trackId];
    if (judgeCount === 0 || judgeCount == null) {
      reasons.push(`Bảng «${track.name}» chưa có giám khảo`);
    }
    const teamCount = teamsByTrack[trackId] ?? track.team_count ?? track.teamCount ?? 0;
    if (!teamCount) {
      reasons.push(`Bảng «${track.name}» chưa có đội tham gia`);
    }
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
