// Sự kiện vòng đời phiên phía browser: hết phiên (tab này), đồng bộ đăng nhập/đăng xuất giữa các tab
// (D-22) và chỗ móc đăng xuất cho Phase 7 (D-23). Không dùng React: `SessionEffects` (plan 03-11) là nơi
// duy nhất nối các sự kiện này vào router và toast.
//
// Trạng thái nằm trong closure của `makeSessionEvents` để test dựng nhiều "tab" độc lập. Singleton cuối
// file là bản duy nhất của một tab thật.

/** Phần tối thiểu của `BroadcastChannel` mà module này dùng, để test thay bằng kênh giả. */
export type BroadcastChannelLike = {
  postMessage(data: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
};

/**
 * - `expired`: phiên của TAB NÀY đã hết (route refresh trả 401). Không đi qua channel: tab khác tự phát
 *   hiện ở request kế tiếp, và cookie đã bị xóa nên tab nào cũng thấy cùng kết quả.
 * - `remote-logged-in` / `remote-logged-out`: tab KHÁC vừa đăng nhập / đăng xuất.
 */
export type SessionEventName = "expired" | "remote-logged-in" | "remote-logged-out";

/** Tin gửi sang tab khác. Đổi mật khẩu thành công phát `logged-out` (D-22). */
export type SessionAnnouncement = "logged-in" | "logged-out";

export type LogoutHandler = () => void | Promise<void>;

export type SessionEventsDeps = Readonly<{
  /** `null` khi môi trường không có `BroadcastChannel` (SSR, Safari < 15.4). Chỉ được gọi khi cần. */
  createChannel: () => BroadcastChannelLike | null;
}>;

export type SessionEvents = Readonly<{
  /** Báo hết phiên. Chỉ chạy listener ở lần đầu cho đến khi `rearmExpired()` (Pitfall 10: tránh hai toast). */
  emitExpired(): void;
  /** Cho phép `emitExpired` phát lại, gọi sau khi người dùng đăng nhập lại. */
  rearmExpired(): void;
  /** Đăng ký listener; trả hàm gỡ. */
  on(event: SessionEventName, listener: () => void): () => void;
  /** Báo cho các tab khác. Tab phát không nhận lại tin của chính nó. No-op khi không có channel. */
  announce(announcement: SessionAnnouncement): void;
  /** AUTH-04 / D-23: Phase 7 đăng ký ngắt SignalR và kết thúc cuộc gọi ở đây. Trả hàm gỡ. */
  registerLogoutHandler(handler: LogoutHandler): () => void;
  /** Chạy mọi handler đăng xuất; một handler lỗi không chặn handler khác và không làm hàm này reject. */
  runLogoutHandlers(): Promise<void>;
  /** Đóng channel và gỡ mọi listener (test, HMR). Handler đăng xuất được giữ nguyên. */
  dispose(): void;
}>;

export function makeSessionEvents(deps: SessionEventsDeps): SessionEvents {
  const listeners: Record<SessionEventName, Set<() => void>> = {
    expired: new Set(),
    "remote-logged-in": new Set(),
    "remote-logged-out": new Set(),
  };
  // Mỗi lần đăng ký là một mục riêng, nên cùng một hàm đăng ký hai lần vẫn gỡ độc lập.
  const logoutHandlers = new Set<{ run: LogoutHandler }>();
  let expiredEmitted = false;
  // `undefined` = chưa hỏi `createChannel`; `null` = đã hỏi và không có channel.
  let channel: BroadcastChannelLike | null | undefined;

  const emit = (event: SessionEventName): void => {
    for (const listener of [...listeners[event]]) listener();
  };

  const handleMessage = (data: unknown): void => {
    // Cùng origin nên đáng tin ở mức trang của mình, nhưng vẫn chỉ nhận đúng hai loại tin (T-03-24).
    if (typeof data !== "object" || data === null) return;

    const type = (data as { type?: unknown }).type;

    if (type === "logged-in") emit("remote-logged-in");
    else if (type === "logged-out") emit("remote-logged-out");
  };

  // Tạo lazy: lúc import module (kể cả khi SSR import nhầm) không được mở channel nào.
  const ensureChannel = (): BroadcastChannelLike | null => {
    if (channel !== undefined) return channel;

    channel = deps.createChannel();
    if (channel !== null) channel.onmessage = (event) => handleMessage(event.data);

    return channel;
  };

  return {
    emitExpired() {
      if (expiredEmitted) return;

      expiredEmitted = true;
      emit("expired");
    },

    rearmExpired() {
      expiredEmitted = false;
    },

    on(event, listener) {
      ensureChannel();
      listeners[event].add(listener);

      return () => {
        listeners[event].delete(listener);
      };
    },

    announce(announcement) {
      ensureChannel()?.postMessage({ type: announcement });
    },

    registerLogoutHandler(handler) {
      const entry = { run: handler };
      logoutHandlers.add(entry);

      return () => {
        logoutHandlers.delete(entry);
      };
    },

    async runLogoutHandlers() {
      // `Promise.resolve().then` bắt cả handler ném đồng bộ.
      await Promise.allSettled([...logoutHandlers].map((entry) => Promise.resolve().then(entry.run)));
    },

    dispose() {
      channel?.close();
      channel = undefined;
      for (const set of Object.values(listeners)) set.clear();
      expiredEmitted = false;
    },
  };
}

// Kênh riêng cho phiên (D-22), khác kênh chuông cuộc gọi UX-06. Adapter nằm ở composition chứ không ở
// package vì `BroadcastChannel` là browser global. Guard `typeof window`: Node 24 có `BroadcastChannel`
// toàn cục, một channel mở lúc SSR sẽ giữ tiến trình sống. Safari < 15.4 không có `BroadcastChannel`:
// tab khác tự phát hiện ở request kế tiếp.
//
// `registerLogoutHandler` là chỗ móc AUTH-04 cho Phase 7 (SignalR, cuộc gọi). Phase 3 danh sách rỗng
// (D-23).
export const sessionEvents: SessionEvents = makeSessionEvents({
  createChannel: () =>
    typeof window === "undefined" || typeof BroadcastChannel === "undefined"
      ? null
      : (new BroadcastChannel("tripory-session") as BroadcastChannelLike),
});
