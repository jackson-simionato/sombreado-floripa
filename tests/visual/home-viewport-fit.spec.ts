import { expect, test } from "@playwright/test";

const flooredViewport = { height: 640, width: 360 };
const primaryActionLabel = "Usar minha localização";
const locationNoticePattern = /Sua localização é usada apenas/;

test.use({ viewport: flooredViewport });

test("location request screen fits the floored viewport without scroll", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const primaryAction = page.getByRole("button", { name: primaryActionLabel });
  await expect(primaryAction).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test("location notice stays clear of the primary action", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const notice = page.getByText(locationNoticePattern);
  const primaryAction = page.getByRole("button", { name: primaryActionLabel });

  await expect(notice).toBeVisible();
  await expect(primaryAction).toBeVisible();

  const noticeBox = await notice.boundingBox();
  const primaryActionBox = await primaryAction.boundingBox();

  expect(noticeBox).not.toBeNull();
  expect(primaryActionBox).not.toBeNull();

  expect(noticeBox!.y + noticeBox!.height).toBeLessThanOrEqual(
    primaryActionBox!.y
  );
});
