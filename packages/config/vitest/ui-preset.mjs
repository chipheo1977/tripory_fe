import { defineConfig } from 'vitest/config';

/**
 * Preset cho package/app có DOM. Mỗi nơi dùng preset tự khai báo jsdom và
 * Testing Library để pnpm isolated luôn resolve dependency từ đúng package.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
