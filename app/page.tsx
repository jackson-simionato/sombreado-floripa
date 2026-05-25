"use client";

import { useState } from "react";

import { LocationRequestScreen } from "../src/screens/LocationRequestScreen";

type TemporaryState = "location-request" | "finding-nearby";

export default function HomePage() {
  const [state, setState] = useState<TemporaryState>("location-request");
  const [manualNoticeVisible, setManualNoticeVisible] = useState(false);

  return (
    <LocationRequestScreen
      state={state}
      manualNoticeVisible={manualNoticeVisible}
      onUseLocation={() => {
        setManualNoticeVisible(false);
        setState("finding-nearby");
      }}
      onManualSearch={() => {
        setManualNoticeVisible(true);
      }}
    />
  );
}
