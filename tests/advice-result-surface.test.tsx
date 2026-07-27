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
      "Esse lado tende a pegar menos sol direto no ponto estimado da linha.",
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
          directionLabel="Ida"
          onChangeRoute={vi.fn()}
          onRefresh={vi.fn()}
          route={route}
        />
      );

      expect(screen.getByTestId("advice-result-screen")).toBeInTheDocument();
      const routeReceipt = screen.getByTestId("advice-route-receipt");
      expect(routeReceipt).toHaveTextContent("124");
      expect(routeReceipt).toHaveTextContent("TICEN - Lagoa");
      expect(routeReceipt).toHaveTextContent("sentido Ida");
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
        "Estimativa pela incidência de sol. Pode variar no caminho."
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
        "Estimativa pela incidência de sol. Pode variar no caminho."
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
