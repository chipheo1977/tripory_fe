// @vitest-environment node
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PROTECTED_PREFIXES } from "./proxy";

// D-10: "route mới trong `(dashboard)` tự được bảo vệ". Proxy không thấy tên route group nên danh sách
// `PROTECTED_PREFIXES` khai báo tay; test này đối chiếu với thư mục thật để quên khai báo thì CI đỏ
// (mối đe dọa T-03-70: route dashboard lọt gate).
const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "app");

function listPages(group: string): string[] {
  const root = path.join(appDir, group);
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === "page.tsx")
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
}

/** `itineraries/[id]/page.tsx` → `/itineraries/x`; `(group)` bị bỏ; `[...slug]` → `x/y`. */
function toUrl(pagePath: string): string {
  const segments = pagePath
    .replace(/\/?page\.tsx$/, "")
    .split("/")
    .filter((segment) => segment !== "" && !/^\(.*\)$/.test(segment))
    .map((segment) => {
      if (/^\[\.\.\..+\]$/.test(segment) || /^\[\[\.\.\..+\]\]$/.test(segment)) return "x/y";
      if (/^\[.+\]$/.test(segment)) return "x";
      return segment;
    });
  return `/${segments.join("/")}`;
}

const isProtected = (url: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));

const dashboardUrls = listPages("(dashboard)").map(toUrl);
const publicUrls = listPages("(public)").map(toUrl);

describe("proxy coverage of the (dashboard) route group", () => {
  it("finds the known dashboard pages (guards against a broken directory walk)", () => {
    expect(dashboardUrls.length).toBeGreaterThan(0);
    expect(dashboardUrls).toContain("/itineraries/mine");
    expect(dashboardUrls).toContain("/settings/password");
  });

  it.each(dashboardUrls)("%s is covered by PROTECTED_PREFIXES", (url) => {
    expect(isProtected(url)).toBe(true);
  });

  it("does not gate any public page by mistake", () => {
    expect(publicUrls.length).toBeGreaterThan(0);
    expect(publicUrls.filter(isProtected)).toEqual([]);
  });
});
