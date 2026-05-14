import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResendMeetingConfirmationUseCase } from "@/domain/integrations/meet/application/use-cases/resend-meeting-confirmation.use-case";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { MeetingNotFoundError, MeetingForbiddenError } from "@/domain/integrations/meet/application/use-cases/meetings-crud.use-cases";

const makeGmailPort = (overrides: { sendCalendarInvite?: (...args: any[]) => Promise<void> } = {}) => ({
  send: vi.fn().mockResolvedValue(undefined),
  sendCalendarInvite: overrides.sendCalendarInvite ?? vi.fn().mockResolvedValue(undefined),
  getProfile: vi.fn().mockResolvedValue({ emailAddress: "primary@wbdigitalsolutions.com" }),
  sendWithAttachment: vi.fn(),
  pollHistory: vi.fn(),
  getThread: vi.fn(),
  getMessage: vi.fn(),
  markAsRead: vi.fn(),
  getSendAsAliases: vi.fn().mockResolvedValue([]),
});

describe("ResendMeetingConfirmationUseCase", () => {
  let repo: FakeMeetingsRepository;

  beforeEach(() => {
    repo = new FakeMeetingsRepository();
  });

  it("retorna NotFoundError quando reunião não existe", async () => {
    const sut = new ResendMeetingConfirmationUseCase(repo, null);

    const result = await sut.execute({ id: "nao-existe", requesterId: "owner-1" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingNotFoundError);
  });

  it("retorna ForbiddenError quando requester não é dono", async () => {
    repo.addMeeting({ id: "m-1", title: "Reunião", startAt: new Date(), status: "scheduled", ownerId: "owner-A" });
    const sut = new ResendMeetingConfirmationUseCase(repo, null);

    const result = await sut.execute({ id: "m-1", requesterId: "owner-B" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingForbiddenError);
  });

  it("retorna sucesso sem enviar quando gmail não está disponível", async () => {
    repo.addMeeting({
      id: "m-1", title: "Reunião", startAt: new Date(), status: "scheduled",
      ownerId: "owner-1", attendeeEmails: JSON.stringify(["a@a.com"]),
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, null);

    const result = await sut.execute({ id: "m-1", requesterId: "owner-1" });

    expect(result.isRight()).toBe(true);
  });

  it("envia sendCalendarInvite para cada attendee", async () => {
    const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
    const gmail = makeGmailPort({ sendCalendarInvite });
    repo.addMeeting({
      id: "m-1", title: "Demo", startAt: new Date("2026-06-01T18:00:00Z"),
      endAt: new Date("2026-06-01T19:00:00Z"),
      status: "scheduled", ownerId: "owner-1",
      attendeeEmails: JSON.stringify(["a@a.com", "b@b.com"]),
      isPresential: true,
      location: "Av. Paulista, 100",
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, gmail as any);

    const result = await sut.execute({ id: "m-1", requesterId: "owner-1" });

    expect(result.isRight()).toBe(true);
    expect(sendCalendarInvite).toHaveBeenCalledTimes(2);
    expect(sendCalendarInvite.mock.calls[0][0].to).toBe("a@a.com");
    expect(sendCalendarInvite.mock.calls[1][0].to).toBe("b@b.com");
  });

  it("subject contém o título da reunião", async () => {
    const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
    const gmail = makeGmailPort({ sendCalendarInvite });
    repo.addMeeting({
      id: "m-1", title: "Apresentação Comercial", startAt: new Date(),
      status: "scheduled", ownerId: "owner-1",
      attendeeEmails: JSON.stringify(["cli@cli.com"]),
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, gmail as any);

    await sut.execute({ id: "m-1", requesterId: "owner-1" });

    const { subject } = sendCalendarInvite.mock.calls[0][0];
    expect(subject).toContain("Apresentação Comercial");
  });

  it("usa organizerEmail passado no input sobre o da reunião", async () => {
    const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
    const gmail = makeGmailPort({ sendCalendarInvite });
    repo.addMeeting({
      id: "m-1", title: "Demo", startAt: new Date(),
      status: "scheduled", ownerId: "owner-1",
      attendeeEmails: JSON.stringify(["cli@cli.com"]),
      organizerEmail: "salvo@wbdigitalsolutions.com",
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, gmail as any);

    await sut.execute({ id: "m-1", requesterId: "owner-1", organizerEmail: "bruno@saltoup.com" });

    const { organizerEmail } = sendCalendarInvite.mock.calls[0][0];
    expect(organizerEmail).toBe("bruno@saltoup.com");
  });

  it("usa organizerEmail da reunião quando input não fornece", async () => {
    const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
    const gmail = makeGmailPort({ sendCalendarInvite });
    repo.addMeeting({
      id: "m-1", title: "Demo", startAt: new Date(),
      status: "scheduled", ownerId: "owner-1",
      attendeeEmails: JSON.stringify(["cli@cli.com"]),
      organizerEmail: "bruno@saltoup.com",
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, gmail as any);

    await sut.execute({ id: "m-1", requesterId: "owner-1" });

    const { organizerEmail } = sendCalendarInvite.mock.calls[0][0];
    expect(organizerEmail).toBe("bruno@saltoup.com");
  });

  it("não falha se sendCalendarInvite lançar erro (non-fatal)", async () => {
    const gmail = makeGmailPort({
      sendCalendarInvite: vi.fn().mockRejectedValue(new Error("SMTP down")),
    });
    repo.addMeeting({
      id: "m-1", title: "Demo", startAt: new Date(),
      status: "scheduled", ownerId: "owner-1",
      attendeeEmails: JSON.stringify(["cli@cli.com"]),
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, gmail as any);

    const result = await sut.execute({ id: "m-1", requesterId: "owner-1" });

    expect(result.isRight()).toBe(true);
  });

  it("suporta attendeeEmails como array de objetos {email}", async () => {
    const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
    const gmail = makeGmailPort({ sendCalendarInvite });
    repo.addMeeting({
      id: "m-1", title: "Demo", startAt: new Date(),
      status: "scheduled", ownerId: "owner-1",
      attendeeEmails: JSON.stringify([{ email: "a@a.com", responseStatus: "needsAction" }]),
    });
    const sut = new ResendMeetingConfirmationUseCase(repo, gmail as any);

    await sut.execute({ id: "m-1", requesterId: "owner-1" });

    expect(sendCalendarInvite).toHaveBeenCalledOnce();
    expect(sendCalendarInvite.mock.calls[0][0].to).toBe("a@a.com");
  });
});
