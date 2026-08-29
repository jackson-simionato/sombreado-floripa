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

const adviceRecentsStorageKey = "sombreado.adviceRecents";

function fiveAdviceRecents() {
  return Array.from({ length: 5 }, (_, index) => {
    const n = index + 1;
    return {
      routeId: `route-${n}`,
      routeVersionId: `version-${n}`,
      routeCode: String(120 + n),
      routeName: `TICEN - Destino ${n}`,
      routeDirectionId: `direction-${n}`,
      directionLabel: `TICEN para Destino ${n}`,
    };
  });
}

async function seedAdviceRecents(
  page: import("@playwright/test").Page,
  recents: ReturnType<typeof fiveAdviceRecents>
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: adviceRecentsStorageKey, value: JSON.stringify(recents) }
  );
}

async function expectEntryBusLooksLikeABus(
  page: import("@playwright/test").Page
) {
  const recents = page.getByTestId("advice-recents");
  const bus = page.getByTestId("entry-bus-motif");
  const brandHeader = page.locator('header[aria-label="Sombreado"]');
  const primaryAction = page.getByRole("button", {
    name: primaryActionLabel,
  });

  await expect(recents).toBeVisible();
  await expect(bus).toBeVisible();
  await expect(brandHeader).toBeVisible();
  await expect(primaryAction).toBeVisible();

  const busBox = await bus.boundingBox();
  const recentsBox = await recents.boundingBox();
  const stickyTop = await primaryAction.evaluate((button) => {
    const sticky = button.closest("[class*='actions']");
    return sticky?.getBoundingClientRect().top ?? null;
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );

  expect(busBox).not.toBeNull();
  expect(recentsBox).not.toBeNull();
  expect(stickyTop).not.toBeNull();
  expect(busBox!.height).toBeGreaterThanOrEqual(200);
  expect(busBox!.height / busBox!.width).toBeGreaterThanOrEqual(1.15);
  expect(recentsBox!.height).toBeLessThanOrEqual(120);
  expect(recentsBox!.y + recentsBox!.height).toBeLessThanOrEqual(stickyTop!);
  expect(overflow).toBeLessThanOrEqual(0);
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

  test("entry bus stays tall with one recent on the location screen", async ({
    page,
  }) => {
    await seedAdviceRecents(page, fiveAdviceRecents().slice(0, 1));
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    await expectEntryBusLooksLikeABus(page);
  });

  test("entry bus stays tall when recents use a horizontal carousel", async ({
    page,
  }) => {
    await seedAdviceRecents(page, fiveAdviceRecents());
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const carousel = page.getByTestId("advice-recents-carousel");
    await expect(carousel).toHaveAttribute("data-recents-count", "5");
    await expectEntryBusLooksLikeABus(page);

    const secondRecent = page.getByRole("button", {
      name: "Selecionar linha 122 TICEN - Destino 2, TICEN para Destino 2",
    });
    await secondRecent.scrollIntoViewIfNeeded();
    await expect(secondRecent).toBeVisible();
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
