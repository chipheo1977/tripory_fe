// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Bất biến bảo mật/phạm vi của Phase 5.1 (like và bình luận) được khóa bằng test tĩnh. Nếu một khẳng định đỏ,
// hãy sửa nguồn vi phạm chứ không nới test.
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

const packageSources = (name: string): SourceFile[] => {
  const base = path.join(repoRoot, "packages", name, "src");
  return walk(base, base).map((file) => ({ ...file, rel: `packages/${name}/src/${file.rel}` }));
};

const socialModule = inWeb("modules/social/");
const socialUiTsx = inWeb("modules/social/ui/").filter((file) => file.rel.endsWith(".tsx"));
const socialComponents = inWeb("components/public-social");
const socialPackage = packageSources("social");
const readText = (...segments: string[]) => readFileSync(path.join(...segments), "utf8");

describe("social security/scope invariants (Phase 5.1, static)", () => {
  // T-51-36, T-51-52: HTML thô của nội dung hoặc tên tác giả là đường XSS.
  it("never uses dangerouslySetInnerHTML in social sources", () => {
    const scanned = [...socialModule, ...socialComponents, ...socialPackage];
    expect(scanned.length).toBeGreaterThanOrEqual(15);
    const offenders = scanned.filter((file) => file.text.includes("dangerouslySetInnerHTML")).map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // coding-rules D: component không chạm API trình duyệt; chỉ hook `use-*.ts` gói chúng.
  it("keeps browser APIs out of social components", () => {
    expect(socialUiTsx.length).toBeGreaterThanOrEqual(10);
    const forbidden = /fetch\(|localStorage|sessionStorage|window\.|document\.|navigator/;
    const offenders = socialUiTsx.filter((file) => forbidden.test(file.text)).map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // coding-rules: ẩn/hiện component bằng prop `visible`, không bằng `&&`/`? :` trước thẻ JSX.
  it("does not toggle JSX with && or ? in social components", () => {
    expect(socialUiTsx.length).toBeGreaterThanOrEqual(10);
    const offenders = socialUiTsx.flatMap((file) =>
      file.text
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /(&&|\?)\s*<[A-Za-z]/.test(line))
        .map(({ index }) => `${file.rel}:${index + 1}`),
    );
    expect(offenders).toEqual([]);
  });

  // T-51-58, D-29: hai module web và hai context không import nhau.
  it("keeps social and itinerary modules and contexts apart", () => {
    expect(socialModule.length).toBeGreaterThan(10);
    const itineraryModule = inWeb("modules/itinerary/");
    expect(itineraryModule.length).toBeGreaterThan(10);
    expect(socialModule.filter((file) => file.text.includes("@/modules/itinerary")).map((file) => file.rel)).toEqual([]);
    expect(
      itineraryModule.filter((file) => /@\/modules\/social|@tripory\/social/.test(file.text)).map((file) => file.rel),
    ).toEqual([]);
    const otherContexts = [...packageSources("itinerary"), ...packageSources("identity")];
    expect(otherContexts.length).toBeGreaterThan(10);
    expect(otherContexts.filter((file) => file.text.includes("@tripory/social")).map((file) => file.rel)).toEqual([]);
    const manifest = JSON.parse(readText(repoRoot, "packages", "social", "package.json")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(manifest.dependencies ?? {});
    expect(deps.length).toBeGreaterThan(0);
    for (const name of ["@tripory/itinerary", "@tripory/identity", "@tripory/chat", "@tripory/ui-web"]) {
      expect(deps).not.toContain(name);
    }
  });

  // T-51-40: adapter HTTP chỉ được lắp ở composition root.
  it("imports @tripory/social/http only from composition", () => {
    const users = webSources.filter((file) => file.text.includes("@tripory/social/http")).map((file) => file.rel);
    expect(users.length).toBeGreaterThan(0);
    expect(users.filter((rel) => !rel.startsWith("composition/"))).toEqual([]);
  });

  // D-25: like và bình luận đi qua gốc `itineraries` sẵn có, allowlist BFF không đổi.
  it("keeps the BFF allowlist unchanged", () => {
    const bff = readText(srcDir, "composition", "server", "bff.ts");
    expect(bff).toContain("BFF_ALLOWED_ROOTS");
    expect(bff).toContain('new Set(["users", "itineraries", "chat"])');
  });

  // D-25: mọi đường dẫn của repository nằm dưới `/itineraries/{id}`.
  it("routes every social call under /itineraries/", () => {
    const repo = readText(repoRoot, "packages", "social", "src", "infrastructure", "http-social-repository.ts");
    const paths = [...repo.matchAll(/path:\s*([^,}\n]+)/g)].map((match) => (match[1] ?? "").trim());
    expect(paths.length).toBeGreaterThanOrEqual(6);
    for (const value of paths) {
      expect(value.startsWith("`${itineraryPath(") || value.startsWith("'/itineraries/")).toBe(true);
    }
    expect(repo).toContain("const itineraryPath = (id: string): string => `/itineraries/${id}`;");
    expect(repo).not.toMatch(/path:\s*[`'"]\/(social|like|comments)/);
  });

  // T-51-28: lệnh ghi tuần tự trong cùng scope; danh sách bình luận không tự tải lại.
  it("serialises social mutations and keeps the comment feed stable", () => {
    const hooks = readText(repoRoot, "packages", "social", "src", "react", "index.ts");
    expect((hooks.match(/scope:/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(hooks).toContain("staleTime: Infinity");
  });

  // UI-SPEC: thuật ngữ "bình luận", giọng văn không dấu chấm than.
  it("keeps the social copy in Vietnamese terms without exclamation marks", () => {
    const copy = readText(srcDir, "modules", "social", "ui", "social-copy.ts");
    const literals = [...copy.matchAll(/"([^"\n]*)"/g)].map((match) => match[1] ?? "");
    expect(literals.length).toBeGreaterThan(30);
    expect(literals.filter((text) => /comment/i.test(text) || text.includes("!"))).toEqual([]);
  });

  // T-51-60: factory RSC không đưa token hay cookie sang client.
  it("keeps the public social factory server-only and token-free", () => {
    const factory = readText(srcDir, "components", "public-social.tsx");
    expect(factory).toContain("makePublicSocial");
    expect(factory).not.toContain('"use client"');
    expect(factory).not.toMatch(/accessToken|cookies/);
  });
});
