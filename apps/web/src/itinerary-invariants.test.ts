// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Bất biến bảo mật/phạm vi của Phase 4 được khóa bằng test tĩnh. Nếu một khẳng định đỏ, hãy sửa nguồn vi phạm
// chứ không nới test.
const srcDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(srcDir, "..", "..", "..");

type SourceFile = { rel: string; text: string };

const IGNORED_DIRS = new Set(["node_modules", ".next", ".turbo", "dist"]);

function walk(dir: string, base: string): SourceFile[] {
  if (!existsSync(dir)) return [];
  const out: SourceFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) out.push(...walk(full, base));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push({
        rel: path.relative(base, full).split(path.sep).join("/"),
        text: readFileSync(full, "utf8"),
      });
    }
  }
  return out;
}

const webSources = walk(srcDir, srcDir).filter((file) => !file.rel.startsWith("test/"));
const inWeb = (prefix: string): SourceFile[] => webSources.filter((file) => file.rel.startsWith(prefix));
const itinerarySources = inWeb("modules/itinerary/");
const itineraryUiTsx = inWeb("modules/itinerary/ui/").filter((file) => file.rel.endsWith(".tsx"));
const uiWebSources = walk(path.join(repoRoot, "packages", "ui-web", "src"), path.join(repoRoot, "packages", "ui-web", "src"));

const packagesSrc = readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const base = path.join(repoRoot, "packages", entry.name, "src");
    return walk(base, base).map((file) => ({ ...file, rel: `packages/${entry.name}/src/${file.rel}` }));
  });

describe("itinerary security/scope invariants (static)", () => {
  // T-04-62: HTML thô trong module itinerary là đường XSS.
  it("never uses dangerouslySetInnerHTML in modules/itinerary", () => {
    // Có nguồn để quét thì khẳng định bên dưới mới có ý nghĩa.
    expect(itinerarySources.length).toBeGreaterThan(10);
    expect(itineraryUiTsx.length).toBeGreaterThan(5);
    const offenders = itinerarySources.filter((file) => file.text.includes("dangerouslySetInnerHTML")).map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // T-04-63: ảnh bìa do người dùng nhập URL; không gửi Referer cho máy chủ ảnh. `<img` trong JSX luôn tự đóng `/>`
  // (không dừng ở `>` đầu tiên vì `=>` của handler nằm trong thẻ).
  it('gives every <img in modules/itinerary referrerPolicy="no-referrer"', () => {
    const offenders: string[] = [];
    let found = 0;
    for (const file of inWeb("modules/itinerary/").filter((f) => f.rel.endsWith(".tsx"))) {
      for (const match of file.text.matchAll(/<img\b[\s\S]*?\/>/g)) {
        found += 1;
        if (!/referrerPolicy=("no-referrer"|\{"no-referrer"\})/.test(match[0])) offenders.push(file.rel);
      }
    }
    expect(found).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  // T-04-65: dnd-kit (DOM) chỉ ở lớp UI của app, không lọt vào package dùng chung.
  it("imports @dnd-kit only under apps/web/src/modules/itinerary/ui", () => {
    const offenders = webSources
      .filter((file) => file.text.includes('from "@dnd-kit/'))
      .filter((file) => !file.rel.startsWith("modules/itinerary/ui/"))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
    expect(webSources.some((file) => file.rel.startsWith("modules/itinerary/ui/") && file.text.includes('from "@dnd-kit/'))).toBe(
      true,
    );

    const leaked = packagesSrc.filter((file) => file.text.includes("@dnd-kit")).map((file) => file.rel);
    expect(leaked).toEqual([]);
  });

  // T-04-64: chỉ POST; request ghi luôn có Origin nên trang lạ không dùng được phiên của nạn nhân.
  it("exports only POST from the api/maps/resolve route", () => {
    const route = webSources.find((file) => file.rel === "app/api/maps/resolve/route.ts");
    expect(route).toBeDefined();
    expect(route?.text).toMatch(/export\s+(async\s+)?function\s+POST\b/);
    expect(route?.text).not.toMatch(/export\s+(async\s+)?function\s+(GET|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/);
    expect(route?.text).not.toMatch(/export\s+(const|let)\s+(GET|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/);
  });

  // D-02 (cuộn vô hạn, không nút "Tải thêm") và D-40 (không chia sẻ, thuộc Phase 5). So khớp phân biệt hoa thường:
  // "Đang tải thêm lịch trình…" và "Link chia sẻ sẽ không còn mở được." là hợp lệ.
  it('has no "Tải thêm" or "Chia sẻ" text in modules/itinerary/ui', () => {
    const offenders = itineraryUiTsx
      .filter((file) => file.text.includes("Tải thêm") || file.text.includes("Chia sẻ"))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  it("has no z-(--z-…) utilities left in apps/web and ui-web", () => {
    const offenders = [
      ...webSources.filter((file) => file.text.includes("z-(--z-")).map((file) => `apps/web/src/${file.rel}`),
      ...uiWebSources.filter((file) => file.text.includes("z-(--z-")).map((file) => `packages/ui-web/src/${file.rel}`),
    ];
    expect(offenders).toEqual([]);
  });

  // T-04-59: RSC của editor không gọi BE; tải qua BFF ở client (Pitfall 11, D-45).
  it("keeps the editor route page free of the http layer and fetch", () => {
    const page = webSources.find((file) => file.rel === "app/(dashboard)/(editor)/itineraries/[id]/edit/page.tsx");
    expect(page).toBeDefined();
    expect(page?.text).not.toContain("@tripory/itinerary/http");
    expect(page?.text).not.toContain("fetch(");
  });
});
