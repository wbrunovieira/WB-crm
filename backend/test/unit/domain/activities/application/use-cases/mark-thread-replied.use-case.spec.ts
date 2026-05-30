import { describe, it, expect } from "vitest";
import { MarkThreadRepliedUseCase } from "@/domain/activities/application/use-cases/mark-thread-replied.use-case";

describe("MarkThreadRepliedUseCase", () => {
  it("encaminha o threadId para markThreadReplied e retorna right", async () => {
    let calledWith = "";
    const repo = { markThreadReplied: async (threadId: string) => { calledWith = threadId; } } as never;
    const r = await new MarkThreadRepliedUseCase(repo).execute("thread-123");
    expect(r.isRight()).toBe(true);
    expect(calledWith).toBe("thread-123");
  });
});
