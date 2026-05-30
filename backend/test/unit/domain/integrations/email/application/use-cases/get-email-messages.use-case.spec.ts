import { describe, it, expect } from "vitest";
import { GetEmailMessagesUseCase } from "@/domain/integrations/email/application/use-cases/get-email-messages.use-case";

describe("GetEmailMessagesUseCase", () => {
  it("encaminha o ownerId para findByOwnerId e retorna as mensagens", async () => {
    let calledWith = "";
    const fakeRepo = {
      findByOwnerId: async (ownerId: string) => { calledWith = ownerId; return [{ id: "m1", ownerId }] as never; },
    };
    const sut = new GetEmailMessagesUseCase(fakeRepo as never);
    const result = await sut.execute("owner-9");
    expect(calledWith).toBe("owner-9");
    expect(result).toHaveLength(1);
  });
});
