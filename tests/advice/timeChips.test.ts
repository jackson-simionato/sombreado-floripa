import { describe, expect, test } from "vitest";

import {
  ADVICE_TIME_CHIPS,
  observedAtForTimeChip,
} from "../../src/advice/timeChips";

describe("advice time chips", () => {
  test("exposes Agora, +15 min, and +30 min as the near-now offsets", () => {
    expect(ADVICE_TIME_CHIPS).toEqual([
      { offsetMinutes: 0, label: "Agora" },
      { offsetMinutes: 15, label: "+15 min" },
      { offsetMinutes: 30, label: "+30 min" },
    ]);
  });

  test("maps each chip onto an ISO observedAt shifted from now", () => {
    const now = new Date("2026-08-29T15:00:00.000Z");

    expect(observedAtForTimeChip(0, now)).toBe("2026-08-29T15:00:00.000Z");
    expect(observedAtForTimeChip(15, now)).toBe("2026-08-29T15:15:00.000Z");
    expect(observedAtForTimeChip(30, now)).toBe("2026-08-29T15:30:00.000Z");
  });
});
