import { expect, test } from "@playwright/test";

test("canonical brand lockup matches its visual baseline", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const brandHeader = page.locator('header[aria-label="Sombreado"]');

  await expect(brandHeader).toBeVisible();
  await expect(brandHeader).toHaveScreenshot("brand-header.png");
});
