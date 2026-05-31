import { describe, expect, it } from 'vitest';
import { createDoneValue } from './block-edit.component';

describe('createDoneValue', () => {
  it('uses the create-card default before the user edits the checkbox', () => {
    expect(createDoneValue(false, true, false)).toBe(false);
    expect(createDoneValue(true, false, false)).toBe(true);
  });

  it('keeps the user-edited checkbox value', () => {
    expect(createDoneValue(false, true, true)).toBe(true);
    expect(createDoneValue(true, false, true)).toBe(false);
  });
});
