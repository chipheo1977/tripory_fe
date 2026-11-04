import { parseCalendarDate, type MetadataInput } from "@tripory/itinerary";
import { describe, expect, it } from "vitest";
import {
  buildAutosavePayload,
  invalidMetadataFields,
  type AutosaveSnapshot,
} from "./metadata-autosave-payload";

const SAVED_DATE = parseCalendarDate("2026-10-01");

const lastSaved: MetadataInput = {
  title: "Tên đã lưu",
  description: "Mô tả đã lưu",
  startDate: SAVED_DATE,
  coverImages: ["https://img.example/old.jpg"],
  selectedCoverIndex: 0,
};

const snapshot = (patch: Partial<AutosaveSnapshot["values"]> = {}, gallery: AutosaveSnapshot["gallery"] = { images: ["https://img.example/a.jpg", "https://img.example/b.jpg"], selectedIndex: 1 }): AutosaveSnapshot => ({
  values: { title: "  Tên mới  ", description: "  Mô tả mới ", startDate: "2026-11-12", ...patch },
  gallery,
});

const build = (s: AutosaveSnapshot) => buildAutosavePayload({ lastSaved, snapshot: s });

describe("buildAutosavePayload", () => {
  it("ô hợp lệ lấy giá trị đã trim, kèm ảnh và vị trí chọn", () => {
    expect(build(snapshot())).toEqual({
      title: "Tên mới",
      description: "Mô tả mới",
      startDate: "2026-11-12",
      coverImages: ["https://img.example/a.jpg", "https://img.example/b.jpg"],
      selectedCoverIndex: 1,
    });
  });

  it.each(["   ", "a".repeat(101)])("tiêu đề sai (%#) dùng tiêu đề đã lưu", (title) => {
    expect(build(snapshot({ title })).title).toBe("Tên đã lưu");
  });

  it("mô tả quá 1000 ký tự dùng mô tả đã lưu; chỉ khoảng trắng thì null", () => {
    expect(build(snapshot({ description: "x".repeat(1001) })).description).toBe("Mô tả đã lưu");
    expect(build(snapshot({ description: "  " })).description).toBeNull();
  });

  it("ngày: rỗng thì null, hợp lệ thì parse, sai thì dùng ngày đã lưu", () => {
    expect(build(snapshot({ startDate: "" })).startDate).toBeNull();
    expect(build(snapshot({ startDate: "2026-11-12" })).startDate).toBe("2026-11-12");
    expect(build(snapshot({ startDate: "2026-02-30" })).startDate).toBe(SAVED_DATE);
  });

  it("mọi ô chữ sai vẫn ra payload với chữ cũ và ảnh mới", () => {
    const payload = build(snapshot({ title: "", description: "x".repeat(1001), startDate: "bad" }));
    expect(payload).toMatchObject({ title: "Tên đã lưu", description: "Mô tả đã lưu", startDate: SAVED_DATE });
    expect(payload.coverImages).toHaveLength(2);
  });

  it("danh sách ảnh rỗng thì selectedCoverIndex null dù selectedIndex là 0", () => {
    const payload = build(snapshot({}, { images: [], selectedIndex: 0 }));
    expect(payload.coverImages).toEqual([]);
    expect(payload.selectedCoverIndex).toBeNull();
  });

  it("đúng 5 khóa, không có điểm đến, sở thích hay coverImageUrl", () => {
    expect(Object.keys(build(snapshot())).toSorted()).toEqual([
      "coverImages",
      "description",
      "selectedCoverIndex",
      "startDate",
      "title",
    ]);
  });

  it("không sửa đầu vào", () => {
    const input = snapshot();
    const copy = structuredClone(input);
    build(input);
    expect(input).toEqual(copy);
  });
});

describe("invalidMetadataFields", () => {
  it("hợp lệ thì tập rỗng", () => {
    expect(invalidMetadataFields(snapshot().values).size).toBe(0);
  });

  it("trả đúng các ô sai", () => {
    expect([...invalidMetadataFields({ title: "", description: "x".repeat(1001), startDate: "bad" })].toSorted()).toEqual([
      "description",
      "startDate",
      "title",
    ]);
    expect([...invalidMetadataFields({ title: "ok", description: "", startDate: "2026-02-30" })]).toEqual(["startDate"]);
  });
});
