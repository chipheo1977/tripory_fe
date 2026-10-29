import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EditorForbidden } from "./editor-forbidden";

it("explains that only the creator can edit and links back to the owner's list", () => {
  render(<EditorForbidden />);

  expect(screen.getByRole("heading", { name: "Bạn không có quyền sửa lịch trình này" })).toBeTruthy();
  expect(screen.getByText("Chỉ người tạo lịch trình mới sửa được.")).toBeTruthy();
  const link = screen.getByRole("link", { name: "Về Lịch trình của tôi" });
  expect(link.getAttribute("href")).toBe("/itineraries/mine");
});

it("renders the action as a link, not a button", () => {
  render(<EditorForbidden />);

  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByRole("link", { name: "Về Lịch trình của tôi" }).getAttribute("role")).toBeNull();
});

it("sets the document title and shows no itinerary content or edit action", () => {
  render(<EditorForbidden />);

  expect(document.title).toBe("Không có quyền truy cập · Tripory");
  expect(screen.queryByRole("menu")).toBeNull();
  expect(screen.queryByText(/Xuất bản|Xóa lịch trình|Thông tin chuyến đi/)).toBeNull();
});
