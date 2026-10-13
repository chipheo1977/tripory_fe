// Body thật của BE (tripory_be, đọc ngày 2026-10-12) cho mọi dạng phản hồi, dùng làm fixture test.
// Nguồn từng dạng: 02-RESEARCH.md §"Hình dạng lỗi BE". Không export ra barrel nào.

export type BeFixture = Readonly<{ status: number; contentType: string | null; body: string }>;

const TIMESTAMP = '2026-10-12T08:00:00+00:00';
const JSON_TYPE = 'application/json; charset=utf-8';
const PROBLEM_TYPE = 'application/problem+json; charset=utf-8';
const TRACE_ID = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00';

const envelopeError = (status: number, errorCode: string, message: string): BeFixture => ({
  status,
  contentType: JSON_TYPE,
  body: JSON.stringify({ status: 'error', data: null, message, errorCode, timestamp: TIMESTAMP }),
});

const validationProblem = (errors: Readonly<Record<string, readonly string[]>>): BeFixture => ({
  status: 400,
  contentType: PROBLEM_TYPE,
  body: JSON.stringify({
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
    title: 'One or more validation errors occurred.',
    status: 400,
    errors,
    traceId: TRACE_ID,
  }),
});

const empty = (status: number): BeFixture => ({ status, contentType: null, body: '' });

/** 1a: HandlerFailure, errorCode chứa NotFound → 404. */
export const envelopeNotFound = envelopeError(404, 'Itinerary.NotFound', 'Không tìm thấy lịch trình.');

/** 1b: GlobalExceptionHandler. */
export const envelopeServerError = envelopeError(500, 'Server.Error', 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.');

/** 1c: FluentValidation qua ValidationPipelineBehavior, errorCode là tên validator, không có field. */
export const envelopeFluentValidation = envelopeError(400, 'NotEmptyValidator', 'Mật khẩu không được để trống.');

/** errorCode chứa Unauthorized → 401 có body envelope. */
export const envelopeUnauthorized = envelopeError(401, 'Auth.Unauthorized', 'Bạn chưa đăng nhập.');

/** 2: [ApiController] model binding, key là tên property PascalCase. */
export const validationProblemPascal = validationProblem({ Email: ['The Email field is required.'] });

/** 2: JSON sai kiểu, key là JSON path, kèm key tên tham số. */
export const validationProblemJsonPath = validationProblem({
  '$.startDate': ['The JSON value could not be converted to System.DateOnly. Path: $.startDate'],
  command: ['The command field is required.'],
});

/** 2: cả body hỏng, key rỗng. */
export const validationProblemBodyBroken = validationProblem({ '': ['A non-empty request body is required.'] });

/** 2: hai key trùng nhau sau chuẩn hóa. */
export const validationProblemDuplicateKeys = validationProblem({ Email: ['a'], '$.email': ['b'] });

/** 3: ProblemDetails không có errors (thiếu Content-Type). */
export const problemDetails415: BeFixture = {
  status: 415,
  contentType: PROBLEM_TYPE,
  body: JSON.stringify({
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16',
    title: 'Unsupported Media Type',
    status: 415,
    traceId: TRACE_ID,
  }),
};

/** 4: body rỗng (JwtBearer, Forbid, route constraint, 405). */
export const emptyUnauthorized = empty(401);
export const emptyForbidden = empty(403);
export const emptyNotFound = empty(404);
export const emptyMethodNotAllowed = empty(405);

/** 5: proxy/host trả HTML khi BE ngủ. */
export const htmlBadGateway: BeFixture = {
  status: 502,
  contentType: 'text/html',
  body: '<html><body><h1>502 Bad Gateway</h1></body></html>',
};

/** Envelope thành công: errorCode vẫn có mặt với giá trị null. */
export const envelopeSuccess: BeFixture = {
  status: 200,
  contentType: JSON_TYPE,
  body: JSON.stringify({
    status: 'success',
    data: { id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301', title: 'Đà Lạt' },
    message: null,
    errorCode: null,
    timestamp: TIMESTAMP,
  }),
};

export const envelopeCreated: BeFixture = {
  status: 201,
  contentType: JSON_TYPE,
  body: JSON.stringify({
    status: 'success',
    data: { id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' },
    message: null,
    errorCode: null,
    timestamp: TIMESTAMP,
  }),
};

/** Body refresh thành công chứa token: dùng để kiểm token không lọt vào ApiError. */
export const refreshSuccess: BeFixture = {
  status: 200,
  contentType: JSON_TYPE,
  body: JSON.stringify({
    status: 'success',
    data: { accessToken: 'fake-access', refreshToken: 'fake-refresh', expiresAt: '2026-10-19T08:00:00+00:00' },
    message: null,
    errorCode: null,
    timestamp: TIMESTAMP,
  }),
};
