import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { AdviceLedgerPrototype } from "../src/prototypes/advice-ledger/AdviceLedgerPrototype";

beforeEach(() => {
  window.history.replaceState({}, "", "/prototype/advice-ledger");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("AdviceLedgerPrototype", () => {
  test("uses the flat side artwork and incidence language for a left recommendation", async () => {
    render(<AdviceLedgerPrototype />);

    await waitFor(() =>
      expect(screen.getByTestId("advice-screen")).toBeInTheDocument()
    );

    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "src",
      "/images/advice-bus-side.png"
    );
    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "data-artwork-mirrored",
      "false"
    );
    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "data-artwork-size",
      "250"
    );
    expect(screen.getByText("Maior incidência")).toBeInTheDocument();
    expect(
      screen.getByText("Este lado tende a ter menor incidência de sol.")
    ).toBeInTheDocument();
  });

  test("mirrors the side artwork when the recommendation moves right", async () => {
    const user = userEvent.setup();
    render(<AdviceLedgerPrototype />);

    await user.click(
      await screen.findByRole("button", { name: "Direita", pressed: false })
    );

    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "src",
      "/images/advice-bus-side.png"
    );
    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "data-artwork-mirrored",
      "true"
    );
    expect(
      screen.getByLabelText(
        "Recomendação: sente à direita. A maior incidência de sol aparece do lado esquerdo do ônibus."
      )
    ).toBeInTheDocument();
  });

  test("uses explicit front, back, and neutral artwork variants", async () => {
    const user = userEvent.setup();
    render(<AdviceLedgerPrototype />);

    await user.click(
      await screen.findByRole("button", { name: "Frente", pressed: false })
    );
    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "src",
      "/images/advice-bus-front.png"
    );

    await user.click(
      screen.getByRole("button", { name: "Trás", pressed: false })
    );
    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "src",
      "/images/advice-bus-back.png"
    );

    await user.click(
      screen.getByRole("button", { name: "Neutro", pressed: false })
    );
    expect(screen.getByTestId("advice-bus-artwork")).toHaveAttribute(
      "src",
      "/images/advice-bus-neutral.png"
    );
    expect(screen.queryByText("Sente aqui")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sem preferência")).toHaveLength(2);
  });

  test("uses horizontal color bands for front and back advice", async () => {
    const user = userEvent.setup();
    render(<AdviceLedgerPrototype />);

    expect(screen.getByTestId("signature-proof")).toHaveAttribute(
      "data-proof-axis",
      "vertical"
    );

    await user.click(
      await screen.findByRole("button", { name: "Frente", pressed: false })
    );
    expect(screen.getByTestId("signature-proof")).toHaveAttribute(
      "data-proof-axis",
      "horizontal"
    );

    await user.click(
      screen.getByRole("button", { name: "Trás", pressed: false })
    );
    expect(screen.getByTestId("signature-proof")).toHaveAttribute(
      "data-proof-axis",
      "horizontal"
    );
  });
});
