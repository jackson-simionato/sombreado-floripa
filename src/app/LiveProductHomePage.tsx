"use client";

import { useMemo } from "react";

import { createLiveRiderFlowClient } from "../api/riderFlowClient";
import { createBrowserLocationProvider } from "../location/locationProvider";
import { ApiConfigurationMissingScreen } from "./ApiConfigurationMissingScreen";
import { HomePageApp } from "./HomePageApp";

type LiveProductHomePageProps = {
  apiBaseUrl?: string;
};

export function LiveProductHomePage({ apiBaseUrl }: LiveProductHomePageProps) {
  const normalizedApiBaseUrl = apiBaseUrl?.trim();
  const riderFlowClient = useMemo(() => {
    if (
      normalizedApiBaseUrl === undefined ||
      normalizedApiBaseUrl.length === 0
    ) {
      return undefined;
    }

    return createLiveRiderFlowClient({ baseUrl: normalizedApiBaseUrl });
  }, [normalizedApiBaseUrl]);
  const locationProvider = useMemo(() => createBrowserLocationProvider(), []);

  if (riderFlowClient === undefined) {
    return <ApiConfigurationMissingScreen />;
  }

  return (
    <HomePageApp
      locationProvider={locationProvider}
      riderFlowClient={riderFlowClient}
      stopAfterDirectionSelection
    />
  );
}
