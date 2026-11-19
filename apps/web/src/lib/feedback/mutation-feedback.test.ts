import { makeApiError, sessionExpiredError } from "@tripory/api-client";
import { describe, expect, it } from "vitest";
import { GENERIC_ERROR_MESSAGE } from "./error-messages";
import * as feedback from "./index";
import { decideMutationError, decideMutationSuccess } from "./mutation-feedback";

const notFound = makeApiError({ kind: "http", status: 404, code: "Itinerary.NotFound", message: "Itinerary not found" });

describe("decideMutationSuccess", () => {
  it.each([
    ["không khai báo", undefined],
    ["object rỗng", {}],
    ["chuỗi rỗng", { successMessage: "" }],
  ] as const)("%s → null (D-07)", (_name, options) => {
    expect(decideMutationSuccess(options)).toBeNull();
  });

  it("successMessage cố định → toast success (D-08)", () => {
    expect(decideMutationSuccess({ successMessage: "Đã xuất bản lịch trình" })).toEqual({
      variant: "success",
      message: "Đã xuất bản lịch trình",
    });
  });
});

describe("decideMutationError", () => {
  it("mặc định bật toast lỗi (D-09)", () => {
    expect(decideMutationError(notFound)).toEqual({ variant: "error", message: "Không tìm thấy lịch trình." });
  });

  it("errorToast: false → null", () => {
    expect(decideMutationError(notFound, { errorToast: false })).toBeNull();
  });

  it("session_expired → null (Phase 3 onSessionExpired lo)", () => {
    expect(decideMutationError(sessionExpiredError())).toBeNull();
  });

  it("aborted → null", () => {
    expect(decideMutationError(makeApiError({ kind: "aborted", status: null, code: null, message: null }))).toBeNull();
  });

  it("network → câu chung", () => {
    expect(decideMutationError(makeApiError({ kind: "network", status: null, code: null, message: null }))).toEqual({
      variant: "error",
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});

describe("decideMutationError với fallbackMessage", () => {
  const network = makeApiError({ kind: "network", status: null, code: null, message: null });
  const fallbackMessage = "Chưa gửi được bình luận. Nội dung vẫn còn, hãy thử gửi lại.";

  it("network → câu theo ngữ cảnh", () => {
    expect(decideMutationError(network, { fallbackMessage })).toEqual({ variant: "error", message: fallbackMessage });
  });

  it("không có fallbackMessage → câu chung như cũ", () => {
    expect(decideMutationError(network, {})).toEqual({ variant: "error", message: GENERIC_ERROR_MESSAGE });
  });

  it("errorToast: false vẫn null", () => {
    expect(decideMutationError(network, { errorToast: false, fallbackMessage })).toBeNull();
  });

  it("session_expired vẫn null", () => {
    expect(decideMutationError(sessionExpiredError(), { fallbackMessage })).toBeNull();
  });
});

describe("barrel lib/feedback", () => {
  it("phơi các hàm và hằng chính", () => {
    expect(feedback.selectErrorMessage).toBeTypeOf("function");
    expect(feedback.resolveFormError).toBeTypeOf("function");
    expect(feedback.decideMutationSuccess).toBeTypeOf("function");
    expect(feedback.decideMutationError).toBeTypeOf("function");
    expect(feedback.ERROR_MESSAGES.size).toBe(60);
  });
});
