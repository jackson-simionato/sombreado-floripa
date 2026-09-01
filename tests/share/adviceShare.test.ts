import { describe, expect, test } from "vitest";

import {
  adviceShareText,
  buildAdviceSharePayload,
  buildAdviceShareUrl,
  formatAdviceShareSentence,
  parseAdviceShareLink,
  shareAdvice,
} from "../../src/share/adviceShare";

const titriVolta = {
  routeId: "route-136",
  routeVersionId: "version-136",
  routeCode: "136",
  routeName: "TITRI - Centro",
  routeDirectionId: "direction-136-volta",
  directionLabel: "TITRI para Centro",
  directionKind: "volta" as const,
};

describe("advice share sentence", () => {
  test("formats the WhatsApp boarding sentence from the Advice Triple", () => {
    expect(
      formatAdviceShareSentence({
        ...titriVolta,
        recommendedSeatArea: "left",
      })
    ).toBe("Linha 136 volta (TITRI → Centro), senta à esquerda — Sombreado");
  });

  test("formats the other seat-area recommendations", () => {
    expect(
      formatAdviceShareSentence({
        ...titriVolta,
        recommendedSeatArea: "right",
      })
    ).toBe("Linha 136 volta (TITRI → Centro), senta à direita — Sombreado");
    expect(
      formatAdviceShareSentence({
        ...titriVolta,
        recommendedSeatArea: "front",
      })
    ).toBe("Linha 136 volta (TITRI → Centro), senta mais à frente — Sombreado");
    expect(
      formatAdviceShareSentence({
        ...titriVolta,
        recommendedSeatArea: "back",
      })
    ).toBe("Linha 136 volta (TITRI → Centro), senta no fundo — Sombreado");
  });

  test("omits the seat clause when there is no side to recommend", () => {
    expect(
      formatAdviceShareSentence({
        ...titriVolta,
        recommendedSeatArea: "neutral",
      })
    ).toBe("Linha 136 volta (TITRI → Centro) — Sombreado");
  });

  test("omits the direction kind when the source does not provide one", () => {
    expect(
      formatAdviceShareSentence({
        ...titriVolta,
        directionKind: null,
        recommendedSeatArea: "left",
      })
    ).toBe("Linha 136 (TITRI → Centro), senta à esquerda — Sombreado");
  });
});

describe("advice share link", () => {
  test("builds a deep link with linha and sentido as stable ids", () => {
    expect(
      buildAdviceShareUrl({
        origin: "https://sombreado.example",
        target: titriVolta,
      })
    ).toBe(
      "https://sombreado.example/?linha=route-136&sentido=direction-136-volta&v=version-136&codigo=136&nome=TITRI+-+Centro&destino=TITRI+para+Centro&k=volta"
    );
  });

  test("parses a share link back into the Advice Triple identity", () => {
    const url = buildAdviceShareUrl({
      origin: "https://sombreado.example",
      target: titriVolta,
    });

    expect(parseAdviceShareLink(url)).toEqual(titriVolta);
  });

  test("parses stable linha and sentido ids without display fields", () => {
    expect(
      parseAdviceShareLink(
        "https://sombreado.example/?linha=route-136&sentido=direction-136-volta&v=version-136"
      )
    ).toEqual({
      ...titriVolta,
      routeCode: "",
      routeName: "",
      directionLabel: "",
      directionKind: null,
    });
  });

  test("ignores a URL that is missing the stable ids", () => {
    expect(
      parseAdviceShareLink("https://sombreado.example/?codigo=136&k=volta")
    ).toBeUndefined();
  });
});

describe("advice share payload", () => {
  test("joins the sentence and deep link as WhatsApp text", () => {
    const payload = buildAdviceSharePayload({
      origin: "https://sombreado.example",
      recommendedSeatArea: "left",
      target: titriVolta,
    });

    expect(payload.sentence).toBe(
      "Linha 136 volta (TITRI → Centro), senta à esquerda — Sombreado"
    );
    expect(payload.url).toContain("linha=route-136");
    expect(payload.url).toContain("sentido=direction-136-volta");
    expect(adviceShareText(payload)).toBe(
      `${payload.sentence}\n${payload.url}`
    );
  });

  test("opens the system share sheet with the sentence and link", async () => {
    let sharedText = "";
    const payload = buildAdviceSharePayload({
      origin: "https://sombreado.example",
      recommendedSeatArea: "left",
      target: titriVolta,
    });

    await expect(
      shareAdvice({
        payload,
        share: async (data) => {
          sharedText = data.text;
        },
      })
    ).resolves.toBe("shared");
    expect(sharedText).toBe(adviceShareText(payload));
  });

  test("copies the sentence when the system share sheet is unavailable", async () => {
    let copied = "";
    const payload = buildAdviceSharePayload({
      origin: "https://sombreado.example",
      recommendedSeatArea: "left",
      target: titriVolta,
    });

    await expect(
      shareAdvice({
        payload,
        copyText: async (text) => {
          copied = text;
        },
      })
    ).resolves.toBe("copied");
    expect(copied).toBe(adviceShareText(payload));
  });

  test("copies the sentence when sharing fails for a reason other than cancel", async () => {
    let copied = "";
    const payload = buildAdviceSharePayload({
      origin: "https://sombreado.example",
      recommendedSeatArea: "left",
      target: titriVolta,
    });

    await expect(
      shareAdvice({
        payload,
        share: async () => {
          throw new Error("share unavailable");
        },
        copyText: async (text) => {
          copied = text;
        },
      })
    ).resolves.toBe("copied");
    expect(copied).toBe(adviceShareText(payload));
  });

  test("treats a cancelled share sheet as dismissed", async () => {
    const payload = buildAdviceSharePayload({
      origin: "https://sombreado.example",
      recommendedSeatArea: "left",
      target: titriVolta,
    });

    await expect(
      shareAdvice({
        payload,
        share: async () => {
          const error = new Error("Share canceled");
          error.name = "AbortError";
          throw error;
        },
      })
    ).resolves.toBe("dismissed");
  });
});
