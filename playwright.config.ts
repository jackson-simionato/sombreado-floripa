import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    viewport: { height: 844, width: 390 },
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000/v1",
    },
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:3100",
  },
});
