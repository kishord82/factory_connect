import baseConfig from '../config/vitest.base.js';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(baseConfig, defineConfig({}));
