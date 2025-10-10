import { getDeals } from "@/actions/deals";
import { getPipelineView } from "@/actions/pipeline-view";
import { getPipelines } from "@/actions/pipelines";
import { DealsView } from "@/components/deals/DealsView";

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
  };
}) {
  const view = searchParams.view || "list";
  const groupBy = searchParams.groupBy || "none";

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
      />
    );
  }

  const deals = await getDeals({
    search: searchParams.search,
    status: searchParams.status,
    valueRange: searchParams.valueRange,
    sortBy: searchParams.sortBy,
  });

  return (
    <DealsView
      initialView="list"
      deals={deals}
      groupBy={groupBy}
      displayMode={searchParams.displayMode}
    />
  );
}
