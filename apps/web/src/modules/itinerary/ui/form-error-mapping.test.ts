import { makeApiError, sessionExpiredError, type FieldErrors } from "@tripory/api-client";
import { describe, expect, it } from "vitest";
import { FIELD_INVALID_MESSAGE, GENERIC_ERROR_MESSAGE } from "@/lib/feedback";
import {
  mapCreateItineraryError,
  mapDeleteItineraryError,
  mapMetadataError,
  mapPublishError,
  mapWaypointError,
} from "./form-error-mapping";

const http = (status: number, code: string | null, message: string | null) =>
  makeApiError({ kind: "http", status, code, message });

const validation = (fieldErrors: FieldErrors) =>
  makeApiError({ kind: "http", status: 400, code: null, message: null, fieldErrors });

const forms = [
  ["mapCreateItineraryError", mapCreateItineraryError, "title"],
  ["mapMetadataError", mapMetadataError, "description"],
  ["mapWaypointError", mapWaypointError, "name"],
  ["mapPublishError", mapPublishError, null],
  ["mapDeleteItineraryError", mapDeleteItineraryError, null],
] as const;

describe.each(forms)("%s (hành vi chung)", (_name, map, knownField) => {
  it.each([
    ["session_expired", sessionExpiredError()],
    ["aborted", makeApiError({ kind: "aborted", status: null, code: null, message: null })],
  ] as const)("%s → null", (_kind, error) => {
    expect(map(error)).toBeNull();
  });

  it.each([
    ["lỗi không phải ApiError", new TypeError("x")],
    ["network", makeApiError({ kind: "network", status: null, code: null, message: null })],
    ["timeout", makeApiError({ kind: "timeout", status: null, code: null, message: null })],
    ["http 500", http(500, null, null)],
  ] as const)("%s → alert câu chung", (_n, error) => {
    expect(map(error)).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  it("key lạ trong fieldErrors → alert câu chung", () => {
    expect(map(validation({ unknownField: ["x"] }))).toEqual({ fieldErrors: {}, alert: GENERIC_ERROR_MESSAGE });
  });

  if (knownField !== null) {
    it("fieldErrors khớp (PascalCase của ASP.NET hoặc camelCase) → 'Giá trị không hợp lệ.' ở ô đó", () => {
      const pascal = knownField.charAt(0).toUpperCase() + knownField.slice(1);
      for (const key of [knownField, pascal]) {
        expect(map(validation({ [key]: ["The field is required."] }))).toEqual({
          fieldErrors: { [knownField]: FIELD_INVALID_MESSAGE },
          alert: null,
        });
      }
    });
  }
});

describe("mapCreateItineraryError", () => {
  it("ItineraryTitle.Empty → ô title", () => {
    expect(mapCreateItineraryError(http(400, "ItineraryTitle.Empty", "x"))).toEqual({
      fieldErrors: { title: "Vui lòng nhập tiêu đề." },
      alert: null,
    });
  });

  it("ItineraryTitle.TooLong → ô title với message BE", () => {
    const mapped = mapCreateItineraryError(http(400, "ItineraryTitle.TooLong", "Tiêu đề quá dài."));
    expect(mapped?.fieldErrors.title).toBe("Tiêu đề quá dài.");
    expect(mapped?.alert).toBeNull();
  });
});

describe("mapMetadataError", () => {
  it("gắn mã tiêu đề và mô tả vào đúng ô", () => {
    expect(mapMetadataError(http(400, "ItineraryTitle.Empty", "x"))?.fieldErrors).toEqual({
      title: "Vui lòng nhập tiêu đề.",
    });
    expect(mapMetadataError(http(400, "ItineraryDescription.TooLong", "Mô tả quá dài."))?.fieldErrors).toEqual({
      description: "Mô tả quá dài.",
    });
  });

  it("Itinerary.NotFound / Forbidden → alert với câu đã biên soạn", () => {
    expect(mapMetadataError(http(404, "Itinerary.NotFound", "x"))).toEqual({
      fieldErrors: {},
      alert: "Không tìm thấy lịch trình.",
    });
    expect(mapMetadataError(http(403, "Itinerary.Forbidden", "x"))).toEqual({
      fieldErrors: {},
      alert: "Bạn không có quyền sửa lịch trình này.",
    });
  });
});

describe("mapWaypointError", () => {
  it("WaypointName.Empty → name; Coordinate.* → location", () => {
    expect(mapWaypointError(http(400, "WaypointName.Empty", "x"))?.fieldErrors).toEqual({
      name: "Vui lòng nhập tên điểm đến.",
    });
    expect(mapWaypointError(http(400, "Coordinate.InvalidLatitude", "x"))?.fieldErrors).toEqual({
      location: "Vĩ độ phải nằm trong khoảng -90 đến 90.",
    });
    expect(mapWaypointError(http(400, "Coordinate.InvalidLongitude", "x"))?.fieldErrors).toEqual({
      location: "Kinh độ phải nằm trong khoảng -180 đến 180.",
    });
  });

  it("Latitude/Longitude của ValidationProblemDetails → ô location", () => {
    expect(mapWaypointError(validation({ Latitude: ["x"] }))).toEqual({
      fieldErrors: { location: FIELD_INVALID_MESSAGE },
      alert: null,
    });
    expect(mapWaypointError(validation({ longitude: ["x"] }))).toEqual({
      fieldErrors: { location: FIELD_INVALID_MESSAGE },
      alert: null,
    });
  });

  it("Waypoint.NotFound → alert", () => {
    expect(mapWaypointError(http(404, "Waypoint.NotFound", "x"))).toEqual({
      fieldErrors: {},
      alert: "Điểm đến không còn tồn tại.",
    });
  });
});

describe("mapPublishError", () => {
  it("Itinerary.CannotPublishEmpty → alert", () => {
    expect(mapPublishError(http(400, "Itinerary.CannotPublishEmpty", "x"))).toEqual({
      fieldErrors: {},
      alert: "Thêm ít nhất 1 điểm đến để xuất bản.",
    });
  });
});

describe("mapDeleteItineraryError", () => {
  it("Itinerary.NotFound → alert", () => {
    expect(mapDeleteItineraryError(http(404, "Itinerary.NotFound", "x"))).toEqual({
      fieldErrors: {},
      alert: "Không tìm thấy lịch trình.",
    });
  });
});
