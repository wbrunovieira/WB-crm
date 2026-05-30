import { describe, it, expect } from "vitest";
import { CancelActiveResearchSessionsUseCase } from "@/domain/integrations/lead-deep-research/application/use-cases/cancel-active-research-sessions.use-case";

describe("CancelActiveResearchSessionsUseCase", () => {
  it("encaminha o ownerId para cancelAllActiveForUser", async () => {
    let calledWith = "";
    const fakeRepo = { cancelAllActiveForUser: async (userId: string) => { calledWith = userId; } } as never;
    const sut = new CancelActiveResearchSessionsUseCase(fakeRepo);
    await sut.execute("owner-42");
    expect(calledWith).toBe("owner-42");
  });
});
