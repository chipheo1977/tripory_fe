import { describe, expect, it, vi } from "vitest";
import { makeFakeBroadcastChannelHub } from "@/test/fake-broadcast-channel";
import { makeSessionEvents } from "./session-events.client";

const CHANNEL = "tripory-session";

/** Hai "tab" cùng một trình duyệt: mỗi tab một `makeSessionEvents` nhưng chung hub. */
function twoTabs() {
  const hub = makeFakeBroadcastChannelHub();
  const make = () => makeSessionEvents({ createChannel: () => hub.create(CHANNEL) });
  return { hub, tabA: make(), tabB: make() };
}

describe("sessionEvents: expired", () => {
  it("phát đúng 1 lần dù gọi 3 lần liên tiếp (Pitfall 10)", () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const listener = vi.fn();
    events.on("expired", listener);

    events.emitExpired();
    events.emitExpired();
    events.emitExpired();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rearmExpired cho phép phát lại", () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const listener = vi.fn();
    events.on("expired", listener);

    events.emitExpired();
    events.rearmExpired();
    events.emitExpired();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("gọi mọi listener và hàm gỡ chỉ gỡ đúng listener đó", () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const first = vi.fn();
    const second = vi.fn();
    const off = events.on("expired", first);
    events.on("expired", second);

    off();
    events.emitExpired();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("không đẩy 'expired' lên channel (chỉ phiên của tab này hết hạn)", () => {
    const { hub, tabA } = twoTabs();
    const peer = hub.create(CHANNEL);
    const received = vi.fn();
    peer.onmessage = received;
    tabA.on("expired", vi.fn());

    tabA.emitExpired();

    expect(received).not.toHaveBeenCalled();
  });
});

describe("sessionEvents: đồng bộ giữa tab (D-22)", () => {
  it("announce('logged-out') làm tab khác nhận 'remote-logged-out', tab phát không nhận lại", () => {
    const { tabA, tabB } = twoTabs();
    const onA = vi.fn();
    const onB = vi.fn();
    tabA.on("remote-logged-out", onA);
    tabB.on("remote-logged-out", onB);

    tabA.announce("logged-out");

    expect(onB).toHaveBeenCalledTimes(1);
    expect(onA).not.toHaveBeenCalled();
  });

  it("announce('logged-in') làm tab khác nhận 'remote-logged-in', tab phát không nhận lại", () => {
    const { tabA, tabB } = twoTabs();
    const onA = vi.fn();
    const onB = vi.fn();
    tabA.on("remote-logged-in", onA);
    tabB.on("remote-logged-in", onB);

    tabA.announce("logged-in");

    expect(onB).toHaveBeenCalledTimes(1);
    expect(onA).not.toHaveBeenCalled();
  });

  it("không lẫn hai loại tin", () => {
    const { tabA, tabB } = twoTabs();
    const loggedIn = vi.fn();
    const loggedOut = vi.fn();
    tabB.on("remote-logged-in", loggedIn);
    tabB.on("remote-logged-out", loggedOut);

    tabA.announce("logged-out");

    expect(loggedOut).toHaveBeenCalledTimes(1);
    expect(loggedIn).not.toHaveBeenCalled();
  });

  it.each([
    ["type lạ", { type: "x" }],
    ["type 'expired' (không phải tin liên tab)", { type: "expired" }],
    ["chuỗi", "logged-out"],
    ["null", null],
    ["số", 42],
    ["type không phải chuỗi", { type: 1 }],
  ])("bỏ qua message lạ: %s", (_name, payload) => {
    const { hub, tabB } = twoTabs();
    const loggedIn = vi.fn();
    const loggedOut = vi.fn();
    tabB.on("remote-logged-in", loggedIn);
    tabB.on("remote-logged-out", loggedOut);
    const intruder = hub.create(CHANNEL);

    intruder.postMessage(payload);

    expect(loggedIn).not.toHaveBeenCalled();
    expect(loggedOut).not.toHaveBeenCalled();
  });
});

describe("sessionEvents: không có BroadcastChannel", () => {
  it("createChannel trả null: mọi hàm vẫn chạy, announce là no-op", () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const expired = vi.fn();
    events.on("expired", expired);
    events.on("remote-logged-out", vi.fn());

    expect(() => events.announce("logged-out")).not.toThrow();
    events.emitExpired();

    expect(expired).toHaveBeenCalledTimes(1);
    expect(() => events.dispose()).not.toThrow();
  });
});

describe("sessionEvents: vòng đời channel", () => {
  it("tạo channel LAZY: không tạo lúc makeSessionEvents", () => {
    const hub = makeFakeBroadcastChannelHub();
    const createChannel = vi.fn(() => hub.create(CHANNEL));

    const events = makeSessionEvents({ createChannel });

    expect(createChannel).not.toHaveBeenCalled();

    events.emitExpired();
    events.registerLogoutHandler(() => undefined);

    expect(createChannel).not.toHaveBeenCalled();
  });

  it("tạo ở lần on() đầu tiên và dùng lại cho các lần sau", () => {
    const hub = makeFakeBroadcastChannelHub();
    const createChannel = vi.fn(() => hub.create(CHANNEL));
    const events = makeSessionEvents({ createChannel });

    events.on("remote-logged-out", vi.fn());
    events.on("remote-logged-in", vi.fn());
    events.announce("logged-in");

    expect(createChannel).toHaveBeenCalledTimes(1);
  });

  it("tạo ở lần announce() đầu tiên", () => {
    const hub = makeFakeBroadcastChannelHub();
    const createChannel = vi.fn(() => hub.create(CHANNEL));
    const events = makeSessionEvents({ createChannel });

    events.announce("logged-out");
    events.announce("logged-in");

    expect(createChannel).toHaveBeenCalledTimes(1);
  });

  it("createChannel trả null chỉ được hỏi một lần", () => {
    const createChannel = vi.fn(() => null);
    const events = makeSessionEvents({ createChannel });

    events.announce("logged-in");
    events.announce("logged-out");
    events.on("remote-logged-in", vi.fn());

    expect(createChannel).toHaveBeenCalledTimes(1);
  });

  it("dispose đóng channel và gỡ listener", () => {
    const hub = makeFakeBroadcastChannelHub();
    const channel = hub.create(CHANNEL);
    const close = vi.spyOn(channel, "close");
    const events = makeSessionEvents({ createChannel: () => channel });
    const listener = vi.fn();
    events.on("expired", listener);
    events.announce("logged-in");

    events.dispose();
    events.emitExpired();

    expect(close).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("sessionEvents: chỗ móc đăng xuất (D-23)", () => {
  it("Phase 3 chưa đăng ký gì: runLogoutHandlers resolve ngay", async () => {
    const events = makeSessionEvents({ createChannel: () => null });

    await expect(events.runLogoutHandlers()).resolves.toBeUndefined();
  });

  it("chạy mọi handler đã đăng ký", async () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const first = vi.fn();
    const second = vi.fn(async () => undefined);
    events.registerLogoutHandler(first);
    events.registerLogoutHandler(second);

    await events.runLogoutHandlers();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("hàm gỡ chỉ gỡ đúng handler đó", async () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const first = vi.fn();
    const second = vi.fn();
    const off = events.registerLogoutHandler(first);
    events.registerLogoutHandler(second);

    off();
    await events.runLogoutHandlers();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("một handler ném lỗi (đồng bộ hoặc reject) không chặn handler khác và không reject", async () => {
    const events = makeSessionEvents({ createChannel: () => null });
    const survivor = vi.fn();
    events.registerLogoutHandler(() => {
      throw new Error("đồng bộ");
    });
    events.registerLogoutHandler(() => Promise.reject(new Error("bất đồng bộ")));
    events.registerLogoutHandler(survivor);

    await expect(events.runLogoutHandlers()).resolves.toBeUndefined();

    expect(survivor).toHaveBeenCalledTimes(1);
  });

  it("đợi handler bất đồng bộ xong mới resolve", async () => {
    const events = makeSessionEvents({ createChannel: () => null });
    let finished = false;
    events.registerLogoutHandler(async () => {
      await Promise.resolve();
      await Promise.resolve();
      finished = true;
    });

    await events.runLogoutHandlers();

    expect(finished).toBe(true);
  });
});
