import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitDate = execSync('git log -1 --format=%cs').toString().trim();

export default defineConfig({
  base: '/rhayzdpteq/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    __BUILD_COMMIT__: JSON.stringify(commitHash),
    __BUILD_DATE__: JSON.stringify(commitDate),
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
