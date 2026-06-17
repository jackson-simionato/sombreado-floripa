import { AppShell } from "../components/AppShell";

import styles from "../screens/OnboardingFlowScreen.module.css";

export function ApiConfigurationMissingScreen() {
  return (
    <AppShell>
      <div className={styles.screen}>
        <section className={styles.stack} aria-labelledby="screen-title">
          <h1 id="screen-title" className={styles.titleCompact}>
            Configuração da API ausente
          </h1>
          <p className={styles.body}>
            O Sombreado Floripa precisa de NEXT_PUBLIC_API_URL para carregar
            dados ao vivo. Configure a URL pública do sombreado-service e
            recarregue a página.
          </p>
          <p className={styles.metaText}>
            As informações das linhas não estão disponíveis neste ambiente.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
