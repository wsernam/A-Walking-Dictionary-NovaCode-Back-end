import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests-integracion/hu023-salvaguardas.test.js'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    restoreMocks: true,
  },
});