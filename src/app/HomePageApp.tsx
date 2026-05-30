"use client";

import { OnboardingFlowScreen } from "../screens/OnboardingFlowScreen";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import type { MapAvailability, MockLocationResult, MockScenarioId } from "../domain/types";

export type HomePageAppProps = {
  locationResult?: MockLocationResult;
  mapAvailabilityOverride?: MapAvailability;
  scenarioId?: MockScenarioId;
};

export function HomePageApp(props: HomePageAppProps) {
  const controller = useOnboardingFlow(props);

  return <OnboardingFlowScreen controller={controller} />;
}
