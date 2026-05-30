import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import HomePage from "../app/page";
import { HomePageApp } from "../src/app/HomePageApp";

describe("home screen flow", () => {
  test("runs the nearby route flow through final onboard advice", async () => {
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

    expect(await screen.findByRole("heading", { name: "Sente à esquerda" })).toBeInTheDocument();
    expect(screen.getByText("4 de 4")).toBeInTheDocument();
    expect(screen.getByText("Agora no ônibus")).toBeInTheDocument();
    expect(screen.getByText("Estimativa pelo sol direto. Pode variar no caminho.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar localização" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Recomendação: sente à esquerda/i)).toBeInTheDocument();
  });

  test("shows computing state before advice when advisory mock is delayed", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="computing-advice" />);

    await completeNearbyFlow(user);
    await user.click(screen.getByRole("button", { name: "Confirmar esta linha" }));

    expect(await screen.findByRole("heading", { name: "Calculando pelo sol direto..." })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Sente à esquerda" })).toBeInTheDocument();
  });

  test("runs manual flow through missing-geometry fallback into final advice", async () => {
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

    expect(await screen.findByRole("heading", { name: "Sente à esquerda" })).toBeInTheDocument();
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

  test("renders preview advice as lightweight distinct result", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="advice-preview-left" />);

    await completeNearbyFlow(user);
    await user.click(screen.getByRole("button", { name: "Confirmar esta linha" }));

    expect(await screen.findByText("Prévia da linha")).toBeInTheDocument();
    expect(screen.getByText("Prévia")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Melhor sentar à direita" })).toBeInTheDocument();
    expect(screen.getByText(/Prévia estimada para linha confirmada/i)).toBeInTheDocument();
  });

  test.each([
    ["advice-exposure-front-recommends-back", "Prefira sentar mais atrás", /sente mais atrás/i],
    ["advice-exposure-back-recommends-front", "Prefira sentar mais à frente", /sente mais à frente/i]
  ] as const)("renders %s without left-right seat copy", async (scenarioId, heading, summaryLabel) => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId={scenarioId} />);

    await completeNearbyFlow(user);
    await user.click(screen.getByRole("button", { name: "Confirmar esta linha" }));

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("Sente à esquerda")).not.toBeInTheDocument();
    expect(screen.queryByText("Melhor sentar à direita")).not.toBeInTheDocument();
    expect(screen.getByLabelText(summaryLabel)).toBeInTheDocument();
  });

  test.each([
    ["advice-neutral-overhead", "Sem lado melhor agora"],
    ["advice-neutral-none", "Sem sol direto relevante agora"]
  ] as const)("renders %s as neutral result without claiming best side", async (scenarioId, heading) => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId={scenarioId} />);

    await completeNearbyFlow(user);
    await user.click(screen.getByRole("button", { name: "Confirmar esta linha" }));

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("Sente à esquerda")).not.toBeInTheDocument();
    expect(screen.queryByText("Melhor sentar à direita")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Diagrama neutro do ônibus/i)).toBeInTheDocument();
  });

  test("renders withheld state without progress and with retry actions", async () => {
    const user = userEvent.setup();

    render(<HomePageApp scenarioId="advice-withheld" />);

    await completeNearbyFlow(user);
    await user.click(screen.getByRole("button", { name: "Confirmar esta linha" }));

    expect(await screen.findByRole("heading", { name: "Não é possível recomendar agora" })).toBeInTheDocument();
    expect(screen.queryByText("4 de 4")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar linha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  test("shows the prototype scenario switcher on the page and can jump to the slow loading state", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    const scenarioSelect = screen.getByRole("combobox", { name: "Protótipo" });
    await user.selectOptions(scenarioSelect, "location-slow-loading");

    expect(await screen.findByRole("heading", { name: "Ainda buscando..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar aguardando" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Procurar linha manualmente" })).toBeInTheDocument();
  });

  test("uses location as the fallback action for manual-search API errors", async () => {
    const user = userEvent.setup();

    render(<HomePage />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Protótipo" }), "error-manual-search");

    expect(await screen.findByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar minha localização" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Procurar linha manualmente" })).not.toBeInTheDocument();
  });
});

async function completeNearbyFlow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Usar minha localização" }));
  await user.click(await screen.findByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" }));
  await user.click(await screen.findByRole("button", { name: "Selecionar sentido TICEN para Lagoa" }));
  await screen.findByRole("heading", { name: "Confirme sua linha" });
}
