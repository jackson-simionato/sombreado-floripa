import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import HomePage from "../app/page";
import { HomePageApp } from "../src/app/HomePageApp";

describe("home screen flow", () => {
  test("runs the nearby route flow through direction choice and route confirmation", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Usar minha localização" }));

    expect(await screen.findByRole("heading", { name: "Escolha sua linha" })).toBeInTheDocument();
    expect(screen.getByText("1 de 4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Selecionar sentido/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" }));

    expect(await screen.findByRole("heading", { name: "Escolha o sentido" })).toBeInTheDocument();
    expect(screen.getByText("2 de 4")).toBeInTheDocument();
    expect(screen.getByText("124 TICEN - Lagoa")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Selecionar sentido TICEN para Lagoa" }));

    expect(await screen.findByRole("heading", { name: "Confirme sua linha" })).toBeInTheDocument();
    expect(screen.getByText("3 de 4")).toBeInTheDocument();
    expect(screen.getByText("Confira se a linha e o sentido combinam com o ônibus.")).toBeInTheDocument();
    expect(screen.getByLabelText("Trajeto esquemático da linha selecionada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar esta linha" }));

    expect(await screen.findByRole("heading", { name: "Calculando pelo sol direto..." })).toBeInTheDocument();
  });

  test("runs the manual search flow through missing-geometry fallback and computing advice", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Procurar linha manualmente" }));

    expect(await screen.findByRole("heading", { name: "Procurar linha" })).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", { name: "Linha" });
    await user.type(searchInput, "888");

    const results = await screen.findByRole("list", { name: "Resultados da busca de linhas" });
    expect(within(results).getByRole("button", { name: "Selecionar linha 888 Lagoa - Trindade" })).toBeInTheDocument();

    await user.click(within(results).getByRole("button", { name: "Selecionar linha 888 Lagoa - Trindade" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar sentido Lagoa para Trindade" }));

    expect(await screen.findByText("Mapa indisponível")).toBeInTheDocument();
    expect(screen.getByText("Ainda é possível confirmar pela linha e pelo sentido.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar mesmo assim" }));

    expect(await screen.findByRole("heading", { name: "Calculando pelo sol direto..." })).toBeInTheDocument();
  });

  test("returns to the correct source when changing route", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Procurar linha manualmente" }));
    await user.type(await screen.findByRole("searchbox", { name: "Linha" }), "lagoa");
    await user.click(await screen.findByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" }));

    expect(await screen.findByRole("heading", { name: "Escolha o sentido" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar linha" }));

    expect(await screen.findByRole("heading", { name: "Procurar linha" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Linha" })).toHaveValue("lagoa");
    expect(screen.getByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Usar minha localização" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" }));

    expect(await screen.findByRole("heading", { name: "Escolha o sentido" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar linha" }));

    expect(await screen.findByRole("heading", { name: "Escolha sua linha" })).toBeInTheDocument();
  });

  test("keeps the selected route when changing direction from confirmation", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Usar minha localização" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar sentido TICEN para Lagoa" }));

    expect(await screen.findByRole("heading", { name: "Confirme sua linha" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trocar sentido" }));

    expect(await screen.findByRole("heading", { name: "Escolha o sentido" })).toBeInTheDocument();
    expect(screen.getByText("124 TICEN - Lagoa")).toBeInTheDocument();
  });

  test("uses the fallback confirmation when map availability is disabled by test options", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="confirmation-fallback-map-unavailable" />);

    await user.click(screen.getByRole("button", { name: "Usar minha localização" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar sentido TICEN para Lagoa" }));

    expect(await screen.findByText("Mapa indisponível")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar mesmo assim" })).toBeInTheDocument();
  });
});
