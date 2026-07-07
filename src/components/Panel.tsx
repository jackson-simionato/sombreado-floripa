import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Panel.module.css";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "surface" | "emphasis";
};

export function Panel({
  children,
  className,
  tone = "surface",
  ...props
}: PanelProps) {
  const classes = [styles.panel, styles[tone], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
