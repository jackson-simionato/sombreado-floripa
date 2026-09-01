import type {
  DirectionalExposure,
  RouteDirectionKind,
  SelectedDirection,
  SelectedRoute,
} from "../domain/types";

export type AdviceShareTarget = {
  routeId: string;
  routeVersionId: string;
  routeCode: string;
  routeName: string;
  routeDirectionId: string;
  directionLabel: string;
  directionKind: RouteDirectionKind | null;
};

export type AdviceShareSeatArea = DirectionalExposure | "neutral";

export function toAdviceShareTarget(
  route: Pick<SelectedRoute, "routeId" | "routeVersionId" | "code" | "name">,
  direction: Pick<
    SelectedDirection,
    "routeDirectionId" | "name" | "directionKind"
  >
): AdviceShareTarget {
  return {
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
    routeCode: route.code,
    routeName: route.name,
    routeDirectionId: direction.routeDirectionId,
    directionLabel: direction.name,
    directionKind: direction.directionKind,
  };
}

const SHARE_PARAMS = {
  linha: "linha",
  sentido: "sentido",
  version: "v",
  codigo: "codigo",
  nome: "nome",
  destino: "destino",
  kind: "k",
} as const;

const SEAT_CLAUSE: Record<DirectionalExposure, string> = {
  left: "senta à esquerda",
  right: "senta à direita",
  front: "senta mais à frente",
  back: "senta no fundo",
};

export function formatAdviceShareSentence(input: {
  routeCode: string;
  directionKind: RouteDirectionKind | null;
  directionLabel: string;
  recommendedSeatArea: AdviceShareSeatArea;
}): string {
  const kind = input.directionKind === null ? "" : ` ${input.directionKind}`;
  const label = shareDirectionLabel(input.directionLabel);
  const seat =
    input.recommendedSeatArea === "neutral"
      ? ""
      : `, ${SEAT_CLAUSE[input.recommendedSeatArea]}`;

  return `Linha ${input.routeCode}${kind} (${label})${seat} — Sombreado`;
}

export function buildAdviceShareUrl(input: {
  origin: string;
  target: AdviceShareTarget;
}): string {
  const params = new URLSearchParams();
  params.set(SHARE_PARAMS.linha, input.target.routeId);
  params.set(SHARE_PARAMS.sentido, input.target.routeDirectionId);
  params.set(SHARE_PARAMS.version, input.target.routeVersionId);
  params.set(SHARE_PARAMS.codigo, input.target.routeCode);
  params.set(SHARE_PARAMS.nome, input.target.routeName);
  params.set(SHARE_PARAMS.destino, input.target.directionLabel);
  if (input.target.directionKind !== null) {
    params.set(SHARE_PARAMS.kind, input.target.directionKind);
  }

  return `${trimTrailingSlash(input.origin)}/?${params.toString()}`;
}

export function parseAdviceShareLink(
  href: string
): AdviceShareTarget | undefined {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }

  const linha = url.searchParams.get(SHARE_PARAMS.linha);
  const sentido = url.searchParams.get(SHARE_PARAMS.sentido);
  const version = url.searchParams.get(SHARE_PARAMS.version);
  const codigo = url.searchParams.get(SHARE_PARAMS.codigo) ?? "";
  const nome = url.searchParams.get(SHARE_PARAMS.nome) ?? "";
  const destino = url.searchParams.get(SHARE_PARAMS.destino) ?? "";
  const kind = url.searchParams.get(SHARE_PARAMS.kind);

  if (
    linha === null ||
    linha.length === 0 ||
    sentido === null ||
    sentido.length === 0 ||
    version === null ||
    version.length === 0
  ) {
    return undefined;
  }

  if (kind !== null && kind !== "ida" && kind !== "volta") {
    return undefined;
  }

  return {
    routeId: linha,
    routeVersionId: version,
    routeCode: codigo,
    routeName: nome,
    routeDirectionId: sentido,
    directionLabel: destino,
    directionKind: kind === null ? null : kind,
  };
}

export type AdviceSharePayload = {
  sentence: string;
  url: string;
};

export function buildAdviceSharePayload(input: {
  origin: string;
  recommendedSeatArea: AdviceShareSeatArea;
  target: AdviceShareTarget;
}): AdviceSharePayload {
  return {
    sentence: formatAdviceShareSentence({
      directionKind: input.target.directionKind,
      directionLabel: input.target.directionLabel,
      recommendedSeatArea: input.recommendedSeatArea,
      routeCode: input.target.routeCode,
    }),
    url: buildAdviceShareUrl({
      origin: input.origin,
      target: input.target,
    }),
  };
}

export function adviceShareText(payload: AdviceSharePayload): string {
  return `${payload.sentence}\n${payload.url}`;
}

export async function shareAdvice(input: {
  payload: AdviceSharePayload;
  share?: (data: { text: string }) => Promise<void>;
  copyText?: (text: string) => Promise<void>;
}): Promise<"shared" | "copied" | "dismissed"> {
  const text = adviceShareText(input.payload);

  if (input.share !== undefined) {
    try {
      await input.share({ text });
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "dismissed";
      }
    }
  }

  if (input.copyText !== undefined) {
    await input.copyText(text);
    return "copied";
  }

  return "dismissed";
}

function shareDirectionLabel(directionLabel: string): string {
  return directionLabel.replace(" para ", " → ");
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function trimTrailingSlash(origin: string): string {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}
