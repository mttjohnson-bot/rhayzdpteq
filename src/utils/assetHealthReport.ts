/**
 * Runtime asset health report — dev mode only.
 *
 * When running in Vite dev mode, probes all known asset URLs and logs a
 * table to the console showing which assets are available and which return
 * 404 or other errors. This makes asset pipeline issues immediately visible
 * during development.
 *
 * In production builds this module is a no-op (tree-shaken by Vite).
 */

/** Known asset paths relative to BASE_URL. */
const EXPECTED_ASSETS = [
  { path: 'assets/characters/owl.glb', type: 'model (optimized)' },
  { path: 'assets/characters/owlbear.glb', type: 'model (optimized)' },
  { path: 'favicon.svg', type: 'icon' },
  { path: 'favicon.ico', type: 'icon' },
];

interface AssetStatus {
  path: string;
  type: string;
  status: number | 'error';
  ok: boolean;
  sizeKB: string;
}

/**
 * Run the asset health report. Only executes in dev mode.
 * Call this once during app initialization.
 */
export async function runAssetHealthReport(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const base = import.meta.env.BASE_URL ?? '/';
  const results: AssetStatus[] = [];

  await Promise.all(
    EXPECTED_ASSETS.map(async (asset) => {
      const url = base + asset.path;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        const sizeKB = contentLength ? (parseInt(contentLength, 10) / 1024).toFixed(1) : '?';
        results.push({
          path: asset.path,
          type: asset.type,
          status: response.status,
          ok: response.ok,
          sizeKB: response.ok ? `${sizeKB} KB` : '-',
        });
      } catch {
        results.push({
          path: asset.path,
          type: asset.type,
          status: 'error',
          ok: false,
          sizeKB: '-',
        });
      }
    }),
  );

  // Sort: failures first, then by path
  results.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? 1 : -1;
    return a.path.localeCompare(b.path);
  });

  const missing = results.filter((r) => !r.ok);

  if (missing.length > 0) {
    console.warn(
      `%c[Asset Health] ${missing.length} asset(s) unavailable:`,
      'color: orange; font-weight: bold',
    );
  } else {
    console.log(
      `%c[Asset Health] All ${results.length} assets available`,
      'color: green; font-weight: bold',
    );
  }

  console.table(
    results.map((r) => ({
      Asset: r.path,
      Type: r.type,
      Status: r.ok ? `${r.status} OK` : `${r.status} MISSING`,
      Size: r.sizeKB,
    })),
  );

  if (missing.length > 0) {
    console.warn(
      `[Asset Health] Missing .glb files? Run: ./scripts/convert-models.mjs\n` +
        `Missing .vox files? They should be in assets/characters/ (source dir).`,
    );
  }
}
