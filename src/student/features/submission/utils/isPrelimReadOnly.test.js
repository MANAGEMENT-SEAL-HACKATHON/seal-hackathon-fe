import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPrelimReadOnly } from './isPrelimReadOnly.js';

describe('isPrelimReadOnly', () => {
  it('true for ADVANCED / ELIMINATED status strings', () => {
    assert.equal(isPrelimReadOnly('ADVANCED'), true);
    assert.equal(isPrelimReadOnly('eliminated'), true);
    assert.equal(isPrelimReadOnly('PARTICIPATING'), false);
  });

  it('reads lotteryStatus / flags from team object', () => {
    assert.equal(isPrelimReadOnly({ lotteryStatus: 'ADVANCED' }), true);
    assert.equal(isPrelimReadOnly({ isEliminatedFromFinal: true }), true);
    assert.equal(isPrelimReadOnly({ lotteryStatus: 'PARTICIPATING' }), false);
  });
});
