import type { ReactNode } from "react";

import styles from "./ChoiceCard.module.css";

type ChoiceCardProps = {
  ariaLabel?: string;
  eyebrow?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  onSelect(): void;
};

export function ChoiceCard({
  ariaLabel,
  eyebrow,
  label,
  meta,
  onSelect,
}: ChoiceCardProps) {
  const accessibleName =
    ariaLabel ??
    (typeof label === "string" ? `Selecionar ${label}` : undefined);

  return (
    <button
      aria-label={accessibleName}
      className={styles.card}
      onClick={onSelect}
      type="button"
    >
      {eyebrow !== undefined ? (
        <span className={styles.eyebrow}>{eyebrow}</span>
      ) : null}
      <strong>{label}</strong>
      {meta !== undefined ? <span className={styles.meta}>{meta}</span> : null}
    </button>
  );
}
