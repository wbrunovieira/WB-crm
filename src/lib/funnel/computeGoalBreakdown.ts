// Default conversion rates from the sales funnel spreadsheet
const DEFAULT_RATES = {
  salesRate: 0.33,       // reuniões realizadas → vendas
  holdRate: 0.82,        // reuniões marcadas → reuniões realizadas
  meetingRate: 0.32,     // conexões c/ decisor → reuniões marcadas
  decisorRate: 0.16,     // conexões → conexões c/ decisor
  connectionRate: 0.59,  // ligações → conexões
};

export type ConversionRates = {
  salesRate?: number;
  holdRate?: number;
  meetingRate?: number;
  decisorRate?: number;
  connectionRate?: number;
};

export type GoalBreakdown = {
  targetSales: number;
  requiredMeetingsHeld: number;
  requiredMeetingsScheduled: number;
  requiredDecisorConnections: number;
  requiredConnections: number;
  requiredCalls: number;
};

export function computeGoalBreakdown(
  targetSales: number,
  rates?: ConversionRates
): GoalBreakdown {
  if (targetSales <= 0) {
    return {
      targetSales: 0,
      requiredMeetingsHeld: 0,
      requiredMeetingsScheduled: 0,
      requiredDecisorConnections: 0,
      requiredConnections: 0,
      requiredCalls: 0,
    };
  }

  const r = { ...DEFAULT_RATES, ...rates };

  const requiredMeetingsHeld         = Math.ceil(targetSales / r.salesRate);
  const requiredMeetingsScheduled    = Math.ceil(requiredMeetingsHeld / r.holdRate);
  const requiredDecisorConnections   = Math.ceil(requiredMeetingsScheduled / r.meetingRate);
  const requiredConnections          = Math.ceil(requiredDecisorConnections / r.decisorRate);
  const requiredCalls                = Math.ceil(requiredConnections / r.connectionRate);

  return {
    targetSales,
    requiredMeetingsHeld,
    requiredMeetingsScheduled,
    requiredDecisorConnections,
    requiredConnections,
    requiredCalls,
  };
}
