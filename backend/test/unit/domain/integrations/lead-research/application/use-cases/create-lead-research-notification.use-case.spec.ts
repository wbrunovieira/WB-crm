import { describe, it, expect, beforeEach } from "vitest";
import { CreateLeadResearchNotificationUseCase } from "@/domain/integrations/lead-research/application/use-cases/create-lead-research-notification.use-case";
import { FakeNotificationsRepository } from "../../fakes/fake-notifications.repository";

let repo: FakeNotificationsRepository;
let useCase: CreateLeadResearchNotificationUseCase;

beforeEach(() => {
  repo = new FakeNotificationsRepository();
  useCase = new CreateLeadResearchNotificationUseCase(repo);
});

describe("CreateLeadResearchNotificationUseCase", () => {
  it("creates LEAD_RESEARCH_COMPLETE with ownerId from payload", async () => {
    const result = await useCase.execute({
      jobId: "job-001",
      status: "completed",
      createdLeads: [
        { lead: { id: "l1", businessName: "Acme" }, contacts: [] },
        { lead: { id: "l2", businessName: "Beta" }, contacts: [] },
      ],
      summary: "2 leads criados",
      ownerId: "user-001",
    });

    expect(result).not.toBeNull();
    expect(result!.userId).toBe("user-001");
    expect(repo.items[0].type).toBe("LEAD_RESEARCH_COMPLETE");
  });

  it("creates LEAD_RESEARCH_ERROR on error status", async () => {
    const result = await useCase.execute({
      jobId: "job-002",
      status: "error",
      summary: "Falha na pesquisa",
      error: "timeout",
      ownerId: "user-001",
    });

    expect(result).not.toBeNull();
    expect(repo.items[0].type).toBe("LEAD_RESEARCH_ERROR");
  });

  it("falls back to admin user when ownerId is not provided", async () => {
    const result = await useCase.execute({
      jobId: "job-003",
      status: "completed",
      summary: "1 lead criado",
      createdLeads: [{ lead: { id: "l1", businessName: "Corp" }, contacts: [] }],
    });

    expect(result!.userId).toBe("admin-001");
  });

  it("returns null when no ownerId and no admin user exists", async () => {
    repo.adminUserId = null;

    const result = await useCase.execute({
      jobId: "job-004",
      status: "completed",
      summary: "ok",
    });

    expect(result).toBeNull();
    expect(repo.items).toHaveLength(0);
  });

  it("creates notification with read=false and full payload JSON", async () => {
    const result = await useCase.execute({
      jobId: "job-005",
      status: "completed",
      summary: "ok",
      ownerId: "user-002",
      createdLeads: [],
    });

    expect(result).not.toBeNull();
    expect(repo.items).toHaveLength(1);
  });
});
