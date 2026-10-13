import { describe, expect, it } from 'vitest';
import * as httpApi from './http';
import * as publicApi from './index';

const missingFrom = (module: object, names: readonly string[]) => names.filter((name) => !(name in module));

describe('api-client public entry', () => {
  it('entry gốc export helper ApiError thuần', () => {
    expect(missingFrom(publicApi, ['isApiError', 'makeApiError', 'SESSION_EXPIRED', 'sessionExpiredError'])).toEqual([]);
  });

  it('entry gốc không có factory client hay helper nội bộ', () => {
    expect('createFetchHttpClient' in publicApi).toBe(false);
    expect('toApiError' in publicApi).toBe(false);
    expect('readBody' in publicApi).toBe(false);
    expect('withSessionRefresh' in publicApi).toBe(false);
  });
});

describe('api-client subpath ./http', () => {
  it('export createFetchHttpClient và DEFAULT_TIMEOUT_MS', () => {
    expect(missingFrom(httpApi, ['createFetchHttpClient', 'DEFAULT_TIMEOUT_MS'])).toEqual([]);
  });

  it('export withSessionRefresh và DEFAULT_SESSION_LOCK_NAME', () => {
    expect('withSessionRefresh' in httpApi).toBe(true);
    expect(missingFrom(httpApi, ['withSessionRefresh', 'DEFAULT_SESSION_LOCK_NAME'])).toEqual([]);
  });

  it('không lộ toApiError', () => {
    expect('toApiError' in httpApi).toBe(false);
  });
});
