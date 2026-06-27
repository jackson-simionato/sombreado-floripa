"use client";

import { OnboardingFlowScreen } from "../screens/OnboardingFlowScreen";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import type { RiderFlowClient } from "../api/riderFlowClient";
import type {
  MapAvailability,
  MockLocationResult,
  MockScenarioId,
  PrototypeScenarioId,
} from "../domain/types";
import type { LocationProvider } from "../location/locationProvider";

export type HomePageAppProps =
  | {
      runtime: "prototype";
      locationProvider?: LocationProvider;
      locationResult?: MockLocationResult;
      mapAvailabilityOverride?: MapAvailability;
      mockScenarioId?: MockScenarioId;
      prototypeScenarioId?: PrototypeScenarioId;
      riderFlowClient?: RiderFlowClient;
      scenarioId?: MockScenarioId;
      stopAfterRouteConfirmation?: boolean;
    }
  | {
      runtime: "live";
      locationProvider: LocationProvider;
      mapAvailabilityOverride?: MapAvailability;
      riderFlowClient: RiderFlowClient;
    };

export function HomePageApp(props: HomePageAppProps) {
  const controller = useOnboardingFlow(props);

  return <OnboardingFlowScreen controller={controller} />;
}
