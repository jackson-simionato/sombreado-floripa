import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AdviceBusDiagram } from "../src/components/AdviceBusDiagram";
import { BusSplitDiagram } from "../src/components/BusSplitDiagram";

describe("bus diagrams", () => {
  test("renders left/right advice as a tiny bus interior with a recommendation callout", () => {
    const { container } = render(
      <AdviceBusDiagram
        advice={{
          directSunExposure: "right",
          mode: "onboard",
          recommendedSeatArea: "left",
        }}
        summary="Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
      />
    );

    expect(
      screen.getByRole("figure", {
        name: "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.",
      })
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-diagram-layout='long-bus']")
    ).toBeTruthy();
    expect(
      container.querySelector("[data-diagram-size='result-focus']")
    ).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='front']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='seats']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='wheels']")).toBeTruthy();
    expect(
      container.querySelector("[data-diagram-cue='seat-rows']")
    ).toBeTruthy();
    expect(screen.getByText("Sente aqui")).toBeInTheDocument();
    expect(screen.getByText("sol direto")).toBeInTheDocument();
    expect(screen.getByText("esquerda")).toBeInTheDocument();
    expect(screen.getByText("direita")).toBeInTheDocument();
    expect(screen.queryByText("motorista")).not.toBeInTheDocument();
    expect(screen.queryByText("bancos")).not.toBeInTheDocument();
  });

  test("renders front/back advice with the same cabin language", () => {
    const { container } = render(
      <AdviceBusDiagram
        advice={{
          directSunExposure: "back",
          mode: "onboard",
          recommendedSeatArea: "front",
        }}
        summary="Recomendação: sente mais à frente. O sol direto aparece mais forte na parte de trás do ônibus."
      />
    );

    expect(
      container.querySelector("[data-diagram-layout='long-bus']")
    ).toBeTruthy();
    expect(
      container.querySelector("[data-diagram-size='result-focus']")
    ).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='front']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='seats']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='wheels']")).toBeTruthy();
    expect(
      container.querySelector("[data-diagram-cue='seat-rows']")
    ).toBeTruthy();
    expect(screen.getByText("Sente aqui")).toBeInTheDocument();
    expect(screen.getByText("sol direto")).toBeInTheDocument();
    expect(screen.getByText("frente")).toBeInTheDocument();
    expect(screen.getByText("trás")).toBeInTheDocument();
  });

  test("renders the entry diagram using the same bus interior signature", () => {
    const { container } = render(<BusSplitDiagram />);

    expect(
      container.querySelector("[data-diagram-layout='long-bus']")
    ).toBeTruthy();
    expect(container.querySelector("[data-diagram-size='entry']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='front']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='seats']")).toBeTruthy();
    expect(container.querySelector("[data-diagram-cue='wheels']")).toBeTruthy();
    expect(
      container.querySelector("[data-diagram-cue='seat-rows']")
    ).toBeTruthy();
    expect(screen.getByText("Sente aqui")).toBeInTheDocument();
    expect(screen.getByText("sol direto")).toBeInTheDocument();
    expect(screen.getByText("esquerda")).toBeInTheDocument();
    expect(screen.getByText("direita")).toBeInTheDocument();
    expect(screen.queryByText("motorista")).not.toBeInTheDocument();
    expect(screen.queryByText("bancos")).not.toBeInTheDocument();
  });
});
