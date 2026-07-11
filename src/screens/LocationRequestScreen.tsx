import { AppShell } from "../components/AppShell";
import { BrandHeader } from "../components/BrandHeader";
import { BusSplitDiagram } from "../components/BusSplitDiagram";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { ScreenHeader } from "../components/ScreenHeader";
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
  onManualSearch,
}: LocationRequestScreenProps) {
  const isLoading = state === "finding-nearby";
  const screenCopy = isLoading
    ? copy.findingNearbyRoutes
    : copy.locationRequest;

  return (
    <AppShell>
      <div className={styles.screen}>
        {!isLoading ? <BrandHeader /> : null}
        <section className={styles.hero} aria-labelledby="screen-title">
          <ScreenHeader
            body={screenCopy.body}
            title={
              isLoading ? (
                screenCopy.heading
              ) : (
                <>
                  Viaje na
                  <br />
                  <span className={styles.heroAccent}>sombra.</span>
                </>
              )
            }
            variant="hero"
          />
          <BusSplitDiagram />
        </section>

        {!isLoading ? (
          <p className={styles.notice}>{copy.locationRequest.locationNotice}</p>
        ) : null}

        {manualNoticeVisible ? (
          <Notice tone="warning">
            {copy.locationRequest.manualUnavailable}
          </Notice>
        ) : null}
      </div>

      <StickyActions>
        {!isLoading ? (
          <Button onClick={onUseLocation}>
            {copy.locationRequest.primaryAction}
          </Button>
        ) : null}
        <Button onClick={onManualSearch} variant="secondary">
          {isLoading
            ? copy.findingNearbyRoutes.secondaryAction
            : copy.locationRequest.secondaryAction}
        </Button>
      </StickyActions>
    </AppShell>
  );
}
