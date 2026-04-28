-- Add agent research fields to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agentSummary" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agentUpdatedFields" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "agentResearchAt" TIMESTAMP(3);

-- Create lead_agent_research_logs table
CREATE TABLE IF NOT EXISTS "lead_agent_research_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "updatedFields" TEXT,
    "proposedFields" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_agent_research_logs_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX IF NOT EXISTS "lead_agent_research_logs_leadId_idx" ON "lead_agent_research_logs"("leadId");

-- Add foreign key
ALTER TABLE "lead_agent_research_logs" ADD CONSTRAINT "lead_agent_research_logs_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
