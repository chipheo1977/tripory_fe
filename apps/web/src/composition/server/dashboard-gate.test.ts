// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decideDashboardGate, type DashboardGateDecision, type SessionKind } from "./dashboard-gate";

describe("decideDashboardGate", () => {
  it.each<[SessionKind, DashboardGateDecision]>([
    ["none", "login"],
    ["invalid", "recover"],
    ["stale", "recover"],
    ["fresh", "render"],
  ])("phiên %s -> %s", (kind, decision) => {
    expect(decideDashboardGate(kind)).toBe(decision);
  });
});
