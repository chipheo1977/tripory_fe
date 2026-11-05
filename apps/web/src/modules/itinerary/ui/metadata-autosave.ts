// Bộ điều khiển tự lưu "Thông tin chuyến đi" (D-87..D-90), TypeScript thuần: không React, không DOM, không storage.
//
// - Ô chữ lưu sau 800 ms ngừng gõ (`schedule`) hoặc ngay khi blur/đóng (`flush`); ngày khởi hành và thao tác ảnh gọi
//   `request()` ngay.
// - Payload dựng LÚC GỬI từ getter của provider (không đóng băng giá trị cũ trong closure) và ô đang sai dùng giá trị
//   đã lưu, nên không bao giờ gửi giá trị sai (D-89).
// - Single-flight + trailing: tối đa một lệnh đang chạy và một lệnh chờ (lệnh cuối thắng). Lệnh thật đi qua
//   `useUpdateMetadata`, nên còn xếp hàng trong scope `itinerary:{id}` cùng mọi lệnh ghi khác (D-88).
// - Lỗi field của BE gắn vào ô (`failure.alert === null`, không có "Thử lại"); lỗi chung giữ `failure.alert` kèm `retry()`
//   (UI hiện lỗi chung bằng một toast có "Thử lại", xem `autosave-failure-toast.ts`).
//   Form đóng khi còn lỗi, hoặc lỗi đến sau khi đã đóng, thì thành lỗi nền qua `onBackgroundFailure` (D-90, D-30).
import { isSameMetadata, type MetadataInput } from "@tripory/itinerary";
import { buildAutosavePayload, type AutosaveSnapshot } from "./metadata-autosave-payload";

export const TEXT_AUTOSAVE_DEBOUNCE_MS = 800;

export type AutosaveFailure = Readonly<{ alert: string | null; fieldErrors: Readonly<Record<string, string>> }>;

export type AutosaveState = Readonly<{
  timerActive: boolean;
  queued: boolean;
  failure: AutosaveFailure | null;
  /** Còn thay đổi chưa gửi hoặc còn lỗi chưa xử lý: đóng form/rời trang cần cẩn thận. */
  dirty: boolean;
}>;

export type AutosaveOutcome = Readonly<{ ok: true }> | Readonly<{ ok: false; failure: AutosaveFailure }>;

export type AutosaveDeps = Readonly<{
  /** Gửi một lệnh (= `mutation.mutate`). */
  send(payload: MetadataInput): void;
  /** Lỗi chung khi form đã đóng: chỉ báo header "Lỗi – Thử lại" (toast lỗi chung do tầng hook lo, đã hiện từ lúc lỗi đến). */
  onBackgroundFailure(failure: AutosaveFailure, retry: () => void): void;
  debounceMs?: number;
  setTimer?(callback: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
}>;

export type MetadataAutosave = Readonly<{
  attach(provider: () => AutosaveSnapshot): void;
  detach(): void;
  openForm(baseline: MetadataInput): void;
  closeForm(): void;
  /** Ô chữ đổi: khởi động lại đồng hồ 800 ms. */
  schedule(): void;
  /** Blur/đóng/unmount: hủy đồng hồ và gửi ngay nếu có thay đổi. */
  flush(): void;
  /** Ngày khởi hành, thao tác ảnh: gửi ngay. */
  request(): void;
  /** Gọi từ callback cấp hook của mutation. */
  settled(outcome: AutosaveOutcome): void;
  retry(): void;
  getState(): AutosaveState;
  subscribe(listener: () => void): () => void;
}>;

export function createMetadataAutosave(deps: AutosaveDeps): MetadataAutosave {
  const debounceMs = deps.debounceMs ?? TEXT_AUTOSAVE_DEBOUNCE_MS;
  const setTimer = deps.setTimer ?? ((callback: () => void, ms: number): unknown => setTimeout(callback, ms));
  const clearTimer = deps.clearTimer ?? ((handle: unknown): void => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let provider: (() => AutosaveSnapshot) | null = null;
  let lastSaved: MetadataInput | null = null;
  let lastSent: MetadataInput | null = null;
  let inFlight: MetadataInput | null = null;
  let queued: MetadataInput | null = null;
  let lastBuilt: MetadataInput | null = null;
  let formOpen = false;
  let timer: unknown = null;
  let failure: AutosaveFailure | null = null;
  // Đã báo lỗi nền cho đợt lỗi hiện tại: lệnh gửi lại do blur có thể lỗi tiếp, không báo hai lần. Xóa khi thành công, mở form hoặc thử lại.
  let reportedBackground = false;
  const listeners = new Set<() => void>();

  const computeState = (): AutosaveState => {
    const timerActive = timer !== null;
    const hasQueued = queued !== null;
    const hasAlert = failure !== null && failure.alert !== null;
    return { timerActive, queued: hasQueued, failure, dirty: timerActive || hasQueued || hasAlert };
  };
  let state = computeState();
  const notify = (): void => {
    state = computeState();
    for (const listener of [...listeners]) listener();
  };

  const cancelTimer = (): void => {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  };

  const sendNow = (payload: MetadataInput): void => {
    inFlight = payload;
    lastSent = payload;
    deps.send(payload);
  };

  const build = (): MetadataInput | null => {
    if (provider === null || lastSaved === null) return null;
    return buildAutosavePayload({ lastSaved, snapshot: provider() });
  };

  const request = (): void => {
    const payload = build();
    if (payload === null) return;
    lastBuilt = payload;
    const baseline = queued ?? lastSent;
    if (baseline !== null && isSameMetadata(payload, baseline)) {
      notify();
      return;
    }
    if (inFlight !== null) queued = payload;
    else sendNow(payload);
    notify();
  };

  const retry = (): void => {
    failure = null;
    reportedBackground = false;
    const payload = build() ?? lastBuilt;
    if (payload === null) {
      notify();
      return;
    }
    lastBuilt = payload;
    // Cùng payload với lệnh đang chạy (ví dụ blur vừa gửi lại): không gửi trùng.
    if (inFlight !== null && isSameMetadata(payload, inFlight)) {
      notify();
      return;
    }
    if (inFlight !== null) queued = payload;
    else sendNow(payload);
    notify();
  };

  const reportBackground = (current: AutosaveFailure): void => {
    if (reportedBackground) return;
    reportedBackground = true;
    deps.onBackgroundFailure(current, retry);
  };

  return {
    attach(next) {
      provider = next;
    },
    detach() {
      provider = null;
    },
    openForm(baseline) {
      formOpen = true;
      failure = null;
      reportedBackground = false;
      if (inFlight === null && queued === null) {
        lastSaved = baseline;
        lastSent = baseline;
      }
      notify();
    },
    closeForm() {
      const pending = failure;
      formOpen = false;
      if (pending !== null && pending.alert !== null) {
        cancelTimer();
        failure = null;
        reportBackground(pending);
        notify();
        return;
      }
      cancelTimer();
      failure = null;
      request();
    },
    schedule() {
      cancelTimer();
      timer = setTimer(() => {
        timer = null;
        request();
      }, debounceMs);
      notify();
    },
    flush() {
      cancelTimer();
      request();
    },
    request,
    settled(outcome) {
      const sent = inFlight;
      inFlight = null;
      if (outcome.ok) {
        lastSaved = sent ?? lastSaved;
        failure = null;
        reportedBackground = false;
        const next = queued;
        queued = null;
        if (next !== null) sendNow(next);
        notify();
        return;
      }
      lastSent = lastSaved;
      queued = null;
      if (!formOpen && outcome.failure.alert !== null) {
        failure = null;
        reportBackground(outcome.failure);
      } else {
        failure = outcome.failure;
      }
      notify();
    },
    retry,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
