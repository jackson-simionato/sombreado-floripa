import type { MockLocationResult } from "../domain/types";

export type LocationProvider = {
  getCurrentLocation(): Promise<MockLocationResult>;
};

export function createBrowserLocationProvider(): LocationProvider {
  return {
    async getCurrentLocation() {
      return new Promise((resolve) => {
        if (navigator.geolocation === undefined) {
          resolve({ kind: "unavailable" });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              kind: "granted",
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
              observedAt: new Date(position.timestamp).toISOString(),
            }),
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              resolve({ kind: "denied" });
              return;
            }

            if (error.code === error.TIMEOUT) {
              resolve({ kind: "timeout" });
              return;
            }

            resolve({ kind: "unavailable" });
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30_000,
            timeout: 10_000,
          }
        );
      });
    },
  };
}
