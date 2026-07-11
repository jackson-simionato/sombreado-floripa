import styles from "./BrandHeader.module.css";

type BrandHeaderProps = {
  compact?: boolean;
};

export function BrandHeader({ compact = false }: BrandHeaderProps) {
  return (
    <header
      className={`${styles.brand} ${compact ? styles.compact : ""}`}
      aria-label="Sombreado"
    >
      <span aria-hidden="true" className={styles.mark}>
        <span className={styles.aisle} />
      </span>
      <span className={styles.name}>Sombreado</span>
    </header>
  );
}
