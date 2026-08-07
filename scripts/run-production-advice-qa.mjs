/* global fetch, process */

/**
 * Local layout/QA harness for the production advice matrix.
 *
 * Boots `npm run dev` against `/prototype` for deterministic scenario capture.
 * This is not Cloudflare Worker / `wrangler deploy` artifact verification.
 */

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const previewUrl = "http://127.0.0.1:4173/prototype";
const server = spawn(
  "npm",
  ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "4173"],
  {
    detached: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  }
);

let serverOutput = "";

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForPreview();
  await import("./validate-production-advice-matrix.mjs");
} finally {
  stopPreview();
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(
        `Production preview exited before validation.\n${serverOutput.trim()}`
      );
    }

    try {
      const response = await fetch(previewUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // The production preview is still starting.
    }

    await delay(250);
  }

  throw new Error(
    `Production preview did not become ready.\n${serverOutput.trim()}`
  );
}

function stopPreview() {
  if (server.pid === undefined) {
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ESRCH"
    ) {
      throw error;
    }
  }
}
