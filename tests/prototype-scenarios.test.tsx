import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import PrototypePage from "../app/prototype/page";
import { HomePageApp } from "../src/app/HomePageApp";
import { prototypeScenarios } from "../src/mocks/scenarioStates";

const scenarioExpectations = [
  ["location-request", "De que lado sentar?"],
  ["location-finding-nearby", "Buscando linhas perto de você..."],
  ["location-slow-loading", "Ainda buscando..."],
  ["location-denied", "Localização desativada"],
  ["routes-nearby", "Escolha sua linha"],
  ["routes-none-nearby", "Não encontrei linhas perto de você"],
  ["manual-search", "Procurar linha"],
  ["manual-search-empty", "Nenhuma linha encontrada"],
  ["direction-choice", "Escolha o sentido"],
  ["direction-unavailable", "Não é possível confirmar o sentido"],
  ["confirmation", "Confirme sua linha"],
  ["confirmation-fallback", "Confirme sua linha"],
  ["advice-computing", "Calculando pelo sol direto..."],
  ["advice-onboard-left", "Sente à esquerda"],
  ["advice-onboard-right", "Melhor sentar à direita"],
  ["advice-onboard-front", "Prefira sentar mais à frente"],
  ["advice-onboard-back", "Prefira sentar mais atrás"],
  ["advice-neutral-overhead", "Sem lado melhor agora"],
  ["advice-neutral-none", "Sem sol direto relevante agora"],
  ["advice-preview", "Melhor sentar à direita"],
  ["advice-withheld", "Não é possível recomendar agora"],
  ["error-nearby-routes", "Algo deu errado"],
  ["error-manual-search", "Algo deu errado"],
  ["error-directions", "Algo deu errado"],
  ["error-geometry", "Algo deu errado"],
  ["error-advice", "Algo deu errado"],
] as const;

describe("prototype scenarios", () => {
  test.each(scenarioExpectations)(
    "renders %s",
    async (prototypeScenarioId, expectedHeading) => {
      render(<HomePageApp prototypeScenarioId={prototypeScenarioId} />);

      expect(
        await screen.findByRole("heading", { name: expectedHeading })
      ).toBeInTheDocument();
    }
  );

  test.each([
    [
      "location-request",
      "De que lado sentar?",
      "Usar minha localização",
      "Procurar linha manualmente",
    ],
    [
      "location-denied",
      "Localização desativada",
      "Procurar linha manualmente",
      "Tentar localização de novo",
    ],
    [
      "routes-none-nearby",
      "Não encontrei linhas perto de você",
      "Procurar linha manualmente",
      "Tentar localização de novo",
    ],
    [
      "manual-search-empty",
      "Nenhuma linha encontrada",
      "Buscar de novo",
      "Usar minha localização",
    ],
    [
      "direction-unavailable",
      "Não é possível confirmar o sentido",
      "Trocar linha",
      "Procurar linha manualmente",
    ],
    [
      "confirmation",
      "Confirme sua linha",
      "Confirmar esta linha",
      "Trocar sentido",
    ],
    [
      "confirmation-fallback",
      "Confirme sua linha",
      "Confirmar mesmo assim",
      "Trocar sentido",
    ],
    [
      "advice-withheld",
      "Não é possível recomendar agora",
      "Trocar linha",
      "Tentar de novo",
    ],
    [
      "error-nearby-routes",
      "Algo deu errado",
      "Tentar de novo",
      "Procurar linha manualmente",
    ],
    [
      "error-directions",
      "Algo deu errado",
      "Tentar de novo",
      "Procurar linha manualmente",
    ],
    [
      "error-geometry",
      "Algo deu errado",
      "Tentar de novo",
      "Procurar linha manualmente",
    ],
    [
      "error-advice",
      "Algo deu errado",
      "Tentar de novo",
      "Procurar linha manualmente",
    ],
  ] as const)(
    "renders contractual actions for %s",
    async (
      prototypeScenarioId,
      expectedHeading,
      primaryActionLabel,
      fallbackActionLabel
    ) => {
      render(<HomePageApp prototypeScenarioId={prototypeScenarioId} />);

      expect(
        await screen.findByRole("heading", { name: expectedHeading })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: primaryActionLabel })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: fallbackActionLabel })
      ).toBeInTheDocument();
    }
  );

  test("manual-search retry keeps the query and returns to the search results", async () => {
    const user = userEvent.setup();

    render(<HomePageApp prototypeScenarioId="error-manual-search" />);

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(
      await screen.findByRole("heading", { name: "Procurar linha" })
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Linha" })).toHaveValue(
      "lagoa"
    );
    expect(
      await screen.findByRole("button", {
        name: "Selecionar linha 124 TICEN - Lagoa",
      })
    ).toBeInTheDocument();
  });

  test("nearby retry returns to the route candidates", async () => {
    const user = userEvent.setup();

    render(<HomePageApp prototypeScenarioId="error-nearby-routes" />);

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(
      await screen.findByRole("heading", { name: "Escolha sua linha" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Selecionar linha 124 TICEN - Lagoa" })
    ).toBeInTheDocument();
  });

  test.each([
    ["error-geometry", "124 TICEN - Lagoa", "TICEN para Lagoa"],
    ["error-advice", "124 TICEN - Lagoa", "TICEN para Lagoa"],
  ] as const)(
    "preserves post-selection context in %s",
    async (prototypeScenarioId, routeLabel, directionLabel) => {
      render(<HomePageApp prototypeScenarioId={prototypeScenarioId} />);

      expect(await screen.findByText(routeLabel)).toBeInTheDocument();
      expect(screen.getByText(directionLabel)).toBeInTheDocument();
    }
  );

  test("slow loading remains inspectable until action and then returns to the nearby loading state", async () => {
    const user = userEvent.setup();

    render(<HomePageApp prototypeScenarioId="location-slow-loading" />);

    expect(
      await screen.findByRole("heading", { name: "Ainda buscando..." })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Continuar aguardando" })
    );
    expect(
      await screen.findByRole("heading", {
        name: "Buscando linhas perto de você...",
      })
    ).toBeInTheDocument();
  });

  test("scenario switcher reaches every mocked prototype state from the home route", async () => {
    const user = userEvent.setup();

    render(<PrototypePage />);

    const scenarioSelect = screen.getByRole("combobox", { name: "Protótipo" });
    const optionLabels = screen
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(optionLabels).toEqual(
      prototypeScenarios.map((scenario) => scenario.label)
    );

    for (const [prototypeScenarioId, expectedHeading] of scenarioExpectations) {
      await user.selectOptions(scenarioSelect, prototypeScenarioId);
      expect(
        await screen.findByRole("heading", { name: expectedHeading })
      ).toBeInTheDocument();
    }
  });
});
