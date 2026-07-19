import type { UiAdviceState } from "../domain/types";

import styles from "./AdviceBusDiagram.module.css";

type AdviceBusDiagramProps = {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  density?: "default" | "compact";
  summary: string;
};

type CabinZone = {
  label: string;
  tone: "recommended" | "sunny" | "neutral";
};

export function AdviceBusDiagram({
  advice,
  density = "default",
  summary,
}: AdviceBusDiagramProps) {
  if (advice.mode === "neutralComputed") {
    return (
      <figure className={styles.figure} aria-label={summary}>
        <CabinInterior
          density={density}
          zones={[
            { label: "esquerda", tone: "neutral" },
            { label: "direita", tone: "neutral" },
          ]}
          variant="side"
        />
        <figcaption className={styles.caption}>{summary}</figcaption>
      </figure>
    );
  }

  if (
    advice.recommendedSeatArea === "front" ||
    advice.recommendedSeatArea === "back"
  ) {
    const recommendFront = advice.recommendedSeatArea === "front";

    return (
      <figure className={styles.figure} aria-label={summary}>
        <CabinInterior
          density={density}
          zones={[
            { label: "frente", tone: recommendFront ? "recommended" : "sunny" },
            { label: "trás", tone: recommendFront ? "sunny" : "recommended" },
          ]}
          variant="deck"
        />
        <figcaption className={styles.caption}>{summary}</figcaption>
      </figure>
    );
  }

  const recommendLeft = advice.recommendedSeatArea === "left";

  return (
    <figure className={styles.figure} aria-label={summary}>
      <CabinInterior
        density={density}
        zones={[
          { label: "esquerda", tone: recommendLeft ? "recommended" : "sunny" },
          { label: "direita", tone: recommendLeft ? "sunny" : "recommended" },
        ]}
        variant="side"
      />
      <figcaption className={styles.caption}>{summary}</figcaption>
    </figure>
  );
}

function CabinInterior({
  density,
  zones,
  variant,
}: {
  density: "default" | "compact";
  zones: [CabinZone, CabinZone];
  variant: "side" | "deck";
}) {
  return (
    <div
      className={`${styles.bus} ${density === "compact" ? styles.busCompact : ""}`}
      data-diagram-density={density}
      data-diagram-layout="long-bus"
      data-diagram-proportion="elongated-bus"
      data-diagram-shape="transit-pictogram-bus"
      data-diagram-size="result-focus"
      data-testid="bus-shell"
      aria-hidden="true"
    >
      <span
        className={styles.wheelCue}
        data-diagram-cue="wheels"
        data-testid="bus-wheels"
      />
      <div className={styles.frontCue} data-diagram-cue="front">
        <span className={styles.routeSign} data-testid="bus-front-sign">
          ônibus
        </span>
        <span className={styles.windshield} data-testid="bus-windshield">
          frente
        </span>
        <span className={styles.driverCue} />
      </div>
      <div
        className={`${styles.cabinBody} ${
          variant === "deck" ? styles.cabinBodyDeck : ""
        }`}
        data-diagram-cue="seats"
      >
        {variant === "side" ? (
          <>
            <CabinZoneView side="left" zone={zones[0]} />
            <div className={styles.aisle}>
              <span>corredor</span>
            </div>
            <CabinZoneView side="right" zone={zones[1]} />
          </>
        ) : (
          <>
            <CabinDeckZoneView zone={zones[0]} />
            <div className={styles.deckAisle}>
              <span>corredor</span>
            </div>
            <CabinDeckZoneView zone={zones[1]} />
          </>
        )}
      </div>
      <span className={styles.rearCue} data-diagram-cue="rear-bumper" />
    </div>
  );
}

function CabinZoneView({
  side,
  zone,
}: {
  side: "left" | "right";
  zone: CabinZone;
}) {
  return (
    <div
      className={`${styles.zone} ${side === "left" ? styles.zoneLeft : styles.zoneRight} ${toneClass(zone.tone)}`}
    >
      <span className={styles.sideLabel}>{zone.label}</span>
      <SeatRows />
      <strong>{calloutFor(zone.tone)}</strong>
    </div>
  );
}

function CabinDeckZoneView({ zone }: { zone: CabinZone }) {
  return (
    <div className={`${styles.deckZone} ${toneClass(zone.tone)}`}>
      <span className={styles.sideLabel}>{zone.label}</span>
      <SeatRows />
      <strong>{calloutFor(zone.tone)}</strong>
    </div>
  );
}

function SeatRows() {
  return (
    <span className={styles.seatRows} data-diagram-cue="seat-rows">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

function toneClass(tone: CabinZone["tone"]) {
  if (tone === "recommended") return styles.zoneRecommended;
  if (tone === "sunny") return styles.zoneSunny;
  return styles.zoneNeutral;
}

function calloutFor(tone: CabinZone["tone"]) {
  if (tone === "recommended") return "Sente aqui";
  if (tone === "sunny") return "sol direto";
  return "sem destaque";
}
