import { test, expect } from '@playwright/test';

test.describe('Game Load', () => {
  test('page loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Wait for the menu screen to appear, confirming JS executed successfully
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });

    expect(errors).toEqual([]);
  });

  test('canvas element is created by Three.js', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });

    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('UI overlay container exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });

    const overlay = page.locator('#ui-overlay');
    await expect(overlay).toBeAttached();
  });

  test('no uncaught console errors during initial load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore browser-level 404s (e.g. favicon)
        if (text.includes('404') || text.includes('favicon')) return;
        consoleErrors.push(text);
      }
    });

    await page.goto('/');
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });
    // Give the game loop a moment to settle
    await page.waitForTimeout(1000);

    expect(consoleErrors).toEqual([]);
  });

  test('game loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector('#menu-screen', { timeout: 5_000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5_000);
  });
});
