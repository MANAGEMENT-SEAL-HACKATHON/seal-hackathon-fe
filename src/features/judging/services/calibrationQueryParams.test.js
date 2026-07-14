import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCalibrationQueryParams } from './calibrationQueryParams.js';

describe('buildCalibrationQueryParams', () => {
  it('includes trackId when provided', () => {
    assert.deepEqual(buildCalibrationQueryParams(5, 12), { roundId: 5, trackId: 12 });
  });

  it('omits trackId when undefined', () => {
    const params = buildCalibrationQueryParams(5, undefined);
    assert.deepEqual(params, { roundId: 5 });
    assert.equal(Object.hasOwn(params, 'trackId'), false);
  });

  it('omits trackId when null', () => {
    const params = buildCalibrationQueryParams(5, null);
    assert.deepEqual(params, { roundId: 5 });
    assert.equal(Object.hasOwn(params, 'trackId'), false);
  });
});
