import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for in-game menu tabs and the Asset Library scene.
 *
 * These tests capture screenshots of each menu tab (Inventory, Skills, Controls,
 * Settings) and the Asset Library area. All are tagged @visual so they run in
 * the non-blocking visual regression CI job.
 *
 * Note: The Map tab is only available inside a dungeon, so it is not tested here.
 * The Diagnostics tab may be disabled by default — it is skipped for now.
 */

test.describe('Menu Tab Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear saves and start a fresh game to reach the hub
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });

    // Start new game
    const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
    await newGameBtn.click();
    await page.waitForSelector('#hud', { timeout: 5_000 });

    // Let the scene settle
    await page.waitForTimeout(500);
  });

  test(
    'visual regression: inventory tab',
    { tag: '@visual' },
    async ({ page }) => {
      // Open inventory with I key
      await page.keyboard.press('KeyI');
      await page.waitForTimeout(500);
      await expect(page.getByText('Inventory').first()).toBeVisible({
        timeout: 2_000,
      });

      // Screenshot the full page to capture the tab bar + inventory panel
      await expect(page).toHaveScreenshot('menu-tab-inventory.png', {
        maxDiffPixelRatio: 0.02,
      });
    },
  );

  test(
    'visual regression: skills tab',
    { tag: '@visual' },
    async ({ page }) => {
      // Open skill tree with K key
      await page.keyboard.press('KeyK');
      await page.waitForTimeout(500);
      await expect(page.getByText('Skill Tree').first()).toBeVisible({
        timeout: 2_000,
      });

      // Screenshot the full page to capture the tab bar + skill tree panel
      await expect(page).toHaveScreenshot('menu-tab-skills.png', {
        maxDiffPixelRatio: 0.02,
      });
    },
  );

  test(
    'visual regression: controls tab',
    { tag: '@visual' },
    async ({ page }) => {
      // Open inventory first (I key), then switch to controls tab with ] key
      await page.keyboard.press('KeyI');
      await page.waitForTimeout(500);
      await expect(page.getByText('Inventory').first()).toBeVisible({
        timeout: 2_000,
      });

      // Tab right: Inventory -> Skills -> Controls (Map is skipped in hub)
      await page.keyboard.press('BracketRight');
      await page.waitForTimeout(200);
      await page.keyboard.press('BracketRight');
      await page.waitForTimeout(200);

      // Verify Controls tab content is visible
      await expect(page.getByText('Controls').first()).toBeVisible({
        timeout: 2_000,
      });

      await expect(page).toHaveScreenshot('menu-tab-controls.png', {
        maxDiffPixelRatio: 0.02,
      });
    },
  );

  test(
    'visual regression: settings tab',
    { tag: '@visual' },
    async ({ page }) => {
      // Open inventory first, then tab to Settings
      await page.keyboard.press('KeyI');
      await page.waitForTimeout(500);
      await expect(page.getByText('Inventory').first()).toBeVisible({
        timeout: 2_000,
      });

      // Tab right to reach Settings: Inventory -> Skills -> Controls -> Settings
      // (Map is skipped in hub)
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('BracketRight');
        await page.waitForTimeout(200);
      }

      // Verify Settings tab content is visible
      await expect(page.getByText('Settings').first()).toBeVisible({
        timeout: 2_000,
      });

      await expect(page).toHaveScreenshot('menu-tab-settings.png', {
        maxDiffPixelRatio: 0.02,
      });
    },
  );
});

test.describe('Asset Library Visual Tests', () => {
  test(
    'visual regression: asset library',
    { tag: '@visual' },
    async ({ page }) => {
      // Clear saves and start a fresh game
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector('#menu-screen', { timeout: 10_000 });

      // Start new game
      const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
      await newGameBtn.click();
      await page.waitForSelector('#hud', { timeout: 5_000 });

      // Wait for hub to settle
      await page.waitForTimeout(500);

      // Walk east (D key) towards the library door at x=8, z=0
      // Player spawns at (0,0), needs to travel ~8 units east
      // Auto-enters library when within 2.5 units of door
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(3000);
      await page.keyboard.up('KeyD');

      // Wait for library scene to load and render
      await page.waitForTimeout(1500);

      // Take a screenshot of the HUD overlay in the library (same approach as hub-hud)
      const hud = page.locator('#hud');
      await expect(hud).toHaveScreenshot('library-hud.png', {
        maxDiffPixelRatio: 0.02,
      });
    },
  );
});
