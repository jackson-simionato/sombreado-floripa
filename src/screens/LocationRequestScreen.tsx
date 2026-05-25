import { AppShell } from "../components/AppShell";
import { BusSplitDiagram } from "../components/BusSplitDiagram";
import { Button } from "../components/Button";
import { StickyActions } from "../components/StickyActions";
import { copy } from "../content/copy";

import styles from "./LocationRequestScreen.module.css";

type LocationRequestScreenProps = {
  state: "location-request" | "finding-nearby";
  manualNoticeVisible: boolean;
  onUseLocation: () => void;
  onManualSearch: () => void;
};

export function LocationRequestScreen({
  state,
  manualNoticeVisible,
  onUseLocation,
  onManualSearch
}: LocationRequestScreenProps) {
  const isLoading = state === "finding-nearby";
  const screenCopy = isLoading ? copy.findingNearbyRoutes : copy.locationRequest;

  return (
    <AppShell>
      <div className={styles.screen}>
        {!isLoading ? <p className={styles.brand}>{copy.locationRequest.brand}</p> : null}
        <section className={styles.hero} aria-labelledby="screen-title">
          <div className={styles.copyBlock}>
            <h1 id="screen-title" className={styles.title}>
              {screenCopy.heading}
            </h1>
            <p className={styles.body}>{screenCopy.body}</p>
          </div>
          <BusSplitDiagram />
        </section>

        {!isLoading ? <p className={styles.notice}>{copy.locationRequest.locationNotice}</p> : null}

        {manualNoticeVisible ? (
          <p className={styles.manualNotice} role="status">
            {copy.locationRequest.manualUnavailable}
          </p>
        ) : null}
      </div>

      <StickyActions>
        {!isLoading ? (
          <Button onClick={onUseLocation}>{copy.locationRequest.primaryAction}</Button>
        ) : null}
        <Button onClick={onManualSearch} variant="secondary">
          {isLoading ? copy.findingNearbyRoutes.secondaryAction : copy.locationRequest.secondaryAction}
        </Button>
      </StickyActions>
    </AppShell>
  );
}
