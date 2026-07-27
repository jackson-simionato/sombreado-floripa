/* global HTMLImageElement, HTMLElement, Image, URL, console, document, getComputedStyle, process, window */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import { format } from "prettier";

const baseUrl =
  process.env.PRODUCTION_ADVICE_URL ?? "http://127.0.0.1:4173/prototype";
const outputUrl = new URL(
  "../docs/design/wayfinder/production-advice-matrix/",
  import.meta.url
);
const outputPath = fileURLToPath(outputUrl);

const areas = ["left", "right", "front", "back", "neutral"];
const contexts = ["onboard", "preview", "recent"];
const viewports = [
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
];
const screenshotStates = new Set([
  "360x640-left-onboard",
  "360x640-right-onboard",
  "360x640-front-onboard",
  "360x640-back-onboard",
  "360x640-neutral-onboard",
  "360x640-left-preview",
  "360x640-neutral-preview",
  "360x640-left-recent",
  "390x844-front-preview",
  "390x844-back-recent",
  "390x844-neutral-preview",
]);
const longRouteName =
  "TICEN - UFSC via Pantanal e Córrego Grande até Lagoa da Conceição";
const expectedAssetHashes = {
  back: "ceea0578ad539ebb9faab812f3e06d6c01751c76842c011b4fecc0358cb62c80",
  front: "409797020518f2baa7f56b38dc6f544d89cb0ffa7aad350873521fe1cccc5a19",
  neutral: "16dccdf23212f7b77dc2f84ba715891b694fdf12733a25166c3495bd5f28dd8e",
  side: "949ae66ca5e1f0b4c1d977fe04aec49230e557b1eaefb31e1c301542e757b93f",
};
const expectedArtworkLandmarks = {
  back: {
    rearLamp: [226, 64, 42, 255],
    rows: [
      [254, 235, 199, 255],
      [254, 235, 200, 255],
      [242, 242, 242, 255],
      [218, 232, 248, 255],
      [218, 233, 248, 255],
    ],
  },
  front: {
    rearLamp: [226, 64, 42, 255],
    rows: [
      [220, 235, 249, 255],
      [219, 235, 249, 255],
      [242, 242, 242, 255],
      [254, 240, 215, 255],
      [254, 240, 215, 255],
    ],
  },
  neutral: {
    rearLamp: [234, 67, 41, 255],
    rows: [
      [251, 249, 247, 255],
      [250, 249, 246, 255],
      [250, 249, 246, 255],
      [250, 249, 246, 255],
      [251, 249, 246, 255],
    ],
  },
};

await mkdir(outputPath, { recursive: true });
const assetIntegrity = await verifyApprovedAssets();

const browser = await chromium.launch({
  chromiumSandbox: false,
  headless: true,
});
const browserErrors = [];
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport,
    });

    collectBrowserErrors(page, browserErrors, viewport.name);

    for (const area of areas) {
      for (const context of contexts) {
        const stateName = `${viewport.name}-${area}-${context}`;
        const scenarioId = `advice-matrix-${context}-${area}`;

        await openScenario(page, scenarioId);
        const metrics = await collectResultMetrics(page);
        validateResultMetrics(metrics, { area, context, stateName });

        const renderedProofLandmarks =
          area === "front" || area === "back"
            ? await sampleRenderedDeckProof(page)
            : undefined;

        if (renderedProofLandmarks !== undefined) {
          validateRenderedDeckProof(renderedProofLandmarks, area, stateName);
        }

        results.push({
          area,
          context,
          metrics,
          renderedProofLandmarks,
          scenarioId,
          state: stateName,
          viewport,
        });

        if (screenshotStates.has(stateName)) {
          await hideDevelopmentPortal(page);
          await page.screenshot({
            animations: "disabled",
            path: `${outputPath}${stateName}.png`,
          });
        }
      }
    }

    await verifyBoundary(page, viewport, "advice-withheld", {
      absentText: "Algo deu errado",
      heading: "Não é possível recomendar agora",
    });
    await verifyBoundary(page, viewport, "error-advice", {
      absentText: "Não é possível recomendar agora",
      heading: "Algo deu errado",
    });
    await page.close();
  }

  await verifyInteractions(browser, browserErrors);
  await verifyReducedMotion(browser, browserErrors);
} finally {
  await browser.close();
}

assert.deepEqual(
  browserErrors,
  [],
  "Browser console or page errors were recorded"
);

const matrixResultsPath = `${outputPath}matrix-results.json`;
const matrixResults = await format(
  JSON.stringify({
    assetIntegrity,
    browserErrors,
    generatedAt: new Date().toISOString(),
    results,
    summary: {
      adviceCombinations: results.length,
      areas,
      boundaryChecks: viewports.length * 2,
      contexts,
      interactionChecks: 2,
      viewports,
    },
  }),
  { filepath: matrixResultsPath }
);

await writeFile(matrixResultsPath, matrixResults);

console.log(
  `Validated ${results.length} production advice states, 4 boundaries, disclosures, reduced motion, and approved artwork integrity.`
);

function collectBrowserErrors(page, errors, scope) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push({ scope, text: message.text(), type: "console" });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ scope, text: error.message, type: "page" });
  });
}

async function openScenario(page, scenarioId) {
  await page.goto(`${baseUrl}?scenario=${scenarioId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[data-testid="advice-result-screen"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const artwork = document.querySelector(
      '[data-testid="advice-bus-artwork"]'
    );

    return (
      artwork instanceof HTMLImageElement &&
      artwork.complete &&
      artwork.naturalWidth > 0
    );
  });
}

async function collectResultMetrics(page) {
  return page.evaluate(() => {
    const screen = requiredElement(
      '[data-testid="advice-result-screen"]',
      "advice result screen"
    );
    const route = requiredElement(
      '[data-testid="advice-route-receipt"]',
      "route receipt"
    );
    const header = requiredElement(
      '[data-testid="advice-result-header"]',
      "result header"
    );
    const proof = requiredElement(
      '[data-testid="advice-diagram-proof"]',
      "diagram proof"
    );
    const trust = requiredElement(
      '[data-testid="advice-trust-row"]',
      "trust row"
    );
    const actions = requiredElement(
      '[data-testid="advice-result-actions"]',
      "result actions"
    );
    const busShell = requiredElement('[data-testid="bus-shell"]', "bus shell");
    const artwork = requiredImage(
      '[data-testid="advice-bus-artwork"]',
      "bus artwork"
    );
    const primary = requiredElement(
      '[data-testid="advice-result-actions"] button:first-child',
      "primary action"
    );
    const options = requiredElement(
      '[data-testid="advice-result-actions"] button:last-child',
      "options action"
    );
    const ledgers = Array.from(document.querySelectorAll("[data-ledger-tone]"));
    const proofGrid = requiredElement(
      '[data-testid="bus-shell"] > div',
      "proof grid"
    );
    const artworkCanvas = document.createElement("canvas");
    artworkCanvas.width = artwork.naturalWidth;
    artworkCanvas.height = artwork.naturalHeight;
    const artworkContext = artworkCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (artworkContext === null) {
      throw new Error("Could not sample loaded bus artwork");
    }

    artworkContext.drawImage(artwork, 0, 0);

    const rowPoints = [337, 475, 612, 750, 887];
    const artworkPixelLandmarks = {
      rearLamp: pixelAt(480, 1021),
      rows: rowPoints.map((y) => pixelAt(480, y)),
    };
    const boxes = [route, header, proof, trust, actions].map((element) =>
      roundRect(element.getBoundingClientRect())
    );
    const artworkRect = roundRect(artwork.getBoundingClientRect());
    const artworkFrame = artwork.parentElement;

    if (!(artworkFrame instanceof HTMLElement)) {
      throw new Error("Missing artwork frame");
    }

    const visibleTextSelector = [
      '[data-testid="advice-route-receipt"] strong',
      '[data-testid="advice-route-receipt"] span',
      '[data-testid="advice-result-header"] h1',
      '[data-testid="advice-result-header"] p',
      "[data-ledger-tone] span",
      "[data-ledger-tone] strong",
      "[data-ledger-tone] small",
      '[data-testid="advice-trust-row"] p',
      '[data-testid="advice-trust-row"] button',
      '[data-testid="advice-result-actions"] button',
    ].join(",");
    const clippedVisibleText = Array.from(
      document.querySelectorAll(visibleTextSelector)
    )
      .filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visiblySized = rect.width > 2 && rect.height > 2;

        return (
          visiblySized &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.clip === "auto" &&
          (element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1)
        );
      })
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim());

    return {
      actionRect: roundRect(actions.getBoundingClientRect()),
      artworkComplete: artwork.complete,
      artworkComputedTransform: getComputedStyle(artwork).transform,
      artworkMirrored: artwork.getAttribute("data-artwork-mirrored"),
      artworkNaturalHeight: artwork.naturalHeight,
      artworkNaturalWidth: artwork.naturalWidth,
      artworkPixelLandmarks,
      artworkRect,
      artworkFrameRect: roundRect(artworkFrame.getBoundingClientRect()),
      artworkSource: artwork.getAttribute("src"),
      artworkVariant: artwork.getAttribute("data-artwork-variant"),
      boxes,
      busAxis: busShell.getAttribute("data-proof-axis"),
      clippedVisibleText,
      contextText: header.querySelector("p")?.textContent?.trim(),
      diagramSummary: busShell.getAttribute("aria-label"),
      documentClientHeight: document.documentElement.clientHeight,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      ledgerBackgrounds: ledgers.map(
        (ledger) => getComputedStyle(ledger).backgroundColor
      ),
      ledgerPositions: ledgers.map((ledger) =>
        ledger.getAttribute("data-ledger-position")
      ),
      ledgerText: ledgers.map((ledger) =>
        ledger.textContent?.replace(/\s+/g, " ").trim()
      ),
      ledgerTones: ledgers.map((ledger) =>
        ledger.getAttribute("data-ledger-tone")
      ),
      neutralMiddleRow: busShell.getAttribute("data-neutral-middle-row"),
      optionsRect: roundRect(options.getBoundingClientRect()),
      primaryRect: roundRect(primary.getBoundingClientRect()),
      proofGridColumns: getComputedStyle(proofGrid).gridTemplateColumns,
      proofGridRows: getComputedStyle(proofGrid).gridTemplateRows,
      resultRect: roundRect(screen.getBoundingClientRect()),
      resultScrollHeight: screen.scrollHeight,
      resultClientHeight: screen.clientHeight,
      routeText: route.textContent?.replace(/\s+/g, " ").trim(),
      screenText: screen.textContent?.replace(/\s+/g, " ").trim(),
      seatRowCount: busShell.getAttribute("data-seat-row-count"),
      trustText: trust.textContent?.replace(/\s+/g, " ").trim(),
      visibleRouteName: route.querySelector("strong")?.textContent?.trim(),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };

    function pixelAt(x, y) {
      return Array.from(artworkContext.getImageData(x, y, 1, 1).data);
    }

    function requiredElement(selector, label) {
      const element = document.querySelector(selector);

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing ${label}`);
      }

      return element;
    }

    function requiredImage(selector, label) {
      const element = document.querySelector(selector);

      if (!(element instanceof HTMLImageElement)) {
        throw new Error(`Missing ${label}`);
      }

      return element;
    }

    function roundRect(rect) {
      return {
        bottom: Number(rect.bottom.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        left: Number(rect.left.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        top: Number(rect.top.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
      };
    }
  });
}

function validateResultMetrics(metrics, { area, context, stateName }) {
  assert.ok(
    metrics.documentScrollHeight <= metrics.viewportHeight + 1,
    `${stateName}: document scrolls (${metrics.documentScrollHeight}px > ${metrics.viewportHeight}px)`
  );
  assert.ok(
    metrics.documentScrollWidth <= metrics.viewportWidth + 1,
    `${stateName}: horizontal document overflow`
  );
  assert.ok(
    metrics.resultScrollHeight <= metrics.resultClientHeight + 1,
    `${stateName}: result surface overflows`
  );
  assert.ok(
    metrics.boxes[3].bottom <= metrics.actionRect.top + 1,
    `${stateName}: persistent actions cover visible result content`
  );
  assert.ok(
    metrics.primaryRect.top >= 0 &&
      metrics.optionsRect.bottom <= metrics.viewportHeight + 0.5,
    `${stateName}: a persistent action is clipped`
  );
  assert.deepEqual(
    metrics.clippedVisibleText,
    [],
    `${stateName}: visible result text is clipped`
  );
  assert.match(
    metrics.routeText ?? "",
    new RegExp(longRouteName),
    `${stateName}: long Portuguese route copy is missing`
  );
  assert.equal(
    metrics.visibleRouteName,
    longRouteName,
    `${stateName}: long Portuguese route name is not visibly rendered`
  );
  assert.match(
    metrics.trustText ?? "",
    /Estimativa pela incidência de sol\. Pode variar no caminho\./,
    `${stateName}: concise estimate copy is missing`
  );
  assert.ok(
    (metrics.diagramSummary?.length ?? 0) > 24,
    `${stateName}: accessible diagram summary is missing`
  );
  assertReadingOrder(metrics.boxes, stateName);
  assert.equal(
    metrics.artworkComplete,
    true,
    `${stateName}: bus artwork did not load`
  );
  assert.equal(
    metrics.artworkNaturalWidth,
    1254,
    `${stateName}: artwork width is not the approved asset`
  );
  assert.equal(
    metrics.artworkNaturalHeight,
    1254,
    `${stateName}: artwork height is not the approved asset`
  );
  assert.ok(
    Math.abs(metrics.artworkRect.width - 250) <= 0.5,
    `${stateName}: rendered artwork is not 250px wide`
  );
  assert.ok(
    Math.abs(
      metrics.artworkRect.left +
        metrics.artworkRect.width / 2 -
        (metrics.artworkFrameRect.left + metrics.artworkFrameRect.width / 2)
    ) <= 0.5,
    `${stateName}: artwork is not centered in its frame`
  );
  assert.equal(
    metrics.artworkSource,
    `/images/advice-bus-${
      area === "left" || area === "right" ? "side" : area
    }.png`,
    `${stateName}: wrong artwork source`
  );
  assert.equal(
    metrics.artworkVariant,
    area,
    `${stateName}: wrong artwork variant`
  );
  assert.equal(
    metrics.artworkMirrored,
    area === "right" ? "true" : "false",
    `${stateName}: wrong mirror marker`
  );

  if (area === "right") {
    assert.match(
      metrics.artworkComputedTransform,
      /^matrix\(-1,/,
      `${stateName}: right artwork is not visually mirrored`
    );
  } else {
    assert.doesNotMatch(
      metrics.artworkComputedTransform,
      /^matrix\(-1,/,
      `${stateName}: non-right artwork was visually mirrored`
    );
  }

  const expectedContextText = {
    onboard: "Agora no ônibus",
    preview: "Prévia da linha · ponto estimado",
    recent: "Última localização conhecida",
  }[context];
  assert.equal(
    metrics.contextText,
    expectedContextText,
    `${stateName}: result context is not explicit`
  );

  if (area === "neutral") {
    assert.deepEqual(
      metrics.ledgerTones,
      ["neutral", "neutral"],
      `${stateName}: neutral state leaks recommendation dominance`
    );
  } else {
    const expectedTones = {
      back: ["sunny", "recommended"],
      front: ["recommended", "sunny"],
      left: ["recommended", "sunny"],
      right: ["sunny", "recommended"],
    }[area];
    assert.deepEqual(
      metrics.ledgerTones,
      expectedTones,
      `${stateName}: recommendation/incidence tones are reversed`
    );
    assert.ok(
      metrics.ledgerText.some((text) => text?.includes("Recomendado")) &&
        metrics.ledgerText.some((text) => text?.includes("Maior incidência")),
      `${stateName}: semantic tones rely on color alone`
    );
  }

  if (area === "front" || area === "back") {
    assert.equal(
      metrics.busAxis,
      "horizontal",
      `${stateName}: wrong deck axis`
    );
    assert.equal(
      metrics.seatRowCount,
      "5",
      `${stateName}: five-row contract is missing`
    );
    assert.equal(
      metrics.neutralMiddleRow,
      "true",
      `${stateName}: neutral middle-row contract is missing`
    );
    assert.deepEqual(
      metrics.ledgerPositions,
      ["top", "bottom"],
      `${stateName}: deck ledgers are not front/back aligned`
    );
    validateArtworkLandmarks(
      metrics.artworkPixelLandmarks,
      expectedArtworkLandmarks[area],
      stateName
    );
  } else if (area === "neutral") {
    validateArtworkLandmarks(
      metrics.artworkPixelLandmarks,
      expectedArtworkLandmarks.neutral,
      stateName
    );
  } else {
    assert.equal(metrics.busAxis, "vertical", `${stateName}: wrong side axis`);
    assert.deepEqual(
      metrics.ledgerPositions,
      ["left", "right"],
      `${stateName}: side ledgers are not left/right aligned`
    );
  }
}

function validateArtworkLandmarks(actual, expected, stateName) {
  assert.equal(
    actual.rows.length,
    5,
    `${stateName}: rendered artwork does not expose five sampled seat rows`
  );
  actual.rows.forEach((pixel, index) => {
    assertPixel(
      pixel,
      expected.rows[index],
      `${stateName}: seat-row ${index + 1} landmark`
    );
  });
  assertPixel(
    actual.rearLamp,
    expected.rearLamp,
    `${stateName}: red rear-lantern landmark`
  );
}

async function sampleRenderedDeckProof(page) {
  const proof = page.locator('[data-testid="bus-shell"] > div');
  const screenshot = await proof.screenshot({ animations: "disabled" });

  return page.evaluate(async (pngBase64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${pngBase64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (context === null) {
      throw new Error("Could not sample rendered deck proof");
    }

    context.drawImage(image, 0, 0);
    const x = 10;
    const points = {
      bottom: [x, Math.floor(image.naturalHeight * 0.78)],
      middle: [x, Math.floor(image.naturalHeight * 0.5)],
      top: [x, Math.floor(image.naturalHeight * 0.22)],
    };

    return Object.fromEntries(
      Object.entries(points).map(([name, [sampleX, sampleY]]) => [
        name,
        Array.from(context.getImageData(sampleX, sampleY, 1, 1).data),
      ])
    );
  }, screenshot.toString("base64"));
}

function validateRenderedDeckProof(samples, area, stateName) {
  const recommended =
    area === "front" ? [206, 229, 250, 255] : [217, 232, 247, 255];
  const sunny = area === "front" ? [241, 225, 192, 255] : [255, 235, 200, 255];
  const neutral = [242, 242, 242, 255];

  assertPixel(
    samples.top,
    area === "front" ? recommended : sunny,
    `${stateName}: rendered front field`
  );
  assertPixel(
    samples.middle,
    neutral,
    `${stateName}: rendered neutral middle field`
  );
  assertPixel(
    samples.bottom,
    area === "front" ? sunny : recommended,
    `${stateName}: rendered back field`
  );
}

function assertPixel(actual, expected, label) {
  const withinTolerance = actual.every(
    (channel, index) => Math.abs(channel - expected[index]) <= 4
  );

  assert.ok(
    withinTolerance,
    `${label} drifted: expected ${expected.join(",")}, received ${actual.join(",")}`
  );
}

function assertReadingOrder(boxes, stateName) {
  for (let index = 1; index < boxes.length; index += 1) {
    assert.ok(
      boxes[index].top >= boxes[index - 1].top,
      `${stateName}: visible reading order is out of sequence`
    );
  }
}

async function verifyBoundary(page, viewport, scenarioId, expectation) {
  await page.goto(`${baseUrl}?scenario=${scenarioId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: expectation.heading }).waitFor();
  assert.equal(
    await page.locator('[data-testid="advice-result-screen"]').count(),
    0,
    `${scenarioId}: boundary leaked into valid advice surface`
  );
  assert.equal(
    await page.getByText(expectation.absentText, { exact: true }).count(),
    0,
    `${scenarioId}: boundary states are not distinct`
  );

  const layout = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }));

  assert.ok(
    layout.scrollHeight <= layout.viewportHeight + 1,
    `${viewport.name}-${scenarioId}: document scrolls`
  );
  assert.ok(
    layout.scrollWidth <= layout.viewportWidth + 1,
    `${viewport.name}-${scenarioId}: horizontal overflow`
  );

  if (viewport.name === "360x640") {
    await hideDevelopmentPortal(page);
    await page.screenshot({
      animations: "disabled",
      path: `${outputPath}${viewport.name}-${scenarioId}.png`,
    });
  }
}

async function verifyInteractions(activeBrowser, errors) {
  const page = await activeBrowser.newPage({
    viewport: { width: 390, height: 844 },
  });
  collectBrowserErrors(page, errors, "interactions");
  await openScenario(page, "advice-matrix-preview-left");

  const estimateTrigger = page.getByRole("button", {
    name: "Entenda a estimativa",
  });
  await estimateTrigger.click();
  await assertFocusedHeading(page, "Sobre esta estimativa");
  const estimateIsolation = await page
    .locator('[data-testid="advice-result-background"]')
    .evaluate((element) => ({
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.inert,
    }));
  assert.deepEqual(
    estimateIsolation,
    { ariaHidden: "true", inert: true },
    "Estimate sheet does not isolate the production result"
  );
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
    "Estimate sheet does not lock background scrolling"
  );
  await hideDevelopmentPortal(page);
  await page.screenshot({
    animations: "disabled",
    path: `${outputPath}390x844-estimate-focus-proof.png`,
  });
  await page.keyboard.press("Tab");
  assert.equal(await focusedText(page), "Fechar", "Tab misses estimate close");
  await page.keyboard.press("Tab");
  assert.equal(
    await focusedText(page),
    "Fechar",
    "Estimate focus does not trap"
  );
  await page.keyboard.press("Escape");
  await waitForFocusedText(page, "Entenda a estimativa");

  const optionsTrigger = page.getByRole("button", { name: "Opções" });
  await optionsTrigger.click();
  await assertFocusedHeading(page, "Outras opções");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await focusedText(page),
    "Trocar linhaVoltar para a seleção de linhas.",
    "Reverse tab misses the final options control"
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await focusedText(page),
    "Fechar",
    "Options focus order is wrong"
  );
  await page.mouse.click(8, 8);
  await waitForFocusedText(page, "Opções");
  assert.equal(
    await page
      .locator('[data-testid="advice-result-background"]')
      .getAttribute("inert"),
    null,
    "Backdrop close leaves the result inert"
  );

  await page.close();
}

async function verifyReducedMotion(activeBrowser, errors) {
  const page = await activeBrowser.newPage({
    reducedMotion: "reduce",
    viewport: { width: 360, height: 640 },
  });
  collectBrowserErrors(page, errors, "reduced-motion");
  await openScenario(page, "advice-matrix-recent-front");
  await page.getByRole("button", { name: "Entenda a estimativa" }).click();
  const motion = await page.getByRole("dialog").evaluate((dialog) => {
    const sheetStyle = getComputedStyle(dialog);
    const action = document.querySelector(
      '[data-testid="advice-result-actions"] button'
    );

    if (!(action instanceof HTMLElement)) {
      throw new Error("Missing reduced-motion action");
    }

    return {
      actionTransitionDuration: getComputedStyle(action).transitionDuration,
      sheetAnimationDuration: sheetStyle.animationDuration,
    };
  });

  assert.ok(
    durationSeconds(motion.sheetAnimationDuration) <= 0.00001,
    `Reduced-motion sheet animation remains ${motion.sheetAnimationDuration}`
  );
  assert.ok(
    motion.actionTransitionDuration
      .split(",")
      .every((duration) => durationSeconds(duration) <= 0.00001),
    `Reduced-motion transitions remain ${motion.actionTransitionDuration}`
  );
  await page.close();
}

async function assertFocusedHeading(page, name) {
  const heading = page.getByRole("heading", { name });
  await heading.waitFor();
  await waitForFocusedText(page, name);
  assert.equal(
    await heading.evaluate((element) => element === document.activeElement),
    true,
    `${name} did not receive focus`
  );
}

async function waitForFocusedText(page, text) {
  await page.waitForFunction(
    (expectedText) =>
      document.activeElement?.textContent?.trim() === expectedText,
    text
  );
}

async function focusedText(page) {
  return page.evaluate(() => document.activeElement?.textContent?.trim());
}

async function hideDevelopmentPortal(page) {
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
}

function durationSeconds(value) {
  const duration = Number.parseFloat(value);

  return value.trim().endsWith("ms") ? duration / 1000 : duration;
}

async function verifyApprovedAssets() {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(expectedAssetHashes).map(
        async ([variant, expectedHash]) => {
          const asset = await readFile(
            new URL(
              `../public/images/advice-bus-${variant}.png`,
              import.meta.url
            )
          );
          const actualHash = createHash("sha256").update(asset).digest("hex");

          assert.equal(
            actualHash,
            expectedHash,
            `${variant} artwork no longer matches the approved asset`
          );

          return [
            variant,
            {
              bytes: asset.byteLength,
              sha256: actualHash,
            },
          ];
        }
      )
    )
  );
}
