import {
  buildTargetAdvisoryRequest,
  toDirectionChoices,
  toRouteCandidates,
  toUiAdvice,
} from "../domain/adapters";
import { initialFlowState } from "../domain/flow";
import type {
  FlowState,
  MapAvailability,
  MockLocationResult,
  MockScenarioId,
  PrototypeScenarioId,
  RetryTarget,
  TargetAdvisoryResponse,
} from "../domain/types";
import {
  fixtureIds,
  mockAdvisories,
  routeDirectionsByRouteId,
  routeGeometryByDirectionId,
  routesResponse,
} from "./fixtures";

export type PrototypeScenarioDefinition = {
  id: PrototypeScenarioId;
  label: string;
  seed: {
    state: FlowState;
    manualQueryDraft?: string;
    mockScenarioId?: MockScenarioId;
    locationResult?: MockLocationResult;
    mapAvailabilityOverride?: MapAvailability;
  };
};

const nearbyCandidates = toRouteCandidates(
  {
    routes: routesResponse.routes.filter(
      (route) => route.route_id !== fixtureIds.routes.missingGeometry
    ),
  },
  { source: "nearby" }
);

const manualCandidates = toRouteCandidates(
  {
    routes: routesResponse.routes.filter(
      (route) =>
        route.route_id === fixtureIds.routes.lagoa ||
        route.route_id === fixtureIds.routes.missingGeometry
    ),
  },
  { source: "manual" }
);

const selectedNearbyRoute = toSelectedRoute(nearbyCandidates[0], "nearby");
const selectedMissingGeometryRoute = toSelectedRoute(
  manualCandidates.find(
    (route) => route.routeId === fixtureIds.routes.missingGeometry
  ) ?? manualCandidates[0],
  "manual"
);

const nearbyDirections = toDirectionChoices(
  routeDirectionsByRouteId[fixtureIds.routes.lagoa]
);
const selectedDirection = toSelectedDirection(nearbyDirections[0]);
const missingGeometryDirections = toDirectionChoices(
  routeDirectionsByRouteId[fixtureIds.routes.missingGeometry]
);
const selectedMissingGeometryDirection = toSelectedDirection(
  missingGeometryDirections[0]
);

const routeGeometry =
  routeGeometryByDirectionId[fixtureIds.routeDirections.lagoaOutbound];
const advisoryRequest = buildTargetAdvisoryRequest({
  lat: -27.5969,
  lng: -48.5488,
  routeVersionId: selectedNearbyRoute.routeVersionId,
  routeDirectionId: selectedDirection.routeDirectionId,
  now: () => new Date("2026-05-26T12:00:00.000Z"),
});

export const prototypeScenarios: ReadonlyArray<PrototypeScenarioDefinition> = [
  {
    id: "location-request",
    label: "Localização: pedir acesso",
    seed: {
      state: cloneState(initialFlowState),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "location-finding-nearby",
    label: "Localização: buscando próximas",
    seed: {
      state: buildState({
        screen: "findingNearbyRoutes",
        requestStatus: "loading",
        latestLocation: { lat: -27.5969, lng: -48.5488 },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "location-slow-loading",
    label: "Localização: busca lenta",
    seed: {
      state: buildState({
        screen: "slowLoadingNotice",
        requestStatus: "loading",
        latestLocation: { lat: -27.5969, lng: -48.5488 },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "location-denied",
    label: "Localização: acesso negado",
    seed: {
      state: buildState({
        screen: "locationDeniedRecovery",
        requestStatus: "error",
        locationIssue: "denied",
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "routes-nearby",
    label: "Linhas: próximas",
    seed: {
      state: buildState({
        screen: "routeCandidateSelection",
        requestStatus: "success",
        latestLocation: { lat: -27.5969, lng: -48.5488 },
        nearbyCandidates,
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "routes-none-nearby",
    label: "Linhas: nenhuma próxima",
    seed: {
      state: buildState({
        screen: "noNearbyRoutes",
        requestStatus: "success",
        latestLocation: { lat: -27.5969, lng: -48.5488 },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "manual-search",
    label: "Busca manual",
    seed: {
      state: buildState({
        screen: "manualRouteSearch",
        requestStatus: "success",
        manualCandidates,
      }),
      manualQueryDraft: "lagoa",
      mockScenarioId: "manual-search",
    },
  },
  {
    id: "manual-search-empty",
    label: "Busca manual: sem resultados",
    seed: {
      state: buildState({
        screen: "noManualResults",
        requestStatus: "success",
      }),
      manualQueryDraft: "xpto",
      mockScenarioId: "manual-search",
    },
  },
  {
    id: "direction-choice",
    label: "Sentido: escolher",
    seed: {
      state: buildState({
        screen: "directionChoice",
        requestStatus: "success",
        nearbyCandidates,
        selectedRoute: selectedNearbyRoute,
        directionChoices: nearbyDirections,
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "direction-unavailable",
    label: "Sentido: indisponível",
    seed: {
      state: buildState({
        screen: "routeWithoutDirections",
        requestStatus: "success",
        nearbyCandidates,
        selectedRoute: toSelectedRoute(
          toRouteCandidates({
            routes: routesResponse.routes.filter(
              (route) => route.route_id === fixtureIds.routes.noDirections
            ),
          })[0],
          "nearby"
        ),
      }),
      mockScenarioId: "route-no-directions",
    },
  },
  {
    id: "confirmation",
    label: "Confirmação",
    seed: {
      state: buildState({
        screen: "routeConfirmation",
        requestStatus: "success",
        nearbyCandidates,
        selectedRoute: selectedNearbyRoute,
        selectedDirection,
        directionChoices: nearbyDirections,
        geometry: routeGeometry,
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "confirmation-fallback",
    label: "Confirmação: fallback",
    seed: {
      state: buildState({
        screen: "routeConfirmationFallback",
        requestStatus: "success",
        manualCandidates,
        selectedRoute: selectedMissingGeometryRoute,
        selectedDirection: selectedMissingGeometryDirection,
        directionChoices: missingGeometryDirections,
        geometry:
          routeGeometryByDirectionId[
            fixtureIds.routeDirections.missingGeometryOutbound
          ],
        mapAvailability: "available",
      }),
      manualQueryDraft: "lagoa",
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "advice-computing",
    label: "Conselho: calculando",
    seed: {
      state: buildState({
        screen: "computingAdvice",
        requestStatus: "loading",
        latestLocation: { lat: -27.5969, lng: -48.5488 },
        nearbyCandidates,
        selectedRoute: selectedNearbyRoute,
        selectedDirection,
        directionChoices: nearbyDirections,
        advisoryRequest,
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "advice-onboard-left",
    label: "Conselho: a bordo esquerda",
    seed: {
      state: adviceState(
        "onboardAdviceResult",
        mockAdvisories.advisoryExposureRightRecommendsLeft
      ),
    },
  },
  {
    id: "advice-onboard-right",
    label: "Conselho: a bordo direita",
    seed: {
      state: adviceState(
        "onboardAdviceResult",
        mockAdvisories.advisoryExposureLeftRecommendsRight
      ),
    },
  },
  {
    id: "advice-onboard-front",
    label: "Conselho: a bordo frente",
    seed: {
      state: adviceState(
        "onboardAdviceResult",
        mockAdvisories.advisoryExposureBackRecommendsFront
      ),
    },
  },
  {
    id: "advice-onboard-back",
    label: "Conselho: a bordo trás",
    seed: {
      state: adviceState(
        "onboardAdviceResult",
        mockAdvisories.advisoryExposureFrontRecommendsBack
      ),
    },
  },
  {
    id: "advice-neutral-overhead",
    label: "Conselho: neutro sol alto",
    seed: {
      state: adviceState(
        "onboardAdviceResult",
        mockAdvisories.advisoryExposureOverheadNeutral
      ),
    },
  },
  {
    id: "advice-neutral-none",
    label: "Conselho: neutro sem sol direto",
    seed: {
      state: adviceState(
        "onboardAdviceResult",
        mockAdvisories.advisoryExposureNoneNeutral
      ),
    },
  },
  {
    id: "advice-preview",
    label: "Conselho: prévia",
    seed: {
      state: adviceState(
        "routePreviewAdviceResult",
        mockAdvisories.advisoryPreviewLeft
      ),
    },
  },
  {
    id: "advice-withheld",
    label: "Conselho: indisponível",
    seed: {
      state: buildState({
        screen: "trueWithheld",
        requestStatus: "success",
        selectedRoute: selectedNearbyRoute,
        selectedDirection,
        directionChoices: nearbyDirections,
        advice: toUiAdvice(mockAdvisories.advisoryWithheld),
        advisoryRequest,
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "error-nearby-routes",
    label: "Erro: linhas próximas",
    seed: {
      state: apiErrorState({
        retryTarget: {
          kind: "nearbyRoutes",
          lat: -27.5969,
          lng: -48.5488,
          radiusMeters: 1200,
          limit: 5,
        },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "error-manual-search",
    label: "Erro: busca manual",
    seed: {
      state: apiErrorState({
        manualQuery: "lagoa",
        retryTarget: { kind: "manualSearch", query: "lagoa", limit: 8 },
      }),
      manualQueryDraft: "lagoa",
      mockScenarioId: "manual-search",
    },
  },
  {
    id: "error-directions",
    label: "Erro: sentidos",
    seed: {
      state: apiErrorState({
        selectedRoute: selectedNearbyRoute,
        retryTarget: {
          kind: "directions",
          routeId: selectedNearbyRoute.routeId,
        },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "error-geometry",
    label: "Erro: geometria",
    seed: {
      state: apiErrorState({
        selectedRoute: selectedNearbyRoute,
        selectedDirection,
        directionChoices: nearbyDirections,
        retryTarget: {
          kind: "geometry",
          routeId: selectedNearbyRoute.routeId,
          routeDirectionId: selectedDirection.routeDirectionId,
          routeVersionId: selectedNearbyRoute.routeVersionId,
        },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
  {
    id: "error-advice",
    label: "Erro: conselho",
    seed: {
      state: apiErrorState({
        selectedRoute: selectedNearbyRoute,
        selectedDirection,
        directionChoices: nearbyDirections,
        advisoryRequest,
        retryTarget: {
          kind: "advisory",
          request: advisoryRequest,
        },
      }),
      mockScenarioId: "nearby-routes",
    },
  },
] as const;

export function getPrototypeScenario(
  id: PrototypeScenarioId
): PrototypeScenarioDefinition {
  return (
    prototypeScenarios.find((scenario) => scenario.id === id) ??
    prototypeScenarios[0]
  );
}

function adviceState(
  screen: FlowState["screen"],
  response: TargetAdvisoryResponse
): FlowState {
  return buildState({
    screen,
    requestStatus: "success",
    nearbyCandidates,
    selectedRoute: selectedNearbyRoute,
    selectedDirection,
    directionChoices: nearbyDirections,
    advice: toUiAdvice(response),
    advisoryRequest,
  });
}

function apiErrorState(input: {
  advisoryRequest?: FlowState["advisoryRequest"];
  directionChoices?: FlowState["directionChoices"];
  manualQuery?: string;
  retryTarget: RetryTarget;
  selectedDirection?: FlowState["selectedDirection"];
  selectedRoute?: FlowState["selectedRoute"];
}): FlowState {
  return buildState({
    screen: "apiError",
    requestStatus: "error",
    manualQuery: input.manualQuery ?? "",
    nearbyCandidates:
      input.selectedRoute?.source === "nearby" ? nearbyCandidates : [],
    manualCandidates:
      input.selectedRoute?.source === "manual" ? manualCandidates : [],
    selectedRoute: input.selectedRoute,
    selectedDirection: input.selectedDirection,
    directionChoices: input.directionChoices ?? [],
    advisoryRequest: input.advisoryRequest,
    error: {
      kind: "api",
      message: "Mock API failure",
      retryTarget: input.retryTarget,
    },
  });
}

function buildState(overrides: Partial<FlowState>): FlowState {
  return cloneState({
    ...initialFlowState,
    ...overrides,
  });
}

function cloneState(state: FlowState): FlowState {
  return {
    ...state,
    latestLocation:
      state.latestLocation === undefined
        ? undefined
        : { ...state.latestLocation },
    nearbyCandidates: state.nearbyCandidates.map((candidate) => ({
      ...candidate,
      directionHints: [...candidate.directionHints],
    })),
    manualCandidates: state.manualCandidates.map((candidate) => ({
      ...candidate,
      directionHints: [...candidate.directionHints],
    })),
    directionChoices: state.directionChoices.map((direction) => ({
      ...direction,
      departureLabels: [...direction.departureLabels],
    })),
    selectedRoute:
      state.selectedRoute === undefined
        ? undefined
        : { ...state.selectedRoute },
    selectedDirection:
      state.selectedDirection === undefined
        ? undefined
        : {
            ...state.selectedDirection,
            departureLabels: [...state.selectedDirection.departureLabels],
          },
    geometry:
      state.geometry === undefined
        ? undefined
        : {
            ...state.geometry,
            segments: state.geometry.segments.map((segment) => ({
              ...segment,
              coordinates: segment.coordinates.map(([lng, lat]) => [lng, lat]),
            })),
          },
    advice: state.advice === undefined ? undefined : { ...state.advice },
    advisoryRequest:
      state.advisoryRequest === undefined
        ? undefined
        : { ...state.advisoryRequest },
    error:
      state.error === undefined
        ? undefined
        : {
            ...state.error,
            retryTarget:
              state.error.retryTarget === undefined
                ? undefined
                : state.error.retryTarget.kind === "advisory"
                  ? {
                      kind: "advisory",
                      request: { ...state.error.retryTarget.request },
                    }
                  : { ...state.error.retryTarget },
          },
    pendingRetry:
      state.pendingRetry === undefined
        ? undefined
        : {
            requestId: state.pendingRetry.requestId,
            retryTarget:
              state.pendingRetry.retryTarget.kind === "advisory"
                ? {
                    kind: "advisory",
                    request: { ...state.pendingRetry.retryTarget.request },
                  }
                : { ...state.pendingRetry.retryTarget },
          },
    pendingRequests: { ...state.pendingRequests },
  };
}

function toSelectedRoute(
  route:
    | NonNullable<FlowState["selectedRoute"]>
    | (typeof nearbyCandidates)[number],
  source: "nearby" | "manual"
) {
  if ("source" in route) {
    return { ...route };
  }

  return {
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
    code: route.code,
    name: route.name,
    source,
    ...(route.distanceMeters === undefined
      ? {}
      : { distanceMeters: route.distanceMeters }),
  };
}

function toSelectedDirection(direction: (typeof nearbyDirections)[number]) {
  return {
    routeDirectionId: direction.routeDirectionId,
    sequence: direction.sequence,
    name: direction.name,
    departureLabels: [...direction.departureLabels],
  };
}
