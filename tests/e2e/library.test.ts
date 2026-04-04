import { test, expect } from '@playwright/test';

/**
 * Visual regression test for the Asset Library scene.
 *
 * The Asset Library is a separate area accessed through the east door in the hub.
 * This test navigates the player there and captures a HUD screenshot, matching
 * the approach used for the hub in hub-navigation.test.ts.
 */

test.describe('Asset Library', () => {
  test(
    'visual regression: library HUD',
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

      // Walk east towards the library door at x=8, z=0.
      // The game applies a -45° isometric rotation to movement input, so:
      //   D alone (moveX=+1) moves northeast in world space (+X, -Z)
      //   D + S together (moveX=+1, moveZ=+1) moves pure east (+X)
      // Player spawns at (0,0), auto-enters library when within 2.5 units of door.
      await page.keyboard.down('KeyD');
      await page.keyboard.down('KeyS');
      await page.waitForTimeout(3000);
      await page.keyboard.up('KeyD');
      await page.keyboard.up('KeyS');

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
