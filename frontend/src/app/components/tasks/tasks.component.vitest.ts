import { describe, expect, it } from 'vitest';
import { shouldExpandTasks, taskListMaxHeight } from './tasks.component';

describe('shouldExpandTasks', () => {
  it('expands when tasks should be kept open by page setting', () => {
    expect(shouldExpandTasks(true, false)).toBe(true);
  });

  it('expands when the user manually opens the accordion', () => {
    expect(shouldExpandTasks(false, true)).toBe(true);
  });

  it('collapses when keep-open is disabled', () => {
    expect(shouldExpandTasks(false, false)).toBe(false);
  });
});

describe('taskListMaxHeight', () => {
  it('does not cap open task lists by a measured height', () => {
    expect(taskListMaxHeight(true)).toBe('none');
  });

  it('clips collapsed task lists', () => {
    expect(taskListMaxHeight(false)).toBe('0px');
  });
});
