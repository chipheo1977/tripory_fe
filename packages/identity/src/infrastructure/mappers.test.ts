import { describe, expect, it } from 'vitest';
import { authResponseDto, userProfileDto, viewerDto } from './dto';
import { authResponseFixture, userIdFixture, userProfileFixture, viewerJsonFixture } from './fixtures';
import { DEFAULT_AVATAR_URL, normalizeAvatarUrl, toViewer } from './mappers';

describe('normalizeAvatarUrl', () => {
  it('hằng DEFAULT_AVATAR_URL là ảnh mặc định chung của BE', () => {
    expect(DEFAULT_AVATAR_URL).toBe('https://api.dicebear.com/7.x/identicon/svg?seed=tripory');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['chuỗi rỗng', ''],
    ['chỉ khoảng trắng', '   '],
    ['xuống dòng và tab', '\n\t'],
    ['ảnh mặc định của BE', 'https://api.dicebear.com/7.x/identicon/svg?seed=tripory'],
    ['ảnh mặc định có khoảng trắng bao quanh', '  https://api.dicebear.com/7.x/identicon/svg?seed=tripory  '],
  ] as const)('%s → null', (_name, input) => {
    expect(normalizeAvatarUrl(input)).toBeNull();
  });

  it.each([
    ['https://cdn.tripory.vn/avatars/a.png', 'https://cdn.tripory.vn/avatars/a.png'],
    ['  https://cdn.tripory.vn/avatars/a.png  ', 'https://cdn.tripory.vn/avatars/a.png'],
    ['https://api.dicebear.com/7.x/identicon/svg?seed=nguoi-khac', 'https://api.dicebear.com/7.x/identicon/svg?seed=nguoi-khac'],
  ] as const)('URL riêng của người dùng được giữ và trim: %s', (input, expected) => {
    expect(normalizeAvatarUrl(input)).toBe(expected);
  });
});

describe('toViewer', () => {
  it('map UserProfileResponse sang Viewer, avatar mặc định thành null', () => {
    expect(toViewer(userProfileDto.parse(userProfileFixture))).toEqual({
      id: userIdFixture,
      email: 'a@b.vn',
      fullName: 'Nguyễn Văn Ánh',
      handle: 'a',
      avatarUrl: null,
    });
  });

  it('map user trong AuthResponse', () => {
    expect(toViewer(authResponseDto.parse(authResponseFixture).user).fullName).toBe('Nguyễn Văn Ánh');
  });

  it('map viewer của route, giữ avatar riêng', () => {
    const dto = viewerDto.parse({ ...viewerJsonFixture.viewer, avatarUrl: 'https://cdn.tripory.vn/a.png' });

    expect(toViewer(dto).avatarUrl).toBe('https://cdn.tripory.vn/a.png');
  });

  it('avatarUrl vắng mặt thành null', () => {
    const { avatarUrl: _omitted, ...rest } = viewerJsonFixture.viewer;

    expect(toViewer(rest).avatarUrl).toBeNull();
  });

  it('chuẩn hóa id về chữ thường', () => {
    expect(toViewer({ ...viewerJsonFixture.viewer, id: userIdFixture.toUpperCase() }).id).toBe(userIdFixture);
  });

  it.each([
    ['không phải GUID', 'khong-phai-guid'],
    ['rỗng', ''],
  ] as const)('id %s thì ném Error, không trả Viewer hỏng', (_name, id) => {
    expect(() => toViewer({ ...viewerJsonFixture.viewer, id })).toThrow(Error);
  });

  it('Viewer chỉ có 5 khóa, không mang token hay trường thừa (T-03-12)', () => {
    const viewer = toViewer({
      ...userProfileDto.parse(userProfileFixture),
      accessToken: 'x',
      refreshToken: 'y',
    } as Parameters<typeof toViewer>[0]);

    expect(Object.keys(viewer).toSorted()).toEqual(['avatarUrl', 'email', 'fullName', 'handle', 'id']);
  });
});
