import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/rpg/**', 'src/dungeon/**', 'src/game/SaveManager.ts'],
      exclude: [
        'src/rpg/LootDrop.ts',
        'src/dungeon/FloorRenderer.ts',
        'src/ui/**',
        'src/rendering/**',
        'src/combat/**',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
});
