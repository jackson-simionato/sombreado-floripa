import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AdviceBusDiagram } from "../src/components/AdviceBusDiagram";
import { BusSplitDiagram } from "../src/components/BusSplitDiagram";
import type { UiAdviceState } from "../src/domain/types";

type DiagramAdvice = Exclude<UiAdviceState, { mode: "withheld" }>;

const leftAdvice: DiagramAdvice = {
  mode: "onboard",
  directSunExposure: "right",
  recommendedSeatArea: "left",
};

const diagramCases: ReadonlyArray<{
  advice: DiagramAdvice;
  area: "left" | "right" | "front" | "back" | "neutral";
  artwork: string;
  axis: "vertical" | "horizontal";
  mirrored: "false" | "true";
  summary: string;
}> = [
  {
    area: "left",
    advice: leftAdvice,
    artwork: "/images/advice-bus-side.png",
    axis: "vertical",
    mirrored: "false",
    summary:
      "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.",
  },
  {
    area: "right",
    advice: {
      mode: "onboard",
      directSunExposure: "left",
      recommendedSeatArea: "right",
    },
    artwork: "/images/advice-bus-side.png",
    axis: "vertical",
    mirrored: "true",
    summary:
      "Recomendação: sente à direita. O sol direto aparece do lado esquerdo do ônibus.",
  },
  {
    area: "front",
    advice: {
      mode: "onboard",
      directSunExposure: "back",
      recommendedSeatArea: "front",
    },
    artwork: "/images/advice-bus-front.png",
    axis: "horizontal",
    mirrored: "false",
    summary:
      "Recomendação: sente mais à frente. O sol direto aparece mais forte na parte de trás do ônibus.",
  },
  {
    area: "back",
    advice: {
      mode: "onboard",
      directSunExposure: "front",
      recommendedSeatArea: "back",
    },
    artwork: "/images/advice-bus-back.png",
    axis: "horizontal",
    mirrored: "false",
    summary:
      "Recomendação: sente mais atrás. O sol direto aparece mais forte na parte da frente do ônibus.",
  },
  {
    area: "neutral",
    advice: {
      mode: "neutralComputed",
      directSunExposure: "overhead",
    },
    artwork: "/images/advice-bus-neutral.png",
    axis: "vertical",
    mirrored: "false",
    summary: "O sol está alto; não há lado melhor agora.",
  },
];

describe("AdviceBusDiagram", () => {
  test("keeps the entry motif abstract instead of showing a full recommendation diagram", () => {
    render(<BusSplitDiagram />);

    expect(screen.getByLabelText(/sinal visual abstrato/i)).toBeInTheDocument();
    expect(screen.getByTestId("entry-bus-motif")).toHaveAttribute(
      "data-diagram-abstraction",
      "abstract-hint"
    );
    expect(screen.getByTestId("entry-bus-motif")).toHaveAttribute(
      "data-diagram-layout",
      "top-down-bus"
    );
    expect(screen.queryByText("Sente aqui")).not.toBeInTheDocument();
    expect(screen.queryByText("sol direto")).not.toBeInTheDocument();
    expect(screen.queryByText("esquerda")).not.toBeInTheDocument();
    expect(screen.queryByText("direita")).not.toBeInTheDocument();
  });

  test.each(diagramCases)(
    "renders the $area orientation artwork and semantic proof",
    ({ advice, area, artwork, axis, mirrored, summary }) => {
      render(<AdviceBusDiagram advice={advice} summary={summary} />);

      const proof = screen.getByTestId("bus-shell");
      const renderedArtwork = within(proof).getByTestId("advice-bus-artwork");

      expect(screen.getByLabelText(summary)).toBeInTheDocument();
      expect(proof).toHaveAttribute("data-advice-area", area);
      expect(proof).toHaveAttribute("data-proof-axis", axis);
      expect(proof).toHaveTextContent(/frente/i);
      expect(renderedArtwork).toHaveAttribute("src", artwork);
      expect(renderedArtwork).toHaveAttribute(
        "data-artwork-mirrored",
        mirrored
      );
      expect(renderedArtwork).toHaveAttribute("data-artwork-size", "250");

      if (area === "neutral") {
        expect(proof).toHaveTextContent("−");
        expect(within(proof).getAllByText("Sem preferência")).toHaveLength(2);
      } else {
        expect(proof).toHaveTextContent("✓");
        expect(proof).toHaveTextContent("☀");
        expect(within(proof).getByText("Sente aqui")).toBeInTheDocument();
        expect(within(proof).getByText("Sol direto")).toBeInTheDocument();
      }
    }
  );

  test.each(
    diagramCases.filter(({ area }) => area === "front" || area === "back")
  )(
    "keeps the five-row deck contract for $area advice",
    ({ advice, summary }) => {
      render(<AdviceBusDiagram advice={advice} summary={summary} />);

      const proof = screen.getByTestId("bus-shell");
      expect(proof).toHaveAttribute("data-seat-row-count", "5");
      expect(proof).toHaveAttribute("data-neutral-middle-row", "true");
    }
  );

  test("can render result screens with compact density", () => {
    render(
      <AdviceBusDiagram
        advice={leftAdvice}
        density="compact"
        summary="Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
      />
    );

    expect(screen.getByTestId("bus-shell")).toHaveAttribute(
      "data-diagram-density",
      "compact"
    );
  });
});
