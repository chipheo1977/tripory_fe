import { makeApiError, sessionExpiredError, type FieldErrors } from "@tripory/api-client";
import { describe, expect, it } from "vitest";
import { FIELD_INVALID_MESSAGE, GENERIC_ERROR_MESSAGE } from "@/lib/feedback";
import { mapChangePasswordError, mapLoginError, mapRegisterError } from "./form-error-mapping";

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const validation = (fieldErrors: FieldErrors) =>
  makeApiError({ kind: "http", status: 400, code: null, message: null, fieldErrors });

/** Mỗi form kèm một field hợp lệ của nó để thử nhánh ValidationProblemDetails. */
const forms = [
  ["mapLoginError", mapLoginError, "email"],
  ["mapRegisterError", mapRegisterError, "fullName"],
  ["mapChangePasswordError", mapChangePasswordError, "newPassword"],
] as const;

describe.each(forms)("%s (hành vi chung)", (_name, map, knownField) => {
  it.each([
    ["session_expired", sessionExpiredError()],
    ["aborted", makeApiError({ kind: "aborted", status: null, code: null, message: null })],
  ] as const)("%s → null (không hiện gì, D-20)", (_kind, error) => {
    expect(map(error)).toBeNull();
  });

  it.each([
    ["lỗi không phải ApiError", new TypeError("x")],
    ["network", makeApiError({ kind: "network", status: null, code: null, message: null })],
    ["timeout", makeApiError({ kind: "timeout", status: null, code: null, message: null })],
    ["parse", makeApiError({ kind: "parse", status: 200, code: null, message: null })],
    ["http 500 không mã", http(500, null, null)],
    ["http 500 Server.Error", http(500, "Server.Error", "Internal")],
  ] as const)("%s → alert câu chung (D-04, D-31)", (_name2, error) => {
    expect(map(error)).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("fieldErrors khớp field của form → 'Giá trị không hợp lệ.' ở ô đó, không alert", () => {
    expect(map(validation({ [knownField]: ["The field is required."] }))).toEqual({
      fieldErrors: { [knownField]: FIELD_INVALID_MESSAGE },
      alert: null,
    });
  });

  it("fieldErrors có key lạ → alert câu chung, không gắn ô", () => {
    expect(map(validation({ startDate: ["The StartDate field is required."] }))).toEqual({
      fieldErrors: {},
      alert: GENERIC_ERROR_MESSAGE,
    });
  });

  it("hỗn hợp key khớp + key rỗng → gắn ô và alert câu chung", () => {
    expect(
      map(validation({ [knownField]: ["The field is required."], "": ["A non-empty request body is required."] })),
    ).toEqual({ fieldErrors: { [knownField]: FIELD_INVALID_MESSAGE }, alert: GENERIC_ERROR_MESSAGE });
  });

  it("không chuỗi tiếng Anh nào của BE lọt ra từ fieldErrors", () => {
    const result = map(validation({ [knownField]: ["The Email field is required."], other: ["Bad request."] }));
    expect(JSON.stringify(result)).not.toMatch(/The Email field|Bad request/);
  });

  it("key __proto__ không đổi prototype của kết quả", () => {
    const fieldErrors = JSON.parse('{"__proto__": ["x"]}') as FieldErrors;
    const result = map(validation(fieldErrors));
    expect(Object.getPrototypeOf(result?.fieldErrors)).toBe(Object.prototype);
    expect(result).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("NotEmptyValidator (mơ hồ: nhiều field cùng mã) → alert message BE, không gắn ô", () => {
    expect(map(http(400, "NotEmptyValidator", "Mật khẩu không được để trống."))).toEqual({
      fieldErrors: {},
      alert: "Mật khẩu không được để trống.",
    });
  });

  it("mã không có trong bảng → alert theo selectErrorMessage (message BE rồi câu chung)", () => {
    expect(map(http(400, "Some.Unknown", "Thông báo từ BE."))).toEqual({
      fieldErrors: {},
      alert: "Thông báo từ BE.",
    });
    expect(map(http(400, "Some.Unknown", null))).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });
});

describe("mapLoginError", () => {
  it("Auth.InvalidCredentials → alert theo bảng map, không gắn ô (D-05)", () => {
    expect(mapLoginError(http(400, "Auth.InvalidCredentials", "Invalid credentials"))).toEqual({
      fieldErrors: {},
      alert: "Email hoặc mật khẩu không đúng.",
    });
  });

  it("Auth.UserBanned → alert message BE (có lý do khóa)", () => {
    expect(mapLoginError(http(400, "Auth.UserBanned", "Tài khoản bị khóa vì vi phạm."))).toEqual({
      fieldErrors: {},
      alert: "Tài khoản bị khóa vì vi phạm.",
    });
  });

  it("EmailValidator → ô email, message BE", () => {
    expect(mapLoginError(http(400, "EmailValidator", "Email không hợp lệ."))).toEqual({
      fieldErrors: { email: "Email không hợp lệ." },
      alert: null,
    });
  });

  it("mã của form khác không gắn nhầm ô: MinimumLengthValidator ở login → alert", () => {
    expect(mapLoginError(http(400, "MinimumLengthValidator", "Quá ngắn."))).toEqual({
      fieldErrors: {},
      alert: "Quá ngắn.",
    });
  });
});

describe("mapRegisterError", () => {
  it("User.EmailAlreadyExists → ô email với câu của bảng map", () => {
    expect(mapRegisterError(http(409, "User.EmailAlreadyExists", "Email already exists"))).toEqual({
      fieldErrors: { email: "Email này đã được đăng ký." },
      alert: null,
    });
  });

  it.each([
    ["Email.InvalidFormat", "Email không đúng định dạng."],
    ["Email.Empty", "Vui lòng nhập email."],
  ] as const)("%s → ô email với câu của bảng map", (code, expected) => {
    expect(mapRegisterError(http(400, code, "msg BE"))).toEqual({ fieldErrors: { email: expected }, alert: null });
  });

  it.each(["Email.TooLong", "EmailValidator"] as const)("%s → ô email với message BE", (code) => {
    expect(mapRegisterError(http(400, code, "Email quá dài."))).toEqual({
      fieldErrors: { email: "Email quá dài." },
      alert: null,
    });
  });

  it("MaximumLengthValidator → ô fullName, message BE", () => {
    expect(mapRegisterError(http(400, "MaximumLengthValidator", "Họ và tên tối đa 100 ký tự."))).toEqual({
      fieldErrors: { fullName: "Họ và tên tối đa 100 ký tự." },
      alert: null,
    });
  });

  it("User.InvalidFullName → ô fullName với câu của bảng map", () => {
    expect(mapRegisterError(http(400, "User.InvalidFullName", "msg BE"))).toEqual({
      fieldErrors: { fullName: "Họ và tên không được để trống." },
      alert: null,
    });
  });

  it("MinimumLengthValidator → ô password, message BE", () => {
    expect(mapRegisterError(http(400, "MinimumLengthValidator", "Mật khẩu tối thiểu 8 ký tự."))).toEqual({
      fieldErrors: { password: "Mật khẩu tối thiểu 8 ký tự." },
      alert: null,
    });
  });

  it("ô gắn lỗi dùng câu chung khi BE không có message và mã không có trong bảng map", () => {
    expect(mapRegisterError(http(400, "MinimumLengthValidator", null))).toEqual({
      fieldErrors: { password: GENERIC_ERROR_MESSAGE },
      alert: null,
    });
  });
});

describe("mapChangePasswordError", () => {
  it("Auth.InvalidCurrentPassword → ô currentPassword (D-19)", () => {
    expect(mapChangePasswordError(http(400, "Auth.InvalidCurrentPassword", "Wrong password"))).toEqual({
      fieldErrors: { currentPassword: "Mật khẩu hiện tại không đúng." },
      alert: null,
    });
  });

  it("NotEqualValidator (mới trùng cũ) → ô newPassword, message BE (D-19)", () => {
    expect(
      mapChangePasswordError(
        http(400, "NotEqualValidator", "Mật khẩu mới không được trùng với mật khẩu hiện tại."),
      ),
    ).toEqual({
      fieldErrors: { newPassword: "Mật khẩu mới không được trùng với mật khẩu hiện tại." },
      alert: null,
    });
  });

  it.each(["MinimumLengthValidator", "RegularExpressionValidator"] as const)(
    "%s → ô newPassword, message BE",
    (code) => {
      expect(mapChangePasswordError(http(400, code, "Mật khẩu chưa đạt yêu cầu."))).toEqual({
        fieldErrors: { newPassword: "Mật khẩu chưa đạt yêu cầu." },
        alert: null,
      });
    },
  );

  it("mã đăng ký không gắn nhầm ô ở form đổi mật khẩu: User.EmailAlreadyExists → alert", () => {
    expect(mapChangePasswordError(http(409, "User.EmailAlreadyExists", "x"))).toEqual({
      fieldErrors: {},
      alert: "Email này đã được đăng ký.",
    });
  });
});
