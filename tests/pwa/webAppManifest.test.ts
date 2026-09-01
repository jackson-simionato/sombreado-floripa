import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { metadata, viewport } from "../../app/layout";

const manifestPath = resolve("public/manifest.webmanifest");

describe("PWA install", () => {
  test("ships a web app manifest with brand theme color and Add to Home Screen display", () => {
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));

    expect(manifest).toEqual(
      expect.objectContaining({
        background_color: "#faf9f5",
        display: "standalone",
        lang: "pt-BR",
        name: "Sombreado Floripa",
        short_name: "Sombreado",
        start_url: "/",
        theme_color: "#faf9f5",
        icons: expect.arrayContaining([
          expect.objectContaining({
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          }),
          expect.objectContaining({
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          }),
        ]),
      })
    );
    expect(existsSync(resolve("public/icons/icon-192.png"))).toBe(true);
    expect(existsSync(resolve("public/icons/icon-512.png"))).toBe(true);
    expect(existsSync(resolve("public/icons/apple-touch-icon.png"))).toBe(true);
  });

  test("does not declare accounts or push notifications", () => {
    const raw = readFileSync(manifestPath, "utf8");

    expect(raw).not.toMatch(/push|gcm_sender_id|notification|sender_id/i);
  });

  test("links the manifest and Apple home-screen metadata from the document", () => {
    expect(viewport.themeColor).toBe("#faf9f5");
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.appleWebApp).toMatchObject({
      capable: true,
      title: "Sombreado",
    });
  });
});
