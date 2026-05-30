import { describe, it, expect } from "vitest";
import {
  GetCallRecordingKeyUseCase,
  RecordingNotFoundError,
  RecordingForbiddenError,
} from "@/domain/integrations/goto/application/use-cases/get-call-recording-key.use-case";

function repoWith(activity: unknown) {
  return { findByIdRaw: async () => activity } as never;
}
const activity = (over: Partial<{ ownerId: string; gotoRecordingUrl: string; gotoRecordingUrl2: string }> = {}) => ({
  ownerId: "owner-1",
  gotoRecordingUrl: "agent.mp3",
  gotoRecordingUrl2: "client.mp3",
  ...over,
});

describe("GetCallRecordingKeyUseCase", () => {
  it("track padrão (agent) → gotoRecordingUrl", async () => {
    const sut = new GetCallRecordingKeyUseCase(repoWith(activity()));
    const r = await sut.execute({ activityId: "a", track: "agent", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.s3Key).toBe("agent.mp3");
  });

  it("track client → gotoRecordingUrl2", async () => {
    const sut = new GetCallRecordingKeyUseCase(repoWith(activity()));
    const r = await sut.execute({ activityId: "a", track: "client", requesterId: "owner-1", requesterRole: "sdr" });
    if (r.isRight()) expect(r.value.s3Key).toBe("client.mp3");
    else throw new Error("esperava right");
  });

  it("404 quando atividade não existe", async () => {
    const sut = new GetCallRecordingKeyUseCase(repoWith(null));
    const r = await sut.execute({ activityId: "x", track: "agent", requesterId: "owner-1", requesterRole: "sdr" });
    if (r.isLeft()) expect(r.value).toBeInstanceOf(RecordingNotFoundError);
    else throw new Error("esperava left");
  });

  it("403 quando outro dono e não admin", async () => {
    const sut = new GetCallRecordingKeyUseCase(repoWith(activity({ ownerId: "outro" })));
    const r = await sut.execute({ activityId: "a", track: "agent", requesterId: "owner-1", requesterRole: "sdr" });
    if (r.isLeft()) expect(r.value).toBeInstanceOf(RecordingForbiddenError);
    else throw new Error("esperava left");
  });

  it("admin acessa de qualquer dono", async () => {
    const sut = new GetCallRecordingKeyUseCase(repoWith(activity({ ownerId: "outro" })));
    const r = await sut.execute({ activityId: "a", track: "agent", requesterId: "owner-1", requesterRole: "admin" });
    expect(r.isRight()).toBe(true);
  });

  it("404 quando não há chave para o track pedido", async () => {
    const sut = new GetCallRecordingKeyUseCase(repoWith(activity({ gotoRecordingUrl2: undefined })));
    const r = await sut.execute({ activityId: "a", track: "client", requesterId: "owner-1", requesterRole: "sdr" });
    if (r.isLeft()) expect(r.value).toBeInstanceOf(RecordingNotFoundError);
    else throw new Error("esperava left");
  });
});
