import { test, expect } from '@playwright/test';

test.describe('New Game', () => {
  test.beforeEach(async ({ page }) => {
    // Clear saves so we start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });
  });

  test('clicking New Game transitions to hub scene', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Click the New Game button
    const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
    await newGameBtn.click();

    // Menu screen should disappear
    await expect(page.locator('#menu-screen')).not.toBeAttached({
      timeout: 5_000,
    });

    // HUD should appear (hub state)
    await page.waitForSelector('#hud', { timeout: 5_000 });
    const hud = page.locator('#hud');
    await expect(hud).toBeAttached();

    // No errors during transition
    expect(errors).toEqual([]);
  });

  test('hub HUD displays level info', async ({ page }) => {
    const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
    await newGameBtn.click();

    await page.waitForSelector('#hud', { timeout: 5_000 });
    // A new game should show Lv.1
    const hudText = await page.locator('#hud').textContent();
    expect(hudText).toContain('Lv.1');
  });

  test('canvas remains visible after entering hub', async ({ page }) => {
    const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
    await newGameBtn.click();

    await page.waitForSelector('#hud', { timeout: 5_000 });
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('pressing Enter on slot 1 starts new game', async ({ page }) => {
    // Press Enter to start game (slot 1 is selected by default)
    await page.keyboard.press('Enter');

    // Should transition to hub
    await expect(page.locator('#menu-screen')).not.toBeAttached({
      timeout: 5_000,
    });
    await page.waitForSelector('#hud', { timeout: 5_000 });
  });
});
