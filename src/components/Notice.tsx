import type { ReactNode } from "react";

import styles from "./Notice.module.css";

type NoticeProps = {
  children: ReactNode;
  title?: ReactNode;
  tone?: "info" | "warning" | "error";
};

export function Notice({ children, title, tone = "info" }: NoticeProps) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role="status">
      {title !== undefined ? <strong>{title}</strong> : null}
      <p>{children}</p>
    </div>
  );
}
