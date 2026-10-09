import { defineConfig } from 'vitest/config';

/**
 * Preset test cho package TypeScript thuần: môi trường node.
 * File test của domain/application/kernel không có DOM, nên file nào lén dùng
 * window/document/React sẽ vỡ ngay khi chạy. Test hook cần DOM thì đặt
 * `// @vitest-environment jsdom` ở đầu file (cần cài jsdom khi đó).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
