import { makeApiError, type FieldErrors } from "@tripory/api-client";
import { describe, expect, it } from "vitest";
import { FIELD_INVALID_MESSAGE, GENERIC_ERROR_MESSAGE } from "./error-messages";
import { resolveFormError } from "./resolve-form-error";

const validation = (fieldErrors: FieldErrors) =>
  makeApiError({ kind: "http", status: 400, code: null, message: null, fieldErrors });

describe("resolveFormError", () => {
  it("field khớp form → 'Giá trị không hợp lệ.' ở ô đó, không toast", () => {
    const result = resolveFormError(validation({ email: ["The Email field is required."] }), ["email", "password"]);
    expect(result).toEqual({ fieldErrors: { email: FIELD_INVALID_MESSAGE }, toastMessage: null });
  });

  it("field không khớp form → toast câu chung", () => {
    const result = resolveFormError(validation({ startDate: ["The StartDate field is required."] }), ["title"]);
    expect(result).toEqual({ fieldErrors: {}, toastMessage: GENERIC_ERROR_MESSAGE });
  });

  it("hỗn hợp field khớp + key rỗng → gắn field và toast câu chung", () => {
    const result = resolveFormError(
      validation({ email: ["The Email field is required."], "": ["A non-empty request body is required."] }),
      ["email"],
    );
    expect(result).toEqual({ fieldErrors: { email: FIELD_INVALID_MESSAGE }, toastMessage: GENERIC_ERROR_MESSAGE });
  });

  it("FluentValidation (không fieldErrors) → toast message BE (D-05a)", () => {
    const error = makeApiError({
      kind: "http",
      status: 400,
      code: "NotEmptyValidator",
      message: "Mật khẩu không được để trống.",
    });
    expect(resolveFormError(error, ["password"])).toEqual({
      fieldErrors: {},
      toastMessage: "Mật khẩu không được để trống.",
    });
  });

  it.each([
    ["network", makeApiError({ kind: "network", status: null, code: null, message: null })],
    ["Error thường", new Error("boom")],
  ] as const)("%s → toast câu chung", (_name, error) => {
    expect(resolveFormError(error, ["email"])).toEqual({ fieldErrors: {}, toastMessage: GENERIC_ERROR_MESSAGE });
  });

  it("aborted → không toast", () => {
    const error = makeApiError({ kind: "aborted", status: null, code: null, message: null });
    expect(resolveFormError(error, ["email"])).toEqual({ fieldErrors: {}, toastMessage: null });
  });

  it.each([
    [{ email: ["The Email field is required."] }, ["email"]],
    [{ email: ["The Email field is required."] }, ["title"]],
    [{ email: ["The Email field is required."], "": ["The Email field is invalid."] }, ["email"]],
  ] as const)("không chuỗi tiếng Anh nào của BE lọt ra (%#)", (fieldErrors, fieldNames) => {
    expect(JSON.stringify(resolveFormError(validation(fieldErrors), fieldNames))).not.toContain("The Email field");
  });

  it("key __proto__ không đổi prototype của kết quả", () => {
    const fieldErrors = JSON.parse('{"__proto__": ["x"], "email": ["y"]}') as FieldErrors;
    const result = resolveFormError(validation(fieldErrors), ["__proto__", "email"]);
    expect(Object.getPrototypeOf(result.fieldErrors)).toBe(Object.prototype);
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["__proto__", "email"]);
    expect(result.toastMessage).toBeNull();
  });
});
