import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { AdviceBusDiagram } from "./AdviceBusDiagram";
import { AdviceResultSheet } from "./AdviceResultSheet";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { RouteSummaryCard } from "./RouteSummaryCard";
import { ScreenHeader } from "./ScreenHeader";
import { StickyActions } from "./StickyActions";
import type { DirectionalExposure, UiAdviceState } from "../domain/types";

import styles from "./AdviceResultSurface.module.css";

type AdviceResultSurfaceProps = {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  context?: "onboard" | "preview" | "recent";
  directionLabel?: string;
  onChangeDirection?: () => void;
  onChangeRoute(): void;
  onRefresh(): void;
  route?: { code: string; name: string };
};

const ESTIMATE_NOTICE =
  "Estimativa pela incidência de sol. Não considera prédios, nuvens, películas ou cortinas.";
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AdviceResultSurface({
  advice,
  context,
  directionLabel,
  onChangeDirection,
  onChangeRoute,
  onRefresh,
  route,
}: AdviceResultSurfaceProps) {
  const variant = adviceVariantCopy(advice);
  const modeLabel = resultModeLabel(advice, context);
  const estimateContext = resolveEstimateContext(advice, context);
  const trustNotice = estimateNoticeCopy(advice);
  const [activeSheet, setActiveSheet] = useState<"estimate" | "options" | null>(
    null
  );
  const backgroundRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const sheetHeadingRef = useRef<HTMLHeadingElement>(null);
  const estimateTriggerRef = useRef<HTMLButtonElement>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLButtonElement | null>(null);

  const closeSheet = useCallback(() => {
    const trigger =
      activeSheet === "estimate"
        ? estimateTriggerRef.current
        : optionsTriggerRef.current;

    restoreFocusRef.current = trigger;
    setActiveSheet(null);
  }, [activeSheet]);

  useIsomorphicLayoutEffect(() => {
    if (activeSheet === null) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }

    const background = backgroundRef.current;
    const previousOverflow = document.body.style.overflow;

    sheetHeadingRef.current?.focus();
    if (background !== null) {
      background.inert = true;
      background.setAttribute("inert", "");
      background.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }

      if (event.key !== "Tab" || dialogRef.current === null) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusable.length === 0) {
        event.preventDefault();
        sheetHeadingRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === sheetHeadingRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (background !== null) {
        background.inert = false;
        background.removeAttribute("inert");
        background.removeAttribute("aria-hidden");
      }
    };
  }, [activeSheet, closeSheet]);

  const changeDirection = useCallback(() => {
    closeSheet();
    onChangeDirection?.();
  }, [closeSheet, onChangeDirection]);

  const changeRoute = useCallback(() => {
    closeSheet();
    onChangeRoute();
  }, [closeSheet, onChangeRoute]);

  return (
    <>
      <div ref={backgroundRef} data-testid="advice-result-background">
        <p
          aria-atomic="true"
          aria-live="polite"
          className={styles.srOnly}
          data-testid="advice-announcement"
          role="status"
        >
          {modeLabel}. {variant.accessibleSummary}
        </p>
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
                eyebrow={modeLabel}
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
              data-diagram-density="compact"
              data-result-focus="diagram"
              data-testid="advice-diagram-proof"
            >
              <AdviceBusDiagram
                advice={advice}
                density="compact"
                summary={variant.accessibleSummary}
              />
            </div>
            <div
              className={styles.estimateNotice}
              data-testid="advice-trust-row"
            >
              <p>{trustNotice}</p>
              <button
                ref={estimateTriggerRef}
                onClick={() => setActiveSheet("estimate")}
                type="button"
              >
                Entenda a estimativa
              </button>
            </div>
          </div>
        </section>
        <StickyActions>
          <div className={styles.actions} data-testid="advice-result-actions">
            <Button onClick={onRefresh}>Atualizar localização</Button>
            <button
              ref={optionsTriggerRef}
              className={styles.optionsAction}
              onClick={() => setActiveSheet("options")}
              type="button"
            >
              Opções
            </button>
          </div>
        </StickyActions>
      </div>
      {activeSheet !== null ? (
        <AdviceResultSheet
          context={estimateContext}
          dialogRef={dialogRef}
          headingRef={sheetHeadingRef}
          kind={activeSheet}
          onChangeDirection={
            onChangeDirection === undefined ? undefined : changeDirection
          }
          onChangeRoute={changeRoute}
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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
  advice: Exclude<UiAdviceState, { mode: "withheld" }>,
  context?: AdviceResultSurfaceProps["context"]
): string {
  if (context === "preview" || advice.mode === "preview") {
    return "Prévia da linha · ponto estimado";
  }
  if (context === "recent" || advice.freshnessNotice === "recentFallback") {
    return "Última localização conhecida";
  }

  return "Agora no ônibus";
}

function resolveEstimateContext(
  advice: Exclude<UiAdviceState, { mode: "withheld" }>,
  context?: AdviceResultSurfaceProps["context"]
): NonNullable<AdviceResultSurfaceProps["context"]> {
  if (context === "preview" || advice.mode === "preview") {
    return "preview";
  }
  if (context === "recent" || advice.freshnessNotice === "recentFallback") {
    return "recent";
  }

  return "onboard";
}

function estimateNoticeCopy(
  advice: Exclude<UiAdviceState, { mode: "withheld" }>
): string {
  if (
    advice.mode === "preview" &&
    advice.distanceFromRouteMeters !== undefined
  ) {
    return `Cerca de ${Math.round(advice.distanceFromRouteMeters)} m fora da rota. ${ESTIMATE_NOTICE}`;
  }

  return ESTIMATE_NOTICE;
}

function directionalAdviceCopy(recommendedSeatArea: DirectionalExposure) {
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
        title: "Prefira o fundo",
        body: "Parte de trás deve pegar menos sol direto neste sentido.",
        accessibleSummary:
          "Recomendação: sente mais atrás. O sol direto aparece mais forte na parte da frente do ônibus.",
      };
  }
}

function previewDirectionalAdviceCopy(
  recommendedSeatArea: DirectionalExposure
) {
  const copy = directionalAdviceCopy(recommendedSeatArea);

  return {
    ...copy,
    body: "Prévia, não orientação ao vivo. Menor incidência estimada neste ponto.",
  };
}
