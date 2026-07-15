import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapRoundToBE } from './roundMapper.js';

describe('mapRoundToBE timer fields (TC-FE create payload)', () => {
  it('includes presentation/qa minutes only when is_final', () => {
    const payload = mapRoundToBE({
      name: 'Chung kết',
      exam_at: '2026-06-20T08:00:00',
      submission_deadline: '2026-06-20T12:00:00',
      is_final: true,
      default_presentation_minutes: 15,
      default_qa_minutes: 8,
    });
    assert.equal(payload.defaultPresentationMinutes, 15);
    assert.equal(payload.defaultQaMinutes, 8);
  });

  it('does not send timer fields for prelim', () => {
    const payload = mapRoundToBE({
      name: 'Sơ loại',
      exam_at: '2026-06-10T08:00:00',
      submission_deadline: '2026-06-10T12:00:00',
      is_final: false,
      top_n_advance: 2,
      min_teams_final: 6,
      default_presentation_minutes: 15,
      default_qa_minutes: 8,
    });
    assert.equal(payload.defaultPresentationMinutes, undefined);
    assert.equal(payload.defaultQaMinutes, undefined);
  });
});
