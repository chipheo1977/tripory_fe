import * as publicApi from './index';
import { describe, expect, it } from 'vitest';

describe('entry gốc', () => {
  it('là module hợp lệ', () => {
    expect(typeof publicApi).toBe('object');
  });
});
