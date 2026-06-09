import { describe, expect, it } from 'vitest';
import type { StyledBlock } from './tower.component';
import { decideFalls, editEntryForNewBlock, selectVisibleStyledBlocks } from './tower.component';

function block(id: string, opacity = '1', difficulty = 1): StyledBlock {
  return {
    id,
    tag: 'tag',
    description: id,
    is_done: true,
    difficulty,
    created_at: 1,
    _anim: '',
    _transform: opacity === '1' ? 'translateY(0)' : 'translateY(500%)',
    _opacity: opacity,
  };
}

describe('selectVisibleStyledBlocks', () => {
  it('reserves a capped visible slot for the newly completed block', () => {
    const styled = [
      block('newly-done'),
      block('done-1'),
      block('done-2'),
      block('done-3'),
      block('done-4'),
      block('done-5'),
      block('done-6'),
      block('done-7'),
    ];

    const result = selectVisibleStyledBlocks(styled, 6, 'newly-done');

    expect(result.hiddenCount).toBe(2);
    expect(result.visibleStyled.map((b) => b.id)).toEqual([
      'newly-done',
      'done-3',
      'done-4',
      'done-5',
      'done-6',
      'done-7',
    ]);
  });

  it('uses the normal capped window when no new block is entering', () => {
    const styled = [
      block('done-0'),
      block('done-1'),
      block('done-2'),
      block('done-3'),
      block('done-4'),
      block('done-5'),
      block('done-6'),
      block('done-7'),
    ];

    const result = selectVisibleStyledBlocks(styled, 6, null);

    expect(result.hiddenCount).toBe(2);
    expect(result.visibleStyled.map((b) => b.id)).toEqual([
      'done-2',
      'done-3',
      'done-4',
      'done-5',
      'done-6',
      'done-7',
    ]);
  });

  it('caps by square cost (difficulty), not by raw block count', () => {
    // Each block draws 2 squares, so only 3 blocks fit in 6 square slots.
    const hard = (id: string): StyledBlock => block(id, '1', 2);
    const styled = [hard('a'), hard('b'), hard('c'), hard('d'), hard('e')];

    const result = selectVisibleStyledBlocks(styled, 6, null);

    expect(result.visibleStyled.map((b) => b.id)).toEqual(['c', 'd', 'e']);
    expect(result.hiddenCount).toBe(4);
  });

  it('keeps a previously-visible block that is now flying out, even on a full stack', () => {
    // Budget is full with three resting blocks; a fourth block has just left the
    // range (opacity 0 → ascending). It was visible a moment ago, so it must stay
    // rendered so its fly-up transition can play instead of vanishing instantly.
    const styled = [
      block('old-1'),
      block('old-2'),
      block('old-3'),
      block('leaving', '0'),
    ];
    const prevVisible = new Set(['old-1', 'old-2', 'old-3', 'leaving']);

    const result = selectVisibleStyledBlocks(styled, 3, null, prevVisible);

    expect(result.visibleStyled.map((b) => b.id)).toContain('leaving');
    expect(result.hiddenCount).toBe(0);
  });

  it('does not resurrect an off-screen block that leaves the range', () => {
    // 'hidden-leaving' was never rendered (not in prevVisible) — nothing to
    // animate from, so keep it out and avoid an unbounded phantom render set.
    const styled = [
      block('old-1'),
      block('old-2'),
      block('old-3'),
      block('hidden-leaving', '0'),
    ];
    const prevVisible = new Set(['old-1', 'old-2', 'old-3']);

    const result = selectVisibleStyledBlocks(styled, 3, null, prevVisible);

    expect(result.visibleStyled.map((b) => b.id)).not.toContain('hidden-leaving');
  });

  it('counts hidden squares when reserving the entering block', () => {
    const styled = [
      block('newly-done', '1', 3),
      block('done-1', '1', 2),
      block('done-2', '1', 2),
      block('done-3', '1', 2),
      block('done-4', '1', 2),
    ];

    const result = selectVisibleStyledBlocks(styled, 6, 'newly-done');

    expect(result.hiddenCount).toBe(6);
    expect(result.visibleStyled.map((b) => b.id)).toEqual(['newly-done', 'done-4']);
  });
});

describe('decideFalls', () => {
  it('never falls on the first render of real data (no fall on page load)', () => {
    expect(
      decideFalls({
        firstRender: true,
        animateInitialStack: false,
        newIds: ['a', 'b', 'c'],
        restingVisibleIds: new Set(['a', 'b', 'c']),
      }),
    ).toEqual([]);
  });

  it('falls the whole initial stack only for the example showcase', () => {
    expect(
      decideFalls({
        firstRender: true,
        animateInitialStack: true,
        newIds: ['a', 'b'],
        restingVisibleIds: new Set(['a', 'b']),
      }),
    ).toEqual(['a', 'b']);
  });

  it('falls a newly ticked/added block once the stack has rendered', () => {
    expect(
      decideFalls({
        firstRender: false,
        animateInitialStack: false,
        newIds: ['new-1'],
        restingVisibleIds: new Set(['old-1', 'old-2', 'new-1']),
      }),
    ).toEqual(['new-1']);
  });

  it('does not fall a new block that is capped out of view or out of range', () => {
    expect(
      decideFalls({
        firstRender: false,
        animateInitialStack: false,
        newIds: ['new-hidden'],
        restingVisibleIds: new Set(['old-1', 'old-2']),
      }),
    ).toEqual([]);
  });

  it('falls nothing when no ids are new (e.g. a date-range reshuffle)', () => {
    expect(
      decideFalls({
        firstRender: false,
        animateInitialStack: false,
        newIds: [],
        restingVisibleIds: new Set(['old-1', 'old-2', 'old-3']),
      }),
    ).toEqual([]);
  });
});

describe('editEntryForNewBlock', () => {
  it('opens the create card in the pending task view when tasks are kept open', () => {
    expect(editEntryForNewBlock(true)).toEqual({ filter: 'pending', activeId: null });
  });

  it('keeps the existing completed-task default when tasks are collapsed', () => {
    expect(editEntryForNewBlock(false)).toEqual({ filter: 'done', activeId: null });
  });
});
