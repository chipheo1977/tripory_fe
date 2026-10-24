// Fake `BroadcastChannel` cho test đồng bộ tab. Một hub = một "trình duyệt": các kênh cùng tên
// trong cùng hub nhận tin của nhau (trừ kênh gửi). Cố ý KHÔNG import `vitest`.

export type BroadcastChannelLike = {
  postMessage(data: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
};

export type FakeBroadcastChannelHub = {
  create(name: string): BroadcastChannelLike;
};

/**
 * Tin được chuyển ĐỒNG BỘ (BroadcastChannel thật bất đồng bộ) để test khỏi phải flush; dữ liệu đi
 * qua `structuredClone` như thật nên payload không clone được sẽ lộ ra ngay trong test.
 */
export function makeFakeBroadcastChannelHub(): FakeBroadcastChannelHub {
  const open = new Map<string, Set<BroadcastChannelLike>>();

  return {
    create(name) {
      const peers = open.get(name) ?? new Set<BroadcastChannelLike>();
      open.set(name, peers);
      let closed = false;

      const channel: BroadcastChannelLike = {
        onmessage: null,
        postMessage(data) {
          if (closed) throw new DOMException("BroadcastChannel đã đóng", "InvalidStateError");
          for (const peer of [...peers]) {
            if (peer === channel) continue;
            peer.onmessage?.({ data: structuredClone(data) });
          }
        },
        close() {
          closed = true;
          peers.delete(channel);
        },
      };

      peers.add(channel);
      return channel;
    },
  };
}
