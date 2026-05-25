import { describe, it, expect } from 'vitest';
import { Schema } from 'effect';
import { Item } from './item';

describe('Item', () => {
  it('decodes a well-formed item', () => {
    const decoded = Schema.decodeUnknownSync(Item)({
      path: '00 Inbox/foo.md',
      title: 'foo',
      body: 'do the thing',
      frontmatter: { status: 'captured', tags: ['task'] },
      capturedAt: '2026-05-23T12:00:00Z',
    });
    expect(decoded.path).toBe('00 Inbox/foo.md');
    expect(decoded.frontmatter.tags).toEqual(['task']);
  });

  it('rejects an item with no path', () => {
    expect(() =>
      Schema.decodeUnknownSync(Item)({ title: 'foo', body: '', frontmatter: {} } as unknown)
    ).toThrow();
  });
});
