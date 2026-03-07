import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitDate = execSync('git log -1 --format=%cs').toString().trim();

const analyze = process.env.ANALYZE === 'true';

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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'model-gallery': resolve(__dirname, 'model-gallery.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
      plugins: analyze
        ? [
            visualizer({
              filename: 'dist/stats.html',
              open: true,
              gzipSize: true,
              template: 'treemap',
            }),
          ]
        : [],
    },
  },
});
