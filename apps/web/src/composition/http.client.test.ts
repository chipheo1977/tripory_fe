import { isApiError } from "@tripory/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeFakeLockManager } from "@/test/fake-locks";
import { makeBrowserHttp } from "./http.client";

// Dựng một "trình duyệt" giả quanh `makeBrowserHttp`: fake fetch định tuyến theo URL, một cookie jar dùng
// chung cho mọi tab (`fresh`) và bộ đếm `beCalls` chỉ tăng khi route refresh thật sự "gọi BE" (lúc cookie
// còn cũ). Lần gọi khi cookie đã tươi là no-op giống route thật (Pattern 3), không tính vào `beCalls`.

const TIMESTAMP = "2026-10-13T08:00:00+00:00";
const LOCK_NAME = "tripory-session-refresh";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const success = (data: unknown) => ({ status: "success", data, message: null, errorCode: null, timestamp: TIMESTAMP });
const failure = (errorCode: string) => ({ status: "error", data: null, message: null, errorCode, timestamp: TIMESTAMP });

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Nhường vài lượt macrotask cho các promise đang chờ chạy tiếp. */
const settle = () => new Promise<void>((done) => setTimeout(done, 10));

type RefreshMode = "ok" | "unavailable" | "network" | "expired";

function makeWorld() {
  const world = {
    /** Cookie jar dùng chung: true khi access token còn tươi. */
    fresh: false,
    /** Số lần route refresh thật sự gọi BE (xoay refresh token). */
    beCalls: 0,
    /** Số lần route refresh được gọi, kể cả lần no-op. */
    refreshCalls: 0,
    bffCalls: 0,
    refreshMode: "ok" as RefreshMode,
    refreshGate: null as Deferred | null,
    bffGate: null as Deferred | null,
    requests: [] as string[],
  };

  const fakeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? "GET";
    world.requests.push(`${method} ${url}`);

    if (url === "/api/auth/refresh" && method === "POST") {
      world.refreshCalls += 1;
      if (world.refreshMode === "network") throw new TypeError("Failed to fetch");
      if (world.refreshMode === "unavailable") return jsonResponse(failure("Bff.RefreshUnavailable"), 503);
      if (world.refreshMode === "expired") return jsonResponse(failure("session.expired"), 401);
      if (world.fresh) return jsonResponse(success({ refreshed: false }));

      world.beCalls += 1;
      await world.refreshGate?.promise;
      world.fresh = true;
      return jsonResponse(success({ refreshed: true }));
    }

    if (url === "/api/bff/users/me" && method === "GET") {
      world.bffCalls += 1;
      // Chốt trạng thái lúc gửi: request đang bay trước khi refresh xong vẫn nhận 401 muộn.
      const stale = !world.fresh;
      await world.bffGate?.promise;
      return stale ? jsonResponse(failure("session.expired"), 401) : jsonResponse(success({ id: "u1" }));
    }

    if (url === "/api/auth/login" && method === "POST") {
      return jsonResponse(failure("Auth.InvalidCredentials"), 401);
    }

    if (url === "/api/auth/change-password" && method === "POST") {
      return world.fresh ? jsonResponse(success(null)) : jsonResponse(failure("session.expired"), 401);
    }

    return jsonResponse(failure("Test.UnknownRoute"), 404);
  });

  return { world, fetch: fakeFetch as unknown as typeof fetch };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("makeBrowserHttp: một đường refresh (AUTH-03, Pitfall 3)", () => {
  it.each([
    ["Web Locks", () => makeFakeLockManager()],
    ["mutex trong tab (không có navigator.locks)", () => undefined],
  ])("5 request 401 song song cộng 1 refreshSession() chủ động chỉ gọi BE đúng 1 lần: %s", async (_name, makeLocks) => {
    const { world, fetch } = makeWorld();
    const onSessionExpired = vi.fn();
    const http = makeBrowserHttp({ fetch, locks: makeLocks(), onSessionExpired });
    world.bffGate = deferred();
    world.refreshGate = deferred();

    // 5 request cùng bay lúc cookie còn cũ.
    const requests = Array.from({ length: 5 }, () => http.bffHttp.send({ method: "GET", path: "/users/me" }));
    await vi.waitFor(() => expect(world.bffCalls).toBe(5));

    // Refresh chủ động bắt đầu và giữ khóa trong khi 5 request nhận 401.
    const proactive = http.refreshSession();
    await vi.waitFor(() => expect(world.refreshCalls).toBe(1));
    world.bffGate.resolve();
    await settle();

    // Lần refresh của 5 request đang xếp hàng sau khóa, chưa tới route.
    expect(world.refreshCalls).toBe(1);
    world.refreshGate.resolve();

    await expect(Promise.all(requests)).resolves.toEqual(Array.from({ length: 5 }, () => ({ id: "u1" })));
    await expect(proactive).resolves.toBe("refreshed");

    expect(world.beCalls).toBe(1);
    // Lần thứ hai tới được route nhưng route no-op vì cookie đã tươi.
    expect(world.refreshCalls).toBe(2);
    expect(world.bffCalls).toBe(10);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("hai tab dùng chung khóa: tab B chờ tab A và không gọi BE lại", async () => {
    const { world, fetch } = makeWorld();
    const locks = makeFakeLockManager();
    const tabA = makeBrowserHttp({ fetch, locks, onSessionExpired: vi.fn() });
    const tabB = makeBrowserHttp({ fetch, locks, onSessionExpired: vi.fn() });
    world.refreshGate = deferred();

    const a = tabA.refreshSession();
    const b = tabB.refreshSession();
    await vi.waitFor(() => expect(world.refreshCalls).toBe(1));
    await settle();

    // Tab B bị khóa chặn: chưa gửi gì tới route.
    expect(world.refreshCalls).toBe(1);

    world.refreshGate.resolve();

    await expect(a).resolves.toBe("refreshed");
    await expect(b).resolves.toBe("refreshed");
    expect(world.beCalls).toBe(1);
    expect(world.refreshCalls).toBe(2);
  });

  it("tab B gọi refreshSession() ngay sau khi tab A xong: route no-op, không gọi BE lần hai", async () => {
    const { world, fetch } = makeWorld();
    const locks = makeFakeLockManager();
    const tabA = makeBrowserHttp({ fetch, locks, onSessionExpired: vi.fn() });
    const tabB = makeBrowserHttp({ fetch, locks, onSessionExpired: vi.fn() });

    await expect(tabA.refreshSession()).resolves.toBe("refreshed");
    await expect(tabB.refreshSession()).resolves.toBe("refreshed");

    expect(world.beCalls).toBe(1);
  });

  it("hai refreshSession() đồng thời trong cùng tab dùng chung một lượt", async () => {
    const { world, fetch } = makeWorld();
    const http = makeBrowserHttp({ fetch, locks: undefined, onSessionExpired: vi.fn() });

    const [first, second] = await Promise.all([http.refreshSession(), http.refreshSession()]);

    expect(first).toBe("refreshed");
    expect(second).toBe("refreshed");
    expect(world.refreshCalls).toBe(1);
    expect(world.beCalls).toBe(1);
  });

  it("gọi route refresh bằng POST /api/auth/refresh", async () => {
    const { world, fetch } = makeWorld();
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    await http.refreshSession();

    expect(world.requests).toEqual(["POST /api/auth/refresh"]);
  });

  it("luôn hỏi route, không tự bỏ qua theo đồng hồ máy", async () => {
    const { world, fetch } = makeWorld();
    world.fresh = true;
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    await expect(http.refreshSession()).resolves.toBe("refreshed");

    expect(world.refreshCalls).toBe(1);
    expect(world.beCalls).toBe(0);
  });
});

describe("makeBrowserHttp: xin khóa quá hạn (Pitfall 6)", () => {
  it("quá 40 giây thì reject lỗi tạm thời kind timeout, không phát expired", async () => {
    vi.useFakeTimers();
    const { world, fetch } = makeWorld();
    const locks = makeFakeLockManager();
    const onSessionExpired = vi.fn();
    // Tab khác (đóng băng ở iOS nền) giữ khóa mãi mãi.
    void locks.request(LOCK_NAME, () => new Promise<never>(() => undefined));
    const http = makeBrowserHttp({ fetch, locks, onSessionExpired });

    let settled = false;
    const outcome = http.refreshSession().then(
      () => null,
      (error: unknown) => error,
    );
    void outcome.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(39_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const error = await outcome;

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ kind: "timeout", status: null, code: null });
    expect(error).not.toBeInstanceOf(DOMException);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(world.refreshCalls).toBe(0);
  });

  it("sau khi hết hạn xin khóa, lần refreshSession() kế tiếp xin lại được (inFlight được reset)", async () => {
    vi.useFakeTimers();
    const { fetch } = makeWorld();
    const locks = makeFakeLockManager();
    void locks.request(LOCK_NAME, () => new Promise<never>(() => undefined));
    const http = makeBrowserHttp({ fetch, locks, onSessionExpired: vi.fn() });

    const first = http.refreshSession().then(
      () => null,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(40_000);
    await first;

    const second = http.refreshSession().then(
      () => null,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(40_000);

    expect(await second).toMatchObject({ kind: "timeout" });
  });

  it("lockWaitMs tùy chỉnh được hạn chờ", async () => {
    vi.useFakeTimers();
    const { fetch } = makeWorld();
    const locks = makeFakeLockManager();
    void locks.request(LOCK_NAME, () => new Promise<never>(() => undefined));
    const http = makeBrowserHttp({ fetch, locks, onSessionExpired: vi.fn(), lockWaitMs: 1_000 });

    const outcome = http.refreshSession().then(
      () => null,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await outcome).toMatchObject({ kind: "timeout" });
  });

  it("lỗi của chính tác vụ trong khóa lan nguyên, không bị đổi thành timeout", async () => {
    const { world, fetch } = makeWorld();
    world.refreshMode = "unavailable";
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    await expect(http.refreshSession()).rejects.toMatchObject({ kind: "http", status: 503 });
  });
});

describe("makeBrowserHttp: hết phiên và lỗi tạm thời (D-14a, D-20)", () => {
  it("route refresh trả 401: refreshSession() resolve 'expired'", async () => {
    const { world, fetch } = makeWorld();
    world.refreshMode = "expired";
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    await expect(http.refreshSession()).resolves.toBe("expired");
  });

  it("route refresh trả 401: 5 request song song reject session_expired và onSessionExpired đúng 1 lần", async () => {
    const { world, fetch } = makeWorld();
    world.refreshMode = "expired";
    const onSessionExpired = vi.fn();
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        http.bffHttp.send({ method: "GET", path: "/users/me" }).then(
          () => null,
          (error: unknown) => error,
        ),
      ),
    );

    for (const error of results) expect(error).toMatchObject({ kind: "session_expired", status: 401 });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    // Refresh không đệ quy: route refresh mà trả 401 cũng không kéo thêm lượt refresh nào.
    expect(world.refreshCalls).toBe(1);
  });

  it.each([
    ["503", "unavailable", { kind: "http", status: 503 }],
    ["lỗi mạng", "network", { kind: "network", status: null }],
  ] as const)("route refresh %s: lỗi tạm thời, không phát expired, lần 401 kế tiếp refresh lại được", async (_name, mode, shape) => {
    const { world, fetch } = makeWorld();
    const onSessionExpired = vi.fn();
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired });
    world.refreshMode = mode;

    const error = await http.bffHttp.send({ method: "GET", path: "/users/me" }).then(
      () => null,
      (rejected: unknown) => rejected,
    );

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject(shape);
    expect(onSessionExpired).not.toHaveBeenCalled();

    // Cookie vẫn còn: BE hồi lại thì request kế tiếp refresh được.
    world.refreshMode = "ok";
    await expect(http.bffHttp.send({ method: "GET", path: "/users/me" })).resolves.toEqual({ id: "u1" });

    expect(world.beCalls).toBe(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe("makeBrowserHttp: authHttp và bffHttp", () => {
  it("authHttp dùng base /api/auth và request sessionRefresh:false không bao giờ vào nhánh refresh", async () => {
    const { world, fetch } = makeWorld();
    const onSessionExpired = vi.fn();
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired });

    const error = await http.authHttp
      .send({ method: "POST", path: "/login", body: { email: "a@b.vn", password: "x" }, sessionRefresh: false })
      .then(
        () => null,
        (rejected: unknown) => rejected,
      );

    // 401 của login là sai thông tin, không phải hết phiên: giữ nguyên lỗi BE.
    expect(error).toMatchObject({ kind: "http", status: 401, code: "Auth.InvalidCredentials" });
    expect(world.requests).toEqual(["POST /api/auth/login"]);
    expect(world.refreshCalls).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("authHttp mặc định vẫn refresh khi gặp 401 session.expired (đổi mật khẩu) rồi phát lại", async () => {
    const { world, fetch } = makeWorld();
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    await expect(
      http.authHttp.send({ method: "POST", path: "/change-password", body: { currentPassword: "a", newPassword: "b" } }),
    ).resolves.toBeNull();

    expect(world.requests).toEqual([
      "POST /api/auth/change-password",
      "POST /api/auth/refresh",
      "POST /api/auth/change-password",
    ]);
    expect(world.beCalls).toBe(1);
  });

  it("bffHttp dùng base /api/bff", async () => {
    const { world, fetch } = makeWorld();
    world.fresh = true;
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    await expect(http.bffHttp.send({ method: "GET", path: "/users/me" })).resolves.toEqual({ id: "u1" });

    expect(world.requests).toEqual(["GET /api/bff/users/me"]);
  });

  it("authHttp và bffHttp cùng một khóa: refresh từ hai client vẫn chỉ gọi BE một lần", async () => {
    const { world, fetch } = makeWorld();
    const http = makeBrowserHttp({ fetch, locks: makeFakeLockManager(), onSessionExpired: vi.fn() });

    const [changed, me] = await Promise.all([
      http.authHttp.send({ method: "POST", path: "/change-password", body: {} }),
      http.bffHttp.send({ method: "GET", path: "/users/me" }),
    ]);

    expect(changed).toBeNull();
    expect(me).toEqual({ id: "u1" });
    expect(world.beCalls).toBe(1);
  });
});
