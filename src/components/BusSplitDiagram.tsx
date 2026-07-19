import { copy } from "../content/copy";

import styles from "./BusSplitDiagram.module.css";

export function BusSplitDiagram() {
  return (
    <figure
      className={styles.figure}
      aria-label={copy.busSplitDiagram.accessibleSummary}
    >
      <div
        className={styles.bus}
        data-diagram-abstraction="abstract-hint"
        data-diagram-layout="top-down-bus"
        data-diagram-size="entry"
        data-testid="entry-bus-motif"
        aria-hidden="true"
      >
        <span className={styles.wheelCue} data-diagram-cue="wheels" />
        <div className={styles.frontCue} data-diagram-cue="front">
          <span className={styles.windshield} />
          <span className={styles.driverCue} />
        </div>
        <div className={styles.splitBody} data-diagram-cue="side-split">
          <span className={styles.shadeField} />
          <span className={styles.centerLine} />
          <span className={styles.sunField} />
        </div>
        <span className={styles.rearCue} data-diagram-cue="rear-bumper" />
      </div>
      <figcaption className={styles.caption}>
        {copy.busSplitDiagram.accessibleSummary}
      </figcaption>
    </figure>
  );
}
