import { backendFetch } from "@/lib/backend/client";
import type { DealListItem } from "@/types/deal";
import type { PipelineData } from "@/components/deals/DealsView";
import type { UserListItem } from "@/hooks/users/use-users";
import { getPipelineView } from "@/actions/pipeline-view";
import type { PipelineSummary } from "@/hooks/pipelines/use-pipelines";
import { DealsView } from "@/components/deals/DealsView";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: {
    view?: string;
    groupBy?: string;
    pipelineId?: string;
    search?: string;
    status?: string;
    valueRange?: string;
    sortBy?: string;
    displayMode?: string;
    owner?: string;
    closedMonth?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const view = searchParams.view || "list";
  const groupBy = searchParams.groupBy || "none";

  const users = await backendFetch<UserListItem[]>('/users').catch(() => [] as UserListItem[]);

  if (view === "kanban") {
    const [pipelineData, allPipelines] = await Promise.all([
      getPipelineView(searchParams.pipelineId),
      backendFetch<PipelineSummary[]>('/pipelines'),
    ]);

    return (
      <DealsView
        initialView="kanban"
        pipelineData={(pipelineData ?? undefined) as unknown as PipelineData | undefined}
        allPipelines={allPipelines}
        groupBy={groupBy}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        users={users}
      />
    );
  }

  const dealsQs = new URLSearchParams();
  if (searchParams.search) dealsQs.set("search", searchParams.search);
  if (searchParams.status) dealsQs.set("status", searchParams.status);
  if (searchParams.valueRange) dealsQs.set("valueRange", searchParams.valueRange);
  if (searchParams.sortBy) dealsQs.set("sortBy", searchParams.sortBy);
  if (searchParams.owner) dealsQs.set("owner", searchParams.owner);
  if (searchParams.closedMonth) dealsQs.set("closedMonth", searchParams.closedMonth);

  const deals = await backendFetch<DealListItem[]>(`/deals?${dealsQs}`).catch((): DealListItem[] => []);

  const dealIds = (deals as { id: string }[]).map((deal) => deal.id);
  const sharedUsersMap = dealIds.length > 0
    ? await backendFetch<Record<string, { id: string; name: string }[]>>(
        `/shared-entities/batch?entityType=deal&entityIds=${dealIds.join(",")}`
      ).catch(() => ({}))
    : {};

  return (
    <DealsView
      initialView="list"
      deals={deals}
      groupBy={groupBy}
      displayMode={searchParams.displayMode}
      isAdmin={isAdmin}
      currentUserId={currentUserId}
      users={users}
      sharedUsersMap={sharedUsersMap}
    />
  );
}
