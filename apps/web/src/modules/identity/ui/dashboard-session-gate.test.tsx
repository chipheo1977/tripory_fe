import { isValidElement, type ReactElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { DashboardSessionGate } from "./dashboard-session-gate";
import { LoginRedirect } from "./login-redirect";
import { SessionRecovery } from "./session-recovery";

const h = vi.hoisted(() => ({ getSessionKind: vi.fn() }));

// viewer.server có `import "server-only"` nên không import được dưới Vitest.
vi.mock("@/composition/viewer.server", () => ({ getSessionKind: h.getSessionKind }));
vi.mock("./login-redirect", () => ({ LoginRedirect: () => null }));
vi.mock("./session-recovery", () => ({ SessionRecovery: () => null }));

const loading = <div data-testid="loading" />;
const children = <div data-testid="page" />;

beforeEach(() => {
  vi.clearAllMocks();
});

const run = async (kind: "none" | "invalid" | "stale" | "fresh") => {
  h.getSessionKind.mockResolvedValue(kind);
  return (await DashboardSessionGate({ children, loading })) as ReactElement<{ fallback?: unknown; children?: unknown }>;
};

it("redirects guests to login", async () => {
  const element = await run("none");

  expect(element.type).toBe(LoginRedirect);
});

it.each(["stale", "invalid"] as const)("recovers a %s session silently with the dashboard skeleton", async (kind) => {
  const element = await run(kind);

  expect(element.type).toBe(SessionRecovery);
  expect(element.props.fallback).toBe(loading);
});

it("renders the page for a fresh session", async () => {
  const element = await run("fresh");

  expect(isValidElement(element)).toBe(true);
  expect(element.props.children).toBe(children);
});
