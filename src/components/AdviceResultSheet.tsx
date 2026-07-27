import type { RefObject } from "react";
import { useId } from "react";

import styles from "./AdviceResultSheet.module.css";

type AdviceResultSheetProps = {
  dialogRef: RefObject<HTMLElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  kind: "estimate" | "options";
  onChangeDirection?: () => void;
  onChangeRoute: () => void;
  onClose: () => void;
};

export function AdviceResultSheet({
  dialogRef,
  headingRef,
  kind,
  onChangeDirection,
  onChangeRoute,
  onClose,
}: AdviceResultSheetProps) {
  const titleId = useId();
  const isEstimate = kind === "estimate";

  return (
    <div className={styles.backdrop}>
      <button
        aria-label="Fechar painel"
        className={styles.backdropDismiss}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.sheet}
        role="dialog"
      >
        <div aria-hidden="true" className={styles.handle} />
        <header className={styles.heading}>
          <div>
            <p>{isEstimate ? "Como funciona" : "Navegação"}</p>
            <h2 id={titleId} ref={headingRef} tabIndex={-1}>
              {isEstimate ? "Sobre esta estimativa" : "Outras opções"}
            </h2>
          </div>
          <button className={styles.close} onClick={onClose} type="button">
            Fechar
          </button>
        </header>
        {isEstimate ? (
          <div className={styles.body}>
            <p>
              Comparamos o sentido da linha, sua localização atual e a posição
              do sol para indicar a área com menor incidência de sol.
            </p>
            <p>
              Não consideramos prédios, nuvens, películas, cortinas nem
              diferenças de sombra entre veículos.
            </p>
            <p>
              Atualize a localização quando embarcar ou depois que o ônibus
              avançar no trajeto.
            </p>
          </div>
        ) : (
          <div className={styles.optionList}>
            {onChangeDirection !== undefined ? (
              <button onClick={onChangeDirection} type="button">
                <strong>Trocar sentido</strong>
                <span>Manter esta linha e escolher outro sentido.</span>
              </button>
            ) : null}
            <button onClick={onChangeRoute} type="button">
              <strong>Trocar linha</strong>
              <span>Voltar para a seleção de linhas.</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
