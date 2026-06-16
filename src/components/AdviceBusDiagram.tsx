import type { UiAdviceState } from "../domain/types";

import styles from "./AdviceBusDiagram.module.css";

type AdviceBusDiagramProps = {
  advice: Exclude<UiAdviceState, { mode: "withheld" }>;
  summary: string;
};

export function AdviceBusDiagram({ advice, summary }: AdviceBusDiagramProps) {
  if (advice.mode === "neutralComputed") {
    return (
      <figure className={styles.figure} aria-label={summary}>
        <div className={styles.frontArrow} aria-hidden="true">
          ↑ <span>frente</span>
        </div>
        <div
          className={`${styles.bus} ${styles.busNeutral}`}
          aria-hidden="true"
        >
          <div className={`${styles.zone} ${styles.zoneNeutral}`}>
            <span>lado esquerdo</span>
            <strong>sem destaque</strong>
          </div>
          <div className={styles.aisle} />
          <div className={`${styles.zone} ${styles.zoneNeutral}`}>
            <span>lado direito</span>
            <strong>sem destaque</strong>
          </div>
        </div>
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
        <div className={styles.frontArrow} aria-hidden="true">
          ↑ <span>frente</span>
        </div>
        <div
          className={`${styles.bus} ${styles.busFrontBack}`}
          aria-hidden="true"
        >
          <div
            className={`${styles.deckZone} ${recommendFront ? styles.deckRecommended : styles.deckSunny}`}
          >
            <span>parte da frente</span>
            <strong>{recommendFront ? "melhor área" : "sol direto"}</strong>
          </div>
          <div className={styles.deckAisle}>
            <span>corredor</span>
          </div>
          <div
            className={`${styles.deckZone} ${recommendFront ? styles.deckSunny : styles.deckRecommended}`}
          >
            <span>parte de trás</span>
            <strong>{recommendFront ? "sol direto" : "melhor área"}</strong>
          </div>
        </div>
        <figcaption className={styles.caption}>{summary}</figcaption>
      </figure>
    );
  }

  const recommendLeft = advice.recommendedSeatArea === "left";

  return (
    <figure className={styles.figure} aria-label={summary}>
      <div className={styles.frontArrow} aria-hidden="true">
        ↑ <span>frente</span>
      </div>
      <div className={styles.bus} aria-hidden="true">
        <div
          className={`${styles.zone} ${recommendLeft ? styles.zoneRecommended : styles.zoneSunny}`}
        >
          <span>lado esquerdo</span>
          <strong>{recommendLeft ? "melhor área" : "sol direto"}</strong>
        </div>
        <div className={styles.aisle} />
        <div
          className={`${styles.zone} ${recommendLeft ? styles.zoneSunny : styles.zoneRecommended}`}
        >
          <span>lado direito</span>
          <strong>{recommendLeft ? "sol direto" : "melhor área"}</strong>
        </div>
      </div>
      <figcaption className={styles.caption}>{summary}</figcaption>
    </figure>
  );
}
