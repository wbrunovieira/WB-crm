/**
 * Validation schemas for Admin Manager Dashboard
 */

import { z } from "zod";

// Period filter options
export const periodOptions = ["today", "week", "month", "custom"] as const;
export type PeriodOption = (typeof periodOptions)[number];

// Date range filter schema
export const dateRangeSchema = z.object({
  period: z.enum(periodOptions).default("month"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    // If period is custom, both dates are required
    if (data.period === "custom") {
      return data.startDate && data.endDate;
    }
    return true;
  },
  {
    message: "Data inicial e final são obrigatórias para período personalizado",
  }
).refine(
  (data) => {
    // End date must be after start date
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: "Data final deve ser maior ou igual à data inicial",
  }
);

export type DateRangeInput = z.input<typeof dateRangeSchema>;
export type DateRange = z.output<typeof dateRangeSchema>;

/**
 * Calculate date range based on period option
 */
export function getDateRangeFromPeriod(period: PeriodOption): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "custom":
    default:
      // For custom, caller must provide dates
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

/**
 * Get previous period for comparison
 */
export function getPreviousPeriodRange(
  startDate: Date,
  endDate: Date
): { startDate: Date; endDate: Date } {
  const periodLength = endDate.getTime() - startDate.getTime();

  return {
    startDate: new Date(startDate.getTime() - periodLength),
    endDate: new Date(startDate.getTime() - 1), // Day before current period
  };
}
