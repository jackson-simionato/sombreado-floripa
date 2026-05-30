"use client";

import { useState } from "react";

import { PrototypeScenarioSwitcher } from "../components/PrototypeScenarioSwitcher";
import type { PrototypeScenarioId } from "../domain/types";
import { getPrototypeScenario } from "../mocks/scenarioStates";

import { HomePageApp } from "./HomePageApp";

export function PrototypeHomePage() {
  const [prototypeScenarioId, setPrototypeScenarioId] = useState<PrototypeScenarioId>("location-request");
  const scenario = getPrototypeScenario(prototypeScenarioId);

  return (
    <>
      <PrototypeScenarioSwitcher onChange={setPrototypeScenarioId} selectedScenarioId={prototypeScenarioId} />
      <HomePageApp
        key={prototypeScenarioId}
        mapAvailabilityOverride={scenario.seed.mapAvailabilityOverride}
        mockScenarioId={scenario.seed.mockScenarioId}
        prototypeScenarioId={prototypeScenarioId}
        locationResult={scenario.seed.locationResult}
      />
    </>
  );
}
