import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AdviceBusDiagram } from "../src/components/AdviceBusDiagram";
import type { UiAdviceState } from "../src/domain/types";

const leftAdvice: Exclude<UiAdviceState, { mode: "withheld" }> = {
  mode: "onboard",
  directSunExposure: "right",
  recommendedSeatArea: "left",
};

describe("AdviceBusDiagram", () => {
  test("renders a city-bus pictogram with front, wheel, aisle, and side split cues", () => {
    render(
      <AdviceBusDiagram
        advice={leftAdvice}
        summary="Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
      />
    );

    expect(
      screen.getByLabelText(
        "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("frente")).toBeInTheDocument();
    expect(screen.getByText("esquerda")).toBeInTheDocument();
    expect(screen.getByText("direita")).toBeInTheDocument();
    expect(screen.getByText("corredor")).toBeInTheDocument();
    expect(screen.getByText("Sente aqui")).toBeInTheDocument();
    expect(screen.getByText("sol direto")).toBeInTheDocument();
    expect(screen.getByTestId("bus-shell")).toHaveAttribute(
      "data-diagram-shape",
      "transit-pictogram-bus"
    );
    expect(screen.getByTestId("bus-wheels")).toBeInTheDocument();
    expect(screen.getByTestId("bus-windshield")).toBeInTheDocument();
  });

  test("neutral advice does not show a recommended-side callout", () => {
    render(
      <AdviceBusDiagram
        advice={{
          mode: "neutralComputed",
          directSunExposure: "overhead",
        }}
        summary="Diagrama neutro do ônibus. Nenhum lado do ônibus aparece como melhor área agora."
      />
    );

    expect(screen.queryByText("Sente aqui")).not.toBeInTheDocument();
    expect(screen.getAllByText("sem destaque")).toHaveLength(2);
  });

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
