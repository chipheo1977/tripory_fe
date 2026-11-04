import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createDraftStorage, draftKey, draftStorage, draftPrefix } from "./draft-storage";
import { useFormDraft } from "./use-form-draft";

// `sessionEvents` thật nhưng không có BroadcastChannel: chỉ cần `emitExpired` / `rearmExpired` / `on`.
vi.mock("@/composition/session-events.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/composition/session-events.client")>();
  return { sessionEvents: actual.makeSessionEvents({ createChannel: () => null }) };
});

import { sessionEvents } from "@/composition/session-events.client";

const HOUR_MS = 60 * 60 * 1000;
const PREFIX = "tripory:draft:v1:u1:i1:";

const schema = z.object({ title: z.string() });

/** Storage trong bộ nhớ, đủ bề mặt `Pick<Storage, ...>` mà adapter dùng. */
function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe("draftKey", () => {
  it("dựng khóa có viewerId và itineraryId", () => {
    expect(draftKey({ viewerId: "u1", itineraryId: "i1", kind: "edit:w1" })).toBe("tripory:draft:v1:u1:i1:edit:w1");
    expect(draftKey({ viewerId: "u1", itineraryId: "i1", kind: "add:1" })).toBe("tripory:draft:v1:u1:i1:add:1");
    expect(draftKey({ viewerId: "u1", itineraryId: "i1", kind: "add:2" })).toBe("tripory:draft:v1:u1:i1:add:2");
  });
});

describe("createDraftStorage", () => {
  let now = 1_000_000;
  const nowMs = () => now;
  beforeEach(() => {
    now = 1_000_000;
  });

  it("lưu rồi đọc lại đúng giá trị qua schema", () => {
    const storage = memoryStorage();
    const drafts = createDraftStorage({ storage, nowMs });
    drafts.save("k", { title: "Đà Lạt" });
    expect(JSON.parse(storage.map.get("k") ?? "null")).toEqual({ savedAt: 1_000_000, values: { title: "Đà Lạt" } });
    expect(drafts.load("k", schema)).toEqual({ title: "Đà Lạt" });
  });

  it("sai schema thì trả null và xóa khóa", () => {
    const storage = memoryStorage();
    const drafts = createDraftStorage({ storage, nowMs });
    drafts.save("k", { title: 42 });
    expect(drafts.load("k", schema)).toBeNull();
    expect(storage.map.has("k")).toBe(false);
  });

  it("JSON hỏng hoặc sai hình phong bì thì trả null và xóa khóa", () => {
    const storage = memoryStorage({ a: "{không phải json", b: JSON.stringify({ values: { title: "x" } }) });
    const drafts = createDraftStorage({ storage, nowMs });
    expect(drafts.load("a", schema)).toBeNull();
    expect(drafts.load("b", schema)).toBeNull();
    expect(storage.map.size).toBe(0);
  });

  it("còn hạn đúng 24 giờ thì đọc được, quá 24 giờ 1ms thì trả null và xóa khóa", () => {
    const storage = memoryStorage();
    const drafts = createDraftStorage({ storage, nowMs });
    drafts.save("k", { title: "x" });
    now += 24 * HOUR_MS;
    expect(drafts.load("k", schema)).toEqual({ title: "x" });
    now += 1;
    expect(drafts.load("k", schema)).toBeNull();
    expect(storage.map.has("k")).toBe(false);
  });

  it("không có bản nháp thì load trả null", () => {
    expect(createDraftStorage({ storage: memoryStorage(), nowMs }).load("none", schema)).toBeNull();
  });

  it("remove xóa khóa", () => {
    const storage = memoryStorage();
    const drafts = createDraftStorage({ storage, nowMs });
    drafts.save("k", { title: "x" });
    drafts.remove("k");
    expect(storage.map.size).toBe(0);
  });

  it("findFirst trả khóa và kind đầu tiên theo prefix, bỏ qua viewer khác", () => {
    const storage = memoryStorage({
      "tripory:draft:v1:u2:i1:add:1": JSON.stringify({ savedAt: now, values: {} }),
      "unrelated": "1",
    });
    const drafts = createDraftStorage({ storage, nowMs });
    expect(drafts.findFirst(PREFIX)).toBeNull();
    drafts.save(`${PREFIX}edit:w1`, { title: "x" });
    expect(drafts.findFirst(PREFIX)).toEqual({ key: `${PREFIX}edit:w1`, kind: "edit:w1" });
    drafts.remove(`${PREFIX}edit:w1`);
    drafts.save(`${PREFIX}add:1`, { title: "x" });
    expect(drafts.findFirst(PREFIX)).toEqual({ key: `${PREFIX}add:1`, kind: "add:1" });
    drafts.remove(`${PREFIX}add:1`);
    drafts.save(`${PREFIX}add:3`, { title: "x" });
    expect(drafts.findFirst(PREFIX)).toEqual({ key: `${PREFIX}add:3`, kind: "add:3" });
  });

  it("findFirst bỏ qua và dọn bản quá hạn hoặc kind lạ", () => {
    const storage = memoryStorage();
    const drafts = createDraftStorage({ storage, nowMs });
    drafts.save(`${PREFIX}edit:old`, { title: "x" });
    storage.setItem(`${PREFIX}weird`, JSON.stringify({ savedAt: now, values: {} }));
    now += 24 * HOUR_MS + 1;
    drafts.save(`${PREFIX}add:1`, { title: "y" });
    expect(drafts.findFirst(PREFIX)).toEqual({ key: `${PREFIX}add:1`, kind: "add:1" });
    expect(storage.map.has(`${PREFIX}edit:old`)).toBe(false);
  });

  it("storage null thì mọi thao tác không ném và trả rỗng", () => {
    const drafts = createDraftStorage({ storage: null, nowMs });
    expect(() => drafts.save("k", { title: "x" })).not.toThrow();
    expect(drafts.load("k", schema)).toBeNull();
    expect(() => drafts.remove("k")).not.toThrow();
    expect(drafts.findFirst(PREFIX)).toBeNull();
  });

  it("setItem ném (quota) hoặc storage ném khi đọc thì không ném ra ngoài", () => {
    const boom = () => {
      throw new Error("QuotaExceededError");
    };
    const drafts = createDraftStorage({
      storage: { getItem: boom, setItem: boom, removeItem: boom, key: boom, length: 1 },
      nowMs,
    });
    expect(() => drafts.save("k", { title: "x" })).not.toThrow();
    expect(drafts.load("k", schema)).toBeNull();
    expect(() => drafts.remove("k")).not.toThrow();
    expect(drafts.findFirst(PREFIX)).toBeNull();
  });
});

describe("draftStorage (singleton)", () => {
  afterEach(() => window.sessionStorage.clear());

  it("dùng window.sessionStorage", () => {
    draftStorage.save("tripory:draft:v1:u1:i1:add:1", { title: "x" });
    expect(window.sessionStorage.getItem("tripory:draft:v1:u1:i1:add:1")).not.toBeNull();
    expect(draftStorage.load("tripory:draft:v1:u1:i1:add:1", schema)).toEqual({ title: "x" });
  });
});

describe("useFormDraft", () => {
  beforeEach(() => {
    sessionEvents.rearmExpired();
    window.sessionStorage.clear();
  });
  afterEach(() => {
    sessionEvents.dispose();
    window.sessionStorage.clear();
  });

  const KEY = draftKey({ viewerId: "u1", itineraryId: "i1", kind: "add:1" });

  it("lưu giá trị form khi phiên hết hạn", () => {
    renderHook(() => useFormDraft({ key: KEY, getValues: () => ({ title: "Đang gõ" }), enabled: true }));
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
    sessionEvents.emitExpired();
    expect(draftStorage.load(KEY, schema)).toEqual({ title: "Đang gõ" });
  });

  it("đọc getValues mới nhất qua ref", () => {
    let title = "a";
    const { rerender } = renderHook(() => useFormDraft({ key: KEY, getValues: () => ({ title }), enabled: true }));
    title = "b";
    rerender();
    sessionEvents.emitExpired();
    expect(draftStorage.load(KEY, schema)).toEqual({ title: "b" });
  });

  it("enabled false thì không lưu", () => {
    renderHook(() => useFormDraft({ key: KEY, getValues: () => ({ title: "x" }), enabled: false }));
    sessionEvents.emitExpired();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("unmount thì không lưu", () => {
    const { unmount } = renderHook(() => useFormDraft({ key: KEY, getValues: () => ({ title: "x" }), enabled: true }));
    unmount();
    sessionEvents.emitExpired();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("đổi enabled từ true sang false thì gỡ listener", () => {
    const { rerender } = renderHook(
      ({ enabled }) => useFormDraft({ key: KEY, getValues: () => ({ title: "x" }), enabled }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    sessionEvents.emitExpired();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });
});

describe("draftPrefix và khóa metadata cũ (D-107)", () => {
  it("draftPrefix khớp tiền tố của draftKey", () => {
    const params = { viewerId: "u1", itineraryId: "i1" };
    expect(draftKey({ ...params, kind: "add:2" }).startsWith(draftPrefix(params))).toBe(true);
    expect(draftPrefix(params)).toBe("tripory:draft:v1:u1:i1:");
  });

  it("khóa metadata cũ trong storage bị bỏ qua và dọn", () => {
    const store = new Map<string, string>([
      ["tripory:draft:v1:u1:i1:metadata", JSON.stringify({ savedAt: Date.now(), values: { title: "cũ" } })],
    ]);
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    };
    const drafts = createDraftStorage({ storage, nowMs: () => Date.now() });
    expect(drafts.findFirst(draftPrefix({ viewerId: "u1", itineraryId: "i1" }))).toBeNull();
    expect(store.size).toBe(0);
  });
});
