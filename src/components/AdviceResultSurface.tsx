import { AdviceBusDiagram } from "./AdviceBusDiagram";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { RouteSummaryCard } from "./RouteSummaryCard";
import { ScreenHeader } from "./ScreenHeader";
import { StickyActions } from "./StickyActions";
import type { UiAdviceState } from "../domain/types";

import styles from "./AdviceResultSurface.module.css";

type AdviceResultSurfaceProps = {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  directionLabel?: string;
  onChangeDirection?(): void;
  onChangeRoute(): void;
  onRefresh(): void;
  route?: { code: string; name: string };
};

const ESTIMATE_NOTICE =
  "Estimativa pela incidência de sol. Pode variar no caminho.";

export function AdviceResultSurface({
  advice,
  directionLabel,
  onChangeRoute,
  onRefresh,
  route,
}: AdviceResultSurfaceProps) {
  const variant = adviceVariantCopy(advice);

  return (
    <>
      <section
        className={styles.resultStack}
        data-testid="advice-result-screen"
        aria-labelledby="screen-title"
      >
        <p className={styles.progress}>4 de 4</p>
        {route !== undefined ? (
          <div data-testid="advice-route-receipt">
            <RouteSummaryCard
              directionLabel={
                directionLabel !== undefined
                  ? `sentido ${directionLabel}`
                  : undefined
              }
              routeCode={route.code}
              routeName={route.name}
            />
          </div>
        ) : null}
        <div className={styles.recommendationPanel}>
          <div data-testid="advice-result-header">
            <ScreenHeader
              body={variant.body}
              eyebrow={resultModeLabel(advice)}
              title={variant.title}
              variant="result"
            />
          </div>
          {advice.mode !== "preview" &&
          advice.freshnessNotice === "recentFallback" ? (
            <Notice>
              Usando sua última localização conhecida. Atualize quando estiver
              no ônibus.
            </Notice>
          ) : null}
          <div
            className={styles.diagramFocus}
            data-result-focus="diagram"
            data-testid="advice-diagram-proof"
          >
            <AdviceBusDiagram
              advice={advice}
              summary={variant.accessibleSummary}
            />
          </div>
          <p className={styles.estimateNotice} data-testid="advice-trust-row">
            {ESTIMATE_NOTICE}
          </p>
        </div>
      </section>
      <StickyActions>
        <div className={styles.actions} data-testid="advice-result-actions">
          <Button onClick={onRefresh}>Atualizar localização</Button>
          <Button onClick={onChangeRoute} variant="secondary">
            Trocar linha
          </Button>
        </div>
      </StickyActions>
    </>
  );
}

function adviceVariantCopy(
  advice: Exclude<UiAdviceState, { mode: "withheld" }>
): {
  accessibleSummary: string;
  body: string;
  title: string;
} {
  if (advice.mode === "preview") {
    return previewDirectionalAdviceCopy(advice.recommendedSeatArea);
  }

  if (advice.mode === "neutralComputed") {
    if (advice.directSunExposure === "overhead") {
      return {
        title: "Sem lado melhor agora",
        body: "O sol está alto e não há uma diferença relevante entre os lados.",
        accessibleSummary: "O sol está alto; não há lado melhor agora.",
      };
    }

    return {
      title: "Sem sol direto relevante agora",
      body: "Não há sol direto suficiente para recomendar uma lateral neste trecho.",
      accessibleSummary:
        "Diagrama neutro do ônibus. Nenhum lado do ônibus aparece como melhor área agora.",
    };
  }

  return directionalAdviceCopy(advice.recommendedSeatArea);
}

function resultModeLabel(
  advice: Exclude<UiAdviceState, { mode: "withheld" }>
): string {
  if (advice.mode === "preview") return "Prévia da linha · ponto estimado";
  if (advice.freshnessNotice === "recentFallback") {
    return "Última localização conhecida";
  }

  return "Agora no ônibus";
}

function directionalAdviceCopy(
  recommendedSeatArea: "left" | "right" | "front" | "back"
) {
  switch (recommendedSeatArea) {
    case "left":
      return {
        title: "Sente à esquerda",
        body: "Esse lado deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente à esquerda. O sol direto aparece do lado direito do ônibus.",
      };
    case "right":
      return {
        title: "Melhor sentar à direita",
        body: "Esse lado deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente à direita. O sol direto aparece do lado esquerdo do ônibus.",
      };
    case "front":
      return {
        title: "Prefira sentar mais à frente",
        body: "Parte da frente deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente mais à frente. O sol direto aparece mais forte na parte de trás do ônibus.",
      };
    case "back":
      return {
        title: "Prefira sentar mais atrás",
        body: "Parte de trás deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente mais atrás. O sol direto aparece mais forte na parte da frente do ônibus.",
      };
  }
}

function previewDirectionalAdviceCopy(
  recommendedSeatArea: "left" | "right" | "front" | "back"
) {
  const copy = directionalAdviceCopy(recommendedSeatArea);

  return {
    ...copy,
    body:
      recommendedSeatArea === "front" || recommendedSeatArea === "back"
        ? "Essa parte tende a pegar menos sol direto no ponto estimado da linha."
        : "Esse lado tende a pegar menos sol direto no ponto estimado da linha.",
  };
}
