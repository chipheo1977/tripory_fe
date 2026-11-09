import { makeApiError } from "@tripory/api-client";
import type { Place } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import {
  PLACE_ERROR,
  PLACE_HINT,
  PLACE_LOADING,
  PLACE_RESULTS_HEADING,
  placeErrorMessage,
  placeListState,
  placeStatusText,
  type PlaceQuerySlice,
} from "./place-list-state";

const place = (id: string): Place => ({
  id,
  name: `Điểm ${id}`,
  address: null,
  coordinate: { latitude: 11.94, longitude: 108.45 },
  category: "attraction",
  countryCode: "VN",
});

const idle: PlaceQuerySlice = { data: undefined, loading: false, error: null };
const loaded = (items: readonly Place[], loading = false): PlaceQuerySlice => ({ data: items, loading, error: null });
const failed = (error: unknown): PlaceQuerySlice => ({ data: undefined, loading: false, error });

const base = { query: "", destinationName: "Lâm Đồng", search: idle, suggestions: idle };

describe("placeListState: gợi ý (từ khóa < 2 ký tự)", () => {
  it("không có điểm đến → hint, không có heading", () => {
    expect(placeListState({ ...base, destinationName: null })).toEqual({
      status: "hint",
      heading: null,
      items: [],
      message: PLACE_HINT,
    });
  });

  it("chưa có dữ liệu → loading", () => {
    expect(placeListState(base)).toMatchObject({ status: "loading", message: PLACE_LOADING });
  });

  it("có gợi ý → ready với heading theo tên điểm đến", () => {
    const items = [place("N1"), place("N2")];
    expect(placeListState({ ...base, query: "h", suggestions: loaded(items) })).toEqual({
      status: "ready",
      heading: "Gợi ý ở Lâm Đồng",
      items,
      message: null,
    });
  });

  it("gợi ý rỗng → hint", () => {
    expect(placeListState({ ...base, suggestions: loaded([]) })).toMatchObject({ status: "hint", message: PLACE_HINT });
  });

  it("gợi ý lỗi → error với câu chung", () => {
    expect(placeListState({ ...base, suggestions: failed(new Error("x")) })).toMatchObject({
      status: "error",
      message: PLACE_ERROR,
    });
  });
});

describe("placeListState: tìm kiếm (từ khóa ≥ 2 ký tự)", () => {
  it("có kết quả → ready, heading Kết quả tìm kiếm", () => {
    const items = [place("N3")];
    expect(placeListState({ ...base, query: "ho", search: loaded(items), suggestions: loaded([place("N1")]) })).toEqual({
      status: "ready",
      heading: PLACE_RESULTS_HEADING,
      items,
      message: null,
    });
  });

  it("rỗng → empty với từ khóa đã chuẩn hóa", () => {
    expect(placeListState({ ...base, query: "  xyz   abc ", search: loaded([]) })).toMatchObject({
      status: "empty",
      message: 'Không tìm thấy "xyz abc". Thử tên khác hoặc nhập tọa độ thủ công.',
    });
  });

  it("dữ liệu cũ rỗng đang tải lại → loading, không báo không tìm thấy", () => {
    expect(placeListState({ ...base, query: "ho xuan", search: loaded([], true) }).status).toBe("loading");
  });

  it("dữ liệu cũ có kết quả đang tải lại → giữ kết quả cũ", () => {
    expect(placeListState({ ...base, query: "ho xuan", search: loaded([place("N4")], true) }).status).toBe("ready");
  });

  it("không có điểm đến vẫn tìm được", () => {
    expect(placeListState({ ...base, destinationName: null, query: "ho", search: loaded([place("N5")]) }).status).toBe(
      "ready",
    );
  });

  it("429 Places.RateLimited → câu giới hạn", () => {
    const error = makeApiError({ kind: "http", status: 429, code: "Places.RateLimited", message: null });
    expect(placeListState({ ...base, query: "ho", search: failed(error) })).toMatchObject({
      status: "error",
      message: "Bạn tìm hơi nhanh. Đợi vài giây rồi thử lại.",
    });
  });
});

describe("placeErrorMessage", () => {
  it.each([
    ["Places.Unavailable", PLACE_ERROR],
    ["Ma.La", PLACE_ERROR],
    [null, PLACE_ERROR],
  ])("mã %j → câu chung của tìm địa điểm", (code, expected) => {
    expect(placeErrorMessage(makeApiError({ kind: "http", status: 502, code, message: "Bad gateway" }))).toBe(expected);
  });

  it("lỗi mạng → câu chung của tìm địa điểm", () => {
    expect(placeErrorMessage(makeApiError({ kind: "network", status: null, code: null, message: null }))).toBe(PLACE_ERROR);
  });
});

describe("placeStatusText", () => {
  it("đếm kết quả, báo không có kết quả, đọc câu lỗi, còn lại rỗng", () => {
    expect(placeStatusText(placeListState({ ...base, suggestions: loaded([place("N1"), place("N2")]) }))).toBe("2 kết quả");
    expect(placeStatusText(placeListState({ ...base, query: "ho", search: loaded([]) }))).toBe("Không có kết quả");
    expect(placeStatusText(placeListState({ ...base, suggestions: failed(new Error("x")) }))).toBe(PLACE_ERROR);
    expect(placeStatusText(placeListState(base))).toBe("");
  });
});
