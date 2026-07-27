/* global HTMLImageElement, HTMLElement, URL, console, document, getComputedStyle, process, window */

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import { format } from "prettier";

const baseUrl =
  process.env.ADVICE_PROTOTYPE_URL ??
  "http://127.0.0.1:4173/prototype/advice-ledger";
const outputUrl = new URL(
  "../docs/design/wayfinder/advice-state-prototype/",
  import.meta.url
);
const outputPath = fileURLToPath(outputUrl);
const sourcePath = fileURLToPath(
  new URL(
    "../docs/design/wayfinder/selected-signature-advice-direction-v2.png",
    import.meta.url
  )
);

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
  "360x640-left-recent",
  "390x844-left-onboard",
  "390x844-back-recent",
  "390x844-neutral-preview",
]);

await mkdir(outputPath, { recursive: true });

const browser = await chromium.launch({
  chromiumSandbox: false,
  headless: true,
});
const consoleErrors = [];
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport,
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({
          text: message.text(),
          viewport: viewport.name,
        });
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push({
        text: error.message,
        viewport: viewport.name,
      });
    });

    for (const area of areas) {
      for (const context of contexts) {
        const stateName = `${viewport.name}-${area}-${context}`;
        const url = `${baseUrl}?area=${area}&context=${context}`;

        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.locator('[data-prototype-ready="true"]').waitFor();
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

        const metrics = await page.evaluate(() => {
          const screen = document.querySelector(
            '[data-testid="advice-screen"]'
          );
          const route = document.querySelector('[data-testid="route-receipt"]');
          const header = document.querySelector(
            '[data-testid="result-header"]'
          );
          const proof = document.querySelector(
            '[data-testid="signature-proof"]'
          );
          const trust = document.querySelector('[data-testid="trust-row"]');
          const actions = document.querySelector(
            '[data-testid="result-actions"]'
          );
          const diagram = document.querySelector(
            '[aria-label="Diagrama de orientação do ônibus"] figure'
          );
          const busShell = document.querySelector('[data-testid="bus-shell"]');
          const artwork = document.querySelector(
            '[data-testid="advice-bus-artwork"]'
          );
          const ledgers = Array.from(
            document.querySelectorAll("[data-ledger-tone]")
          );

          assertElement(screen, "advice screen");
          assertElement(route, "route receipt");
          assertElement(header, "result header");
          assertElement(proof, "signature proof");
          assertElement(trust, "trust row");
          assertElement(actions, "result actions");
          assertElement(diagram, "accessible diagram");
          assertElement(busShell, "bus shell");
          assertElement(artwork, "bus artwork");

          const boxes = [route, header, proof, trust, actions].map((element) =>
            roundRect(element.getBoundingClientRect())
          );
          const screenRect = roundRect(screen.getBoundingClientRect());
          const actionRect = roundRect(actions.getBoundingClientRect());
          const artworkRect = roundRect(artwork.getBoundingClientRect());
          const artworkFrameRect = roundRect(busShell.getBoundingClientRect());
          const primary = document.querySelector(
            '[data-testid="result-actions"] button:first-child'
          );
          const options = document.querySelector(
            '[data-testid="result-actions"] button:last-child'
          );

          assertElement(primary, "primary action");
          assertElement(options, "options action");

          return {
            actionRect,
            artworkComplete: artwork.complete,
            artworkMirrored: artwork.getAttribute("data-artwork-mirrored"),
            artworkNaturalHeight: artwork.naturalHeight,
            artworkNaturalWidth: artwork.naturalWidth,
            artworkRect,
            artworkFrameRect,
            artworkSource: artwork.getAttribute("src"),
            artworkVariant: artwork.getAttribute("data-artwork-variant"),
            boxes,
            bodyClientHeight: document.documentElement.clientHeight,
            bodyClientWidth: document.documentElement.clientWidth,
            bodyScrollHeight: document.documentElement.scrollHeight,
            bodyScrollWidth: document.documentElement.scrollWidth,
            clippedLedgerText: Array.from(
              document.querySelectorAll(
                "[data-ledger-tone] span, [data-ledger-tone] strong, [data-ledger-tone] small"
              )
            )
              .filter((element) => {
                const style = getComputedStyle(element);
                const hasText = (element.textContent?.trim().length ?? 0) > 0;

                return (
                  hasText &&
                  style.display !== "none" &&
                  (element.scrollWidth > element.clientWidth + 1 ||
                    element.scrollHeight > element.clientHeight + 1)
                );
              })
              .map((element) => element.textContent?.trim()),
            diagramSummary: diagram.getAttribute("aria-label"),
            ledgerTones: ledgers.map((ledger) =>
              ledger.getAttribute("data-ledger-tone")
            ),
            primaryRect: roundRect(primary.getBoundingClientRect()),
            screenClientHeight: screen.clientHeight,
            screenRect,
            screenScrollHeight: screen.scrollHeight,
            screenText: screen.textContent?.replace(/\s+/g, " ").trim(),
            optionsRect: roundRect(options.getBoundingClientRect()),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          };

          function assertElement(value, label) {
            if (!(value instanceof HTMLElement)) {
              throw new Error(`Missing ${label}`);
            }
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

        assert.ok(
          metrics.bodyScrollHeight <= metrics.viewportHeight + 1,
          `${stateName}: document scrolls (${metrics.bodyScrollHeight}px > ${metrics.viewportHeight}px)`
        );
        assert.ok(
          metrics.bodyScrollWidth <= metrics.viewportWidth + 1,
          `${stateName}: horizontal overflow`
        );
        assert.ok(
          metrics.screenScrollHeight <= metrics.screenClientHeight + 1,
          `${stateName}: advice screen scrolls`
        );
        assert.ok(
          metrics.actionRect.bottom <= metrics.viewportHeight + 0.5,
          `${stateName}: result actions leave the viewport`
        );
        assert.ok(
          metrics.primaryRect.top >= 0 &&
            metrics.optionsRect.bottom <= metrics.viewportHeight + 0.5,
          `${stateName}: a persistent action is clipped`
        );
        assert.ok(
          metrics.diagramSummary?.length > 24,
          `${stateName}: accessible diagram summary is missing`
        );
        assert.ok(
          Math.abs(metrics.artworkRect.width - 250) <= 0.5,
          `${stateName}: bus artwork dimensions drifted (${metrics.artworkRect.width}px)`
        );
        assert.ok(
          Math.abs(
            metrics.artworkRect.left +
              metrics.artworkRect.width / 2 -
              (metrics.artworkFrameRect.left +
                metrics.artworkFrameRect.width / 2)
          ) <= 0.5,
          `${stateName}: bus artwork is not centered in its frame`
        );
        assert.equal(
          metrics.artworkComplete,
          true,
          `${stateName}: bus artwork did not load`
        );
        assert.ok(
          metrics.artworkNaturalWidth >= 1000 &&
            metrics.artworkNaturalHeight >= 1000,
          `${stateName}: bus artwork is not the full generated asset`
        );
        assert.deepEqual(
          metrics.clippedLedgerText,
          [],
          `${stateName}: visible diagram text is cropped`
        );
        assert.equal(
          metrics.artworkSource,
          `/images/advice-bus-${
            area === "left" || area === "right" ? "side" : area
          }.png`,
          `${stateName}: bus artwork uses the wrong state asset`
        );
        assert.equal(
          metrics.artworkMirrored,
          area === "right" ? "true" : "false",
          `${stateName}: side artwork mirror state is wrong`
        );
        assert.equal(
          metrics.artworkVariant,
          area,
          `${stateName}: bus artwork state marker is wrong`
        );
        assertReadingOrder(metrics.boxes, stateName);

        if (area === "neutral") {
          assert.deepEqual(
            metrics.ledgerTones,
            ["neutral", "neutral"],
            `${stateName}: neutral state leaks recommendation dominance`
          );
        } else {
          assert.ok(
            metrics.ledgerTones.includes("recommended") &&
              metrics.ledgerTones.includes("sunny"),
            `${stateName}: directional state lacks text-and-pattern tones`
          );
        }

        results.push({
          area,
          context,
          metrics,
          state: stateName,
          viewport,
        });

        if (screenshotStates.has(stateName)) {
          await page.addStyleTag({
            content: "nextjs-portal { display: none !important; }",
          });
          await page.screenshot({
            animations: "disabled",
            path: `${outputPath}${stateName}.png`,
          });
        }
      }
    }

    await page.close();
  }

  await verifyInteractions(browser);
  await verifyReducedMotion(browser);
  await createComparisonBoard(browser);
} finally {
  await browser.close();
}

assert.deepEqual(consoleErrors, [], "Browser console errors were recorded");

const matrixResultsPath = `${outputPath}matrix-results.json`;
const matrixResults = await format(
  JSON.stringify({
    consoleErrors,
    generatedAt: new Date().toISOString(),
    results,
    summary: {
      combinations: results.length,
      contexts,
      areas,
      viewports,
    },
  }),
  {
    filepath: matrixResultsPath,
  }
);

await writeFile(matrixResultsPath, matrixResults);

console.log(
  `Validated ${results.length} responsive states with no page overflow or console errors.`
);

function assertReadingOrder(boxes, stateName) {
  for (let index = 1; index < boxes.length; index += 1) {
    assert.ok(
      boxes[index].top >= boxes[index - 1].top,
      `${stateName}: visible reading order is out of sequence`
    );
  }
}

async function verifyInteractions(activeBrowser) {
  const page = await activeBrowser.newPage({
    viewport: { width: 390, height: 844 },
  });

  await page.goto(`${baseUrl}?area=left&context=preview`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[data-prototype-ready="true"]').waitFor();

  const estimateTrigger = page.getByRole("button", {
    name: "Entenda a estimativa",
  });
  await estimateTrigger.click();
  await assertFocusedHeading(page, "Sobre esta estimativa");
  assert.equal(
    await page
      .locator('[data-testid="advice-screen"]')
      .evaluate((element) => element.parentElement?.inert),
    true,
    "Estimate sheet background is not inert"
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Fechar",
    "Tab does not enter the estimate sheet controls"
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Fechar",
    "Estimate sheet does not trap focus"
  );
  await page.keyboard.press("Escape");
  await waitForFocusedText(page, "Entenda a estimativa");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Entenda a estimativa",
    "Escape does not restore focus to the estimate trigger"
  );

  const optionsTrigger = page.getByRole("button", { name: "Opções" });
  await optionsTrigger.click();
  await assertFocusedHeading(page, "Outras opções");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Trocar linhaVoltar para a seleção de linhas.",
    "Reverse tab does not wrap to the final options control"
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Fechar",
    "Options sheet focus order does not wrap to close"
  );
  await page.mouse.click(8, 8);
  await waitForFocusedText(page, "Opções");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Opções",
    "Backdrop dismissal does not restore focus to the options trigger"
  );

  await optionsTrigger.click();
  await page.getByRole("button", { name: "Trocar sentido" }).click();
  await page.getByRole("status").waitFor();
  assert.match(
    (await page.getByRole("status").textContent()) ?? "",
    /voltaria para a escolha de sentido/,
    "Options action does not expose its prototype outcome"
  );

  await page.close();

  const desktopPage = await activeBrowser.newPage({
    viewport: { width: 1024, height: 844 },
  });
  await desktopPage.goto(`${baseUrl}?area=left&context=onboard`, {
    waitUntil: "domcontentloaded",
  });
  await desktopPage.locator('[data-prototype-ready="true"]').waitFor();
  await desktopPage.keyboard.press("ArrowRight");
  await desktopPage.waitForFunction(() =>
    window.location.search.includes("area=right")
  );
  assert.match(
    await desktopPage.locator("h1").textContent(),
    /direita/i,
    "Arrow-key state switching did not update the result"
  );
  await desktopPage.close();
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

async function verifyReducedMotion(activeBrowser) {
  const page = await activeBrowser.newPage({
    reducedMotion: "reduce",
    viewport: { width: 360, height: 640 },
  });
  await page.goto(`${baseUrl}?area=front&context=recent`, {
    waitUntil: "domcontentloaded",
  });
  const motion = await page
    .getByRole("button", { name: "Atualizar localização" })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
      };
    });

  assert.ok(
    Number.parseFloat(motion.animationDuration) <= 0.00001,
    `Reduced-motion animation duration remains ${motion.animationDuration}`
  );
  assert.equal(
    motion.transitionDuration,
    "0s",
    "Reduced-motion transitions are still active"
  );
  await page.close();
}

async function createComparisonBoard(activeBrowser) {
  const implementationPath = `${outputPath}360x640-left-onboard.png`;
  const [source, implementation] = await Promise.all([
    readFile(sourcePath, "base64"),
    readFile(implementationPath, "base64"),
  ]);
  const page = await activeBrowser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 760, height: 682 },
  });

  await page.setContent(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(2, 360px);
            gap: 20px;
            background: #e9e8e4;
            color: #1b1c1a;
            font: 600 13px/1.2 system-ui, sans-serif;
          }
          figure { margin: 0; display: grid; gap: 8px; }
          img {
            width: 360px;
            height: 640px;
            display: block;
            object-fit: fill;
            background: #faf9f5;
          }
        </style>
      </head>
      <body>
        <figure>
          <figcaption>Fonte selecionada · normalizada para 360 × 640</figcaption>
          <img alt="" src="data:image/png;base64,${source}" />
        </figure>
        <figure>
          <figcaption>Protótipo · 360 × 640</figcaption>
          <img alt="" src="data:image/png;base64,${implementation}" />
        </figure>
      </body>
    </html>
  `);
  await page.screenshot({
    path: `${outputPath}comparison-left-onboard-360x640.png`,
  });

  await page.setContent(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(2, 360px);
            gap: 20px;
            background: #e9e8e4;
            color: #1b1c1a;
            font: 600 13px/1.2 system-ui, sans-serif;
          }
          figure { margin: 0; display: grid; gap: 8px; }
          .crop {
            width: 360px;
            height: 360px;
            overflow: hidden;
            background: #faf9f5;
          }
          img {
            width: 360px;
            height: 640px;
            display: block;
            object-fit: fill;
          }
          .source img { transform: translateY(-185px); }
          .implementation img { transform: translateY(-170px); }
        </style>
      </head>
      <body>
        <figure class="source">
          <figcaption>Fonte selecionada · prova visual</figcaption>
          <div class="crop">
            <img alt="" src="data:image/png;base64,${source}" />
          </div>
        </figure>
        <figure class="implementation">
          <figcaption>Protótipo · prova visual</figcaption>
          <div class="crop">
            <img alt="" src="data:image/png;base64,${implementation}" />
          </div>
        </figure>
      </body>
    </html>
  `);
  await page.screenshot({
    path: `${outputPath}comparison-focus-proof-left-onboard-360x640.png`,
  });
  await page.close();
}
