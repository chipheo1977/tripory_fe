import { describe, expect, expectTypeOf, it } from 'vitest';
import * as publicApi from './index';
import type {
  ChangePasswordInput,
  LoginInput,
  ProfileReader,
  RegisterInput,
  SessionGateway,
  Viewer,
} from './index';

describe('identity public entry', () => {
  it('entry gốc là module hợp lệ', () => {
    expect(typeof publicApi).toBe('object');
  });

  it('phơi domain ở entry gốc', () => {
    expect(Object.keys(publicApi)).toEqual(
      expect.arrayContaining([
        'CHANGE_PASSWORD_RULES',
        'PROACTIVE_LEAD_SEC',
        'REFRESH_IF_BELOW_SEC',
        'REGISTER_PASSWORD_RULES',
        'STALE_AT_SEC',
        'evaluatePasswordRules',
        'isFresh',
        'remainingSeconds',
        'toSafeNextPath',
        'viewerDisplayName',
      ]),
    );
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
