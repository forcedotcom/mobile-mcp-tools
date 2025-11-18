import { mergeConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import baseConfig from '../../vitest.config.base.mts';

export default mergeConfig(baseConfig, {
  plugins: [tsconfigPaths()],
});

