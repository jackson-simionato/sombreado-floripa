import type {
  DirectionChoice,
  DirectionalExposure,
  ExposureDirection,
  FlowAdvisoryResponse,
  RouteCandidate,
  RouteDirectionsResponse,
  RouteSelectionSource,
  RoutesResponse,
  TargetAdvisoryRequest,
  UiAdviceState,
} from "./types";

export const DEFAULT_ADVISORY_WINDOW_MINUTES = 15;

export function toRouteCandidates(
  routesResponse: RoutesResponse,
  options: { source?: RouteSelectionSource } = {}
): RouteCandidate[] {
  const candidates = routesResponse.routes.map((route) => ({
    routeId: route.route_id,
    routeVersionId: route.route_version_id,
    code: route.route_code,
    name: route.route_name,
    ...(route.distance_meters === undefined
      ? {}
      : { distanceMeters: route.distance_meters }),
    directionHints: route.directions.flatMap((direction) => [
      direction.name,
      ...direction.departure_labels,
    ]),
  }));

  if (options.source !== "nearby") {
    return candidates;
  }

  return [...candidates].sort(compareNearbyCandidates);
}

export function toDirectionChoices(
  routeDirectionsResponse: RouteDirectionsResponse
): DirectionChoice[] {
  return routeDirectionsResponse.directions.map((direction) => ({
    routeDirectionId: direction.route_direction_id,
    sequence: direction.sequence,
    name: direction.name,
    departureLabels: [...direction.departure_labels],
  }));
}

export function toUiAdvice(
  advisoryResponse: FlowAdvisoryResponse
): UiAdviceState {
  if (advisoryResponse.status === "advice") {
    const recommendedSeatArea = advisoryResponse.recommendedSeatArea;

    if (
      recommendedSeatArea === "neutral" ||
      advisoryResponse.directSunExposure === "overhead" ||
      advisoryResponse.directSunExposure === "none"
    ) {
      return {
        mode: "neutralComputed",
        directSunExposure:
          advisoryResponse.directSunExposure === "overhead"
            ? "overhead"
            : "none",
      };
    }

    if (advisoryResponse.mode === "preview") {
      return {
        mode: "preview",
        directSunExposure:
          advisoryResponse.directSunExposure as DirectionalExposure,
        recommendedSeatArea,
        previewSource: "estimated_route_point",
        ...(advisoryResponse.position?.distanceFromRouteMeters === undefined
          ? {}
          : {
              distanceFromRouteMeters:
                advisoryResponse.position.distanceFromRouteMeters,
            }),
      };
    }

    return {
      mode: "onboard",
      directSunExposure:
        advisoryResponse.directSunExposure as DirectionalExposure,
      recommendedSeatArea,
    };
  }

  if (advisoryResponse.status === "withheld") {
    return {
      mode: "withheld",
      reasonCode:
        "reasonCode" in advisoryResponse
          ? advisoryResponse.reasonCode
          : (advisoryResponse.reason_code ?? "service_unavailable"),
    };
  }

  const dominantDirection =
    advisoryResponse.upcoming_window?.dominant_direction;
  if (dominantDirection === undefined) {
    return {
      mode: "withheld",
      reasonCode: "insufficient_sun_signal",
    };
  }

  if (dominantDirection === "overhead" || dominantDirection === "none") {
    return {
      mode: "neutralComputed",
      directSunExposure: dominantDirection,
    };
  }

  const recommendedSeatArea = invertExposure(dominantDirection);
  if (advisoryResponse.advisory_context === "estimated_route_point") {
    return {
      mode: "preview",
      directSunExposure: dominantDirection,
      recommendedSeatArea,
      previewSource: "estimated_route_point",
      ...(advisoryResponse.projected_position === undefined
        ? {}
        : {
            distanceFromRouteMeters:
              advisoryResponse.projected_position.distance_from_route_meters,
          }),
    };
  }

  return {
    mode: "onboard",
    directSunExposure: dominantDirection,
    recommendedSeatArea,
  };
}

export function buildTargetAdvisoryRequest(input: {
  lat: number;
  lng: number;
  routeVersionId: string;
  routeDirectionId: string;
  now?: () => Date;
  windowMinutes?: number;
  includeRemaining?: boolean;
}): TargetAdvisoryRequest {
  return {
    lat: input.lat,
    lng: input.lng,
    route_version_id: input.routeVersionId,
    route_direction_id: input.routeDirectionId,
    datetime: (input.now ?? (() => new Date()))().toISOString(),
    window_minutes: input.windowMinutes ?? DEFAULT_ADVISORY_WINDOW_MINUTES,
    include_remaining: input.includeRemaining ?? true,
  };
}

function compareNearbyCandidates(
  left: RouteCandidate,
  right: RouteCandidate
): number {
  if (left.distanceMeters !== undefined && right.distanceMeters === undefined) {
    return -1;
  }
  if (left.distanceMeters === undefined && right.distanceMeters !== undefined) {
    return 1;
  }
  if (left.distanceMeters !== undefined && right.distanceMeters !== undefined) {
    const byDistance = left.distanceMeters - right.distanceMeters;
    if (byDistance !== 0) {
      return byDistance;
    }
  }

  return `${left.code} ${left.name}`.localeCompare(
    `${right.code} ${right.name}`,
    "pt-BR",
    {
      numeric: true,
      sensitivity: "base",
    }
  );
}

function invertExposure(exposure: DirectionalExposure): DirectionalExposure {
  const mapping: Record<DirectionalExposure, DirectionalExposure> = {
    left: "right",
    right: "left",
    front: "back",
    back: "front",
  };

  return mapping[exposure];
}

export function isDirectionalExposure(
  exposure: ExposureDirection
): exposure is DirectionalExposure {
  return exposure !== "overhead" && exposure !== "none";
}
