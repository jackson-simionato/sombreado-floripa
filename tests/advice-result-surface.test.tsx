import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { AdviceResultSurface } from "../src/components/AdviceResultSurface";
import type { UiAdviceState } from "../src/domain/types";

const route = { code: "124", name: "TICEN - Lagoa" };

describe("AdviceResultSurface", () => {
  test.each([
    [
      "onboard advice",
      {
        mode: "onboard",
        directSunExposure: "right",
        recommendedSeatArea: "left",
      },
      "Agora no ônibus",
      "Sente à esquerda",
      "Esse lado deve pegar menos sol direto neste sentido.",
      "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.",
    ],
    [
      "preview advice",
      {
        mode: "preview",
        directSunExposure: "left",
        recommendedSeatArea: "right",
        previewSource: "estimated_route_point",
      },
      "Prévia da linha · ponto estimado",
      "Melhor sentar à direita",
      "Prévia, não orientação ao vivo. Menor incidência estimada neste ponto.",
      "Recomendação: sente à direita. O sol direto aparece do lado esquerdo do ônibus.",
    ],
    [
      "recent-location advice",
      {
        mode: "onboard",
        directSunExposure: "right",
        recommendedSeatArea: "left",
        freshnessNotice: "recentFallback",
      },
      "Última localização conhecida",
      "Sente à esquerda",
      "Esse lado deve pegar menos sol direto neste sentido.",
      "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.",
    ],
    [
      "neutral advice",
      {
        mode: "neutralComputed",
        directSunExposure: "overhead",
      },
      "Agora no ônibus",
      "Sem lado melhor agora",
      "O sol está alto e não há uma diferença relevante entre os lados.",
      "O sol está alto; não há lado melhor agora.",
    ],
    [
      "back advice",
      {
        mode: "onboard",
        directSunExposure: "front",
        recommendedSeatArea: "back",
      },
      "Agora no ônibus",
      "Prefira o fundo",
      "Parte de trás deve pegar menos sol direto neste sentido.",
      "Recomendação: sente mais atrás. O sol direto aparece mais forte na parte da frente do ônibus.",
    ],
  ] as const)(
    "renders route receipt, status, proof, and trust copy for %s",
    (_name, advice, status, title, body, accessibleSummary) => {
      render(
        <AdviceResultSurface
          advice={advice as Exclude<UiAdviceState, { mode: "withheld" }>}
          directionLabel="TICEN para Lagoa · Ida"
          onChangeRoute={vi.fn()}
          onRefresh={vi.fn()}
          route={route}
        />
      );

      expect(screen.getByTestId("advice-result-screen")).toBeInTheDocument();
      const routeReceipt = screen.getByTestId("advice-route-receipt");
      expect(routeReceipt).toHaveTextContent("124");
      expect(routeReceipt).toHaveTextContent("TICEN - Lagoa");
      expect(routeReceipt).toHaveTextContent("sentido TICEN para Lagoa · Ida");
      expect(screen.getByTestId("advice-result-header")).toHaveTextContent(
        status
      );
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByText(body)).toBeInTheDocument();
      expect(
        within(screen.getByTestId("advice-diagram-proof")).getByLabelText(
          accessibleSummary
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId("advice-trust-row")).toHaveTextContent(
        "Estimativa pela incidência de sol. Não considera prédios, nuvens, películas ou cortinas."
      );

      if (status === "Última localização conhecida") {
        expect(
          screen.getByText(
            "Usando sua última localização conhecida. Atualize quando estiver no ônibus."
          )
        ).toBeInTheDocument();
      }
    }
  );

  test("politely announces mounted and updated advice context without adding visible copy", () => {
    const { rerender } = render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        context="onboard"
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    const announcement = screen.getByRole("status");
    expect(announcement).toHaveTextContent(
      "Agora no ônibus. Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus."
    );
    expect(screen.getByTestId("advice-result-screen")).not.toContainElement(
      announcement
    );

    rerender(
      <AdviceResultSurface
        advice={{
          mode: "neutralComputed",
          directSunExposure: "overhead",
        }}
        context="preview"
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    expect(announcement).toHaveTextContent(
      "Prévia da linha · ponto estimado. O sol está alto; não há lado melhor agora."
    );
    expect(announcement).toHaveAttribute("aria-live", "polite");
    expect(announcement).toHaveAttribute("aria-atomic", "true");
  });

  test("uses the compact diagram contract for the no-scroll result hierarchy", () => {
    render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    expect(screen.getByTestId("advice-diagram-proof")).toHaveAttribute(
      "data-diagram-density",
      "compact"
    );
    expect(screen.getByTestId("bus-shell")).toHaveAttribute(
      "data-diagram-density",
      "compact"
    );
  });

  test("shows Agora, +15 min, and +30 min chips with Agora selected by default", () => {
    render(
      <AdviceResultSurface
        advice={{
          mode: "preview",
          directSunExposure: "left",
          recommendedSeatArea: "right",
          previewSource: "estimated_route_point",
        }}
        context="preview"
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        onSelectTimeOffset={vi.fn()}
        route={route}
      />
    );

    const chips = screen.getByRole("radiogroup", {
      name: "Horário da recomendação",
    });
    expect(within(chips).getByRole("radio", { name: "Agora" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(
      within(chips).getByRole("radio", { name: "+15 min" })
    ).toHaveAttribute("aria-checked", "false");
    expect(
      within(chips).getByRole("radio", { name: "+30 min" })
    ).toHaveAttribute("aria-checked", "false");
    expect(
      screen.queryByLabelText(/data|calendário|leave-at/i)
    ).not.toBeInTheDocument();
    expect(document.querySelector("input[type='date']")).toBeNull();
    expect(document.querySelector("input[type='datetime-local']")).toBeNull();
  });

  test("marks the selected time chip as active", () => {
    render(
      <AdviceResultSurface
        advice={{
          mode: "preview",
          directSunExposure: "left",
          recommendedSeatArea: "right",
          previewSource: "estimated_route_point",
        }}
        context="preview"
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        onSelectTimeOffset={vi.fn()}
        selectedTimeOffsetMinutes={30}
        route={route}
      />
    );

    expect(screen.getByRole("radio", { name: "+30 min" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: "Agora" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  test("selecting a time chip asks to recompute advice for that offset", async () => {
    const user = userEvent.setup();
    const onSelectTimeOffset = vi.fn();

    render(
      <AdviceResultSurface
        advice={{
          mode: "preview",
          directSunExposure: "left",
          recommendedSeatArea: "right",
          previewSource: "estimated_route_point",
        }}
        context="preview"
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        onSelectTimeOffset={onSelectTimeOffset}
        route={route}
      />
    );

    await user.click(screen.getByRole("radio", { name: "+15 min" }));

    expect(onSelectTimeOffset).toHaveBeenCalledExactlyOnceWith(15);
  });

  test("refreshes advice and keeps route changes behind options", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onChangeRoute = vi.fn();

    render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        onChangeRoute={onChangeRoute}
        onRefresh={onRefresh}
        route={route}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Atualizar localização" })
    );
    await user.click(screen.getByRole("button", { name: "Opções" }));
    await user.click(screen.getByRole("button", { name: /^Trocar linha/ }));

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onChangeRoute).toHaveBeenCalledOnce();
    expect(screen.getByTestId("advice-result-actions")).toBeInTheDocument();
  });

  test("focuses the estimate heading synchronously before isolating the result", () => {
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => 1);

    try {
      render(
        <AdviceResultSurface
          advice={{
            mode: "onboard",
            directSunExposure: "right",
            recommendedSeatArea: "left",
          }}
          onChangeRoute={vi.fn()}
          onRefresh={vi.fn()}
          route={route}
        />
      );

      expect(screen.getByTestId("advice-trust-row")).toHaveTextContent(
        "Estimativa pela incidência de sol. Não considera prédios, nuvens, películas ou cortinas."
      );

      const trigger = screen.getByRole("button", {
        name: "Entenda a estimativa",
      });
      trigger.focus();
      fireEvent.click(trigger);

      expect(
        screen.getByRole("heading", { name: "Sobre esta estimativa" })
      ).toHaveFocus();
      expect(screen.getByTestId("advice-result-background")).toHaveAttribute(
        "inert"
      );
    } finally {
      requestAnimationFrame.mockRestore();
    }
  });

  test.each([
    [
      "onboard",
      {
        mode: "onboard",
        directSunExposure: "right",
        recommendedSeatArea: "left",
      },
      "onboard",
      "Comparamos o sentido da linha, sua localização atual e a posição do sol para indicar a área com menor incidência de sol.",
    ],
    [
      "preview",
      {
        mode: "preview",
        directSunExposure: "left",
        recommendedSeatArea: "right",
        previewSource: "estimated_route_point",
        distanceFromRouteMeters: 280,
      },
      "preview",
      "Esta prévia usa um ponto estimado da linha, não sua localização ao vivo. Comparamos esse ponto, o sentido da linha e a posição do sol.",
    ],
    [
      "recent",
      {
        mode: "onboard",
        directSunExposure: "right",
        recommendedSeatArea: "left",
        freshnessNotice: "recentFallback",
      },
      "recent",
      "Usamos sua última localização conhecida, que pode estar desatualizada. Comparamos essa posição, o sentido da linha e a posição do sol.",
    ],
  ] as const)(
    "opens estimate-sheet copy for %s advice without claiming the wrong location",
    async (_name, advice, context, opening) => {
      const user = userEvent.setup();

      render(
        <AdviceResultSurface
          advice={advice as Exclude<UiAdviceState, { mode: "withheld" }>}
          context={context}
          onChangeRoute={vi.fn()}
          onRefresh={vi.fn()}
          route={route}
        />
      );

      if (context === "preview") {
        expect(screen.getByTestId("advice-trust-row")).toHaveTextContent(
          "Cerca de 280 m fora da rota."
        );
      }

      await user.click(
        screen.getByRole("button", { name: "Entenda a estimativa" })
      );

      expect(screen.getByText(opening)).toBeInTheDocument();
      if (context !== "onboard") {
        expect(
          screen.queryByText(
            "Comparamos o sentido da linha, sua localização atual e a posição do sol para indicar a área com menor incidência de sol."
          )
        ).not.toBeInTheDocument();
      }
    }
  );

  test("isolates the result and traps focus while an estimate sheet is open", async () => {
    const user = userEvent.setup();

    render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Entenda a estimativa" })
    );

    const background = screen.getByTestId("advice-result-background");
    expect(background).toHaveAttribute("inert");
    expect(background).toHaveAttribute("aria-hidden", "true");

    const dialog = screen.getByRole("dialog", {
      name: "Sobre esta estimativa",
    });
    const close = within(dialog).getByRole("button", { name: "Fechar" });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("heading", { name: "Sobre esta estimativa" })
      ).toHaveFocus()
    );

    close.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(close).toHaveFocus();
  });

  test("closes the estimate sheet from Escape or its backdrop and restores the trigger", async () => {
    const user = userEvent.setup();

    render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    const trigger = screen.getByRole("button", {
      name: "Entenda a estimativa",
    });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Fechar painel" }));

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("runs real direction and route changes from the options sheet", async () => {
    const user = userEvent.setup();
    const onChangeDirection = vi.fn();
    const onChangeRoute = vi.fn();

    render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        onChangeDirection={onChangeDirection}
        onChangeRoute={onChangeRoute}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    await user.click(screen.getByRole("button", { name: "Opções" }));
    await user.click(screen.getByRole("button", { name: /^Trocar sentido/ }));
    expect(onChangeDirection).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Opções" }));
    await user.click(screen.getByRole("button", { name: /^Trocar linha/ }));
    expect(onChangeRoute).toHaveBeenCalledOnce();
  });

  test("cleans up document state when a sheet closes or the surface unmounts", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <AdviceResultSurface
        advice={{
          mode: "onboard",
          directSunExposure: "right",
          recommendedSeatArea: "left",
        }}
        onChangeRoute={vi.fn()}
        onRefresh={vi.fn()}
        route={route}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Entenda a estimativa" })
    );
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByTestId("advice-result-background")).not.toHaveAttribute(
      "aria-hidden"
    );
    expect(screen.getByTestId("advice-result-background")).not.toHaveAttribute(
      "inert"
    );

    await user.click(screen.getByRole("button", { name: "Opções" }));
    const background = screen.getByTestId("advice-result-background");
    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(background).not.toHaveAttribute("aria-hidden");
    expect(background).not.toHaveAttribute("inert");
  });
});
