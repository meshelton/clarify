import { describe, it, expect } from 'vitest';
import { Schema } from 'effect';
import { Outcome } from './outcome';

describe('Outcome', () => {
  it('decodes a nextAction outcome', () => {
    const decoded = Schema.decodeUnknownSync(Outcome)({
      type: 'nextAction',
      projectLink: '[[Build website]]',
      context: '@computer',
      energy: 'medium',
      time: 30,
    });
    expect(decoded.type).toBe('nextAction');
  });

  it('decodes a trash outcome', () => {
    const decoded = Schema.decodeUnknownSync(Outcome)({ type: 'trash' });
    expect(decoded.type).toBe('trash');
  });

  it('rejects an outcome with unknown type', () => {
    expect(() => Schema.decodeUnknownSync(Outcome)({ type: 'mystery' } as unknown)).toThrow();
  });
});
