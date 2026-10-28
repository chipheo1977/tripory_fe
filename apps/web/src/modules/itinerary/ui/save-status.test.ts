import { expect, it, vi } from "vitest";
import { createSaveStatusStore } from "./save-status";

it("starts empty", () => {
  const store = createSaveStatusStore();

  expect(store.getSnapshot()).toEqual({ hasSaved: false, failure: null });
});

it("markSaved sets hasSaved and clears a failure", () => {
  const store = createSaveStatusStore();
  store.markFailed(() => undefined);

  store.markSaved();

  expect(store.getSnapshot()).toEqual({ hasSaved: true, failure: null });
});

it("markFailed keeps the exact retry function", () => {
  const store = createSaveStatusStore();
  const retry = vi.fn();

  store.markFailed(retry);

  expect(store.getSnapshot().failure?.retry).toBe(retry);
});

it("notifies listeners on every change and stops after unsubscribe", () => {
  const store = createSaveStatusStore();
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);

  store.markFailed(() => undefined);
  store.markSaved();
  expect(listener).toHaveBeenCalledTimes(2);

  unsubscribe();
  store.markSaved();
  expect(listener).toHaveBeenCalledTimes(2);
});

it("returns a referentially stable snapshot while nothing changes", () => {
  const store = createSaveStatusStore();
  const first = store.getSnapshot();

  expect(store.getSnapshot()).toBe(first);

  store.markSaved();
  const second = store.getSnapshot();
  expect(second).not.toBe(first);
  expect(store.getSnapshot()).toBe(second);
});
