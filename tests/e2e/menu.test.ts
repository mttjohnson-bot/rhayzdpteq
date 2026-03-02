import { test, expect } from '@playwright/test';

test.describe('Menu Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing save data
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });
  });

  test('title screen renders with game title', async ({ page }) => {
    const title = page.locator('#menu-screen h1');
    await expect(title).toHaveText('Rhayzd Pteq');
    await expect(title).toBeVisible();
  });

  test('subtitle is displayed', async ({ page }) => {
    const subtitle = page.locator('#menu-screen p');
    await expect(subtitle).toHaveText('Climb the tower. Defeat the darkness.');
  });

  test('four save slot buttons are shown', async ({ page }) => {
    const slotButtons = page.locator('#menu-screen button:has-text("Slot")');
    await expect(slotButtons).toHaveCount(4);

    // All slots should show "Empty" for a fresh game
    for (let i = 0; i < 4; i++) {
      await expect(slotButtons.nth(i)).toContainText('Empty');
    }
  });

  test('New Game button is visible on empty save slot', async ({ page }) => {
    const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
    await expect(newGameBtn).toBeVisible();
  });

  test('save slot selection updates active slot highlight', async ({ page }) => {
    // Use keyboard number key to select slot 2 (clicking triggers uiConfirm
    // in ActionManager which would start the game)
    await page.keyboard.press('Digit2');
    await page.waitForTimeout(300);

    // Slot 2 should now have the active border
    const slot2 = page.locator('#menu-screen button:has-text("Slot 2")');
    const borderStyle = await slot2.evaluate(
      (el) => (el as HTMLElement).style.border,
    );
    // Browser returns computed rgb() values rather than hex
    expect(borderStyle).toContain('rgb(170, 68, 255)');
  });

  test('controls hint text is shown', async ({ page }) => {
    const hint = page.locator('#menu-screen').getByText('Keys 1-4');
    await expect(hint).toBeVisible();
  });

  test('build version info is displayed', async ({ page }) => {
    const version = page.locator('#menu-screen').getByText('last changed');
    await expect(version).toBeVisible();
  });

  test('visual regression: title screen', async ({ page }) => {
    // Mask the version info since it changes per build
    const versionInfo = page.locator('#menu-screen').getByText('last changed');
    await expect(page).toHaveScreenshot('title-screen.png', {
      mask: [versionInfo],
      maxDiffPixelRatio: 0.02,
    });
  });
});
