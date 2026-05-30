"use client";

import { OnboardingFlowScreen } from "../screens/OnboardingFlowScreen";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import type { MapAvailability, MockLocationResult, MockScenarioId, PrototypeScenarioId } from "../domain/types";

export type HomePageAppProps = {
  locationResult?: MockLocationResult;
  mapAvailabilityOverride?: MapAvailability;
  mockScenarioId?: MockScenarioId;
  prototypeScenarioId?: PrototypeScenarioId;
  scenarioId?: MockScenarioId;
};

export function HomePageApp(props: HomePageAppProps) {
  const controller = useOnboardingFlow(props);

  return <OnboardingFlowScreen controller={controller} />;
}
