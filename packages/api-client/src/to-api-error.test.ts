import { describe, expect, it } from 'vitest';
import type { ApiError } from './api-error';
import {
  emptyForbidden,
  emptyMethodNotAllowed,
  emptyNotFound,
  emptyUnauthorized,
  envelopeFluentValidation,
  envelopeNotFound,
  envelopeServerError,
  envelopeUnauthorized,
  htmlBadGateway,
  problemDetails415,
  validationProblemBodyBroken,
  validationProblemDuplicateKeys,
  validationProblemJsonPath,
  validationProblemPascal,
  type BeFixture,
} from './fixtures/be-responses';
import { readBody } from './response-shapes';
import { normalizeFieldKey, toApiError } from './to-api-error';

const bodyOf = (f: BeFixture): unknown => {
  const result = readBody(f.body);
  return result.kind === 'json' ? result.value : undefined;
};

const plain = (status: number): ApiError => ({ type: 'ApiError', kind: 'http', status, code: null, message: null });

const cases: readonly { name: string; fixture: BeFixture; expected: ApiError }[] = [
  {
    name: '1a envelope 404 Itinerary.NotFound giữ errorCode và message BE',
    fixture: envelopeNotFound,
    expected: { type: 'ApiError', kind: 'http', status: 404, code: 'Itinerary.NotFound', message: 'Không tìm thấy lịch trình.' },
  },
  {
    name: '1b envelope 500 Server.Error',
    fixture: envelopeServerError,
    expected: {
      type: 'ApiError',
      kind: 'http',
      status: 500,
      code: 'Server.Error',
      message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    },
  },
  {
    name: '1c envelope 400 NotEmptyValidator không có fieldErrors',
    fixture: envelopeFluentValidation,
    expected: { type: 'ApiError', kind: 'http', status: 400, code: 'NotEmptyValidator', message: 'Mật khẩu không được để trống.' },
  },
  {
    name: 'envelope 401 Auth.Unauthorized',
    fixture: envelopeUnauthorized,
    expected: { type: 'ApiError', kind: 'http', status: 401, code: 'Auth.Unauthorized', message: 'Bạn chưa đăng nhập.' },
  },
  {
    name: '2 ValidationProblemDetails PascalCase Email → email, message null',
    fixture: validationProblemPascal,
    expected: { ...plain(400), fieldErrors: { email: ['The Email field is required.'] } },
  },
  {
    name: '2 ValidationProblemDetails key $.startDate và command',
    fixture: validationProblemJsonPath,
    expected: {
      ...plain(400),
      fieldErrors: {
        startDate: ['The JSON value could not be converted to System.DateOnly. Path: $.startDate'],
        command: ['The command field is required.'],
      },
    },
  },
  {
    name: '2 ValidationProblemDetails key rỗng giữ nguyên',
    fixture: validationProblemBodyBroken,
    expected: { ...plain(400), fieldErrors: { '': ['A non-empty request body is required.'] } },
  },
  {
    name: '2 ValidationProblemDetails gộp key trùng sau chuẩn hóa',
    fixture: validationProblemDuplicateKeys,
    expected: { ...plain(400), fieldErrors: { email: ['a', 'b'] } },
  },
  { name: '3 ProblemDetails 415 không errors', fixture: problemDetails415, expected: plain(415) },
  { name: '4 body rỗng 401', fixture: emptyUnauthorized, expected: plain(401) },
  { name: '4 body rỗng 403', fixture: emptyForbidden, expected: plain(403) },
  { name: '4 body rỗng 404', fixture: emptyNotFound, expected: plain(404) },
  { name: '4 body rỗng 405', fixture: emptyMethodNotAllowed, expected: plain(405) },
  { name: '5 HTML 502 từ proxy', fixture: htmlBadGateway, expected: plain(502) },
  { name: 'JSON hỏng', fixture: { status: 500, contentType: 'application/json', body: '{"status":' }, expected: plain(500) },
];

describe('toApiError', () => {
  it.each(cases)('$name', ({ fixture, expected }) => {
    const result = toApiError(fixture.status, bodyOf(fixture));
    expect(result).toEqual(expected);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('envelope có errorCode rỗng và message toàn khoảng trắng → null', () => {
    const result = toApiError(400, { status: 'error', data: null, message: '   ', errorCode: '' });
    expect(result).toEqual(plain(400));
  });

  const oddBodies: readonly { name: string; body: unknown }[] = [
    { name: 'chuỗi', body: 'Bad Gateway' },
    { name: 'số', body: 42 },
    { name: 'mảng', body: [1, 2] },
    { name: 'record lạ', body: { foo: 1 } },
    { name: 'status envelope sai kiểu', body: { status: 'weird', errorCode: 'X' } },
    { name: 'errors có value không phải mảng chuỗi', body: { title: 'x', status: 400, errors: { Email: 'oops' } } },
  ];

  it.each(oddBodies)('body lạ ($name) → code/message null, không ném', ({ body }) => {
    expect(toApiError(503, body)).toEqual(plain(503));
  });

  it('không lộ token fake-refresh trong body lỗi', () => {
    const result = toApiError(400, {
      status: 'error',
      data: { refreshToken: 'fake-refresh' },
      message: 'x',
      errorCode: 'Token.Compromised',
    });

    expect(JSON.stringify(result)).not.toContain('fake-refresh');
    const allowed = new Set(['type', 'kind', 'status', 'code', 'message', 'fieldErrors']);
    expect(Object.keys(result).filter((key) => !allowed.has(key))).toEqual([]);
  });
});

describe('normalizeFieldKey', () => {
  it.each([
    ['Email', 'email'],
    ['$.startDate', 'startDate'],
    ['Items[0].Name', 'items[0].name'],
    ['$', ''],
    ['', ''],
    ['command', 'command'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeFieldKey(input)).toBe(expected);
  });
});

describe('readBody', () => {
  it.each([
    { name: 'chuỗi rỗng', text: '', expected: { kind: 'empty' } },
    { name: 'toàn khoảng trắng', text: '  ', expected: { kind: 'empty' } },
    { name: 'JSON hợp lệ', text: '{"a":1}', expected: { kind: 'json', value: { a: 1 } } },
    { name: 'HTML', text: '<html></html>', expected: { kind: 'invalid' } },
    { name: 'JSON hỏng', text: '{"status":', expected: { kind: 'invalid' } },
  ])('$name', ({ text, expected }) => {
    expect(readBody(text)).toEqual(expected);
  });
});
