// Default conversion rates from the sales funnel spreadsheet
const DEFAULT_RATES = {
  salesRate: 0.33,          // reuniões realizadas → vendas
  holdRate: 0.82,           // reuniões marcadas → reuniões realizadas
  meetingRate: 0.32,        // conexões c/ decisor → reuniões marcadas
  decisorRate: 0.16,        // conexões → conexões c/ decisor
  connectionRate: 0.59,     // ligações → conexões
  avgAttemptsPerLead: 2.5,  // tentativas de ligação por lead único
};

export type ConversionRates = {
  salesRate?: number;
  holdRate?: number;
  meetingRate?: number;
  decisorRate?: number;
  connectionRate?: number;
  avgAttemptsPerLead?: number;
};

export type GoalBreakdown = {
  targetSales: number;
  requiredMeetingsHeld: number;
  requiredMeetingsScheduled: number;
  requiredDecisorConnections: number;
  requiredConnections: number;
  requiredCalls: number;
  requiredUniqueLeads: number;
  avgAttemptsPerLead: number;
};

export function computeGoalBreakdown(
  targetSales: number,
  rates?: ConversionRates
): GoalBreakdown {
  const r = { ...DEFAULT_RATES, ...rates };

  if (targetSales <= 0) {
    return {
      targetSales: 0,
      requiredMeetingsHeld: 0,
      requiredMeetingsScheduled: 0,
      requiredDecisorConnections: 0,
      requiredConnections: 0,
      requiredCalls: 0,
      requiredUniqueLeads: 0,
      avgAttemptsPerLead: r.avgAttemptsPerLead,
    };
  }

  const requiredMeetingsHeld         = Math.ceil(targetSales / r.salesRate);
  const requiredMeetingsScheduled    = Math.ceil(requiredMeetingsHeld / r.holdRate);
  const requiredDecisorConnections   = Math.ceil(requiredMeetingsScheduled / r.meetingRate);
  const requiredConnections          = Math.ceil(requiredDecisorConnections / r.decisorRate);
  const requiredCalls                = Math.ceil(requiredConnections / r.connectionRate);
  const requiredUniqueLeads          = Math.ceil(requiredCalls / r.avgAttemptsPerLead);

  return {
    targetSales,
    requiredMeetingsHeld,
    requiredMeetingsScheduled,
    requiredDecisorConnections,
    requiredConnections,
    requiredCalls,
    requiredUniqueLeads,
    avgAttemptsPerLead: r.avgAttemptsPerLead,
  };
}
