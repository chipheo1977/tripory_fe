import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ['192.168.30.44'],
  // Bot xem trước link (PUB-05, D-18..D-20). Thiết lập này THAY danh sách mặc định của Next nên phải chép lại toàn bộ regex
  // mặc định (next 16.4.0, shared/lib/router/utils/html-bots.js) rồi nối thêm Zalo, Facebot, meta-externalagent.
  // Bot trong danh sách nhận metadata chặn (thẻ og:* nằm trong <head>) thay vì streaming (nối vào <body>).
  // next-config.test.ts so phần đầu regex này với bản của Next; nâng Next thì đối chiếu lại. UA thật của Zalo chưa kiểm (UAT).
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|Zalo|Facebot|meta-externalagent/i,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
