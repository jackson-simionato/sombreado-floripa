import type { SelectedDirection, SelectedRoute } from "../domain/types";

export const ADVICE_RECENTS_STORAGE_KEY = "sombreado.adviceRecents";
export const ADVICE_RECENTS_MAX = 5;

export type AdviceRecent = {
  routeId: string;
  routeVersionId: string;
  routeCode: string;
  routeName: string;
  routeDirectionId: string;
  directionLabel: string;
};

export function toAdviceRecent(
  route: Pick<SelectedRoute, "routeId" | "routeVersionId" | "code" | "name">,
  direction: Pick<SelectedDirection, "routeDirectionId" | "name">
): AdviceRecent {
  return {
    routeId: route.routeId,
    routeVersionId: route.routeVersionId,
    routeCode: route.code,
    routeName: route.name,
    routeDirectionId: direction.routeDirectionId,
    directionLabel: direction.name,
  };
}

export function readAdviceRecents(
  storage: Storage = window.localStorage
): AdviceRecent[] {
  const raw = storage.getItem(ADVICE_RECENTS_STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      const recent = parseAdviceRecent(item);
      return recent === undefined ? [] : [recent];
    });
  } catch {
    return [];
  }
}

export function recordAdviceRecent(
  recent: AdviceRecent,
  storage: Storage = window.localStorage
): AdviceRecent[] {
  const recents = [
    recent,
    ...readAdviceRecents(storage).filter(
      (item) => !isSameAdviceRecent(item, recent)
    ),
  ].slice(0, ADVICE_RECENTS_MAX);

  writeAdviceRecents(recents, storage);
  return recents;
}

export function dropAdviceRecent(
  identity: Pick<AdviceRecent, "routeId" | "routeDirectionId">,
  storage: Storage = window.localStorage
): AdviceRecent[] {
  const recents = readAdviceRecents(storage).filter(
    (item) => !isSameAdviceRecent(item, identity)
  );
  writeAdviceRecents(recents, storage);
  return recents;
}

function writeAdviceRecents(recents: AdviceRecent[], storage: Storage): void {
  storage.setItem(ADVICE_RECENTS_STORAGE_KEY, JSON.stringify(recents));
}

function isSameAdviceRecent(
  left: Pick<AdviceRecent, "routeId" | "routeDirectionId">,
  right: Pick<AdviceRecent, "routeId" | "routeDirectionId">
): boolean {
  return (
    left.routeId === right.routeId &&
    left.routeDirectionId === right.routeDirectionId
  );
}

function parseAdviceRecent(value: unknown): AdviceRecent | undefined {
  if (value === null || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.routeId !== "string" ||
    record.routeId.length === 0 ||
    typeof record.routeVersionId !== "string" ||
    record.routeVersionId.length === 0 ||
    typeof record.routeCode !== "string" ||
    record.routeCode.length === 0 ||
    typeof record.routeName !== "string" ||
    record.routeName.length === 0 ||
    typeof record.routeDirectionId !== "string" ||
    record.routeDirectionId.length === 0 ||
    typeof record.directionLabel !== "string" ||
    record.directionLabel.length === 0
  ) {
    return undefined;
  }

  return {
    routeId: record.routeId,
    routeVersionId: record.routeVersionId,
    routeCode: record.routeCode,
    routeName: record.routeName,
    routeDirectionId: record.routeDirectionId,
    directionLabel: record.directionLabel,
  };
}
