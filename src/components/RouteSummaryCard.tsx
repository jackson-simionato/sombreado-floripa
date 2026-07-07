import styles from "./RouteSummaryCard.module.css";

type RouteSummaryCardProps = {
  directionLabel?: string;
  label?: string;
  routeCode?: string;
  routeName?: string;
};

export function RouteSummaryCard({
  directionLabel,
  label,
  routeCode,
  routeName,
}: RouteSummaryCardProps) {
  if (routeCode === undefined && routeName === undefined) {
    return null;
  }

  return (
    <div className={styles.card}>
      {routeCode !== undefined ? (
        <span className={styles.code}>{routeCode}</span>
      ) : null}
      <div className={styles.text}>
        {label !== undefined ? <p>{label}</p> : null}
        {routeCode !== undefined && routeName !== undefined ? (
          <span className={styles.fullLabel}>
            {routeCode} {routeName}
          </span>
        ) : null}
        {routeName !== undefined ? <strong>{routeName}</strong> : null}
        {directionLabel !== undefined ? <span>{directionLabel}</span> : null}
      </div>
    </div>
  );
}
