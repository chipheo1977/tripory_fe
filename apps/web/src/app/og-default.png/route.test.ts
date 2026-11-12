// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "./route";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("GET /og-default.png", () => {
  it("returns a 1200x630 PNG under 500 KB", async () => {
    const response = GET();
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^image\/png/);
    expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
    expect(bytes.byteLength).toBeLessThan(500 * 1024);
  }, 30_000);
});
