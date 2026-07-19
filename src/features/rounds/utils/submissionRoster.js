/**
 * Ghép danh sách đội (eligible) với bài nộp thành roster dùng chung cho
 * SubmissionStatusPanel (luôn hiển thị) và modal Kết thúc sớm.
 *
 * Giữ `submissionStatus` ở dạng raw để consumer tự map nhãn qua
 * `getSubmissionStatusMeta(status, { latePolicy, windowClosed, isFinal })` —
 * KHÔNG tự chế nhãn riêng (tránh tái tạo bug nộp-trễ hiển thị sai).
 *
 * @param {Array} teams - đội eligible (ACTIVE cho Sơ loại, ADVANCED cho CK)
 * @param {Array} submissions - kết quả personBApi.getRoundSubmissions(roundId)
 * @returns {Array<{id:number,name:string,trackId:number|null,trackName:string|null,
 *   submissionStatus:string|null,submittedAt:string|null,submissionId:number|null,isLate:boolean}>}
 */
export const buildSubmissionRoster = (teams = [], submissions = []) => {
  const subByTeam = new Map();
  (submissions || []).forEach((s) => {
    const tid = Number(s.team_id ?? s.teamId);
    if (Number.isFinite(tid)) subByTeam.set(tid, s);
  });

  return (teams || [])
    .map((t) => {
      const id = Number(t.id ?? t.teamId);
      const name = t.teamName || t.team_name || t.name || `Đội #${id}`;
      const sub = Number.isFinite(id) ? subByTeam.get(id) || null : null;
      // Ưu tiên track của bài nộp (đúng round đang xem) — team DTO có thể mang track của round khác.
      const trackId = sub?.track_id ?? sub?.trackId ?? t.trackId ?? t.track_id ?? null;
      const trackName =
        t.trackName || t.track_name || sub?.track_name || sub?.trackName || null;
      return {
        id,
        name,
        trackId: trackId == null ? null : Number(trackId),
        trackName,
        submissionStatus: sub?.status ?? null,
        submittedAt: sub?.submitted_at ?? sub?.submittedAt ?? null,
        submissionId: sub?.id ?? null,
        isLate: Boolean(sub?.is_late ?? sub?.isLate),
      };
    })
    .sort((a, b) => {
      // Chưa nộp lên đầu để Coord dễ soi trước khi đóng sớm
      const aSubmitted = a.submissionStatus != null;
      const bSubmitted = b.submissionStatus != null;
      if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1;
      return String(a.name).localeCompare(String(b.name), 'vi');
    });
};
