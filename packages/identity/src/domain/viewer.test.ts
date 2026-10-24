import { parseUserId } from '@tripory/shared-kernel';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { viewerDisplayName, type Viewer } from './viewer';

const id = parseUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301');

const makeViewer = (overrides: Partial<Viewer> = {}): Viewer => {
  if (id === null) throw new Error('id mẫu phải hợp lệ');

  return {
    id,
    email: 'lan@tripory.vn',
    fullName: 'Nguyễn Thị Lan',
    handle: 'lan',
    avatarUrl: null,
    ...overrides,
  };
};

describe('viewerDisplayName', () => {
  it('dùng họ tên khi có', () => {
    expect(viewerDisplayName(makeViewer())).toBe('Nguyễn Thị Lan');
  });

  it('bỏ khoảng trắng hai đầu của họ tên', () => {
    expect(viewerDisplayName(makeViewer({ fullName: '  Lan  ' }))).toBe('Lan');
  });

  it.each([[''], ['   '], ['\t\n']] as const)('rơi về email khi họ tên rỗng: %j', (fullName) => {
    expect(viewerDisplayName(makeViewer({ fullName }))).toBe('lan@tripory.vn');
  });
});

describe('Viewer', () => {
  it('chỉ đọc và avatarUrl có thể null', () => {
    expectTypeOf<Viewer['avatarUrl']>().toEqualTypeOf<string | null>();
    expectTypeOf<Viewer['fullName']>().toEqualTypeOf<string>();

    const viewer = makeViewer();
    // @ts-expect-error Viewer là Readonly, không gán lại field
    viewer.email = 'khac@tripory.vn';
    expect(viewer).toBeDefined();
  });
});
