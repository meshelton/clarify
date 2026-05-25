import { describe, it, expect } from 'vitest';
import { Schema } from 'effect';
import { ClarifySettings, defaultSettings } from './schema';

describe('ClarifySettings', () => {
  it('decodes the shipped defaults', () => {
    const decoded = Schema.decodeUnknownSync(ClarifySettings)(defaultSettings);
    expect(decoded.inbox.folderPath).toBe('00 Inbox');
    expect(decoded.projectsAndAreas.miscAreaName).toBe('Misc');
    expect(Object.keys(decoded.outcomes)).toHaveLength(9);
  });
});
