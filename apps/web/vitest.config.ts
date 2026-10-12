import uiPreset from '@tripory/config/vitest/ui';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(uiPreset, {
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
});
