import styles from "./RouteCodeBadge.module.css";

type RouteCodeBadgeProps = {
  code: string;
};

export function RouteCodeBadge({ code }: RouteCodeBadgeProps) {
  const isLongCode = code.length >= 5;

  return (
    <span
      className={`${styles.badge} ${isLongCode ? styles.badgeLong : ""}`}
      data-route-code-length={code.length}
      data-route-code-variant="circle"
    >
      {code}{" "}
    </span>
  );
}
