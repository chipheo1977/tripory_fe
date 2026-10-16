// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Bất biến bảo mật của Phase 3 được khóa bằng test tĩnh. Nếu một khẳng định đỏ, hãy sửa nguồn vi phạm
// chứ không nới test.
const srcDir = path.dirname(fileURLToPath(import.meta.url));

type SourceFile = { rel: string; text: string };

function walk(dir: string): SourceFile[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file))
    .map((file) => ({
      rel: path.relative(srcDir, file).split(path.sep).join("/"),
      text: readFileSync(file, "utf8"),
    }));
}

const allSources = walk(srcDir).filter((file) => !file.rel.startsWith("test/"));
const inDir = (prefix: string): SourceFile[] => allSources.filter((file) => file.rel.startsWith(prefix));
const routeFiles = inDir("app/api/").filter((file) => file.rel.endsWith("/route.ts"));

describe("auth security invariants (static)", () => {
  // Pitfall 3 / T-03-71: hai đường refresh cùng chạy sẽ đạp token xoay vòng của nhau.
  it('keeps the "/refresh" path literal inside composition/http.client.ts only', () => {
    const owners = allSources.filter((file) => file.text.includes('"/refresh"')).map((file) => file.rel);
    expect(owners).toEqual(["composition/http.client.ts"]);
  });

  // D-23: `/api/auth/token` (đưa token cho JS) thuộc Phase 7 (CHAT-09), không dựng ở đây.
  it("does not expose an api/auth/token route", () => {
    expect(existsSync(path.join(srcDir, "app", "api", "auth", "token"))).toBe(false);
  });

  it("has route handlers to inspect", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(6);
  });

  it.each(routeFiles.map((file) => [file.rel, file] as const))(
    "%s is a thin shell over composition/server",
    (_rel, file) => {
      expect(file.text.split("\n").length).toBeLessThanOrEqual(25);
      expect(file.text).toContain("@/composition/server/");
      expect(file.text).not.toContain("@tripory/identity/http");
      expect(file.text).not.toContain("@tripory/api-client/http");
    },
  );

  // T-03-72: token/mật khẩu không bao giờ vào log.
  it("has no console.* in composition/** and modules/**", () => {
    const offenders = [...inDir("composition/"), ...inDir("modules/")]
      .filter((file) => /\bconsole\./.test(file.text))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  it('only composition/viewer.server.ts imports "server-only" in composition/**', () => {
    const owners = inDir("composition/")
      .filter((file) => /import\s+["']server-only["']/.test(file.text))
      .map((file) => file.rel);
    expect(owners).toEqual(["composition/viewer.server.ts"]);
  });

  // T-03-72: token không ở storage, không ở biến NEXT_PUBLIC_ (lộ vào bundle client).
  it("never stores tokens in web storage or NEXT_PUBLIC_ variables", () => {
    const offenders = allSources
      .filter((file) =>
        /NEXT_PUBLIC_API|NEXT_PUBLIC_\w*TOKEN|\blocalStorage\b|\bsessionStorage\b/.test(file.text),
      )
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  // T-03-73: proxy chỉ nhìn cookie, không gọi BE và không giải mã token.
  it("keeps proxy.ts free of network calls and identity/http", () => {
    const proxy = allSources.find((file) => file.rel === "proxy.ts");
    expect(proxy).toBeDefined();
    expect(proxy?.text).not.toContain("fetch(");
    expect(proxy?.text).not.toContain("@tripory/identity/http");
  });

  // D-35: bí mật dùng chung với BE chỉ server đọc. Nằm ngoài composition/server/** là có đường lọt vào bundle
  // client hoặc vào code dùng chung; tiền tố NEXT_PUBLIC_ nhúng thẳng giá trị vào JS gửi trình duyệt.
  it("references BFF_SHARED_SECRET only inside composition/server/**", () => {
    const offenders = allSources
      .filter((file) => /BFF_SHARED_SECRET|bffSharedSecret/.test(file.text))
      .filter((file) => !file.rel.startsWith("composition/server/"))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });

  it("never gives BFF_SHARED_SECRET a NEXT_PUBLIC_ prefix (source, turbo.json, .env.example, next.config)", () => {
    const repoRoot = path.resolve(srcDir, "..", "..", "..");
    const webRoot = path.resolve(srcDir, "..");
    const configTexts = [
      path.join(repoRoot, "turbo.json"),
      path.join(webRoot, ".env.example"),
      ...["next.config.ts", "next.config.mjs", "next.config.js"].map((name) => path.join(webRoot, name)),
    ]
      .filter((file) => existsSync(file))
      .map((file) => ({ rel: path.relative(repoRoot, file), text: readFileSync(file, "utf8") }));
    const offenders = [...allSources, ...configTexts]
      .filter((file) => /NEXT_PUBLIC_\w*(BFF|SHARED_SECRET)/i.test(file.text))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
    // Cấu hình tồn tại để khẳng định ở trên có ý nghĩa.
    expect(configTexts.map((file) => file.rel)).toContain("turbo.json");
  });

  it("does not inline BFF_SHARED_SECRET through next.config env/publicRuntimeConfig", () => {
    const webRoot = path.resolve(srcDir, "..");
    const offenders = ["next.config.ts", "next.config.mjs", "next.config.js"]
      .map((name) => path.join(webRoot, name))
      .filter((file) => existsSync(file) && /BFF_SHARED_SECRET/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  // Xóa cookie bằng `maxAge: 0` để thuộc tính (path, secure, sameSite) luôn khớp lúc đặt.
  it("clears cookies via maxAge 0 instead of .delete() in composition/server", () => {
    const offenders = inDir("composition/server/")
      .filter((file) => /\.delete\(/.test(file.text))
      .map((file) => file.rel);
    expect(offenders).toEqual([]);
  });
});
