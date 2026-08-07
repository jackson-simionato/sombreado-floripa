import type { UiAdviceState } from "../domain/types";

import styles from "./AdviceBusDiagram.module.css";

type AdviceBusDiagramProps = {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  density?: "default" | "compact";
  summary: string;
};

type AdviceArea = "left" | "right" | "front" | "back" | "neutral";
type LedgerTone = "recommended" | "sunny" | "neutral";

type LedgerContent = {
  areaLabel: string;
  cue: "✓" | "☀" | "−";
  eyebrow: string;
  title: string;
  tone: LedgerTone;
};

const BUS_ARTWORK_SIZE = 250;

const ARTWORK_BY_AREA: Record<AdviceArea, string> = {
  back: "/images/advice-bus-back.png",
  front: "/images/advice-bus-front.png",
  left: "/images/advice-bus-side.png",
  neutral: "/images/advice-bus-neutral.png",
  right: "/images/advice-bus-side.png",
};

const LEDGER_POSITION_CLASS: Record<
  "left" | "right" | "top" | "bottom",
  string
> = {
  bottom: styles.ledgerBottom,
  left: "",
  right: "",
  top: styles.ledgerTop,
};

export function AdviceBusDiagram({
  advice,
  density = "default",
  summary,
}: AdviceBusDiagramProps) {
  const area = areaFor(advice);
  const ledgers = ledgersFor(area);
  const isDeck = area === "front" || area === "back";

  return (
    <figure
      aria-label={summary}
      className={styles.figure}
      data-advice-area={area}
      data-diagram-density={density}
      data-diagram-layout="long-bus"
      data-diagram-proportion="elongated-bus"
      data-diagram-shape="transit-pictogram-bus"
      data-diagram-size="result-focus"
      data-neutral-middle-row={isDeck ? "true" : undefined}
      data-proof-axis={isDeck ? "horizontal" : "vertical"}
      data-seat-row-count={isDeck ? "5" : undefined}
      data-testid="bus-shell"
    >
      <p className={styles.frontCue}>
        <span aria-hidden="true">↑</span> Frente
      </p>
      <div className={`${styles.proofGrid} ${isDeck ? styles.deckProof : ""}`}>
        <Ledger content={ledgers[0]} position={isDeck ? "top" : "left"} />
        <BusArtwork area={area} />
        <Ledger content={ledgers[1]} position={isDeck ? "bottom" : "right"} />
      </div>
      <figcaption className={styles.srOnly}>{summary}</figcaption>
    </figure>
  );
}

function areaFor(
  advice: Exclude<UiAdviceState, { mode: "withheld" }>
): AdviceArea {
  return advice.mode === "neutralComputed"
    ? "neutral"
    : advice.recommendedSeatArea;
}

function ledgersFor(area: AdviceArea): [LedgerContent, LedgerContent] {
  switch (area) {
    case "left":
      return [recommendedLedger("esquerda"), sunnyLedger("direita")];
    case "right":
      return [sunnyLedger("esquerda"), recommendedLedger("direita")];
    case "front":
      return [recommendedLedger("frente"), sunnyLedger("fundo")];
    case "back":
      return [sunnyLedger("frente"), recommendedLedger("fundo")];
    case "neutral":
      return [neutralLedger("esquerda"), neutralLedger("direita")];
  }
}

function recommendedLedger(areaLabel: string): LedgerContent {
  return {
    areaLabel,
    cue: "✓",
    eyebrow: "Recomendado",
    title: "Sente aqui",
    tone: "recommended",
  };
}

function sunnyLedger(areaLabel: string): LedgerContent {
  return {
    areaLabel,
    cue: "☀",
    eyebrow: "Maior incidência",
    title: "Sol direto",
    tone: "sunny",
  };
}

function neutralLedger(areaLabel: string): LedgerContent {
  return {
    areaLabel,
    cue: "−",
    eyebrow: "Sem preferência",
    title: "Sem destaque",
    tone: "neutral",
  };
}

function BusArtwork({ area }: { area: AdviceArea }) {
  const isMirrored = area === "right";

  return (
    <div className={styles.busArtworkFrame}>
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
        src={ARTWORK_BY_AREA[area]}
        style={{ width: `${BUS_ARTWORK_SIZE}px` }}
      />
    </div>
  );
}

function Ledger({
  content,
  position,
}: {
  content: LedgerContent;
  position: "left" | "right" | "top" | "bottom";
}) {
  return (
    <div
      className={`${styles.ledger} ${styles[content.tone]} ${LEDGER_POSITION_CLASS[position]}`}
      data-ledger-position={position}
      data-ledger-tone={content.tone}
    >
      <span className={styles.ledgerEyebrow}>
        <span aria-hidden="true">{content.cue}</span> {content.eyebrow}
      </span>
      <strong>{content.title}</strong>
      <small>{content.areaLabel}</small>
    </div>
  );
}
