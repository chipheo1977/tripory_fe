import type { MetadataInput } from "@tripory/itinerary";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMetadataAutosave, type AutosaveFailure, type AutosaveOutcome } from "./metadata-autosave";
import type { AutosaveSnapshot } from "./metadata-autosave-payload";

const baseline: MetadataInput = {
  title: "Gốc",
  description: null,
  startDate: null,
  coverImages: [],
  selectedCoverIndex: null,
};

const GENERIC_FAILURE: AutosaveFailure = { alert: "Đã có lỗi xảy ra, vui lòng thử lại", fieldErrors: {} };
const FIELD_FAILURE: AutosaveFailure = { alert: null, fieldErrors: { title: "Tiêu đề tối đa 100 ký tự." } };
const OK: AutosaveOutcome = { ok: true };

function setup() {
  const send = vi.fn<(payload: MetadataInput) => void>();
  const onBackgroundFailure = vi.fn<(failure: AutosaveFailure, retry: () => void) => void>();
  const snapshot = { title: "Gốc", images: [] as string[], selectedIndex: null as number | null };
  const provider = (): AutosaveSnapshot => ({
    values: { title: snapshot.title, description: "", startDate: "" },
    gallery: { images: snapshot.images, selectedIndex: snapshot.selectedIndex },
  });
  const autosave = createMetadataAutosave({ send, onBackgroundFailure });
  autosave.attach(provider);
  autosave.openForm(baseline);
  return { autosave, send, onBackgroundFailure, snapshot };
}

const titles = (send: ReturnType<typeof setup>["send"]) => send.mock.calls.map(([payload]) => payload.title);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("debounce và flush", () => {
  it("schedule: 799 ms chưa gửi, 800 ms gửi đúng một lần; hai lần schedule chỉ gửi giá trị cuối", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.schedule();
    vi.advanceTimersByTime(500);
    snapshot.title = "AB";
    autosave.schedule();
    vi.advanceTimersByTime(799);
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(titles(send)).toEqual(["AB"]);
  });

  it("flush gửi ngay và hủy đồng hồ", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.schedule();
    autosave.flush();
    expect(titles(send)).toEqual(["A"]);
    vi.advanceTimersByTime(2000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("blur ngay sau lần lưu do đồng hồ (giá trị không đổi) không gửi lại", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.schedule();
    vi.advanceTimersByTime(800);
    autosave.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("request khi giá trị bằng baseline không gửi", () => {
    const { autosave, send } = setup();
    autosave.request();
    expect(send).not.toHaveBeenCalled();
  });

  it("getter đọc lúc chạy: đổi giá trị sau schedule vẫn dùng giá trị mới", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.schedule();
    snapshot.title = "Mới nhất";
    vi.advanceTimersByTime(800);
    expect(titles(send)).toEqual(["Mới nhất"]);
  });

  it("tiêu đề sai dùng tiêu đề đã lưu; trùng mốc thì không gửi", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "   ";
    autosave.flush();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("single-flight + trailing", () => {
  it("đang chạy: chỉ giữ payload cuối; sau settled gửi đúng một lệnh chờ", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    snapshot.title = "B";
    autosave.request();
    snapshot.title = "C";
    autosave.request();
    expect(titles(send)).toEqual(["A"]);
    expect(autosave.getState().queued).toBe(true);
    autosave.settled(OK);
    expect(titles(send)).toEqual(["A", "C"]);
    autosave.settled(OK);
    expect(send).toHaveBeenCalledTimes(2);
    expect(autosave.getState().queued).toBe(false);
  });

  it("chuỗi 5 lần đổi ảnh khi lệnh đầu chưa xong sinh tối đa 2 lệnh", () => {
    const { autosave, send, snapshot } = setup();
    for (let index = 1; index <= 5; index += 1) {
      snapshot.images = Array.from({ length: index }, (_, n) => `https://img.example/${n}.jpg`);
      snapshot.selectedIndex = index - 1;
      autosave.request();
    }
    autosave.settled(OK);
    autosave.settled(OK);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].coverImages).toHaveLength(5);
  });
});

describe("lỗi", () => {
  it("lỗi field gắn ô, không có alert, không dirty; sửa rồi flush gửi lại", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.settled({ ok: false, failure: FIELD_FAILURE });
    expect(autosave.getState().failure?.fieldErrors.title).toBeTruthy();
    expect(autosave.getState().failure?.alert).toBeNull();
    expect(autosave.getState().dirty).toBe(false);
    snapshot.title = "AB";
    autosave.flush();
    expect(titles(send)).toEqual(["A", "AB"]);
  });

  it("lỗi chung khi form mở: có alert, dirty; retry gửi giá trị mới nhất và xóa failure", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    expect(autosave.getState().failure?.alert).toBe(GENERIC_FAILURE.alert);
    expect(autosave.getState().dirty).toBe(true);
    snapshot.title = "A2";
    autosave.retry();
    expect(titles(send)).toEqual(["A", "A2"]);
    expect(autosave.getState().failure).toBeNull();
  });

  it("closeForm khi còn lỗi chung gọi onBackgroundFailure một lần với retry dùng được", () => {
    const { autosave, send, onBackgroundFailure, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    autosave.closeForm();
    expect(onBackgroundFailure).toHaveBeenCalledTimes(1);
    expect(autosave.getState().failure).toBeNull();
    onBackgroundFailure.mock.calls[0]?.[1]();
    expect(titles(send)).toEqual(["A", "A"]);
  });

  it("lỗi đến sau closeForm gọi onBackgroundFailure ngay", () => {
    const { autosave, onBackgroundFailure, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.closeForm();
    expect(onBackgroundFailure).not.toHaveBeenCalled();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    expect(onBackgroundFailure).toHaveBeenCalledTimes(1);
    expect(autosave.getState().failure).toBeNull();
  });

  it("lỗi field sau closeForm không báo lỗi nền", () => {
    const { autosave, onBackgroundFailure, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.closeForm();
    autosave.settled({ ok: false, failure: FIELD_FAILURE });
    expect(onBackgroundFailure).not.toHaveBeenCalled();
  });
});

describe("lỗi nền không báo hai lần; retry không gửi trùng", () => {
  it("lệnh gửi lại sau closeForm lỗi tiếp thì không báo lỗi nền lần hai", () => {
    const { autosave, onBackgroundFailure, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    snapshot.title = "B";
    autosave.request();
    autosave.closeForm();
    expect(onBackgroundFailure).toHaveBeenCalledTimes(1);
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    expect(onBackgroundFailure).toHaveBeenCalledTimes(1);
  });

  it("sau retry thủ công, một lỗi mới được báo lại", () => {
    const { autosave, onBackgroundFailure, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    autosave.closeForm();
    autosave.retry();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    expect(onBackgroundFailure).toHaveBeenCalledTimes(2);
  });

  it("retry với payload trùng lệnh đang chạy thì không gửi thêm", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.retry();
    expect(send).toHaveBeenCalledTimes(1);
    expect(autosave.getState().queued).toBe(false);
  });
});

describe("đóng form, detach, openForm", () => {
  it("closeForm khi còn đồng hồ chữ hợp lệ gửi ngay", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.schedule();
    autosave.closeForm();
    expect(titles(send)).toEqual(["A"]);
    vi.advanceTimersByTime(2000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("closeForm khi chữ sai không gửi giá trị sai", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "";
    autosave.schedule();
    autosave.closeForm();
    expect(send).not.toHaveBeenCalled();
  });

  it("detach rồi retry dùng payload dựng gần nhất", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    autosave.detach();
    autosave.retry();
    expect(titles(send)).toEqual(["A", "A"]);
  });

  it("detach vẫn gửi nốt lệnh chờ sau settled", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    snapshot.title = "B";
    autosave.request();
    autosave.detach();
    autosave.settled(OK);
    expect(titles(send)).toEqual(["A", "B"]);
  });

  it("openForm khi còn inFlight không ghi đè lastSent", () => {
    const { autosave, send, snapshot } = setup();
    snapshot.title = "A";
    autosave.request();
    autosave.openForm(baseline);
    autosave.request();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("trạng thái", () => {
  it("dirty đúng cho đồng hồ, lệnh chờ và lỗi chung", () => {
    const { autosave, snapshot } = setup();
    expect(autosave.getState().dirty).toBe(false);
    snapshot.title = "A";
    autosave.schedule();
    expect(autosave.getState()).toMatchObject({ timerActive: true, dirty: true });
    autosave.flush();
    expect(autosave.getState().timerActive).toBe(false);
    snapshot.title = "B";
    autosave.request();
    expect(autosave.getState()).toMatchObject({ queued: true, dirty: true });
    autosave.settled({ ok: false, failure: GENERIC_FAILURE });
    expect(autosave.getState().dirty).toBe(true);
  });

  it("subscribe được gọi khi đổi, getState giữ tham chiếu khi không đổi", () => {
    const { autosave, snapshot } = setup();
    const listener = vi.fn();
    const unsubscribe = autosave.subscribe(listener);
    const before = autosave.getState();
    expect(autosave.getState()).toBe(before);
    snapshot.title = "A";
    autosave.schedule();
    expect(listener).toHaveBeenCalled();
    expect(autosave.getState()).not.toBe(before);
    unsubscribe();
    listener.mockClear();
    autosave.flush();
    expect(listener).not.toHaveBeenCalled();
  });
});
