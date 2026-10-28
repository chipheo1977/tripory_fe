import { makeApiError, sessionExpiredError, type FieldErrors } from "@tripory/api-client";
import { describe, expect, it } from "vitest";
import { FIELD_INVALID_MESSAGE, GENERIC_ERROR_MESSAGE } from "./error-messages";
import { FORM_ALERT, mapFormError, type FormErrorTarget } from "./form-error";

// Form giả với hai ô, đủ để thử phần generic mà không phụ thuộc bảng map của form nào.
const FIELDS = ["title", "startDate"] as const;
type Field = (typeof FIELDS)[number];

const TABLE: ReadonlyMap<string, FormErrorTarget<Field>> = new Map<string, FormErrorTarget<Field>>([
  ["Itinerary.Title", "title"],
  ["NotEmptyValidator", FORM_ALERT],
]);

const map = (error: unknown) => mapFormError(error, FIELDS, TABLE);
const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });
const validation = (fieldErrors: FieldErrors) =>
  makeApiError({ kind: "http", status: 400, code: null, message: null, fieldErrors });

describe("mapFormError", () => {
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
    ["http 500 không mã", http(500, null, null)],
  ] as const)("%s → alert câu chung", (_name, error) => {
    expect(map(error)).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("mã trong bảng trỏ tới ô → gắn ô với message BE, không alert", () => {
    expect(map(http(400, "Itinerary.Title", "Tiêu đề quá dài."))).toEqual({
      fieldErrors: { title: "Tiêu đề quá dài." },
      alert: null,
    });
  });

  it("mã trong bảng trỏ tới alert → alert message BE", () => {
    expect(map(http(400, "NotEmptyValidator", "Không được để trống."))).toEqual({
      fieldErrors: {},
      alert: "Không được để trống.",
    });
  });

  it("mã không có trong bảng → alert message BE rồi câu chung", () => {
    expect(map(http(400, "Some.Unknown", "Thông báo từ BE."))).toEqual({
      fieldErrors: {},
      alert: "Thông báo từ BE.",
    });
    expect(map(http(400, "Some.Unknown", null))).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("fieldErrors khớp ô → 'Giá trị không hợp lệ.' ở ô đó, không alert", () => {
    expect(map(validation({ title: ["The Title field is required."] }))).toEqual({
      fieldErrors: { title: FIELD_INVALID_MESSAGE },
      alert: null,
    });
  });

  it("fieldErrors có key lạ → alert câu chung, không gắn ô", () => {
    expect(map(validation({ unknown: ["Bad."] }))).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("hỗn hợp key khớp + key rỗng → gắn ô và alert câu chung", () => {
    expect(map(validation({ startDate: ["Bad."], "": ["A non-empty request body is required."] }))).toEqual({
      fieldErrors: { startDate: FIELD_INVALID_MESSAGE },
      alert: GENERIC_ERROR_MESSAGE,
    });
  });

  it("key __proto__ không đổi prototype của kết quả", () => {
    const fieldErrors = JSON.parse('{"__proto__": ["x"]}') as FieldErrors;
    const result = map(validation(fieldErrors));

    expect(Object.getPrototypeOf(result?.fieldErrors)).toBe(Object.prototype);
    expect(result).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("mã kiểu prototype (toString) không khớp nhầm bảng", () => {
    expect(map(http(400, "toString", "Từ BE."))).toEqual({ fieldErrors: {}, alert: "Từ BE." });
  });
});
