import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los tests e2e comparten la base de datos: se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
