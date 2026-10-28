// @vitest-environment node
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  itineraryDetailJson,
  itineraryEnvelope,
  summaryJson,
  summaryPageJson,
} from "./be-itinerary-fixtures";
import { makeFakeBroadcastChannelHub } from "./fake-broadcast-channel";
import { installFakeIntersectionObserver } from "./fake-intersection-observer";
import { makeFakeLockManager } from "./fake-locks";
import { installFakeResizeObserver } from "./fake-resize-observer";
import { makeRequest, setCookiesOf } from "./next-request";

/** Nhường event loop để các microtask/macrotask đang chờ chạy hết. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
}>;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("makeRequest", () => {
  it("dựng NextRequest với URL, method, origin, cookie và body JSON", async () => {
    const request = makeRequest("/api/x", {
      method: "POST",
      origin: "https://app.test",
      cookies: { a: "1" },
      headers: { "x-extra": "yes" },
      body: { email: "a@b.vn" },
    });

    expect(request.url).toBe("https://app.test/api/x");
    expect(request.method).toBe("POST");
    expect(request.headers.get("origin")).toBe("https://app.test");
    expect(request.headers.get("cookie")).toBe("a=1");
    expect(request.cookies.get("a")?.value).toBe("1");
    expect(request.headers.get("x-extra")).toBe("yes");
    expect(request.headers.get("content-type")).toBe("application/json");
    await expect(request.json()).resolves.toEqual({ email: "a@b.vn" });
  });

  it("ghép nhiều cookie thành một header cookie", () => {
    const request = makeRequest("/api/x", { cookies: { a: "1", b: "2" } });

    expect(request.headers.get("cookie")).toBe("a=1; b=2");
    expect(request.cookies.get("b")?.value).toBe("2");
  });

  it("mặc định GET, không origin header, không cookie, không body", () => {
    const request = makeRequest("/api/x?y=1");

    expect(request.method).toBe("GET");
    expect(request.url).toBe("https://app.test/api/x?y=1");
    expect(request.nextUrl.searchParams.get("y")).toBe("1");
    expect(request.headers.has("origin")).toBe(false);
    expect(request.headers.has("cookie")).toBe(false);
    expect(request.body).toBeNull();
  });

  it("header truyền vào ghi đè origin header sinh từ option origin", () => {
    const request = makeRequest("/api/x", {
      origin: "https://app.test",
      headers: { origin: "https://evil.test" },
    });

    expect(request.url).toBe("https://app.test/api/x");
    expect(request.headers.get("origin")).toBe("https://evil.test");
  });

  it("body chuỗi được giữ nguyên và không bị gắn content-type JSON", async () => {
    const request = makeRequest("/api/x", { method: "POST", body: "not-json{" });

    // Request chuẩn tự đặt text/plain cho body chuỗi; test body hỏng ghi đè bằng headers.
    expect(request.headers.get("content-type")).not.toBe("application/json");
    await expect(request.text()).resolves.toBe("not-json{");

    const asJson = makeRequest("/api/x", {
      method: "POST",
      body: "not-json{",
      headers: { "content-type": "application/json" },
    });
    expect(asJson.headers.get("content-type")).toBe("application/json");
    await expect(asJson.json()).rejects.toThrow();
  });
});

describe("setCookiesOf", () => {
  it("đọc đúng HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=60 từ header thô", () => {
    const response = new Response(null);
    response.headers.append("set-cookie", "tripory_at=abc.def; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=60");

    expect(setCookiesOf(response)).toEqual({
      tripory_at: {
        value: "abc.def",
        attrs: { httponly: true, secure: true, samesite: "lax", path: "/", "max-age": "60" },
      },
    });
  });

  it("đọc cookie do NextResponse.cookies.set sinh ra, kể cả cookie xóa với Max-Age=0", () => {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("tripory_at", "token", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 });
    response.cookies.set("tripory_rt", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });

    const cookies = setCookiesOf(response);

    expect(Object.keys(cookies)).toEqual(["tripory_at", "tripory_rt"]);
    // Next tự thêm Expires khi có maxAge nên chỉ khẳng định các thuộc tính cần thiết.
    expect(cookies.tripory_at?.value).toBe("token");
    expect(cookies.tripory_at?.attrs).toMatchObject({
      httponly: true,
      secure: true,
      samesite: "lax",
      path: "/",
      "max-age": "60",
    });
    expect(cookies.tripory_rt?.value).toBe("");
    expect(cookies.tripory_rt?.attrs["max-age"]).toBe("0");
  });

  it("giữ nguyên dấu = trong giá trị cookie và trả {} khi không có Set-Cookie", () => {
    const response = new Response(null);
    response.headers.append("set-cookie", "k=a=b==; Path=/");

    expect(setCookiesOf(response).k?.value).toBe("a=b==");
    expect(setCookiesOf(new Response(null))).toEqual({});
  });
});

describe("makeFakeLockManager", () => {
  it("hai request cùng tên chạy tuần tự: task 2 chỉ chạy sau khi task 1 resolve", async () => {
    const locks = makeFakeLockManager();
    const first = deferred<string>();
    const events: string[] = [];

    const p1 = locks.request("session", async () => {
      events.push("start-1");
      const value = await first.promise;
      events.push("end-1");
      return value;
    });
    const p2 = locks.request("session", async () => {
      events.push("start-2");
      return "second";
    });

    await flush();
    expect(events).toEqual(["start-1"]);
    expect(locks.held()).toEqual(["session"]);

    first.resolve("first");
    await expect(p1).resolves.toBe("first");
    await expect(p2).resolves.toBe("second");
    expect(events).toEqual(["start-1", "end-1", "start-2"]);
    expect(locks.held()).toEqual([]);
  });

  it("request khác tên chạy song song", async () => {
    const locks = makeFakeLockManager();
    const gate = deferred<void>();
    const started: string[] = [];

    const p1 = locks.request("a", async () => {
      started.push("a");
      await gate.promise;
    });
    const p2 = locks.request("b", async () => {
      started.push("b");
      await gate.promise;
    });

    await flush();
    expect(started).toEqual(["a", "b"]);
    expect(locks.held().sort()).toEqual(["a", "b"]);

    gate.resolve();
    await Promise.all([p1, p2]);
    expect(locks.held()).toEqual([]);
  });

  it("task ném lỗi thì reject đúng lỗi đó và nhả khóa cho người chờ sau", async () => {
    const locks = makeFakeLockManager();
    const failure = new Error("boom");

    const p1 = locks.request("session", async () => {
      throw failure;
    });
    const p2 = locks.request("session", async () => "after");

    await expect(p1).rejects.toBe(failure);
    await expect(p2).resolves.toBe("after");
  });

  it("options.signal abort khi đang chờ thì reject AbortError và không chạy callback", async () => {
    const locks = makeFakeLockManager();
    const holder = deferred<void>();
    const controller = new AbortController();
    const waiting = vi.fn(async () => "never");

    const p1 = locks.request("session", () => holder.promise);
    const p2 = locks.request("session", { signal: controller.signal }, waiting);
    const p3 = locks.request("session", async () => "third");
    const rejection = p2.catch((error: unknown) => error);

    await flush();
    controller.abort();

    const error = await rejection;
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");

    holder.resolve();
    await p1;
    await expect(p3).resolves.toBe("third");
    expect(waiting).not.toHaveBeenCalled();
  });

  it("signal đã abort sẵn thì reject ngay và không giữ khóa", async () => {
    const locks = makeFakeLockManager();
    const controller = new AbortController();
    controller.abort();

    await expect(locks.request("session", { signal: controller.signal }, async () => "x")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(locks.held()).toEqual([]);
  });

  it("hai tab dùng chung một manager thì loại trừ lẫn nhau", async () => {
    const shared = makeFakeLockManager();
    const tabA = shared;
    const tabB = shared;
    const gate = deferred<void>();
    const order: string[] = [];

    const a = tabA.request("tripory-session-refresh", async () => {
      order.push("A-in");
      await gate.promise;
      order.push("A-out");
    });
    const b = tabB.request("tripory-session-refresh", async () => {
      order.push("B-in");
    });

    await flush();
    expect(order).toEqual(["A-in"]);

    gate.resolve();
    await Promise.all([a, b]);
    expect(order).toEqual(["A-in", "A-out", "B-in"]);
  });
});

describe("makeFakeBroadcastChannelHub", () => {
  it("postMessage của kênh A tới mọi kênh khác cùng tên, không tới chính kênh gửi", () => {
    const hub = makeFakeBroadcastChannelHub();
    const a = hub.create("tripory-session");
    const b = hub.create("tripory-session");
    const c = hub.create("tripory-session");
    const onA = vi.fn();
    const onB = vi.fn();
    const onC = vi.fn();
    a.onmessage = onA;
    b.onmessage = onB;
    c.onmessage = onC;

    a.postMessage({ type: "expired" });

    expect(onA).not.toHaveBeenCalled();
    expect(onB).toHaveBeenCalledTimes(1);
    expect(onB).toHaveBeenCalledWith({ data: { type: "expired" } });
    expect(onC).toHaveBeenCalledTimes(1);
  });

  it("kênh khác tên không nhận tin", () => {
    const hub = makeFakeBroadcastChannelHub();
    const a = hub.create("one");
    const other = hub.create("two");
    const onOther = vi.fn();
    other.onmessage = onOther;

    a.postMessage("hi");

    expect(onOther).not.toHaveBeenCalled();
  });

  it("close() gỡ kênh: không nhận tin nữa và không gửi được nữa", () => {
    const hub = makeFakeBroadcastChannelHub();
    const a = hub.create("tripory-session");
    const b = hub.create("tripory-session");
    const onB = vi.fn();
    b.onmessage = onB;

    b.close();
    a.postMessage("after-close");

    expect(onB).not.toHaveBeenCalled();
    expect(() => b.postMessage("x")).toThrow(DOMException);
  });

  it("nhận bản sao structured clone, không phải cùng tham chiếu", () => {
    const hub = makeFakeBroadcastChannelHub();
    const a = hub.create("tripory-session");
    const b = hub.create("tripory-session");
    const received: unknown[] = [];
    b.onmessage = (event) => received.push(event.data);
    const payload = { nested: { n: 1 } };

    a.postMessage(payload);

    expect(received).toEqual([payload]);
    expect(received[0]).not.toBe(payload);
  });
});

describe("installFakeIntersectionObserver", () => {
  const target = { id: "sentinel" } as unknown as Element;

  it("trigger gọi callback của observer đang theo dõi với isIntersecting và target", () => {
    const io = installFakeIntersectionObserver();
    try {
      const callback = vi.fn();
      const observer = new IntersectionObserver(callback, { rootMargin: "200px" });
      observer.observe(target);

      io.trigger(true);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0]?.[0]).toEqual([{ isIntersecting: true, target }]);
      expect(io.instances[0]?.options).toEqual({ rootMargin: "200px" });
    } finally {
      io.restore();
    }
  });

  it("disconnect rồi thì trigger không gọi callback nữa", () => {
    const io = installFakeIntersectionObserver();
    try {
      const callback = vi.fn();
      const observer = new IntersectionObserver(callback);
      observer.observe(target);
      observer.disconnect();

      io.trigger(true);

      expect(callback).not.toHaveBeenCalled();
    } finally {
      io.restore();
    }
  });

  it("restore trả lại IntersectionObserver gốc", () => {
    const before = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
    const io = installFakeIntersectionObserver();

    expect((globalThis as { IntersectionObserver?: unknown }).IntersectionObserver).not.toBe(before);
    io.restore();
    expect((globalThis as { IntersectionObserver?: unknown }).IntersectionObserver).toBe(before);
  });
});

describe("installFakeResizeObserver", () => {
  it("resize báo chiều cao cho observer đang theo dõi đúng target", () => {
    const ro = installFakeResizeObserver();
    try {
      const target = { id: "a" } as unknown as Element;
      const other = { id: "b" } as unknown as Element;
      const callback = vi.fn();
      new ResizeObserver(callback).observe(target);

      ro.resize(other, 10);
      expect(callback).not.toHaveBeenCalled();

      ro.resize(target, 120);
      const entries = callback.mock.calls[0]?.[0] as { contentRect: { height: number }; borderBoxSize: { blockSize: number }[] }[];
      expect(entries[0]?.contentRect.height).toBe(120);
      expect(entries[0]?.borderBoxSize[0]?.blockSize).toBe(120);
    } finally {
      ro.restore();
    }
  });
});

describe("be-itinerary-fixtures", () => {
  it("chi tiết có ngày thưa và orderIndex lộn như BE thật", () => {
    const detail = itineraryDetailJson();

    expect(detail.days[0]?.dayNumber).toBe(3);
    expect(detail.days.map((d) => d.dayNumber)).toEqual([3, 1]);
    expect(detail.days[1]?.subtitle).toBe("");
    expect(detail.waypoints.filter((w) => w.dayNumber === 1).map((w) => w.orderIndex)).toEqual([1, 0]);
    expect(detail.updatedAt).toMatch(/\.\d{7}\+00:00$/);
  });

  it("overrides ghi đè trường và trang /mine suy đúng cờ trang", () => {
    expect(itineraryDetailJson({ title: "Khác" }).title).toBe("Khác");

    const last = summaryPageJson();
    expect(last).toMatchObject({ pageIndex: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1 });

    const first = summaryPageJson({ items: [summaryJson(), summaryJson()], hasNextPage: true });
    expect(first).toMatchObject({ hasNextPage: true, totalPages: 2, totalCount: 3 });
    expect(first.items).toHaveLength(2);
  });

  it("envelope thành công cùng hình với fixture auth", () => {
    expect(itineraryEnvelope({ a: 1 })).toMatchObject({ status: "success", data: { a: 1 }, errorCode: null });
  });
});
