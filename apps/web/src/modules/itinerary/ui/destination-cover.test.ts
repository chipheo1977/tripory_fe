import { expect, it } from "vitest";
import { defaultCoverFor, destinationBoundsFor, destinationNameFor } from "./destination-cover";

it("trả URL ảnh mặc định theo slug", () => {
  expect(defaultCoverFor("vn-da-nang")).toBe("https://triporyv1.vercel.app/destinations/vn-da-nang.jpg");
});

it.each([null, "vn-khong-co", ""])("mã %j không có ảnh mặc định", (code) => {
  expect(defaultCoverFor(code)).toBeNull();
});

it("mọi ảnh mặc định bắt đầu bằng https://", () => {
  for (const slug of ["vn-ha-noi", "vn-ho-chi-minh", "vn-hue"]) {
    expect(defaultCoverFor(slug)?.startsWith("https://")).toBe(true);
  }
});

it("trả khung nhìn của tỉnh theo slug và null khi không có", () => {
  expect(destinationBoundsFor("vn-da-nang")).toEqual([
    [107.21, 14.95],
    [109.03, 16.34],
  ]);
  expect(destinationBoundsFor(null)).toBeNull();
  expect(destinationBoundsFor("vn-khong-co")).toBeNull();
});

it("trả tên tỉnh theo slug và null khi không có", () => {
  expect(destinationNameFor("vn-lam-dong")).toBe("Lâm Đồng");
  expect(destinationNameFor(null)).toBeNull();
  expect(destinationNameFor("vn-khong-co")).toBeNull();
});