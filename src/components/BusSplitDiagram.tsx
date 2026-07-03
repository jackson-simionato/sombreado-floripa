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
        data-diagram-layout="long-bus"
        data-diagram-size="entry"
        aria-hidden="true"
      >
        <span className={styles.wheelCue} data-diagram-cue="wheels" />
        <div className={styles.frontCue} data-diagram-cue="front">
          <span className={styles.windshield} />
          <span className={styles.driverCue} />
        </div>
        <div className={styles.cabinBody} data-diagram-cue="seats">
          <div className={`${styles.sideShade} ${styles.zoneLeft}`}>
            <span>{copy.busSplitDiagram.left}</span>
            <SeatRows />
            <strong>{copy.busSplitDiagram.calmerSide}</strong>
          </div>
          <div className={styles.aisle} />
          <div className={`${styles.sideSun} ${styles.zoneRight}`}>
            <span>{copy.busSplitDiagram.right}</span>
            <SeatRows />
            <strong>{copy.busSplitDiagram.sunnySide}</strong>
          </div>
        </div>
      </div>
      <figcaption className={styles.caption}>
        {copy.busSplitDiagram.accessibleSummary}
      </figcaption>
    </figure>
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
