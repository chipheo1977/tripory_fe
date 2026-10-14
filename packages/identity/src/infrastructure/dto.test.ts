import { describe, expect, it } from 'vitest';
import { authResponseDto, tokenResponseDto, userDto, userProfileDto, viewerDto, viewerResponseDto } from './dto';
import {
  authResponseFixture,
  emailExistsEnvelope,
  invalidCredentialsEnvelope,
  tokenCompromisedEnvelope,
  tokenExpiredEnvelope,
  tokenInvalidRefreshEnvelope,
  tokenResponseFixture,
  userProfileFixture,
  viewerJsonFixture,
} from './fixtures';

const without = <T extends object>(source: T, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));

describe('authResponseDto', () => {
  it('nhận AuthResponse thật của BE và giữ user', () => {
    const parsed = authResponseDto.parse(authResponseFixture);

    expect(parsed.accessToken).toBe('fake-access-token');
    expect(parsed.refreshToken).toBe('fake-refresh-token');
    expect(parsed.expiresAt).toBe('2026-10-20T08:00:00+00:00');
    expect(parsed.user.fullName).toBe('Nguyễn Văn Ánh');
  });

  it.each(['accessToken', 'refreshToken', 'expiresAt', 'user'] as const)('thiếu %s thì parse thất bại', (key) => {
    expect(authResponseDto.safeParse(without(authResponseFixture, key)).success).toBe(false);
  });

  it('envelope lỗi của BE không parse thành AuthResponse', () => {
    expect(authResponseDto.safeParse(invalidCredentialsEnvelope).success).toBe(false);
  });
});

describe('tokenResponseDto', () => {
  it('nhận TokenResponse và không có user', () => {
    const parsed = tokenResponseDto.parse(tokenResponseFixture);

    expect(Object.keys(parsed).toSorted()).toEqual(['accessToken', 'expiresAt', 'refreshToken']);
  });

  it('bỏ user nếu BE gửi kèm, giữ hình dạng token', () => {
    const parsed = tokenResponseDto.parse(authResponseFixture);

    expect('user' in parsed).toBe(false);
  });

  it.each(['accessToken', 'refreshToken', 'expiresAt'] as const)('thiếu %s thì parse thất bại', (key) => {
    expect(tokenResponseDto.safeParse(without(tokenResponseFixture, key)).success).toBe(false);
  });
});

describe('userDto và userProfileDto', () => {
  it('userDto nhận user trong AuthResponse', () => {
    expect(userDto.parse(authResponseFixture.user).handle).toBe('a');
  });

  it('userProfileDto nhận UserProfileResponse đủ trường', () => {
    const parsed = userProfileDto.parse(userProfileFixture);

    expect(parsed).toMatchObject({
      id: userProfileFixture.id,
      email: 'a@b.vn',
      handle: 'a',
      fullName: 'Nguyễn Văn Ánh',
      bio: null,
      status: 'Active',
      roles: ['Traveler'],
      createdAt: '2026-10-01T03:00:00+00:00',
    });
  });

  it.each(['id', 'email', 'handle', 'fullName', 'status', 'roles', 'createdAt'] as const)(
    'userProfileDto thiếu %s thì parse thất bại',
    (key) => {
      expect(userProfileDto.safeParse(without(userProfileFixture, key)).success).toBe(false);
    },
  );

  it.each(['id', 'email', 'handle', 'fullName'] as const)('userDto thiếu %s thì parse thất bại', (key) => {
    expect(userDto.safeParse(without(authResponseFixture.user, key)).success).toBe(false);
  });

  it('chấp nhận bio và avatarUrl null (BE: string?)', () => {
    expect(userDto.safeParse({ ...authResponseFixture.user, bio: null, avatarUrl: null }).success).toBe(true);
  });
});

describe('viewerDto và viewerResponseDto', () => {
  it('viewerDto nhận hình route trả cho browser, avatarUrl có thể null', () => {
    expect(viewerDto.parse(viewerJsonFixture.viewer)).toEqual(viewerJsonFixture.viewer);
  });

  it('viewerResponseDto bóc { viewer }', () => {
    expect(viewerResponseDto.parse(viewerJsonFixture).viewer.fullName).toBe('Nguyễn Văn Ánh');
  });

  it('thiếu viewer thì parse thất bại', () => {
    expect(viewerResponseDto.safeParse({}).success).toBe(false);
    expect(viewerResponseDto.safeParse({ viewer: null }).success).toBe(false);
  });

  it('không giữ khóa token nếu ai đó gửi kèm (T-03-12)', () => {
    const parsed = viewerResponseDto.parse({
      viewer: { ...viewerJsonFixture.viewer, accessToken: 'x', refreshToken: 'y' },
      accessToken: 'z',
    });

    expect(JSON.stringify(parsed)).not.toMatch(/accessToken|refreshToken/);
  });
});

describe('envelope lỗi của BE', () => {
  it.each([
    ['Token.InvalidRefreshToken', tokenInvalidRefreshEnvelope],
    ['Token.Compromised', tokenCompromisedEnvelope],
    ['Token.Expired', tokenExpiredEnvelope],
    ['Auth.InvalidCredentials', invalidCredentialsEnvelope],
    ['User.EmailAlreadyExists', emailExistsEnvelope],
  ] as const)('%s không parse được thành DTO thành công', (_code, envelope) => {
    expect(tokenResponseDto.safeParse(envelope).success).toBe(false);
    expect(viewerResponseDto.safeParse(envelope).success).toBe(false);
  });
});
