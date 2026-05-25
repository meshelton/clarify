import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { itemMachine } from './itemMachine';
import type { Item } from '../vault/schema/item';

const item: Item = { path: '00 Inbox/a.md', title: 'a', body: '', frontmatter: {} };

const start = () => createActor(itemMachine, { input: { item } }).start();

describe('itemMachine — path navigation', () => {
  it('NO at assessing → notActionable.choosing', () => {
    const a = start();
    a.send({ type: 'NO' });
    expect(a.getSnapshot().value).toEqual({ notActionable: 'choosing' });
  });

  it('YES at assessing → actionable.complexity', () => {
    const a = start();
    a.send({ type: 'YES' });
    expect(a.getSnapshot().value).toEqual({ actionable: 'complexity' });
  });

  it('NO → PICK trash → submits', () => {
    const a = start();
    a.send({ type: 'NO' });
    a.send({ type: 'PICK', outcome: 'trash' });
    expect(a.getSnapshot().status).toBe('done');
    expect(a.getSnapshot().output).toEqual({ type: 'trash' });
  });

  it('NO → PICK reference → submits', () => {
    const a = start();
    a.send({ type: 'NO' });
    a.send({ type: 'PICK', outcome: 'reference' });
    expect(a.getSnapshot().output).toEqual({ type: 'reference' });
  });

  it('YES → Single → <2min YES → bind project → submits doNow', () => {
    const a = start();
    a.send({ type: 'YES' });
    a.send({ type: 'PICK', outcome: 'single' });
    a.send({ type: 'YES' });
    a.send({ type: 'INPUT', field: 'projectLink', value: '[[Misc]]' });
    a.send({ type: 'SUBMIT' });
    expect(a.getSnapshot().output).toMatchObject({ type: 'doNow', projectLink: '[[Misc]]' });
  });
});

describe('itemMachine — back navigation', () => {
  it('BACK from notActionable.choosing returns to assessing', () => {
    const a = start();
    a.send({ type: 'NO' });
    expect(a.getSnapshot().value).toEqual({ notActionable: 'choosing' });
    a.send({ type: 'BACK' });
    expect(a.getSnapshot().value).toBe('assessing');
  });

  it('BACK from actionable.complexity returns to assessing', () => {
    const a = start();
    a.send({ type: 'YES' });
    expect(a.getSnapshot().value).toEqual({ actionable: 'complexity' });
    a.send({ type: 'BACK' });
    expect(a.getSnapshot().value).toBe('assessing');
  });

  it('BACK from single.duration returns to actionable.complexity', () => {
    const a = start();
    a.send({ type: 'YES' });
    a.send({ type: 'PICK', outcome: 'single' });
    a.send({ type: 'BACK' });
    expect(a.getSnapshot().value).toEqual({ actionable: 'complexity' });
  });

  it('BACK from defer.ownership returns to single.duration', () => {
    const a = start();
    a.send({ type: 'YES' });
    a.send({ type: 'PICK', outcome: 'single' });
    a.send({ type: 'NO' }); // duration NO → defer
    a.send({ type: 'BACK' });
    expect(a.getSnapshot().value).toEqual({ actionable: { single: 'duration' } });
  });
});
