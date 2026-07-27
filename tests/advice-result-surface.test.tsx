import { render, screen, within } from "@testing-library/react";
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

  test("refreshes advice and keeps a direct route-change action", async () => {
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
    await user.click(screen.getByRole("button", { name: "Trocar linha" }));

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onChangeRoute).toHaveBeenCalledOnce();
    expect(screen.getByTestId("advice-result-actions")).toBeInTheDocument();
  });
});
