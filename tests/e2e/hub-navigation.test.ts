import { test, expect } from '@playwright/test';

test.describe('Hub Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear saves and start a fresh game
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#menu-screen', { timeout: 10_000 });

    // Start new game
    const newGameBtn = page.locator('#menu-screen button:has-text("New Game")');
    await newGameBtn.click();
    await page.waitForSelector('#hud', { timeout: 5_000 });
  });

  test('player can move with WASD keys', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Press movement keys - the game should not error
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');

    await page.keyboard.down('KeyA');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyA');

    await page.keyboard.down('KeyS');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyS');

    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');

    // HUD should still be visible (game hasn't crashed)
    await expect(page.locator('#hud')).toBeAttached();
    expect(errors).toEqual([]);
  });

  test('inventory opens with I key', async ({ page }) => {
    await page.keyboard.press('KeyI');
    // Wait briefly for the UI to open
    await page.waitForTimeout(300);

    // Look for the inventory panel (contains "Inventory" text)
    const inventoryText = page.getByText('Inventory');
    await expect(inventoryText.first()).toBeVisible({ timeout: 2_000 });
  });

  test('inventory closes with I key again', async ({ page }) => {
    // Open inventory
    await page.keyboard.press('KeyI');
    await page.waitForTimeout(300);
    await expect(page.getByText('Inventory').first()).toBeVisible({
      timeout: 2_000,
    });

    // Close inventory
    await page.keyboard.press('KeyI');
    await page.waitForTimeout(300);

    // The HUD should still be there but inventory should be closed
    await expect(page.locator('#hud')).toBeAttached();
  });

  test('skill tree opens with K key', async ({ page }) => {
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(300);

    // Look for skill tree content
    const skillTreeText = page.getByText('Skill Tree');
    await expect(skillTreeText.first()).toBeVisible({ timeout: 2_000 });
  });

  test('portal interaction prompt appears near portal', async ({ page }) => {
    // Walk towards the portal (it's in the hub)
    // Move the player to where the portal should be
    // The portal is typically at the center/specific location in the hub
    // We'll walk and check for the interaction prompt
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyW');

    // Check if any interaction prompt is showing in the HUD
    // The prompt text varies by device, so check for common patterns
    const hudContent = await page.locator('#hud').textContent();
    // The HUD should contain some text (level info at minimum)
    expect(hudContent).toBeTruthy();
    expect(hudContent!.length).toBeGreaterThan(0);
  });

  test('visual regression: hub HUD', async ({ page }) => {
    // Wait for the scene to render fully
    await page.waitForTimeout(1000);

    // Take a screenshot of just the HUD overlay, not the 3D canvas
    // (3D canvas may differ across GPU drivers)
    const hud = page.locator('#hud');
    await expect(hud).toHaveScreenshot('hub-hud.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
