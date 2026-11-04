import { describe, expect, it } from "vitest";
import {
  COVER_DUPLICATE,
  COVER_NOT_HTTPS,
  COVER_TOO_LONG,
  createItinerarySchema,
  createTripSchema,
  DAY_COUNT_INVALID,
  DESTINATION_REQUIRED,
  metadataFieldsSchema,
  TRIP_NAME_REQUIRED,
  TRIP_NAME_TOO_LONG,
  validateCoverUrl,
  isHttpsUrl,
  metadataSchema,
  toMetadataInput,
  validateSubtitle,
  waypointSchema,
  type MetadataValues,
  type WaypointValues,
} from "./form-schemas";

const messagesOf = (result: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`) ?? [];

const metadata = (patch: Partial<MetadataValues> = {}): MetadataValues => ({
  title: "Sài Gòn 3 ngày",
  description: "",
  startDate: "",
  coverImageUrl: "",
  ...patch,
});

const waypoint = (patch: Partial<WaypointValues> = {}): WaypointValues => ({
  name: "Chợ Bến Thành",
  location: "10.7725, 106.6980",
  address: "",
  notes: "",
  ...patch,
});

describe("createItinerarySchema", () => {
  it("rejects an empty or whitespace title", () => {
    expect(messagesOf(createItinerarySchema.safeParse({ title: "   " }))).toEqual(["title:Vui lòng nhập tiêu đề."]);
    expect(messagesOf(createItinerarySchema.safeParse({ title: "" }))).toEqual(["title:Vui lòng nhập tiêu đề."]);
  });

  it("accepts 100 characters and rejects 101", () => {
    expect(createItinerarySchema.safeParse({ title: "a".repeat(100) }).success).toBe(true);
    expect(messagesOf(createItinerarySchema.safeParse({ title: "a".repeat(101) }))).toEqual([
      "title:Tiêu đề tối đa 100 ký tự.",
    ]);
  });

  it("counts the raw value: 99 characters plus 2 trailing spaces is 101", () => {
    expect(messagesOf(createItinerarySchema.safeParse({ title: `${"a".repeat(99)}  ` }))).toEqual([
      "title:Tiêu đề tối đa 100 ký tự.",
    ]);
  });
});

describe("metadataSchema", () => {
  it("accepts a minimal valid form", () => {
    expect(metadataSchema.safeParse(metadata()).success).toBe(true);
  });

  it("applies the title rules", () => {
    expect(messagesOf(metadataSchema.safeParse(metadata({ title: " " })))).toEqual(["title:Vui lòng nhập tiêu đề."]);
    expect(messagesOf(metadataSchema.safeParse(metadata({ title: "a".repeat(101) })))).toEqual([
      "title:Tiêu đề tối đa 100 ký tự.",
    ]);
  });

  it("limits the description to 1000 raw characters", () => {
    expect(metadataSchema.safeParse(metadata({ description: "a".repeat(1000) })).success).toBe(true);
    expect(messagesOf(metadataSchema.safeParse(metadata({ description: "a".repeat(1001) })))).toEqual([
      "description:Mô tả tối đa 1000 ký tự.",
    ]);
  });

  it("validates the start date as a real calendar date", () => {
    expect(metadataSchema.safeParse(metadata({ startDate: "" })).success).toBe(true);
    expect(metadataSchema.safeParse(metadata({ startDate: "2026-10-12" })).success).toBe(true);
    expect(messagesOf(metadataSchema.safeParse(metadata({ startDate: "2026-02-29" })))).toEqual([
      "startDate:Ngày khởi hành không hợp lệ.",
    ]);
    expect(messagesOf(metadataSchema.safeParse(metadata({ startDate: "12/10/2026" })))).toEqual([
      "startDate:Ngày khởi hành không hợp lệ.",
    ]);
  });

  it("requires an https cover image link and rejects dangerous schemes", () => {
    expect(metadataSchema.safeParse(metadata({ coverImageUrl: "" })).success).toBe(true);
    expect(metadataSchema.safeParse(metadata({ coverImageUrl: "https://example.com/a.jpg" })).success).toBe(true);
    for (const bad of ["http://x", "javascript:alert(1)", "ftp://x", "example.com/a.jpg", "https://a b"]) {
      expect(messagesOf(metadataSchema.safeParse(metadata({ coverImageUrl: bad })))).toEqual([
        "coverImageUrl:Link ảnh phải bắt đầu bằng https://.",
      ]);
    }
  });

  it("limits the cover image link to 500 characters", () => {
    const ok = `https://${"a".repeat(492)}`;
    const tooLong = `https://${"a".repeat(495)}`;
    expect(ok).toHaveLength(500);
    expect(metadataSchema.safeParse(metadata({ coverImageUrl: ok })).success).toBe(true);
    expect(tooLong).toHaveLength(503);
    expect(messagesOf(metadataSchema.safeParse(metadata({ coverImageUrl: tooLong })))).toEqual([
      "coverImageUrl:Link ảnh tối đa 500 ký tự.",
    ]);
  });
});

describe("waypointSchema", () => {
  it("accepts a valid waypoint", () => {
    expect(waypointSchema.safeParse(waypoint()).success).toBe(true);
  });

  it("requires a name and caps it at 200 raw characters", () => {
    expect(messagesOf(waypointSchema.safeParse(waypoint({ name: "  " })))).toEqual([
      "name:Vui lòng nhập tên điểm đến.",
    ]);
    expect(waypointSchema.safeParse(waypoint({ name: "a".repeat(200) })).success).toBe(true);
    expect(messagesOf(waypointSchema.safeParse(waypoint({ name: "a".repeat(201) })))).toEqual([
      "name:Tên điểm đến tối đa 200 ký tự.",
    ]);
  });

  it("only checks that the location is not empty (parsing belongs to LocationField)", () => {
    expect(messagesOf(waypointSchema.safeParse(waypoint({ location: " " })))).toEqual([
      "location:Vui lòng dán tọa độ hoặc link Google Maps.",
    ]);
    expect(waypointSchema.safeParse(waypoint({ location: "không phải tọa độ" })).success).toBe(true);
  });

  it("caps address at 500 and notes at 2000 characters", () => {
    expect(waypointSchema.safeParse(waypoint({ address: "a".repeat(500), notes: "a".repeat(2000) })).success).toBe(
      true,
    );
    expect(messagesOf(waypointSchema.safeParse(waypoint({ address: "a".repeat(501) })))).toEqual([
      "address:Địa chỉ tối đa 500 ký tự.",
    ]);
    expect(messagesOf(waypointSchema.safeParse(waypoint({ notes: "a".repeat(2001) })))).toEqual([
      "notes:Ghi chú tối đa 2000 ký tự.",
    ]);
  });
});

describe("validateSubtitle", () => {
  it("returns the error copy above 100 characters and null otherwise", () => {
    expect(validateSubtitle("a".repeat(101))).toBe("Phụ đề tối đa 100 ký tự.");
    expect(validateSubtitle("a".repeat(100))).toBeNull();
    expect(validateSubtitle("")).toBeNull();
  });
});

describe("isHttpsUrl", () => {
  it("accepts https only, without whitespace", () => {
    expect(isHttpsUrl("https://example.com")).toBe(true);
    expect(isHttpsUrl("HTTPS://example.com")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("https://")).toBe(false);
    expect(isHttpsUrl("https://a b")).toBe(false);
  });
});

describe("toMetadataInput", () => {
  it("trims, turns empty strings into null and parses the start date", () => {
    expect(
      toMetadataInput({
        title: "  Sài Gòn  ",
        description: "  mô tả  ",
        startDate: "2026-10-12",
        coverImageUrl: " https://example.com/a.jpg ",
      }),
    ).toEqual({
      title: "Sài Gòn",
      description: "mô tả",
      startDate: "2026-10-12",
      coverImages: ["https://example.com/a.jpg"],
      selectedCoverIndex: 0,
    });
    expect(toMetadataInput(metadata({ description: "   ", startDate: "", coverImageUrl: " " }))).toEqual({
      title: "Sài Gòn 3 ngày",
      description: null,
      startDate: null,
      coverImages: [],
      selectedCoverIndex: null,
    });
  });
});

const trip = (patch: Record<string, unknown> = {}) => ({
  destinationCode: "vn-da-nang",
  title: "Chuyến đi Đà Nẵng",
  startDate: "",
  dayCount: 3,
  interests: [] as string[],
  ...patch,
});

const issuesOf = (schema: { safeParse(value: unknown): { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`) ?? [];

describe("createTripSchema", () => {
  it("nhận dữ liệu hợp lệ", () => {
    expect(createTripSchema.safeParse(trip()).success).toBe(true);
  });

  it.each([null, ""])("điểm đến %j thiếu thì đúng một lỗi", (destinationCode) => {
    expect(issuesOf(createTripSchema, trip({ destinationCode }))).toEqual([`destinationCode: ${DESTINATION_REQUIRED}`]);
  });

  it.each(["", "   "])("tên %j rỗng", (title) => {
    expect(issuesOf(createTripSchema, trip({ title }))).toEqual([`title: ${TRIP_NAME_REQUIRED}`]);
  });

  it("tên 101 ký tự quá dài, 100 ký tự hợp lệ", () => {
    expect(issuesOf(createTripSchema, trip({ title: "a".repeat(101) }))).toEqual([`title: ${TRIP_NAME_TOO_LONG}`]);
    expect(createTripSchema.safeParse(trip({ title: "a".repeat(100) })).success).toBe(true);
  });

  it.each([0, 31, 2.5, Number.NaN])("số ngày %s không hợp lệ", (dayCount) => {
    expect(issuesOf(createTripSchema, trip({ dayCount }))).toEqual([`dayCount: ${DAY_COUNT_INVALID}`]);
  });

  it.each([1, 30])("số ngày biên %s hợp lệ", (dayCount) => {
    expect(createTripSchema.safeParse(trip({ dayCount })).success).toBe(true);
  });

  it("ngày khởi hành: rỗng và ngày thật hợp lệ, ngày không có thật bị từ chối", () => {
    expect(createTripSchema.safeParse(trip({ startDate: "" })).success).toBe(true);
    expect(createTripSchema.safeParse(trip({ startDate: "2026-11-12" })).success).toBe(true);
    expect(issuesOf(createTripSchema, trip({ startDate: "2026-02-30" }))).toEqual(["startDate: Ngày khởi hành không hợp lệ."]);
  });
});

describe("metadataFieldsSchema", () => {
  it("không có ô ảnh và kiểm tiêu đề, mô tả, ngày", () => {
    expect(metadataFieldsSchema.safeParse({ title: "A", description: "", startDate: "" }).success).toBe(true);
    expect(issuesOf(metadataFieldsSchema, { title: "", description: "x".repeat(1001), startDate: "x" })).toEqual([
      "title: Vui lòng nhập tiêu đề.",
      "description: Mô tả tối đa 1000 ký tự.",
      "startDate: Ngày khởi hành không hợp lệ.",
    ]);
  });
});

describe("validateCoverUrl", () => {
  it.each(["", "http://x.test/a.jpg", "javascript:alert(1)", "https://a b", "data:image/png;base64,AAA"])(
    "%j không phải https hợp lệ",
    (raw) => {
      expect(validateCoverUrl(raw, [])).toBe(COVER_NOT_HTTPS);
    },
  );

  it("quá 500 ký tự", () => {
    expect(validateCoverUrl(`https://a.test/${"x".repeat(486)}`, [])).toBe(COVER_TOO_LONG);
  });

  it("trùng sau khi trim", () => {
    expect(validateCoverUrl("  https://a.test/1.jpg ", ["https://a.test/1.jpg"])).toBe(COVER_DUPLICATE);
  });

  it("URL mới hợp lệ, kể cả có khoảng trắng đầu cuối", () => {
    expect(validateCoverUrl("https://a.test/2.jpg", ["https://a.test/1.jpg"])).toBeNull();
    expect(validateCoverUrl(" https://a.test/2.jpg ", [])).toBeNull();
  });
});
