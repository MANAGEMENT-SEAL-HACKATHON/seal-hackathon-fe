// src/features/rounds/utils/roundAdvancementRules.js
const getTrackId = (team) => team.trackId ?? team.track_id;
const getAssignedGroup = (team) => team.assignedGroup ?? team.assigned_group ?? null;
const getTeamName = (team) => team.teamName ?? team.team_name ?? `Đội #${team.id}`;

/** Bỏ tiền tố "Track 1 —" trong tên BE, giữ phần chủ đề (RAG Pipeline, …). */
const cleanBangDauName = (trackName, trackId) => {
  if (!trackName) return `Bảng đấu #${trackId}`;
  const stripped = trackName.replace(/^Track\s+\d+\s*[—–-]\s*/i, '').trim();
  return stripped || trackName;
};

/** Nhóm con sau bốc thăm: "Bảng A" → "nhóm A". Không có nhóm → null. */
const formatNhómLabel = (assignedGroup) => {
  if (!assignedGroup) return null;
  const normalized = String(assignedGroup).trim();
  if (!normalized || normalized === '(mặc định)') return null;
  return normalized.replace(/^Bảng\s*/i, 'nhóm ');
};

/** Nhãn lỗi theo nhóm con (A/B) — chỉ dùng trong validate, không hiển thị summary. */
export const formatPartitionLabel = (partition, { withCount = true } = {}) => {
  const name = cleanBangDauName(partition.trackName, partition.trackId);
  const group = formatNhómLabel(partition.assignedGroup);
  const countSuffix = withCount ? `: ${partition.teamCount} đội` : '';
  return group ? `${name} (${group})${countSuffix}` : `${name}${countSuffix}`;
};

/** Gom đội theo bảng đấu (track), không tách nhóm A/B. */
export const buildTrackTeamSummary = (partitions = []) => {
  const byTrack = new Map();

  for (const partition of partitions) {
    if (!byTrack.has(partition.trackId)) {
      byTrack.set(partition.trackId, {
        trackId: partition.trackId,
        trackName: partition.trackName,
        teamCount: 0,
      });
    }
    byTrack.get(partition.trackId).teamCount += partition.teamCount;
  }

  return [...byTrack.values()].sort((a, b) => a.trackId - b.trackId);
};

const getBangDauNumber = (trackName, fallbackIndex) => {
  const match = trackName?.match(/^Track\s+(\d+)/i);
  return match ? Number(match[1]) : fallbackIndex + 1;
};

/** "Bảng 1: RAG Pipeline (2 đội)" */
export const formatTrackSummaryLabel = (summary, index = 0) => {
  const topic = cleanBangDauName(summary.trackName, summary.trackId);
  const no = getBangDauNumber(summary.trackName, index);
  return `Bảng ${no}: ${topic} (${summary.teamCount} đội)`;
};

export const buildPartitionStats = (teams = [], tracks = [], { requireLocked = false } = {}) => {
  const partitions = new Map();

  for (const team of teams) {
    if (team.status && team.status !== 'ACTIVE') continue;
    if (requireLocked && !(team.is_locked ?? team.isLocked)) continue;

    const trackId = getTrackId(team);
    if (!trackId) continue;

    const assignedGroup = getAssignedGroup(team);
    const key = `${trackId}::${assignedGroup}`;
    const track = tracks.find((t) => t.id === trackId);

    if (!partitions.has(key)) {
      partitions.set(key, {
        trackId,
        trackName: team.trackName ?? team.track_name ?? track?.name ?? `Bảng #${trackId}`,
        assignedGroup,
        teamCount: 0,
        teamNames: [],
      });
    }

    const partition = partitions.get(key);
    partition.teamCount += 1;
    partition.teamNames.push(getTeamName(team));
  }

  return [...partitions.values()].sort((a, b) => {
    const byTrack = a.trackName.localeCompare(b.trackName);
    return byTrack !== 0 ? byTrack : a.assignedGroup.localeCompare(b.assignedGroup);
  });
};

/** Tính theo bảng đấu (track): 3 bảng × 1 đội/bảng = 3 đội vào chung kết. */
export const computeAdvancementCapacity = (partitions, topNAdvance) => {
  const topN = Number(topNAdvance);
  const trackSummary = buildTrackTeamSummary(partitions);

  if (!topN || topN < 1 || !trackSummary.length) {
    return {
      minTeamsPerTrack: 0,
      maxAdvanceTotal: 0,
      trackCount: trackSummary.length,
    };
  }

  const counts = trackSummary.map((t) => t.teamCount);
  const minTeamsPerTrack = Math.min(...counts);
  const maxAdvanceTotal = trackSummary.reduce(
    (sum, t) => sum + Math.min(topN, t.teamCount),
    0
  );

  return { minTeamsPerTrack, maxAdvanceTotal, trackCount: trackSummary.length };
};

export const validateAdvancementConfig = ({
  topNAdvance,
  minTeamsFinal,
  partitions = [],
  requirePartitions = false,
}) => {
  const errors = [];
  const warnings = [];
  const topN = topNAdvance ? Number(topNAdvance) : null;
  const minFinal = minTeamsFinal ? Number(minTeamsFinal) : null;

  if (!partitions.length) {
    if (requirePartitions) {
      errors.push('Chưa có đội được phân nhóm — hoàn tất bốc thăm trước.');
    } else {
      warnings.push('Chưa có số đội thực tế — đang dùng số dự tính.');
    }
    return { valid: errors.length === 0, errors, warnings, capacity: null };
  }

  if (!topN || topN < 1) {
    errors.push('Vui lòng nhập số đội vào chung kết mỗi bảng (≥ 1).');
    return { valid: false, errors, warnings, capacity: null };
  }

  const capacity = computeAdvancementCapacity(partitions, topN);
  const trackSummary = buildTrackTeamSummary(partitions);

  trackSummary.forEach((track, index) => {
    if (topN > track.teamCount) {
      const label = formatTrackSummaryLabel(track, index).replace(/ \(\d+ đội\)$/, '');
      errors.push(
        `${label}: có ${track.teamCount} đội, không thể chọn ${topN} đội/bảng.`
      );
    }
  });

  if (minFinal && minFinal > capacity.maxAdvanceTotal) {
    errors.push(
      `Tối đa vào chung kết (${minFinal}) vượt tổng tối đa có thể đi tiếp (${capacity.maxAdvanceTotal} đội).`
    );
  }

  if (capacity.minTeamsPerTrack > 0 && topN > capacity.minTeamsPerTrack) {
    warnings.push(
      `Gợi ý: bảng đấu ít đội nhất có ${capacity.minTeamsPerTrack} đội — nên chọn ≤ ${capacity.minTeamsPerTrack} đội/bảng.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    capacity,
  };
};

/** GĐ1: dự tính | GĐ3 trước activate: xác nhận theo đội thực tế */
export const getAdvancementFieldMode = (hackathon, existingRounds) => {
  if (!hackathon || hackathon.status === 'DRAFT') {
    return 'estimate';
  }

  const prelimActive = (existingRounds || []).some((r) => !r.is_final && r.is_active);
  if (prelimActive) {
    return 'active';
  }

  if (hackathon.status === 'ONGOING') {
    return 'confirm';
  }

  return 'estimate';
};

export const getAdvancementFieldHint = (mode, validation, { partitions = [], topNAdvance } = {}) => {
  if (mode === 'estimate') {
    return 'Nhập tạm — chỉnh lại sau khi bốc thăm.';
  }

  if (mode === 'confirm') {
    if (validation?.capacity && partitions.length) {
      const { maxAdvanceTotal } = validation.capacity;
      const trackSummary = buildTrackTeamSummary(partitions);
      const totalTeams = trackSummary.reduce((sum, t) => sum + t.teamCount, 0);
      const topN = Number(topNAdvance) || 1;
      return (
        `${totalTeams} đội · ${trackSummary.length} bảng đấu · ` +
        `chọn ${topN} đội/bảng sau chấm → tối đa ${maxAdvanceTotal} đội vào chung kết.`
      );
    }
    return 'Kiểm tra lại theo số đội thực tế trước khi mở thi.';
  }

  return 'Đang áp dụng cho vòng Sơ loại.';
};
