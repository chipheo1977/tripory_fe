import type { Itinerary } from "@tripory/itinerary";
import { addCoverImage, galleryOf } from "@tripory/itinerary";
import { parseItineraryId, parseUserId } from "@tripory/shared-kernel";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AutosaveFailure } from "./metadata-autosave";
import { useTripInfoForm } from "./use-trip-info-form";
import type { MetadataAutosaveHandle } from "./use-metadata-autosave";

const ID = parseItineraryId("3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f");
const OWNER = parseUserId("3f2504e0-4f89-11d3-9a0c-0305e82c3301");
if (ID === null || OWNER === null) throw new Error("dữ liệu mẫu phải hợp lệ");

const SAVED = "https://example.com/saved.jpg";
const itinerary: Itinerary = {
  id: ID,
  ownerId: OWNER,
  title: "Chuyến đi",
  description: null,
  coverImageUrl: SAVED,
  coverImages: [SAVED],
  destinationCode: "vn-da-nang",
  interests: [],
  startDate: null,
  isPublic: false,
  totalDistanceKm: 0,
  days: [],
  waypoints: [],
};

const handle = (failure: AutosaveFailure | null): MetadataAutosaveHandle => ({
  state: { timerActive: false, queued: false, failure, dirty: false },
  openForm: vi.fn(),
  attach: vi.fn(),
  detach: vi.fn(),
  request: vi.fn(),
  retry: vi.fn(),
}) as unknown as MetadataAutosaveHandle;

const coverFailure = (): AutosaveFailure => ({
  alert: null,
  fieldErrors: { coverImages: "Link ảnh không hợp lệ." },
});

describe("useTripInfoForm: lỗi ảnh bìa", () => {
  it("đặt lại lưới mỗi lần có lỗi ảnh mới, kể cả khi thông báo lỗi giống hệt lần trước", () => {
    const { result, rerender } = renderHook(
      ({ autosave }) => useTripInfoForm({ itinerary, autosave, open: true }),
      { initialProps: { autosave: handle(null) } },
    );

    for (let round = 0; round < 2; round += 1) {
      act(() => {
        result.current.onCoverChange(addCoverImage(galleryOf(itinerary), `https://example.com/bad-${round}.jpg`));
      });
      expect(result.current.gallery.images).toHaveLength(2);

      rerender({ autosave: handle(coverFailure()) });
      expect(result.current.gallery.images).toEqual([SAVED]);
      expect(result.current.coverError).toBe("Link ảnh không hợp lệ.");
      // Không trả failure về null giữa hai lần: chuỗi lỗi giữ nguyên, chỉ tham chiếu failure đổi.
    }
  });
});
