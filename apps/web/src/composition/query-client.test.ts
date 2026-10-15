import { makeApiError, sessionExpiredError } from "@tripory/api-client";
import { notify } from "@tripory/ui-web";
import { MutationObserver } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR_MESSAGE } from "@/lib/feedback";
import { makeQueryClient } from "./query-client";

vi.mock("@tripory/ui-web", () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

type Feedback = { successMessage?: string; errorToast?: boolean };

const runSuccess = async (feedback?: Feedback) => {
  const queryClient = makeQueryClient();
  const observer = new MutationObserver(queryClient, {
    mutationFn: async () => "ok",
    meta: feedback === undefined ? undefined : { feedback },
  });

  await observer.mutate();
};

const runFailure = async (error: unknown, feedback?: Feedback) => {
  const queryClient = makeQueryClient();
  const observer = new MutationObserver(queryClient, {
    mutationFn: async () => {
      throw error;
    },
    meta: feedback === undefined ? undefined : { feedback },
  });

  await observer.mutate().catch(() => undefined);
};

describe("makeQueryClient: mặc định (Phase 2 D-12)", () => {
  it("query và mutation không tự thử lại", () => {
    const defaults = makeQueryClient().getDefaultOptions();

    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("mỗi lần gọi trả một QueryClient mới (không dùng chung cache giữa tài khoản)", () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient());
  });

  it("dữ liệu tươi 60 giây", () => {
    expect(makeQueryClient().getDefaultOptions().queries?.staleTime).toBe(60_000);
  });
});

describe("makeQueryClient: toast khi mutation thành công (FND-05)", () => {
  it("có successMessage → notify.success đúng 1 lần", async () => {
    await runSuccess({ successMessage: "Xong" });

    expect(notify.success).toHaveBeenCalledTimes(1);
    expect(notify.success).toHaveBeenCalledWith("Xong");
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("không có successMessage → không toast", async () => {
    await runSuccess({});

    expect(notify.success).not.toHaveBeenCalled();
  });

  it("không có meta → không toast", async () => {
    await runSuccess();

    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });
});

describe("makeQueryClient: toast khi mutation lỗi (FND-05)", () => {
  it("ApiError http 400 có message BE → notify.error với message đó", async () => {
    await runFailure(makeApiError({ kind: "http", status: 400, code: null, message: "Mật khẩu quá ngắn" }));

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(notify.error).toHaveBeenCalledWith("Mật khẩu quá ngắn");
  });

  it("mã lỗi có trong bảng map → câu của FE", async () => {
    await runFailure(
      makeApiError({ kind: "http", status: 404, code: "Itinerary.NotFound", message: "Itinerary not found" }),
    );

    expect(notify.error).toHaveBeenCalledWith("Không tìm thấy lịch trình.");
  });

  it("lỗi mạng → câu chung", async () => {
    await runFailure(makeApiError({ kind: "network", status: null, code: null, message: null }));

    expect(notify.error).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
  });

  it("errorToast: false → không toast", async () => {
    await runFailure(makeApiError({ kind: "http", status: 400, code: null, message: "Sai rồi" }), {
      errorToast: false,
    });

    expect(notify.error).not.toHaveBeenCalled();
  });

  it("session_expired → không toast (onSessionExpired lo)", async () => {
    await runFailure(sessionExpiredError());

    expect(notify.error).not.toHaveBeenCalled();
  });

  it("aborted → không toast", async () => {
    await runFailure(makeApiError({ kind: "aborted", status: null, code: null, message: null }));

    expect(notify.error).not.toHaveBeenCalled();
  });

  it("lỗi không phải ApiError → câu chung, không lộ chi tiết kỹ thuật", async () => {
    await runFailure(new TypeError("x is not a function"));

    expect(notify.error).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
  });
});
