import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "daily-goal:v1";

/** Starting point recommended for door-to-door B2B prospecting with full data capture (contact +
 *  notes, not just a knock) — adjust after a week of real field data. Editable from today.tsx. */
export const DEFAULT_DAILY_GOAL = 10;

export async function getDailyGoal(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_GOAL;
}

export async function setDailyGoal(goal: number): Promise<void> {
  await AsyncStorage.setItem(KEY, String(Math.max(1, Math.round(goal))));
}
