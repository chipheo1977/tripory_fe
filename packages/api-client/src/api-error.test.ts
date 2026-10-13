import { describe, expect, it } from 'vitest';
import { isApiError, makeApiError, SESSION_EXPIRED, sessionExpiredError } from './api-error';

describe('makeApiError', () => {
  it('trả object frozen có type ApiError, không có key fieldErrors khi không truyền', () => {
    const error = makeApiError({ kind: 'http', status: 404, code: 'Itinerary.NotFound', message: 'x' });

    expect(error).toEqual({ type: 'ApiError', kind: 'http', status: 404, code: 'Itinerary.NotFound', message: 'x' });
    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.keys(error)).toEqual(['type', 'kind', 'status', 'code', 'message']);
  });

  it('có fieldErrors thì thêm key fieldErrors', () => {
    const error = makeApiError({
      kind: 'http',
      status: 400,
      code: null,
      message: null,
      fieldErrors: { email: ['The Email field is required.'] },
    });

    expect(Object.keys(error)).toEqual(['type', 'kind', 'status', 'code', 'message', 'fieldErrors']);
    expect(error.fieldErrors).toEqual({ email: ['The Email field is required.'] });
  });
});

describe('isApiError', () => {
  it('nhận ra ApiError do makeApiError tạo', () => {
    expect(isApiError(makeApiError({ kind: 'network', status: null, code: null, message: null }))).toBe(true);
  });

  const notApiErrors: readonly { name: string; value: unknown }[] = [
    { name: 'Error thường', value: new Error('x') },
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
    { name: 'chuỗi ApiError', value: 'ApiError' },
    { name: 'thiếu kind', value: { type: 'ApiError' } },
    { name: 'kind lạ', value: { type: 'ApiError', kind: 'lạ' } },
    { name: 'thiếu type', value: { kind: 'http' } },
  ];

  it.each(notApiErrors)('$name → false', ({ value }) => {
    expect(isApiError(value)).toBe(false);
  });
});

describe('sessionExpiredError', () => {
  it('trả lỗi session_expired 401 với code session.expired', () => {
    expect(SESSION_EXPIRED).toBe('session.expired');
    expect(sessionExpiredError()).toEqual({
      type: 'ApiError',
      kind: 'session_expired',
      status: 401,
      code: 'session.expired',
      message: null,
    });
    expect(isApiError(sessionExpiredError())).toBe(true);
  });
});
