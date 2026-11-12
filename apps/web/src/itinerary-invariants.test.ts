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

  // D-143: tìm địa điểm chỉ đọc nên chỉ GET; GET cùng origin không có Origin vẫn qua, Origin lạ bị chặn trong handler.
  it.each(["search", "suggestions", "reverse"])("exports only GET from the api/places/%s route", (name) => {
    const route = webSources.find((file) => file.rel === `app/api/places/${name}/route.ts`);
    expect(route).toBeDefined();
    expect(route?.text).toMatch(/export\s+(async\s+)?function\s+GET\b/);
    expect(route?.text).not.toMatch(/export\s+(async\s+)?function\s+(POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/);
    expect(route?.text).not.toMatch(/export\s+(const|let)\s+(POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/);
    expect(route?.text).not.toMatch(/export\s*\{/);
  });

  // D-02 (cuộn vô hạn, không nút "Tải thêm"). Khóa D-40 (chưa có chia sẻ trong Phase 4) đã hết hiệu lực: Phase 5 dựng
  // nút/hộp "Chia sẻ" (PUB-04). So khớp phân biệt hoa thường: "Đang tải thêm lịch trình…" là hợp lệ.
  it('has no "Tải thêm" text in modules/itinerary/ui', () => {
    const offenders = itineraryUiTsx.filter((file) => file.text.includes("Tải thêm")).map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  it('keeps the Phase 5 share UI: share-button.tsx exists with the "Chia sẻ" label', () => {
    const button = itineraryUiTsx.find((file) => file.rel.endsWith("modules/itinerary/ui/share-button.tsx"));
    expect(button).toBeDefined();
    expect(button?.text).toContain("Chia sẻ lịch trình");
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

  // D-107 (T-04-143): form "Thông tin chuyến đi" tự lưu nên không có bản nháp; kind `metadata` không được quay lại.
  it('has no "metadata" draft kind in modules/itinerary/ui', () => {
    const draftStorage = webSources.find((file) => file.rel === "modules/itinerary/ui/draft-storage.ts");
    expect(draftStorage).toBeDefined();
    expect(draftStorage?.text).not.toMatch(/["']metadata["']|`metadata:/);
    const offenders = inWeb("modules/itinerary/ui/")
      .filter((file) => /kind:\s*["']metadata["']|draftKey\([^)]*metadata/.test(file.text))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // T-04-145: package itinerary thuần; URL ảnh đi vào qua tham số `imageBaseUrl`, không đọc env hay global của trình duyệt.
  it("keeps packages/itinerary free of env and browser globals", () => {
    const sources = packagesSrc.filter((file) => file.rel.startsWith("packages/itinerary/src/"));
    expect(sources.length).toBeGreaterThan(20);
    const banned = ["process.env", "NEXT_PUBLIC", "window.", "document.", "localStorage", "sessionStorage"];
    const offenders = sources
      .filter((file) => banned.some((word) => file.text.includes(word)))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // D-54, D-77 (T-04-144): PUT metadata không gửi điểm đến/sở thích/ảnh đơn; POST create gửi đủ 5 khóa.
  it("sends destination and interests only in create, never in updateMetadata", () => {
    const repo = packagesSrc.find((file) => file.rel === "packages/itinerary/src/infrastructure/http-itinerary-repository.ts");
    expect(repo).toBeDefined();
    const text = repo?.text ?? "";
    const updateStart = text.indexOf("async updateMetadata");
    const publishStart = text.indexOf("async publish");
    expect(updateStart).toBeGreaterThan(-1);
    expect(publishStart).toBeGreaterThan(updateStart);
    const updateBody = text.slice(updateStart, publishStart);
    for (const key of ["destinationCode", "interests", "coverImageUrl"]) expect(updateBody).not.toContain(key);

    const createStart = text.indexOf("async create");
    expect(createStart).toBeGreaterThan(-1);
    expect(createStart).toBeLessThan(updateStart);
    const createBody = text.slice(createStart, updateStart);
    for (const key of ["title", "destinationCode", "dayCount", "startDate", "interests"]) expect(createBody).toContain(key);
  });

  // D-79, D-106: gốc URL ảnh là hằng https ở tầng composition; chỉ vài file UI được chạm vào danh mục.
  it("keeps the destination image base URL a https constant and the catalog off most UI files", () => {
    const catalog = webSources.find((file) => file.rel === "composition/destination-catalog.ts");
    expect(catalog).toBeDefined();
    const code = (catalog?.text ?? "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).toMatch(/const DESTINATION_IMAGE_BASE_URL\s*=\s*"https:\/\//);
    for (const banned of ["NEXT_PUBLIC", "process.env", "use client", "http.client"]) expect(code).not.toContain(banned);

    const allowed = new Set([
      "modules/itinerary/ui/destination-cover.ts",
      "modules/itinerary/ui/create-itinerary-dialog.tsx",
      "modules/itinerary/ui/use-create-itinerary-form.ts",
    ]);
    const offenders = inWeb("modules/itinerary/ui/")
      .filter((file) => file.text.includes("destinationCatalog") && !allowed.has(file.rel))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });
});

describe("public itinerary invariants (Phase 5, static)", () => {
  const VIEWER_ROUTE = "app/(public)/(viewer)/";
  const read = (rel: string): string => readFileSync(path.join(srcDir, rel), "utf8");
  // Dòng chú thích không phải vi phạm (comment có thể nhắc tên API bị cấm để giải thích vì sao cấm).
  const code = (text: string): string => text.split("\n").filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line)).join("\n");
  const tagAround = (text: string, index: number): string => text.slice(Math.max(0, index - 400), index + 400);

  // T-05-25, T-05-49 (tabnabbing): mọi link mở tab mới phải kèm rel="noopener noreferrer".
  it('pairs every target="_blank" in modules/itinerary/ui with rel="noopener noreferrer"', () => {
    const offenders: string[] = [];
    let found = 0;
    for (const file of itineraryUiTsx) {
      for (const match of file.text.matchAll(/target="_blank"/g)) {
        found += 1;
        if (!tagAround(file.text, match.index).includes('rel="noopener noreferrer"')) offenders.push(file.rel);
      }
    }
    expect(found).toBeGreaterThanOrEqual(2);
    expect(offenders).toEqual([]);
  });

  // T-05-62, T-05-63: route công khai gọi BE chỉ qua `itinerary.server` (server-only), không fetch, không cache dùng chung, không đọc cookie.
  it("keeps the public route page free of http/fetch/shared cache/cookies and with generateMetadata", () => {
    const page = readFileSync(path.join(srcDir, VIEWER_ROUTE, "itineraries", "[id]", "page.tsx"), "utf8");
    expect(page).toContain("generateMetadata");
    for (const forbidden of ["@tripory/itinerary/http", "fetch(", "use cache", "cookies("]) {
      expect(page).not.toContain(forbidden);
    }
  });

  // RESEARCH Pattern 6: file-based metadata (`opengraph-image`, `twitter-image`) có ưu tiên cao hơn `generateMetadata`
  // và sẽ ghi đè ảnh bìa/noindex của trang công khai.
  it("has no file-based opengraph/twitter image in the public route", () => {
    const base = path.join(srcDir, VIEWER_ROUTE);
    expect(existsSync(base)).toBe(true);
    const names: string[] = [];
    const collect = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) collect(path.join(dir, entry.name));
        else names.push(entry.name);
      }
    };
    collect(base);
    expect(names.length).toBeGreaterThan(2);
    expect(names.filter((name) => /^(opengraph|twitter)-image/.test(name))).toEqual([]);
  });

  // T-05-01, T-05-29: `uqr` chỉ ở apps/web, chỉ `encode()` (không `renderSVG` cần HTML thô).
  it("keeps uqr in apps/web only and never uses renderSVG", () => {
    const appPackage = readFileSync(path.join(srcDir, "..", "package.json"), "utf8");
    expect(appPackage).toContain('"uqr": "catalog:"');
    const packageDirs = readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true }).filter((entry) => entry.isDirectory());
    expect(packageDirs.length).toBeGreaterThan(3);
    for (const entry of packageDirs) {
      const manifest = path.join(repoRoot, "packages", entry.name, "package.json");
      if (existsSync(manifest)) expect(readFileSync(manifest, "utf8")).not.toContain('"uqr"');
    }
    expect(packagesSrc.filter((file) => /from\s+["']uqr["']/.test(file.text)).map((file) => file.rel)).toEqual([]);
    expect(code(read("modules/itinerary/ui/qr-matrix.ts"))).not.toContain("renderSVG");
  });

  // T-05-54: bản chỉ đọc không kéo hook ghi hay dnd-kit vào bundle công khai.
  it("keeps the read-only public files free of the editor data client and dnd-kit", () => {
    const readOnly = itineraryUiTsx
      .concat(inWeb("modules/itinerary/ui/").filter((file) => file.rel.endsWith(".ts")))
      .filter((file) => /^modules\/itinerary\/ui\/(public-|article-|share-|qr-|maps-link|draft-strip|view-mode-toggle|use-public-|use-share-|use-qr-|use-day-navigation|use-pill-)/.test(file.rel));
    expect(readOnly.length).toBeGreaterThan(20);
    const offenders = readOnly
      .filter((file) => file.text.includes("itinerary.client") || file.text.includes("@dnd-kit"))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // D-20, T-05-20: mọi nhánh metadata công khai đều noindex; `PUBLIC_SITE_URL` chỉ phía server.
  it("always noindexes public metadata and keeps PUBLIC_SITE_URL server-only", () => {
    const metadata = read("composition/server/public-metadata.ts");
    expect(metadata).toContain("index: false");
    expect(metadata).toContain("follow: false");
    expect(metadata).not.toContain("index: true");
    const siteUrl = code(read("composition/server/site-url.ts"));
    expect(siteUrl).toContain("PUBLIC_SITE_URL");
    expect(siteUrl).not.toContain("NEXT_PUBLIC");
  });

  // D-21: trang 403 giữ đúng câu khóa và không mời đăng nhập (tránh dò bản nháp).
  it("keeps the locked 403 copy without a sign-in prompt", () => {
    const forbidden = code(read("modules/itinerary/ui/public-forbidden.tsx"));
    // `buttonVariants` là hàm của file client trong ui-web: gọi từ RSC làm vỡ stream 403 (bắt được lúc chạy `next start`).
    expect(forbidden.trimStart().startsWith('"use client"')).toBe(true);
    expect(forbidden).toContain("Lịch trình này chưa được xuất bản");
    expect(forbidden).toContain("Chỉ người tạo xem được bản nháp.");
    expect(forbidden).not.toContain("Đăng nhập");
  });
});
