export type FunnelActivity = {
  type: string;
  gotoDuration: number | null;
  callContactType: string | null;
  completed: boolean;
  meetingNoShow: boolean;
  dueDate: Date | null;
};

export type FunnelDeal = {
  status: string;
  closedAt: Date | null;
};

export type FunnelStats = {
  calls: number;
  connections: number;
  decisorConnections: number;
  meetingsScheduled: number;
  meetingsHeld: number;
  sales: number;
};

export function computeFunnelStats(
  activities: FunnelActivity[],
  deals: FunnelDeal[],
  weekStart: Date,
  weekEnd: Date
): FunnelStats {
  const inWeek = (date: Date | null): boolean =>
    date !== null && date >= weekStart && date < weekEnd;

  const calls = activities.filter(
    (a) => a.type === "call" && inWeek(a.dueDate)
  );

  const meetings = activities.filter(
    (a) => a.type === "meeting" && inWeek(a.dueDate)
  );

  return {
    calls: calls.length,
    connections: calls.filter((a) => a.gotoDuration !== null && a.gotoDuration > 60).length,
    decisorConnections: calls.filter((a) => a.callContactType === "decisor").length,
    meetingsScheduled: meetings.length,
    meetingsHeld: meetings.filter((a) => a.completed && !a.meetingNoShow).length,
    sales: deals.filter(
      (d) => d.status === "won" && inWeek(d.closedAt)
    ).length,
  };
}
