// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

const require = createRequire(import.meta.url);
const { HTML_LIMITED_BOT_UA_RE } = require("next/dist/shared/lib/router/utils/html-bots") as {
  HTML_LIMITED_BOT_UA_RE: RegExp;
};

const EXTRA_BOT_SUFFIX = "|Zalo|Facebot|meta-externalagent";

function getRegex(): RegExp {
  const value = nextConfig.htmlLimitedBots;
  expect(value instanceof RegExp).toBe(true);
  return value as RegExp;
}

describe("next.config htmlLimitedBots", () => {
  it.each([
    "Mozilla/5.0 (compatible; ZaloBot/1.0)",
    "Zalo",
    "Facebot",
    "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  ])("matches the added link-preview bot %s", (ua) => {
    expect(getRegex().test(ua)).toBe(true);
  });

  it.each([
    "facebookexternalhit/1.1",
    "Twitterbot/1.0",
    "Slackbot-LinkExpanding 1.0",
    "WhatsApp/2.23",
    "Discordbot/2.0",
    "Mozilla/5.0 (compatible; Bingbot/2.0)",
  ])("still matches the Next default bot %s", (ua) => {
    expect(HTML_LIMITED_BOT_UA_RE.test(ua)).toBe(true);
    expect(getRegex().test(ua)).toBe(true);
  });

  it("does not match a regular desktop browser", () => {
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    expect(getRegex().test(chrome)).toBe(false);
  });

  it("keeps the default regex as its prefix and flags (re-check when Next is upgraded)", () => {
    const regex = getRegex();
    expect(regex.source).toBe(`${HTML_LIMITED_BOT_UA_RE.source}${EXTRA_BOT_SUFFIX}`);
    expect(regex.flags).toBe(HTML_LIMITED_BOT_UA_RE.flags);
  });
});
