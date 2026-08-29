import type { ReactNode } from "react";

import styles from "./ChoiceCard.module.css";

type ChoiceCardProps = {
  ariaLabel?: string;
  badge?: ReactNode;
  className?: string;
  compact?: boolean;
  eyebrow?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  onSelect(): void;
};

export function ChoiceCard({
  ariaLabel,
  badge,
  className,
  compact = false,
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
      className={[styles.card, compact ? styles.compact : undefined, className]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
      type="button"
    >
      {badge !== undefined ? (
        <span aria-hidden="true" className={styles.badge}>
          {badge}
        </span>
      ) : null}
      <span className={styles.content}>
        {eyebrow !== undefined ? (
          <span className={styles.eyebrow}>{eyebrow}</span>
        ) : null}
        <strong>{label}</strong>
        {meta !== undefined ? (
          <span className={styles.meta}>{meta}</span>
        ) : null}
      </span>
      <span aria-hidden="true" className={styles.chevron} />
    </button>
  );
}
