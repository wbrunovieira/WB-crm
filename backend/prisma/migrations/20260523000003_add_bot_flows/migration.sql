-- CreateTable
CREATE TABLE "BotFlow" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" TEXT NOT NULL DEFAULT 'KEYWORD',
    "triggerValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BotFlow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BotFlowNode" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "BotFlowNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BotFlowEdge" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "conditionType" TEXT,
    "conditionValue" TEXT,
    "label" TEXT,
    CONSTRAINT "BotFlowEdge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BotFlowSession" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "leadId" TEXT,
    "currentNodeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "variables" JSONB NOT NULL DEFAULT '{}',
    "waitingSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BotFlowSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotFlow_instanceName_isActive_idx" ON "BotFlow"("instanceName", "isActive");
CREATE INDEX "BotFlowSession_phone_instanceName_status_idx" ON "BotFlowSession"("phone", "instanceName", "status");

-- AddForeignKey
ALTER TABLE "BotFlow" ADD CONSTRAINT "BotFlow_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BotFlowNode" ADD CONSTRAINT "BotFlowNode_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "BotFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotFlowEdge" ADD CONSTRAINT "BotFlowEdge_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "BotFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotFlowEdge" ADD CONSTRAINT "BotFlowEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "BotFlowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotFlowEdge" ADD CONSTRAINT "BotFlowEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "BotFlowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotFlowSession" ADD CONSTRAINT "BotFlowSession_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "BotFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
