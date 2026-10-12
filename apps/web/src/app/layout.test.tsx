import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(appDir, "layout.tsx"), "utf8");

it("declares Vietnamese metadata and the Inter font contract", () => {
  expect(source).toContain('lang="vi"');
  expect(source).toContain('title: "Tripory"');
  expect(source).toContain('description: "Lập và chia sẻ lịch trình du lịch"');
  expect(source).toContain("Inter({");
  expect(source).toContain('subsets: ["latin", "vietnamese"]');
  expect(source).not.toContain("Geist");
});
