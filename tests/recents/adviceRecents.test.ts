import { describe, expect, test } from "vitest";

import {
  ADVICE_RECENTS_MAX,
  ADVICE_RECENTS_STORAGE_KEY,
  dropAdviceRecent,
  readAdviceRecents,
  recordAdviceRecent,
  toAdviceRecent,
} from "../../src/recents/adviceRecents";

const lagoa = {
  routeId: "route-124",
  routeVersionId: "version-124",
  routeCode: "124",
  routeName: "TICEN - Lagoa",
  routeDirectionId: "direction-124",
  directionLabel: "TICEN para Lagoa",
};

describe("advice recents", () => {
  test("reads an empty list when storage has no recents", () => {
    expect(readAdviceRecents(createMemoryStorage())).toEqual([]);
  });

  test("reads an empty list when stored JSON is corrupt", () => {
    const storage = createMemoryStorage({
      [ADVICE_RECENTS_STORAGE_KEY]: "{not-json",
    });

    expect(readAdviceRecents(storage)).toEqual([]);
  });

  test("records a recent with the advice-query fields", () => {
    const storage = createMemoryStorage();

    expect(recordAdviceRecent(lagoa, storage)).toEqual([lagoa]);
    expect(readAdviceRecents(storage)).toEqual([lagoa]);
  });

  test("keeps the newest recent first and caps the list", () => {
    const storage = createMemoryStorage();

    for (let index = 1; index <= ADVICE_RECENTS_MAX + 1; index += 1) {
      recordAdviceRecent(
        {
          ...lagoa,
          routeId: `route-${index}`,
          routeDirectionId: `direction-${index}`,
          routeCode: String(index),
        },
        storage
      );
    }

    const recents = readAdviceRecents(storage);
    expect(recents).toHaveLength(ADVICE_RECENTS_MAX);
    expect(recents[0]?.routeId).toBe(`route-${ADVICE_RECENTS_MAX + 1}`);
    expect(recents.at(-1)?.routeId).toBe("route-2");
  });

  test("dedupes the same route and direction and refreshes the version", () => {
    const storage = createMemoryStorage();
    recordAdviceRecent(lagoa, storage);
    recordAdviceRecent(
      {
        ...lagoa,
        routeId: "route-133",
        routeDirectionId: "direction-133",
        routeCode: "133",
      },
      storage
    );

    const updated = recordAdviceRecent(
      { ...lagoa, routeVersionId: "version-124-b" },
      storage
    );

    expect(updated).toEqual([
      { ...lagoa, routeVersionId: "version-124-b" },
      {
        ...lagoa,
        routeId: "route-133",
        routeDirectionId: "direction-133",
        routeCode: "133",
      },
    ]);
  });

  test("drops a recent by route and direction", () => {
    const storage = createMemoryStorage();
    recordAdviceRecent(lagoa, storage);
    recordAdviceRecent(
      {
        ...lagoa,
        routeId: "route-133",
        routeDirectionId: "direction-133",
        routeCode: "133",
      },
      storage
    );

    expect(
      dropAdviceRecent(
        { routeId: "route-124", routeDirectionId: "direction-124" },
        storage
      )
    ).toEqual([
      {
        ...lagoa,
        routeId: "route-133",
        routeDirectionId: "direction-133",
        routeCode: "133",
      },
    ]);
  });

  test("maps a selected route and direction onto a recent", () => {
    expect(
      toAdviceRecent(
        {
          routeId: "route-124",
          routeVersionId: "version-124",
          code: "124",
          name: "TICEN - Lagoa",
        },
        {
          routeDirectionId: "direction-124",
          name: "TICEN para Lagoa",
        }
      )
    ).toEqual(lagoa);
  });
});

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}
