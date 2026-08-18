import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "daily-goal:v1";
// { "YYYY-MM-DD": number } — each entry is the goal value effective FROM that day forward,
// until the next recorded change. Without this, changing today's goal retroactively rewrote
// whether a PAST day (evaluated against whatever goal is "current" now) had met ITS goal —
// e.g. hitting a 10-visit goal yesterday, then raising today's goal to 20, made yesterday look
// like it missed a 20-visit goal it was never actually held to.
const HISTORY_KEY = "daily-goal-history:v1";

/** Starting point recommended for door-to-door B2B prospecting with full data capture (contact +
 *  notes, not just a knock) — adjust after a week of real field data. Editable from today.tsx. */
export const DEFAULT_DAILY_GOAL = 10;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDailyGoal(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_GOAL;
}

export async function setDailyGoal(goal: number): Promise<void> {
  const value = Math.max(1, Math.round(goal));
  await AsyncStorage.setItem(KEY, String(value));
  const history = await getGoalHistory();
  history[todayKey()] = value;
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/** Every recorded goal change — powers per-day lookups for the streak/record calculation. */
export async function getGoalHistory(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : {};
}

/** Resolves whichever goal was actually in effect on `dayKey` ("YYYY-MM-DD") — the most recent
 *  recorded change on or before that day, or DEFAULT_DAILY_GOAL if no change was ever recorded
 *  before then. Local-only storage, no server sync: a device that customized the goal BEFORE
 *  this history mechanism existed has no record of that older value, so days before this
 *  feature's first edit retroactively resolve to the default — accepted limitation, not fixable
 *  after the fact. */
export function resolveGoalForDay(dayKey: string, history: Record<string, number>): number {
  const keys = Object.keys(history).filter((k) => k <= dayKey).sort();
  return keys.length ? history[keys[keys.length - 1]] : DEFAULT_DAILY_GOAL;
}
