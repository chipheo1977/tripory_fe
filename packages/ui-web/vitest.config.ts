import uiPreset from '@tripory/config/vitest/ui';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(uiPreset, {
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
});
