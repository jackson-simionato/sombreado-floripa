export const ADVICE_TIME_CHIPS = [
  { offsetMinutes: 0, label: "Agora" },
  { offsetMinutes: 15, label: "+15 min" },
  { offsetMinutes: 30, label: "+30 min" },
] as const;

export type AdviceTimeOffsetMinutes =
  (typeof ADVICE_TIME_CHIPS)[number]["offsetMinutes"];

export function observedAtForTimeChip(
  offsetMinutes: AdviceTimeOffsetMinutes,
  now: Date
): string {
  return new Date(now.getTime() + offsetMinutes * 60_000).toISOString();
}
