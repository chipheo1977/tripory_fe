import { mergeConfig } from 'vitest/config';
import preset from './vitest/preset.mjs';

export default mergeConfig(preset, {
  test: {
    include: ['test/**/*.test.ts'],
    // Mỗi ESLint instance nạp typescript-eslint (+ eslint-config-next cho apps/web), chậm hơn test thường.
    testTimeout: 60_000,
  },
});
