"use client";

import type { CSSProperties, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CaretUp } from "@phosphor-icons/react/CaretUp";
import { Check } from "@phosphor-icons/react/Check";
import { DoorOpen } from "@phosphor-icons/react/DoorOpen";
import { Info } from "@phosphor-icons/react/Info";
import { Minus } from "@phosphor-icons/react/Minus";
import { Sun } from "@phosphor-icons/react/Sun";

import { RouteCodeBadge } from "../../components/RouteCodeBadge";

import styles from "./AdviceLedgerPrototype.module.css";

type AdviceArea = "left" | "right" | "front" | "back" | "neutral";
type AdviceContext = "onboard" | "preview" | "recent";
type OpenSheet = "estimate" | "options" | null;
type LedgerTone = "recommended" | "sunny" | "neutral";

type LedgerContent = {
  areaLabel: string;
  eyebrow: string;
  title: string;
  tone: LedgerTone;
  connectorY: string;
};

const AREA_OPTIONS: ReadonlyArray<{
  id: AdviceArea;
  label: string;
}> = [
  { id: "left", label: "Esquerda" },
  { id: "right", label: "Direita" },
  { id: "front", label: "Frente" },
  { id: "back", label: "Trás" },
  { id: "neutral", label: "Neutro" },
];

const CONTEXT_OPTIONS: ReadonlyArray<{
  id: AdviceContext;
  label: string;
}> = [
  { id: "onboard", label: "No ônibus" },
  { id: "preview", label: "Prévia" },
  { id: "recent", label: "Local recente" },
];

const AREA_COPY: Record<
  AdviceArea,
  {
    title: string;
    onboardBody: string;
    previewBody: string;
    recentBody: string;
    summary: string;
    orientation: string;
  }
> = {
  left: {
    title: "Sente à esquerda",
    onboardBody: "Este lado tende a ter menor incidência de sol.",
    previewBody:
      "Este lado tende a ter menor incidência de sol neste ponto estimado.",
    recentBody:
      "Pela última posição conhecida, este lado tende a ter menor incidência de sol.",
    summary:
      "Recomendação: sente à esquerda. A maior incidência de sol aparece do lado direito do ônibus.",
    orientation: "Ao entrar, escolha as janelas à sua esquerda.",
  },
  right: {
    title: "Sente à direita",
    onboardBody: "Este lado tende a ter menor incidência de sol.",
    previewBody:
      "Este lado tende a ter menor incidência de sol neste ponto estimado.",
    recentBody:
      "Pela última posição conhecida, este lado tende a ter menor incidência de sol.",
    summary:
      "Recomendação: sente à direita. A maior incidência de sol aparece do lado esquerdo do ônibus.",
    orientation: "Ao entrar, escolha as janelas à sua direita.",
  },
  front: {
    title: "Prefira a frente",
    onboardBody: "A parte da frente tende a ter menor incidência de sol.",
    previewBody:
      "A parte da frente tende a ter menor incidência de sol neste ponto estimado.",
    recentBody:
      "Pela última posição conhecida, a frente tende a ter menor incidência de sol.",
    summary:
      "Recomendação: sente mais à frente. A maior incidência de sol aparece na parte de trás do ônibus.",
    orientation: "Ao entrar, procure assentos na parte da frente.",
  },
  back: {
    title: "Prefira o fundo",
    onboardBody: "A parte de trás tende a ter menor incidência de sol.",
    previewBody:
      "A parte de trás tende a ter menor incidência de sol neste ponto estimado.",
    recentBody:
      "Pela última posição conhecida, a parte de trás tende a ter menor incidência de sol.",
    summary:
      "Recomendação: sente mais atrás. A maior incidência de sol aparece na parte da frente do ônibus.",
    orientation: "Ao entrar, siga para os assentos mais ao fundo.",
  },
  neutral: {
    title: "Sem lado melhor agora",
    onboardBody:
      "Nenhuma área melhora bastante a incidência de sol neste trecho.",
    previewBody:
      "Neste ponto estimado, nenhuma área aparece como claramente melhor.",
    recentBody:
      "Na última posição conhecida, nenhuma área aparece como claramente melhor.",
    summary:
      "Diagrama neutro do ônibus. Nenhuma área aparece como uma recomendação melhor agora.",
    orientation: "Escolha o assento mais confortável para você.",
  },
};

const CONTEXT_COPY: Record<
  AdviceContext,
  {
    estimateOpening: string;
    status: string;
  }
> = {
  onboard: {
    status: "Agora no ônibus",
    estimateOpening:
      "Comparamos o sentido da linha, sua localização atual e a posição do sol para indicar a área com menor incidência de sol.",
  },
  preview: {
    status: "Prévia da linha · ponto estimado",
    estimateOpening:
      "Esta prévia usa um ponto estimado da linha, não sua localização ao vivo. Comparamos esse ponto, o sentido da linha e a posição do sol.",
  },
  recent: {
    status: "Última localização conhecida",
    estimateOpening:
      "Usamos sua última localização conhecida, que pode estar desatualizada. Comparamos essa posição, o sentido da linha e a posição do sol.",
  },
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const ARTWORK_BY_AREA: Record<AdviceArea, string> = {
  back: "/images/advice-bus-back.png",
  front: "/images/advice-bus-front.png",
  left: "/images/advice-bus-side.png",
  neutral: "/images/advice-bus-neutral.png",
  right: "/images/advice-bus-side.png",
};

const BUS_ARTWORK_SIZE = 250;

export function AdviceLedgerPrototype() {
  const [area, setArea] = useState<AdviceArea>("left");
  const [context, setContext] = useState<AdviceContext>("onboard");
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [isReady, setIsReady] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const backgroundRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);
  const estimateTriggerRef = useRef<HTMLButtonElement>(null);
  const optionsTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedArea = params.get("area");
    const requestedContext = params.get("context");

    if (isAdviceArea(requestedArea)) {
      setArea(requestedArea);
    }

    if (isAdviceContext(requestedContext)) {
      setContext(requestedContext);
    }

    setIsReady(true);
  }, []);

  const syncUrl = useCallback(
    (nextArea: AdviceArea, nextContext: AdviceContext) => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("area", nextArea);
      nextUrl.searchParams.set("context", nextContext);
      window.history.replaceState({}, "", nextUrl);
    },
    []
  );

  const chooseArea = useCallback(
    (nextArea: AdviceArea) => {
      setArea(nextArea);
      setActionMessage(`Estado alterado para ${labelForArea(nextArea)}.`);
      syncUrl(nextArea, context);
    },
    [context, syncUrl]
  );

  const chooseContext = useCallback(
    (nextContext: AdviceContext) => {
      setContext(nextContext);
      setActionMessage(
        `Contexto alterado para ${CONTEXT_COPY[nextContext].status}.`
      );
      syncUrl(area, nextContext);
    },
    [area, syncUrl]
  );

  const closeSheet = useCallback(() => {
    const trigger =
      openSheet === "estimate"
        ? estimateTriggerRef.current
        : optionsTriggerRef.current;

    setOpenSheet(null);
    window.requestAnimationFrame(() => trigger?.focus());
  }, [openSheet]);

  useEffect(() => {
    if (openSheet === null) {
      return;
    }

    const background = backgroundRef.current;
    const previousOverflow = document.body.style.overflow;

    if (background !== null) {
      background.inert = true;
      background.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(() => dialogHeadingRef.current?.focus());

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
        dialogHeadingRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogHeadingRef.current)
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
        background.removeAttribute("aria-hidden");
      }
    };
  }, [closeSheet, openSheet]);

  useEffect(() => {
    const handlePrototypeKeys = (event: KeyboardEvent) => {
      if (
        openSheet !== null ||
        (event.target instanceof HTMLElement &&
          event.target.matches("input, textarea, select, [contenteditable]"))
      ) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const currentIndex = AREA_OPTIONS.findIndex(
        (option) => option.id === area
      );
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + AREA_OPTIONS.length) % AREA_OPTIONS.length;
      chooseArea(AREA_OPTIONS[nextIndex].id);
    };

    document.addEventListener("keydown", handlePrototypeKeys);
    return () => document.removeEventListener("keydown", handlePrototypeKeys);
  }, [area, chooseArea, openSheet]);

  const copy = AREA_COPY[area];
  const ledgers = ledgerContentFor(area);

  return (
    <div
      className={styles.prototypePage}
      data-prototype-ready={isReady ? "true" : "false"}
    >
      <div ref={backgroundRef}>
        <main className={styles.adviceScreen} data-testid="advice-screen">
          <p className={styles.progress}>4 de 4</p>

          <section
            className={styles.routeReceipt}
            aria-label="Linha escolhida"
            data-testid="route-receipt"
          >
            <RouteCodeBadge code="124" />
            <div>
              <strong>TICEN – Lagoa</strong>
              <span>sentido Ida</span>
            </div>
          </section>

          <header className={styles.resultHeader} data-testid="result-header">
            <p>{CONTEXT_COPY[context].status}</p>
            <h1>{copy.title}</h1>
            <span>{bodyFor(area, context)}</span>
          </header>

          <SignatureProof
            area={area}
            ledgers={ledgers}
            orientation={copy.orientation}
            summary={copy.summary}
          />

          <section
            className={styles.trustRow}
            aria-label="Sobre a estimativa"
            data-testid="trust-row"
          >
            <Info aria-hidden="true" size={18} weight="regular" />
            <p>
              Estimativa pela incidência de sol.
              <span>Pode variar no caminho.</span>
            </p>
            <button
              ref={estimateTriggerRef}
              onClick={() => setOpenSheet("estimate")}
              type="button"
            >
              Entenda a estimativa
            </button>
          </section>

          <footer className={styles.actions} data-testid="result-actions">
            <button
              className={styles.primaryAction}
              onClick={() => {
                setActionMessage("Localização atualizada no protótipo.");
                chooseContext("onboard");
              }}
              type="button"
            >
              Atualizar localização
            </button>
            <button
              ref={optionsTriggerRef}
              className={styles.optionsAction}
              onClick={() => setOpenSheet("options")}
              type="button"
            >
              Opções
            </button>
          </footer>

          <p className={styles.srOnly} aria-live="polite" role="status">
            {actionMessage}
          </p>
        </main>

        <PrototypeControls
          area={area}
          context={context}
          onAreaChange={chooseArea}
          onContextChange={chooseContext}
        />
      </div>

      {openSheet !== null ? (
        <div className={styles.backdrop}>
          <button
            aria-label="Fechar painel"
            className={styles.backdropDismiss}
            onClick={closeSheet}
            tabIndex={-1}
            type="button"
          />
          <section
            ref={dialogRef}
            aria-labelledby="sheet-title"
            aria-modal="true"
            className={styles.sheet}
            role="dialog"
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            {openSheet === "estimate" ? (
              <EstimateSheet
                context={context}
                headingRef={dialogHeadingRef}
                onClose={closeSheet}
              />
            ) : (
              <OptionsSheet
                headingRef={dialogHeadingRef}
                onAction={(message) => {
                  setActionMessage(message);
                  closeSheet();
                }}
                onClose={closeSheet}
              />
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SignatureProof({
  area,
  ledgers,
  orientation,
  summary,
}: {
  area: AdviceArea;
  ledgers: [LedgerContent, LedgerContent];
  orientation: string;
  summary: string;
}) {
  return (
    <section
      className={styles.proof}
      data-advice-area={area}
      data-proof-axis={
        area === "front" || area === "back" ? "horizontal" : "vertical"
      }
      data-testid="signature-proof"
      aria-label="Diagrama de orientação do ônibus"
    >
      <p className={styles.frontLabel}>
        <CaretUp aria-hidden="true" size={12} weight="fill" />
        Frente
      </p>
      <div
        className={`${styles.proofGrid} ${
          area === "front" || area === "back"
            ? `${styles.deckProof} ${
                area === "front" ? styles.frontDeck : styles.backDeck
              }`
            : ""
        }`}
      >
        <Ledger content={ledgers[0]} side="left" />
        <AdviceBusArtwork area={area} summary={summary} />
        <Ledger content={ledgers[1]} side="right" />
      </div>
      <p className={styles.orientationCue}>
        <DoorOpen aria-hidden="true" size={16} weight="regular" />
        {orientation}
      </p>
    </section>
  );
}

function AdviceBusArtwork({
  area,
  summary,
}: {
  area: AdviceArea;
  summary: string;
}) {
  const isMirrored = area === "right";

  return (
    <figure
      aria-label={summary}
      className={styles.busArtworkFrame}
      data-testid="bus-shell"
    >
      {/* The side asset is intentionally mirrored for the right recommendation. */}
      <img
        alt=""
        aria-hidden="true"
        className={`${styles.busArtwork} ${
          isMirrored ? styles.busArtworkMirrored : ""
        }`}
        data-artwork-mirrored={isMirrored ? "true" : "false"}
        data-artwork-size={BUS_ARTWORK_SIZE}
        data-artwork-variant={area}
        data-testid="advice-bus-artwork"
        style={{ width: BUS_ARTWORK_SIZE }}
        src={ARTWORK_BY_AREA[area]}
      />
      <figcaption className={styles.srOnly}>{summary}</figcaption>
    </figure>
  );
}

function Ledger({
  content,
  side,
}: {
  content: LedgerContent;
  side: "left" | "right";
}) {
  const ledgerStyle = {
    "--connector-y": content.connectorY,
  } as CSSProperties;

  return (
    <div
      className={`${styles.ledger} ${styles[content.tone]}`}
      data-ledger-tone={content.tone}
      data-ledger-side={side}
      style={ledgerStyle}
    >
      <span className={styles.ledgerIcon} aria-hidden="true">
        {content.tone === "recommended" ? (
          <Check size={21} weight="bold" />
        ) : null}
        {content.tone === "sunny" ? <Sun size={21} weight="fill" /> : null}
        {content.tone === "neutral" ? <Minus size={21} weight="bold" /> : null}
      </span>
      <span>{content.eyebrow}</span>
      <strong>{content.title}</strong>
      <small>{content.areaLabel}</small>
    </div>
  );
}

function PrototypeControls({
  area,
  context,
  onAreaChange,
  onContextChange,
}: {
  area: AdviceArea;
  context: AdviceContext;
  onAreaChange(nextArea: AdviceArea): void;
  onContextChange(nextContext: AdviceContext): void;
}) {
  return (
    <aside
      className={styles.prototypeControls}
      aria-label="Estados do protótipo"
    >
      <p>
        <strong>Protótipo descartável</strong>
        <span>Use ← e → para alternar a área.</span>
      </p>
      <fieldset>
        <legend>Recomendação</legend>
        <div>
          {AREA_OPTIONS.map((option) => (
            <button
              aria-pressed={area === option.id}
              key={option.id}
              onClick={() => onAreaChange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Contexto</legend>
        <div>
          {CONTEXT_OPTIONS.map((option) => (
            <button
              aria-pressed={context === option.id}
              key={option.id}
              onClick={() => onContextChange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </aside>
  );
}

function EstimateSheet({
  context,
  headingRef,
  onClose,
}: {
  context: AdviceContext;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose(): void;
}) {
  return (
    <>
      <div className={styles.sheetHeading}>
        <div>
          <p>Como funciona</p>
          <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
            Sobre esta estimativa
          </h2>
        </div>
        <button onClick={onClose} type="button">
          Fechar
        </button>
      </div>
      <div className={styles.sheetBody}>
        <p>{CONTEXT_COPY[context].estimateOpening}</p>
        <p>
          Não consideramos prédios, nuvens, películas, cortinas nem diferenças
          de sombra entre veículos.
        </p>
        <p>
          Atualize a localização quando embarcar ou depois que o ônibus avançar
          no trajeto.
        </p>
      </div>
    </>
  );
}

function OptionsSheet({
  headingRef,
  onAction,
  onClose,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAction(message: string): void;
  onClose(): void;
}) {
  return (
    <>
      <div className={styles.sheetHeading}>
        <div>
          <p>Navegação</p>
          <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
            Outras opções
          </h2>
        </div>
        <button onClick={onClose} type="button">
          Fechar
        </button>
      </div>
      <div className={styles.optionList}>
        <button
          onClick={() =>
            onAction("O protótipo voltaria para a escolha de sentido.")
          }
          type="button"
        >
          <strong>Trocar sentido</strong>
          <span>Manter esta linha e escolher outro sentido.</span>
        </button>
        <button
          onClick={() =>
            onAction("O protótipo voltaria para a seleção de linhas.")
          }
          type="button"
        >
          <strong>Trocar linha</strong>
          <span>Voltar para a seleção de linhas.</span>
        </button>
      </div>
    </>
  );
}

function ledgerContentFor(area: AdviceArea): [LedgerContent, LedgerContent] {
  if (area === "neutral") {
    return [neutralLedger("esquerda", "50%"), neutralLedger("direita", "50%")];
  }

  if (area === "left") {
    return [
      recommendedLedger("esquerda", "50%"),
      sunnyLedger("direita", "50%"),
    ];
  }

  if (area === "right") {
    return [
      sunnyLedger("esquerda", "50%"),
      recommendedLedger("direita", "50%"),
    ];
  }

  if (area === "front") {
    return [recommendedLedger("frente", "30%"), sunnyLedger("trás", "70%")];
  }

  return [sunnyLedger("frente", "30%"), recommendedLedger("trás", "70%")];
}

function recommendedLedger(
  areaLabel: string,
  connectorY: string
): LedgerContent {
  return {
    areaLabel,
    connectorY,
    eyebrow: "Recomendado",
    title: "Sente aqui",
    tone: "recommended",
  };
}

function sunnyLedger(areaLabel: string, connectorY: string): LedgerContent {
  return {
    areaLabel,
    connectorY,
    eyebrow: "Evite se puder",
    title: "Maior incidência",
    tone: "sunny",
  };
}

function neutralLedger(areaLabel: string, connectorY: string): LedgerContent {
  return {
    areaLabel,
    connectorY,
    eyebrow: "Sem destaque",
    title: "Sem preferência",
    tone: "neutral",
  };
}

function bodyFor(area: AdviceArea, context: AdviceContext): string {
  const copy = AREA_COPY[area];

  if (context === "preview") {
    return copy.previewBody;
  }

  if (context === "recent") {
    return copy.recentBody;
  }

  return copy.onboardBody;
}

function labelForArea(area: AdviceArea): string {
  return AREA_OPTIONS.find((option) => option.id === area)?.label ?? area;
}

function isAdviceArea(value: string | null): value is AdviceArea {
  return AREA_OPTIONS.some((option) => option.id === value);
}

function isAdviceContext(value: string | null): value is AdviceContext {
  return CONTEXT_OPTIONS.some((option) => option.id === value);
}
