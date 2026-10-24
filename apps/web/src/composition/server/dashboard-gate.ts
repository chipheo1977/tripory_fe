// Quyết định của layout `(dashboard)` theo loại phiên đọc từ cookie (D-11, D-24). Hàm thuần, không `server-only`
// để test được dưới Vitest.

/** Trùng `SessionState["state"]` của session-store. */
export type SessionKind = "none" | "invalid" | "stale" | "fresh";

/**
 * - `login`: khách, chuyển sang /login?next=.
 * - `recover`: cookie còn nhưng access hết hạn/hỏng; client refresh im lặng rồi render lại (D-24).
 * - `render`: phiên tươi, hiển thị nội dung.
 */
export type DashboardGateDecision = "login" | "recover" | "render";

export function decideDashboardGate(kind: SessionKind): DashboardGateDecision {
  switch (kind) {
    case "none":
      return "login";
    case "invalid":
    case "stale":
      return "recover";
    case "fresh":
      return "render";
  }
}
