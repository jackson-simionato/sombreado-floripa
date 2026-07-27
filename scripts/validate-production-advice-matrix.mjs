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
const boundaries = [];
const interactionEvidence = [];
const reducedMotionEvidence = [];

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

        const renderedProof = await sampleRenderedProof(page);
        validateRenderedProof(renderedProof, area, stateName);

        results.push({
          area,
          context,
          metrics,
          renderedProof,
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

    boundaries.push(
      await verifyBoundary(page, viewport, "advice-withheld", {
        absentText: "Algo deu errado",
        actions: ["Trocar linha", "Tentar de novo"],
        heading: "Não é possível recomendar agora",
      })
    );
    boundaries.push(
      await verifyBoundary(page, viewport, "error-advice", {
        absentText: "Não é possível recomendar agora",
        actions: ["Tentar de novo", "Procurar linha manualmente"],
        heading: "Algo deu errado",
      })
    );
    await page.close();
  }

  for (const viewport of viewports) {
    interactionEvidence.push(
      await verifyInteractions(browser, browserErrors, viewport)
    );
    reducedMotionEvidence.push(
      await verifyReducedMotion(browser, browserErrors, viewport)
    );
  }
} finally {
  await browser.close();
}

assert.equal(
  evidenceRecordCount(interactionEvidence),
  viewports.length,
  "Interaction evidence does not cover both production viewports"
);
assert.equal(
  evidenceRecordCount(reducedMotionEvidence),
  viewports.length,
  "Reduced-motion evidence does not cover both production viewports"
);
assert.deepEqual(
  browserErrors,
  [],
  "Browser console or page errors were recorded"
);

const matrixResultsPath = `${outputPath}matrix-results.json`;
const matrixResults = await format(
  JSON.stringify({
    assetIntegrity,
    boundaries,
    browserErrors,
    generatedAt: new Date().toISOString(),
    interactions: interactionEvidence,
    reducedMotion: reducedMotionEvidence,
    results,
    summary: {
      adviceCombinations: results.length,
      areas,
      boundaryChecks: boundaries.length,
      contexts,
      interactionChecks: interactionEvidence.length * 2,
      reducedMotionChecks: reducedMotionEvidence.length,
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
    const announcement = requiredElement(
      '[data-testid="advice-announcement"]',
      "polite advice announcement"
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
    const estimateTrigger = requiredElement(
      '[data-testid="advice-trust-row"] button',
      "estimate trigger"
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
    const announcementStyle = getComputedStyle(announcement);
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
      announcementAriaAtomic: announcement.getAttribute("aria-atomic"),
      announcementAriaLive: announcement.getAttribute("aria-live"),
      announcementPosition: announcementStyle.position,
      announcementRect: roundRect(announcement.getBoundingClientRect()),
      announcementRole: announcement.getAttribute("role"),
      announcementText: announcement.textContent?.replace(/\s+/g, " ").trim(),
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
      estimateTriggerRect: roundRect(estimateTrigger.getBoundingClientRect()),
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
    `${stateName}: persistent actions cover visible result content (${metrics.boxes[3].bottom}px > ${metrics.actionRect.top}px)`
  );
  assert.ok(
    metrics.primaryRect.top >= 0 &&
      metrics.optionsRect.bottom <= metrics.viewportHeight + 0.5,
    `${stateName}: a persistent action is clipped`
  );
  for (const [label, rect] of [
    ["primary action", metrics.primaryRect],
    ["options action", metrics.optionsRect],
    ["estimate trigger", metrics.estimateTriggerRect],
  ]) {
    assert.ok(
      rect.height >= 48,
      `${stateName}: ${label} is ${rect.height}px tall, expected at least 48px`
    );
    assert.ok(
      rect.left >= -0.5 &&
        rect.right <= metrics.viewportWidth + 0.5 &&
        rect.top >= -0.5 &&
        rect.bottom <= metrics.viewportHeight + 0.5,
      `${stateName}: ${label} leaves the viewport`
    );
  }
  assert.deepEqual(
    metrics.clippedVisibleText,
    [],
    `${stateName}: visible result text is clipped`
  );
  assert.equal(
    metrics.announcementRole,
    "status",
    `${stateName}: advice announcement is not a status`
  );
  assert.equal(
    metrics.announcementAriaLive,
    "polite",
    `${stateName}: advice announcement is not polite`
  );
  assert.equal(
    metrics.announcementAriaAtomic,
    "true",
    `${stateName}: advice announcement is not atomic`
  );
  assert.equal(
    metrics.announcementPosition,
    "absolute",
    `${stateName}: advice announcement is not visually isolated`
  );
  assert.ok(
    metrics.announcementRect.width <= 1.1 &&
      metrics.announcementRect.height <= 1.1,
    `${stateName}: advice announcement duplicates visible copy`
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
  assert.equal(
    metrics.announcementText,
    `${expectedContextText}. ${metrics.diagramSummary}`,
    `${stateName}: polite announcement does not combine context and advice`
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

async function sampleRenderedProof(page) {
  const proof = page.locator('[data-testid="bus-shell"] > div');
  const geometry = await page.evaluate(() => {
    const proofGrid = document.querySelector('[data-testid="bus-shell"] > div');
    const artwork = document.querySelector(
      '[data-testid="advice-bus-artwork"]'
    );

    if (
      !(proofGrid instanceof HTMLElement) ||
      !(artwork instanceof HTMLImageElement)
    ) {
      throw new Error("Missing rendered proof geometry");
    }

    const proofRect = proofGrid.getBoundingClientRect();
    const artworkRect = artwork.getBoundingClientRect();

    return {
      artwork: {
        height: artworkRect.height,
        left: artworkRect.left - proofRect.left,
        top: artworkRect.top - proofRect.top,
        width: artworkRect.width,
      },
      visibleFieldLabels: Array.from(
        proofGrid.querySelectorAll("[data-ledger-tone]")
      ).map((ledger) => ledger.textContent?.replace(/\s+/g, " ").trim()),
    };
  });
  const screenshot = await proof.screenshot({ animations: "disabled" });

  return page.evaluate(
    async ({ geometry, pngBase64 }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${pngBase64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (context === null) {
        throw new Error("Could not sample rendered proof");
      }

      context.drawImage(image, 0, 0);
      const fieldPoints = {
        bottom: [10, Math.floor(image.naturalHeight * 0.78)],
        left: [10, Math.floor(image.naturalHeight * 0.5)],
        middle: [10, Math.floor(image.naturalHeight * 0.5)],
        right: [image.naturalWidth - 10, Math.floor(image.naturalHeight * 0.5)],
        top: [10, Math.floor(image.naturalHeight * 0.22)],
      };
      const artworkPoint = (x, y) => [
        Math.round(geometry.artwork.left + (x / 1254) * geometry.artwork.width),
        Math.round(geometry.artwork.top + (y / 1254) * geometry.artwork.height),
      ];
      const rowPoints = [337, 475, 612, 750, 887].map((y) =>
        artworkPoint(480, y)
      );
      const rearLampPoint = artworkPoint(480, 1021);

      return {
        artwork: {
          rearLamp: sample(rearLampPoint),
          rows: rowPoints.map(sample),
        },
        dimensions: {
          height: image.naturalHeight,
          width: image.naturalWidth,
        },
        fields: Object.fromEntries(
          Object.entries(fieldPoints).map(([name, point]) => [
            name,
            sample(point),
          ])
        ),
        geometry: geometry.artwork,
        visibleFieldLabels: geometry.visibleFieldLabels,
      };

      function sample([x, y]) {
        return {
          point: [x, y],
          rgba: Array.from(context.getImageData(x, y, 1, 1).data),
        };
      }
    },
    { geometry, pngBase64: screenshot.toString("base64") }
  );
}

function validateRenderedProof(proof, area, stateName) {
  const fieldColors = {
    neutral: [244, 244, 240, 255],
    recommendedBack: [217, 232, 247, 255],
    recommendedFront: [206, 229, 250, 255],
    sunnyBack: [255, 235, 200, 255],
    sunnyFront: [241, 225, 192, 255],
  };

  if (area === "front" || area === "back") {
    const expected = expectedArtworkLandmarks[area];
    assert.equal(
      proof.artwork.rows.length,
      5,
      `${stateName}: composited proof does not retain five seat-row samples`
    );
    proof.artwork.rows.forEach((sample, index) => {
      assertPixel(
        sample.rgba,
        expected.rows[index],
        `${stateName}: composited seat-row ${index + 1}`
      );
    });
    assertPixel(
      proof.artwork.rearLamp.rgba,
      expected.rearLamp,
      `${stateName}: composited red rear lantern`
    );
    assertPixel(
      proof.fields.top.rgba,
      area === "front" ? fieldColors.recommendedFront : fieldColors.sunnyBack,
      `${stateName}: rendered front field`
    );
    assertPixel(
      proof.fields.middle.rgba,
      [242, 242, 242, 255],
      `${stateName}: rendered neutral middle field`
    );
    assertPixel(
      proof.fields.bottom.rgba,
      area === "front" ? fieldColors.sunnyFront : fieldColors.recommendedBack,
      `${stateName}: rendered back field`
    );
  } else if (area === "left" || area === "right") {
    assertPixel(
      proof.fields.left.rgba,
      area === "left" ? fieldColors.recommendedFront : fieldColors.sunnyFront,
      `${stateName}: rendered left-side field`
    );
    assertPixel(
      proof.fields.right.rgba,
      area === "left" ? fieldColors.sunnyFront : fieldColors.recommendedFront,
      `${stateName}: rendered right-side field`
    );
  } else {
    assertPixel(
      proof.fields.left.rgba,
      fieldColors.neutral,
      `${stateName}: rendered neutral left field`
    );
    assertPixel(
      proof.fields.right.rgba,
      fieldColors.neutral,
      `${stateName}: rendered neutral right field`
    );
  }

  if (area === "neutral") {
    assert.ok(
      proof.visibleFieldLabels.every(
        (label) =>
          label?.includes("Sem preferência") && label.includes("Sem destaque")
      ),
      `${stateName}: neutral rendered fields are not visibly described`
    );
  } else {
    assert.ok(
      proof.visibleFieldLabels.some((label) =>
        label?.includes("Recomendado")
      ) &&
        proof.visibleFieldLabels.some((label) =>
          label?.includes("Maior incidência")
        ),
      `${stateName}: rendered field semantics rely on color alone`
    );
  }
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

  const layout = await page.evaluate((expectedActions) => {
    const heading = document.querySelector("h1");
    const content = heading?.closest("section");
    const actions = expectedActions.map((name) => {
      const action = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent?.replace(/\s+/g, " ").trim() === name
      );

      if (!(action instanceof HTMLElement)) {
        throw new Error(`Missing boundary action: ${name}`);
      }

      return action;
    });
    const actionWrapper = actions[0]?.parentElement;

    if (
      !(heading instanceof HTMLElement) ||
      !(content instanceof HTMLElement) ||
      !(actionWrapper instanceof HTMLElement)
    ) {
      throw new Error("Missing boundary layout elements");
    }

    return {
      actionRect: roundRect(actionWrapper.getBoundingClientRect()),
      actions: actions.map((action) => ({
        name: action.textContent?.replace(/\s+/g, " ").trim(),
        rect: roundRect(action.getBoundingClientRect()),
      })),
      clippedVisibleText: Array.from(
        document.querySelectorAll("h1, p, strong, span, button")
      )
        .filter((element) => {
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);

          return (
            rect.width > 2 &&
            rect.height > 2 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            (element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1)
          );
        })
        .map((element) => element.textContent?.replace(/\s+/g, " ").trim()),
      contentClientWidth: content.clientWidth,
      contentRect: roundRect(content.getBoundingClientRect()),
      contentScrollWidth: content.scrollWidth,
      heading: heading.textContent?.replace(/\s+/g, " ").trim(),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };

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
  }, expectation.actions);

  assert.ok(
    layout.scrollHeight <= layout.viewportHeight + 1,
    `${viewport.name}-${scenarioId}: document scrolls`
  );
  assert.ok(
    layout.scrollWidth <= layout.viewportWidth + 1,
    `${viewport.name}-${scenarioId}: horizontal overflow`
  );
  assert.ok(
    layout.contentScrollWidth <= layout.contentClientWidth + 1,
    `${viewport.name}-${scenarioId}: boundary content overflows horizontally`
  );
  assert.ok(
    layout.contentRect.bottom <= layout.actionRect.top + 1,
    `${viewport.name}-${scenarioId}: actions overlap boundary copy`
  );
  assert.deepEqual(
    layout.clippedVisibleText,
    [],
    `${viewport.name}-${scenarioId}: boundary copy is clipped`
  );
  layout.actions.forEach(({ name, rect }) => {
    assert.ok(
      rect.height >= 48,
      `${viewport.name}-${scenarioId}: ${name} is ${rect.height}px tall`
    );
    assert.ok(
      rect.left >= -0.5 &&
        rect.right <= layout.viewportWidth + 0.5 &&
        rect.top >= -0.5 &&
        rect.bottom <= layout.viewportHeight + 0.5,
      `${viewport.name}-${scenarioId}: ${name} leaves the viewport`
    );
  });

  if (viewport.name === "360x640") {
    await hideDevelopmentPortal(page);
    await page.screenshot({
      animations: "disabled",
      path: `${outputPath}${viewport.name}-${scenarioId}.png`,
    });
  }

  return {
    ...layout,
    scenarioId,
    viewport,
  };
}

async function verifyInteractions(activeBrowser, errors, viewport) {
  const page = await activeBrowser.newPage({
    viewport,
  });
  collectBrowserErrors(page, errors, `interactions-${viewport.name}`);
  await openScenario(page, "advice-matrix-preview-left");

  const estimateTrigger = page.getByRole("button", {
    name: "Entenda a estimativa",
  });
  await estimateTrigger.click();
  await assertFocusedHeading(page, "Sobre esta estimativa");
  const estimateDialog = page.getByRole("dialog", {
    name: "Sobre esta estimativa",
  });
  const estimateCloseRect = await locatorRect(
    estimateDialog.getByRole("button", { name: "Fechar" })
  );
  assertVisibleTarget(
    estimateCloseRect,
    viewport,
    `${viewport.name}: estimate close`
  );
  const estimateSheetAnimationDuration = await estimateDialog.evaluate(
    (dialog) => getComputedStyle(dialog).animationDuration
  );
  const estimateSheetSeconds = durationSeconds(estimateSheetAnimationDuration);
  assert.ok(
    estimateSheetSeconds >= 0.3 && estimateSheetSeconds <= 0.7,
    `${viewport.name}: sheet entrance is ${estimateSheetAnimationDuration}, expected 300–700ms`
  );
  const estimateFocusedHeading = await focusedText(page);
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
  const estimateBodyOverflow = await page.evaluate(
    () => document.body.style.overflow
  );
  assert.equal(
    estimateBodyOverflow,
    "hidden",
    "Estimate sheet does not lock background scrolling"
  );
  await hideDevelopmentPortal(page);
  await page.screenshot({
    animations: "disabled",
    path: `${outputPath}${viewport.name}-estimate-focus-proof.png`,
  });
  await page.keyboard.press("Tab");
  const estimateFirstTabText = await focusedText(page);
  assert.equal(estimateFirstTabText, "Fechar", "Tab misses estimate close");
  await page.keyboard.press("Tab");
  const estimateTrappedTabText = await focusedText(page);
  assert.equal(
    estimateTrappedTabText,
    "Fechar",
    "Estimate focus does not trap"
  );
  await page.keyboard.press("Escape");
  await waitForFocusedText(page, "Entenda a estimativa");
  const estimateEscapeRestoredText = await focusedText(page);

  const optionsTrigger = page.getByRole("button", { name: "Opções" });
  await optionsTrigger.click();
  await assertFocusedHeading(page, "Outras opções");
  const optionsDialog = page.getByRole("dialog", { name: "Outras opções" });
  const optionsCloseRect = await locatorRect(
    optionsDialog.getByRole("button", { name: "Fechar" })
  );
  assertVisibleTarget(
    optionsCloseRect,
    viewport,
    `${viewport.name}: options close`
  );
  const optionsFocusedHeading = await focusedText(page);
  await page.keyboard.press("Shift+Tab");
  const optionsReverseWrapText = await focusedText(page);
  assert.equal(
    optionsReverseWrapText,
    "Trocar linhaVoltar para a seleção de linhas.",
    "Reverse tab misses the final options control"
  );
  await page.keyboard.press("Tab");
  const optionsForwardWrapText = await focusedText(page);
  assert.equal(
    optionsForwardWrapText,
    "Fechar",
    "Options focus order is wrong"
  );
  await page.mouse.click(8, 8);
  await waitForFocusedText(page, "Opções");
  const optionsBackdropRestoredText = await focusedText(page);
  const optionsInertAfterClose = await page
    .locator('[data-testid="advice-result-background"]')
    .getAttribute("inert");
  assert.equal(
    optionsInertAfterClose,
    null,
    "Backdrop close leaves the result inert"
  );

  await page.close();

  return {
    estimate: {
      bodyOverflow: estimateBodyOverflow,
      escapeRestoredText: estimateEscapeRestoredText,
      firstTabText: estimateFirstTabText,
      focusedHeading: estimateFocusedHeading,
      isolation: estimateIsolation,
      closeRect: estimateCloseRect,
      sheetAnimationDuration: estimateSheetAnimationDuration,
      sheetSeconds: estimateSheetSeconds,
      trappedTabText: estimateTrappedTabText,
    },
    options: {
      backdropRestoredText: optionsBackdropRestoredText,
      closeRect: optionsCloseRect,
      focusedHeading: optionsFocusedHeading,
      forwardWrapText: optionsForwardWrapText,
      inertAfterClose: optionsInertAfterClose,
      reverseWrapText: optionsReverseWrapText,
    },
    scenarioId: "advice-matrix-preview-left",
    viewport,
  };
}

async function verifyReducedMotion(activeBrowser, errors, viewport) {
  const page = await activeBrowser.newPage({
    reducedMotion: "reduce",
    viewport,
  });
  collectBrowserErrors(page, errors, `reduced-motion-${viewport.name}`);
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

  return {
    ...motion,
    actionSeconds: motion.actionTransitionDuration
      .split(",")
      .map(durationSeconds),
    scenarioId: "advice-matrix-recent-front",
    sheetSeconds: durationSeconds(motion.sheetAnimationDuration),
    viewport,
  };
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

async function locatorRect(locator) {
  const box = await locator.boundingBox();

  if (box === null) {
    throw new Error("Visible browser target has no bounding box");
  }

  return {
    bottom: Number((box.y + box.height).toFixed(2)),
    height: Number(box.height.toFixed(2)),
    left: Number(box.x.toFixed(2)),
    right: Number((box.x + box.width).toFixed(2)),
    top: Number(box.y.toFixed(2)),
    width: Number(box.width.toFixed(2)),
  };
}

function assertVisibleTarget(rect, viewport, label) {
  assert.ok(
    rect.height >= 48,
    `${label} target is ${rect.height}px tall, expected at least 48px`
  );
  assert.ok(
    rect.left >= -0.5 &&
      rect.right <= viewport.width + 0.5 &&
      rect.top >= -0.5 &&
      rect.bottom <= viewport.height + 0.5,
    `${label} target leaves the viewport`
  );
}

function durationSeconds(value) {
  const duration = Number.parseFloat(value);

  return value.trim().endsWith("ms") ? duration / 1000 : duration;
}

function evidenceRecordCount(evidence) {
  if (evidence === undefined) return 0;

  return Array.isArray(evidence) ? evidence.length : 1;
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
