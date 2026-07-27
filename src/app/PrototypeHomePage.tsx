"use client";

import { useEffect, useState } from "react";

import { PrototypeScenarioSwitcher } from "../components/PrototypeScenarioSwitcher";
import type { PrototypeScenarioId } from "../domain/types";
import {
  getPrototypeScenario,
  isPrototypeScenarioId,
} from "../mocks/scenarioStates";

import { HomePageApp } from "./HomePageApp";

export function PrototypeHomePage() {
  const [prototypeScenarioId, setPrototypeScenarioId] =
    useState<PrototypeScenarioId>("location-request");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const requestedScenario = new URLSearchParams(window.location.search).get(
      "scenario"
    );

    if (isPrototypeScenarioId(requestedScenario)) {
      setPrototypeScenarioId(requestedScenario);
    }
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const media = window.matchMedia("(max-width: 640px)");
    const updateViewport = () => {
      setIsMobileViewport(media.matches);
    };

    updateViewport();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateViewport);

      return () => {
        media.removeEventListener("change", updateViewport);
      };
    }

    if (typeof media.addListener === "function") {
      media.addListener(updateViewport);

      return () => {
        media.removeListener(updateViewport);
      };
    }
  }, []);

  const scenario = getPrototypeScenario(prototypeScenarioId);

  return (
    <>
      {!isMobileViewport ? (
        <PrototypeScenarioSwitcher
          onChange={setPrototypeScenarioId}
          selectedScenarioId={prototypeScenarioId}
        />
      ) : null}
      <HomePageApp
        key={prototypeScenarioId}
        mapAvailabilityOverride={scenario.seed.mapAvailabilityOverride}
        mockScenarioId={scenario.seed.mockScenarioId}
        prototypeScenarioId={prototypeScenarioId}
        locationResult={scenario.seed.locationResult}
        runtime="prototype"
      />
    </>
  );
}
