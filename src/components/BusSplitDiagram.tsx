import { copy } from "../content/copy";

import styles from "./BusSplitDiagram.module.css";

export function BusSplitDiagram() {
  return (
    <figure className={styles.figure} aria-label={copy.busSplitDiagram.accessibleSummary}>
      <div className={styles.frontArrow} aria-hidden="true">
        ↑ <span>{copy.busSplitDiagram.front}</span>
      </div>
      <div className={styles.bus} aria-hidden="true">
        <div className={styles.sideShade}>
          <span>{copy.busSplitDiagram.left}</span>
          <strong>{copy.busSplitDiagram.calmerSide}</strong>
        </div>
        <div className={styles.aisle} />
        <div className={styles.sideSun}>
          <span>{copy.busSplitDiagram.right}</span>
          <strong>{copy.busSplitDiagram.sunnySide}</strong>
        </div>
      </div>
      <figcaption className={styles.caption}>{copy.busSplitDiagram.accessibleSummary}</figcaption>
    </figure>
  );
}
