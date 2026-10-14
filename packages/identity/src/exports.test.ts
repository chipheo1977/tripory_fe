import { describe, expect, it } from 'vitest';
import * as publicApi from './index';

describe('identity public entry', () => {
  it('entry gốc là module hợp lệ', () => {
    expect(typeof publicApi).toBe('object');
  });
});
