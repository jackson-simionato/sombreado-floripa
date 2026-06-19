import { z } from "zod";

export const publicApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    requestId: z.string().optional(),
  }),
});

export type BrowserRequestOptions = {
  signal?: AbortSignal;
};

export type LiveApiErrorKind =
  | "configuration"
  | "network"
  | "http"
  | "malformedResponse"
  | "aborted";

export class LiveApiError extends Error {
  readonly kind: LiveApiErrorKind;
  declare readonly status?: number;
  declare readonly code?: string;

  constructor(input: {
    kind: LiveApiErrorKind;
    message: string;
    status?: number;
    code?: string;
  }) {
    super(input.message);
    this.name = "LiveApiError";
    this.kind = input.kind;

    if (input.status !== undefined) {
      this.status = input.status;
    }

    if (input.code !== undefined) {
      this.code = input.code;
    }
  }
}

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

export function isAbortedApiError(error: unknown): boolean {
  return error instanceof LiveApiError && error.kind === "aborted";
}

export async function requestBrowserJson<T>({
  fetchImpl,
  url,
  schema,
  options,
  requestFailureMessage,
  malformedResponseMessage,
}: {
  fetchImpl: typeof fetch;
  url: string;
  schema: z.ZodType<T>;
  options?: BrowserRequestOptions;
  requestFailureMessage: string;
  malformedResponseMessage: string;
}): Promise<T> {
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      credentials: "omit",
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LiveApiError({
        kind: "aborted",
        message: error.message,
      });
    }

    throw new LiveApiError({
      kind: "network",
      message: error instanceof Error ? error.message : requestFailureMessage,
    });
  }

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    const parsedError = publicApiErrorEnvelopeSchema.safeParse(body);

    throw new LiveApiError({
      kind: "http",
      status: response.status,
      message: requestFailureMessage,
      ...(parsedError.success ? { code: parsedError.data.error.code } : {}),
    });
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new LiveApiError({
      kind: "malformedResponse",
      message: malformedResponseMessage,
    });
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new LiveApiError({
      kind: "malformedResponse",
      message: malformedResponseMessage,
    });
  }

  return parsed.data;
}
