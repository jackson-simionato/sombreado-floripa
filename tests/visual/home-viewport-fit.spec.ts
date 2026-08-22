import { expect, test } from "@playwright/test";

const primaryActionLabel = "Usar minha localização";
const locationNoticePattern = /Sua localização é usada apenas/;

async function expectNoticeClearOfSticky(
  page: import("@playwright/test").Page
) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const notice = page.getByText(locationNoticePattern);
  const primaryAction = page.getByRole("button", { name: primaryActionLabel });

  await expect(notice).toBeVisible();
  await expect(primaryAction).toBeVisible();

  const noticeBox = await notice.boundingBox();
  const primaryActionBox = await primaryAction.boundingBox();
  const stickyTop = await primaryAction.evaluate((button) => {
    const sticky = button.closest("[class*='actions']");
    return sticky?.getBoundingClientRect().top ?? null;
  });

  expect(noticeBox).not.toBeNull();
  expect(primaryActionBox).not.toBeNull();
  expect(stickyTop).not.toBeNull();

  const noticeBottom = noticeBox!.y + noticeBox!.height;

  expect(noticeBottom).toBeLessThanOrEqual(stickyTop!);
  expect(noticeBottom).toBeLessThanOrEqual(primaryActionBox!.y);
}

test.describe("phone CSS viewport after browser chrome", () => {
  test.use({ viewport: { height: 600, width: 360 } });

  test("location request screen fits without scroll", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const primaryAction = page.getByRole("button", {
      name: primaryActionLabel,
    });
    await expect(primaryAction).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("location notice stays clear of the sticky primary action", async ({
    page,
  }) => {
    await expectNoticeClearOfSticky(page);
  });
});

test.describe("laptop window short height", () => {
  test.use({ viewport: { height: 700, width: 1280 } });

  test("location notice stays clear of the sticky primary action", async ({
    page,
  }) => {
    await expectNoticeClearOfSticky(page);
  });
});
