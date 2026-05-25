import type { ReactNode } from "react";

import styles from "./StickyActions.module.css";

type StickyActionsProps = {
  children: ReactNode;
};

export function StickyActions({ children }: StickyActionsProps) {
  return <div className={styles.actions}>{children}</div>;
}
