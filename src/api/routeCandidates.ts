import { z } from "zod";

const routeCandidateSchema = z.object({
  routeId: z.string(),
  routeVersionId: z.string(),
  routeCode: z.string(),
  routeName: z.string(),
  distanceMeters: z.number().optional(),
  directionHints: z.array(z.string()).optional(),
});

export const routeCandidatesResponseSchema = z.object({
  routes: z.array(routeCandidateSchema),
});

export type RouteCandidateTransport = z.infer<typeof routeCandidateSchema>;
export type RouteCandidatesResponseTransport = z.infer<
  typeof routeCandidatesResponseSchema
>;

export type LiveApiErrorKind =
  | "configuration"
  | "network"
  | "http"
  | "malformedResponse";

export type RouteCandidateRequestOptions = {
  signal?: AbortSignal;
};

export class LiveApiError extends Error {
  readonly kind: LiveApiErrorKind;
  readonly status?: number;

  constructor(input: {
    kind: LiveApiErrorKind;
    message: string;
    status?: number;
  }) {
    super(input.message);
    this.name = "LiveApiError";
    this.kind = input.kind;
    this.status = input.status;
  }
}

export type RouteCandidatesClient = {
  listNearbyRouteCandidates(
    input: {
      lat: number;
      lng: number;
      radiusMeters: number;
      limit: number;
    },
    options?: RouteCandidateRequestOptions
  ): Promise<RouteCandidatesResponseTransport>;
  searchRouteCandidates(
    input: {
      query: string;
      limit: number;
    },
    options?: RouteCandidateRequestOptions
  ): Promise<RouteCandidatesResponseTransport>;
};

export function requireApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim().replace(/\/+$/, "");

  if (trimmed === undefined || trimmed.length === 0) {
    throw new LiveApiError({
      kind: "configuration",
      message: "NEXT_PUBLIC_API_URL is required for live API mode.",
    });
  }

  return trimmed;
}

export function createRouteCandidatesClient({
  baseUrl,
  fetchImpl = fetch,
}: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): RouteCandidatesClient {
  const normalizedBaseUrl = requireApiBaseUrl(baseUrl);

  return {
    listNearbyRouteCandidates(input, options) {
      const searchParams = new URLSearchParams({
        lat: input.lat.toString(),
        lng: input.lng.toString(),
        radiusMeters: input.radiusMeters.toString(),
        limit: input.limit.toString(),
      });

      return requestRouteCandidates(
        fetchImpl,
        `${normalizedBaseUrl}/route-candidates/nearby?${searchParams.toString()}`,
        options
      );
    },

    searchRouteCandidates(input, options) {
      const searchParams = new URLSearchParams({
        query: input.query,
        limit: input.limit.toString(),
      });

      return requestRouteCandidates(
        fetchImpl,
        `${normalizedBaseUrl}/route-candidates/search?${searchParams.toString()}`,
        options
      );
    },
  };
}

async function requestRouteCandidates(
  fetchImpl: typeof fetch,
  url: string,
  options?: RouteCandidateRequestOptions
): Promise<RouteCandidatesResponseTransport> {
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      credentials: "omit",
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  } catch (error) {
    throw new LiveApiError({
      kind: "network",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível conectar à API de linhas.",
    });
  }

  if (!response.ok) {
    throw new LiveApiError({
      kind: "http",
      status: response.status,
      message: "Não consegui carregar as linhas agora.",
    });
  }

  const body: unknown = await response.json();
  const parsed = routeCandidatesResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new LiveApiError({
      kind: "malformedResponse",
      message: "A resposta da API de linhas veio em um formato inesperado.",
    });
  }

  return parsed.data;
}
