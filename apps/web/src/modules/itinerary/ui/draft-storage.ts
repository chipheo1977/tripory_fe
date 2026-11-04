// Bản nháp form lưu vào `sessionStorage` khi phiên hết hạn thật (D-36, RESEARCH Pattern 18). Chỉ còn form waypoint:
// form "Thông tin chuyến đi" tự lưu nên không có bản nháp (D-101, D-107); khóa `metadata` cũ bị `findFirst` dọn như kind lạ.
//
// - Khóa có `viewerId` để tài khoản khác đăng nhập cùng tab không thấy nội dung của người trước (Pitfall 4, T-04-41).
// - Giá trị lưu là `{ savedAt, values }`; đọc lại luôn qua Zod, bản hỏng/sai schema hoặc quá 24 giờ bị xóa và coi như không có.
// - Mọi truy cập storage bọc try/catch: chế độ riêng tư, quota đầy hay SSR đều không được làm hỏng form.
import type { z } from "zod";

const KEY_PREFIX = "tripory:draft:v1:";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type DraftKind = `add:${number}` | `edit:${string}`;

export const draftPrefix = (p: { viewerId: string; itineraryId: string }): string =>
  `${KEY_PREFIX}${p.viewerId}:${p.itineraryId}:`;

export const draftKey = (p: { viewerId: string; itineraryId: string; kind: DraftKind }): string =>
  `${draftPrefix(p)}${p.kind}`;

export type DraftStorage = Readonly<{
  save(key: string, values: unknown): void;
  /** Sai schema hoặc quá 24 giờ thì xóa khóa và trả `null`. */
  load<T>(key: string, schema: z.ZodType<T>): T | null;
  remove(key: string): void;
  /** `prefix` dạng `tripory:draft:v1:{viewerId}:{itineraryId}:`. Bản quá hạn hoặc kind lạ bị bỏ qua và dọn. */
  findFirst(prefix: string): Readonly<{ key: string; kind: DraftKind }> | null;
}>;

export type DraftStorageDeps = Readonly<{
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length"> | null;
  nowMs: () => number;
}>;

const isDraftKind = (value: string): value is DraftKind => {
  if (value.startsWith("edit:")) return value.length > "edit:".length;
  if (value.startsWith("add:")) return /^add:\d+$/.test(value);
  return false;
};

type Envelope = Readonly<{ savedAt: number; values: unknown }>;

const parseEnvelope = (raw: string): Envelope | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { savedAt, values } = parsed as { savedAt?: unknown; values?: unknown };
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt) || values === undefined) return null;
  return { savedAt, values };
};

export function createDraftStorage({ storage, nowMs }: DraftStorageDeps): DraftStorage {
  const attempt = <T>(action: (target: NonNullable<DraftStorageDeps["storage"]>) => T, fallback: T): T => {
    if (storage === null) return fallback;
    try {
      return action(storage);
    } catch {
      return fallback;
    }
  };

  const remove = (key: string): void => attempt((target) => target.removeItem(key), undefined);

  const readFresh = (key: string): Envelope | null => {
    const raw = attempt((target) => target.getItem(key), null);
    if (raw === null) return null;
    const envelope = parseEnvelope(raw);
    if (envelope === null || nowMs() - envelope.savedAt > DRAFT_TTL_MS) {
      remove(key);
      return null;
    }
    return envelope;
  };

  return {
    save(key, values) {
      attempt((target) => target.setItem(key, JSON.stringify({ savedAt: nowMs(), values })), undefined);
    },
    load(key, schema) {
      const envelope = readFresh(key);
      if (envelope === null) return null;
      const result = schema.safeParse(envelope.values);
      if (!result.success) {
        remove(key);
        return null;
      }
      return result.data;
    },
    remove,
    findFirst(prefix) {
      // Gom khóa trước rồi mới đọc/xóa: xóa trong lúc duyệt theo chỉ số làm lệch chỉ số.
      const keys = attempt((target) => {
        const found: string[] = [];
        for (let index = 0; index < target.length; index += 1) {
          const key = target.key(index);
          if (key !== null && key.startsWith(prefix)) found.push(key);
        }
        return found;
      }, [] as string[]);
      for (const key of keys) {
        const kind = key.slice(prefix.length);
        if (!isDraftKind(kind) || readFresh(key) === null) {
          if (!isDraftKind(kind)) remove(key);
          continue;
        }
        return { key, kind };
      }
      return null;
    },
  };
}

// `window.sessionStorage` có thể ném SecurityError khi bị chặn; SSR không có `window`.
const browserSessionStorage = (): DraftStorageDeps["storage"] => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const draftStorage: DraftStorage = createDraftStorage({
  storage: browserSessionStorage(),
  nowMs: () => Date.now(),
});
