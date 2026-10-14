import { describe, expect, expectTypeOf, it } from 'vitest';
import * as httpApi from './infrastructure';
import * as publicApi from './index';
import * as reactApi from './react';
import type {
  ChangePasswordInput,
  LoginInput,
  ProfileReader,
  RegisterInput,
  SessionGateway,
  Viewer,
} from './index';
import type { AccessTokenClaims } from './infrastructure';

const missingFrom = (module: object, names: readonly string[]) => names.filter((name) => !(name in module));

const DOMAIN_NAMES = [
  'toSafeNextPath',
  'CHANGE_PASSWORD_RULES',
  'REGISTER_PASSWORD_RULES',
  'evaluatePasswordRules',
  'viewerDisplayName',
  'STALE_AT_SEC',
  'REFRESH_IF_BELOW_SEC',
  'PROACTIVE_LEAD_SEC',
  'remainingSeconds',
  'isFresh',
] as const;

const INFRASTRUCTURE_NAMES = [
  'createHttpSessionGateway',
  'createHttpProfileReader',
  'parseAccessTokenClaims',
  'normalizeAvatarUrl',
  'toViewer',
  'viewerDto',
  'authResponseDto',
  'tokenResponseDto',
  'userProfileDto',
  'userDto',
] as const;

const REACT_NAMES = ['createIdentityHooks', 'identityKeys'] as const;

describe('identity public entry', () => {
  it('entry gốc là module hợp lệ', () => {
    expect(typeof publicApi).toBe('object');
  });

  it('phơi domain ở entry gốc', () => {
    expect(Object.keys(publicApi)).toEqual(expect.arrayContaining([...DOMAIN_NAMES]));
    expect(missingFrom(publicApi, DOMAIN_NAMES)).toEqual([]);
  });

  it.each([...INFRASTRUCTURE_NAMES, ...REACT_NAMES])('entry gốc không có %s', (name) => {
    expect(name in publicApi).toBe(false);
  });

  it('phơi port và Viewer dạng type ở entry gốc', () => {
    expectTypeOf<SessionGateway['login']>().parameters.toEqualTypeOf<[LoginInput]>();
    expectTypeOf<SessionGateway['login']>().returns.toEqualTypeOf<Promise<Viewer>>();
    expectTypeOf<SessionGateway['register']>().parameters.toEqualTypeOf<[RegisterInput]>();
    expectTypeOf<SessionGateway['register']>().returns.toEqualTypeOf<Promise<Viewer>>();
    expectTypeOf<SessionGateway['logout']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<SessionGateway['changePassword']>().parameters.toEqualTypeOf<[ChangePasswordInput]>();
    expectTypeOf<SessionGateway['changePassword']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<ProfileReader['me']>().returns.toEqualTypeOf<Promise<Viewer>>();
    expectTypeOf<RegisterInput>().toExtend<LoginInput>();
  });
});

describe('identity subpath ./infrastructure (@tripory/identity/http)', () => {
  it('có gateway, profile reader, claim, mapper và schema DTO', () => {
    expect(missingFrom(httpApi, INFRASTRUCTURE_NAMES)).toEqual([]);
  });

  it('createHttpSessionGateway có ở subpath http và không có ở entry gốc', () => {
    expect('createHttpSessionGateway' in httpApi).toBe(true);
    expect('createHttpSessionGateway' in publicApi).toBe(false);
  });

  it('không lẫn domain hay hook React', () => {
    expect('toSafeNextPath' in httpApi).toBe(false);
    expect('createIdentityHooks' in httpApi).toBe(false);
  });

  it('phơi type AccessTokenClaims', () => {
    expectTypeOf<AccessTokenClaims>().toHaveProperty('exp').toEqualTypeOf<number>();
    expectTypeOf<AccessTokenClaims>().toHaveProperty('email').toEqualTypeOf<string>();
  });
});

describe('identity subpath ./react (@tripory/identity/react)', () => {
  it('có createIdentityHooks và identityKeys', () => {
    expect(missingFrom(reactApi, REACT_NAMES)).toEqual([]);
  });

  it('không lẫn adapter HTTP hay domain', () => {
    expect('createHttpSessionGateway' in reactApi).toBe(false);
    expect('toSafeNextPath' in reactApi).toBe(false);
  });

  it('khóa query của hồ sơ là ["identity", "me"]', () => {
    expect(reactApi.identityKeys.me).toEqual(['identity', 'me']);
  });
});
