import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Button } from "../src/components/Button";
import { ChoiceCard } from "../src/components/ChoiceCard";
import { Notice } from "../src/components/Notice";
import { RouteSummaryCard } from "../src/components/RouteSummaryCard";
import { TextField } from "../src/components/TextField";

describe("design-system primitives", () => {
  test("button preserves the existing primary and secondary API", async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    render(
      <>
        <Button onClick={onPrimary}>Confirmar esta linha</Button>
        <Button onClick={onSecondary} variant="secondary">
          Trocar sentido
        </Button>
      </>
    );

    await user.click(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    );
    await user.click(screen.getByRole("button", { name: "Trocar sentido" }));

    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onSecondary).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Confirmar esta linha" })
    ).toHaveAttribute("type", "button");
  });

  test("choice cards expose accessible selection actions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ChoiceCard
        eyebrow="perto de você"
        label="124 TICEN - Lagoa"
        meta="450 m de você"
        onSelect={onSelect}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Selecionar 124 TICEN - Lagoa" })
    );

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.getByText("perto de você")).toBeInTheDocument();
    expect(screen.getByText("450 m de você")).toBeInTheDocument();
  });

  test("notice supports status messaging without hiding its title", () => {
    render(
      <Notice title="Mapa indisponível" tone="warning">
        Ainda é possível confirmar pela linha e pelo sentido.
      </Notice>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Mapa indisponível");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ainda é possível confirmar pela linha e pelo sentido."
    );
  });

  test("text field keeps a visible label and controlled value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TextField
        label="Linha"
        onChange={onChange}
        placeholder="124 ou Lagoa"
        type="search"
        value="124"
      />
    );

    const input = screen.getByRole("searchbox", { name: "Linha" });
    await user.type(input, "5");

    expect(input).toHaveValue("124");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText("Linha")).toBeInTheDocument();
  });
});

describe("Sombreado route components", () => {
  test("route summary card keeps route and direction readable", () => {
    render(
      <RouteSummaryCard
        directionLabel="Lagoa para TICEN"
        label="Linha escolhida"
        routeCode="124"
        routeName="TICEN - Lagoa"
      />
    );

    expect(screen.getByText("Linha escolhida")).toBeInTheDocument();
    expect(screen.getByText("124")).toBeInTheDocument();
    expect(screen.getByText("TICEN - Lagoa")).toBeInTheDocument();
    expect(screen.getByText("Lagoa para TICEN")).toBeInTheDocument();
  });
});
