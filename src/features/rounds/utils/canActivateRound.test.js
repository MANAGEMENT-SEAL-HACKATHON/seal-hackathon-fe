import assert from 'node:assert/strict';
import { canActivateRound, getActivateRoundTooltip } from './canActivateRound.js';

const prelim = { id: 1, is_final: false, is_active: false };
const tracks = [
  { id: 10, name: 'Track 1', round_id: 1 },
  { id: 11, name: 'Track 2', round_id: 1 },
];

{
  // Bug cũ: thiếu criteriaCount/judgeCount bị coi là «chưa có»
  const { ok, reasons } = canActivateRound(prelim, {
    tracks,
    teamsByTrack: { 10: 2, 11: 2 },
  });
  assert.equal(ok, true, `unknown counts must not block: ${reasons.join('; ')}`);
}

{
  const { ok, reasons } = canActivateRound(prelim, {
    tracks,
    teamsByTrack: { 10: 2, 11: 2 },
    criteriaCountByTrack: { 10: 5, 11: 5 },
    judgeCountByTrack: { 10: 1, 11: 1 },
  });
  assert.equal(ok, true, reasons.join('; '));
}

{
  const { ok, reasons } = canActivateRound(prelim, {
    tracks,
    teamsByTrack: { 10: 2, 11: 2 },
    criteriaCountByTrack: { 10: 0, 11: 5 },
    judgeCountByTrack: { 10: 1, 11: 0 },
  });
  assert.equal(ok, false);
  assert.ok(reasons.some((r) => r.includes('Track 1') && r.includes('tiêu chí')));
  assert.ok(reasons.some((r) => r.includes('Track 2') && r.includes('giám khảo')));
}

{
  const tip = getActivateRoundTooltip(prelim, {
    tracks,
    teamsByTrack: {},
    criteriaCountByTrack: { 10: 1, 11: 1 },
    judgeCountByTrack: { 10: 1, 11: 1 },
  });
  assert.ok(tip.includes('chưa có đội'));
}

{
  const { ok, reasons, warnings } = canActivateRound(prelim, {
    tracks,
    teamsByTrack: { 10: 2, 11: 2 },
    criteriaCountByTrack: { 10: 5, 11: 5 },
    judgeCountByTrack: { 10: 1, 11: 1 },
    tracksMissingTiebreaker: [{ trackName: 'Track 2' }],
  });
  assert.equal(ok, true, `tiebreaker warning must not block: ${reasons.join('; ')}`);
  assert.ok(warnings.some((w) => w.includes('tiêu chí phụ')));
}

{
  const { ok, warnings } = canActivateRound(prelim, {
    tracks,
    teamsByTrack: { 10: 2, 11: 2 },
    criteriaCountByTrack: { 10: 5, 11: 5 },
    judgeCountByTrack: { 10: 1, 11: 1 },
    criteriaByTrack: {
      10: [{ name: 'A', is_tiebreaker_priority: false }],
      11: [{ name: 'B', is_tiebreaker_priority: true }],
    },
  });
  assert.equal(ok, true);
  assert.ok(warnings.some((w) => w.includes('Track 1')));
}

{
  // Already active — no early-start / START_NOW allowance
  const active = { id: 1, is_final: false, is_active: true };
  const { ok, reasons } = canActivateRound(active, {
    tracks,
    teamsByTrack: { 10: 2, 11: 2 },
    criteriaCountByTrack: { 10: 5, 11: 5 },
    judgeCountByTrack: { 10: 1, 11: 1 },
  });
  assert.equal(ok, false);
  assert.ok(reasons.some((r) => r.includes('đã được kích hoạt')));
}

console.log('canActivateRound.test.js: ok');
