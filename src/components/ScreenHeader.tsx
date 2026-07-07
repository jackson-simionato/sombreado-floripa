import type { ReactNode } from "react";

import styles from "./ScreenHeader.module.css";

type ScreenHeaderProps = {
  body?: ReactNode;
  eyebrow?: ReactNode;
  id?: string;
  title: ReactNode;
  variant?: "hero" | "compact" | "result";
};

export function ScreenHeader({
  body,
  eyebrow,
  id = "screen-title",
  title,
  variant = "compact",
}: ScreenHeaderProps) {
  const titleClass =
    variant === "hero"
      ? styles.titleHero
      : variant === "result"
        ? styles.titleResult
        : styles.titleCompact;

  return (
    <div className={styles.header}>
      {eyebrow !== undefined ? (
        <p className={styles.eyebrow}>{eyebrow}</p>
      ) : null}
      <h1 id={id} className={titleClass}>
        {title}
      </h1>
      {body !== undefined ? <p className={styles.body}>{body}</p> : null}
    </div>
  );
}
