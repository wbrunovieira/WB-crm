import { getDeals } from "@/actions/deals";
import { getUsers } from "@/actions/users";
import { getPipelineView } from "@/actions/pipeline-view";
import { getPipelines } from "@/actions/pipelines";
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
  };
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";
  const currentUserId = session?.user?.id || "";

  const view = searchParams.view || "list";
  const groupBy = searchParams.groupBy || "none";

  const users = isAdmin ? await getUsers() : [];

  if (view === "kanban") {
    const [pipelineData, allPipelines] = await Promise.all([
      getPipelineView(searchParams.pipelineId),
      getPipelines(),
    ]);

    return (
      <DealsView
        initialView="kanban"
        pipelineData={pipelineData}
        allPipelines={allPipelines}
        groupBy={groupBy}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        users={users}
      />
    );
  }

  const deals = await getDeals({
    search: searchParams.search,
    status: searchParams.status,
    valueRange: searchParams.valueRange,
    sortBy: searchParams.sortBy,
    owner: searchParams.owner,
  });

  return (
    <DealsView
      initialView="list"
      deals={deals}
      groupBy={groupBy}
      displayMode={searchParams.displayMode}
      isAdmin={isAdmin}
      currentUserId={currentUserId}
      users={users}
    />
  );
}
