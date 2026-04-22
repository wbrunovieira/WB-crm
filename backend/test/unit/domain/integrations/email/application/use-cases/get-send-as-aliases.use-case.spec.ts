import { describe, it, expect, beforeEach } from "vitest";
import { GetSendAsAliasesUseCase } from "@/domain/integrations/email/application/use-cases/get-send-as-aliases.use-case";
import { FakeGmailPort } from "../../fakes/fake-gmail.port";

const USER_ID = "google-token-singleton";

let gmailPort: FakeGmailPort;
let useCase: GetSendAsAliasesUseCase;

beforeEach(() => {
  gmailPort = new FakeGmailPort();
  gmailPort.sendAsAliases = [
    { email: "bruno@wbdigitalsolutions.com", displayName: "", isDefault: false, isPrimary: true },
    { email: "bruno@saltoup.com", displayName: "Bruno Vieira", isDefault: true, isPrimary: false },
  ];
  useCase = new GetSendAsAliasesUseCase(gmailPort);
});

describe("GetSendAsAliasesUseCase", () => {
  it("returns all verified sendAs aliases for the user", async () => {
    const result = await useCase.execute(USER_ID);

    expect(result.isRight()).toBe(true);
    const { aliases } = result.unwrap();
    expect(aliases).toHaveLength(2);
  });

  it("each alias has email, displayName, isDefault, isPrimary", async () => {
    const { aliases } = (await useCase.execute(USER_ID)).unwrap();
    const saltoup = aliases.find((a) => a.email === "bruno@saltoup.com");
    expect(saltoup).toBeDefined();
    expect(saltoup!.displayName).toBe("Bruno Vieira");
    expect(saltoup!.isDefault).toBe(true);
    expect(saltoup!.isPrimary).toBe(false);
  });

  it("marks the primary alias correctly", async () => {
    const { aliases } = (await useCase.execute(USER_ID)).unwrap();
    const primary = aliases.find((a) => a.isPrimary);
    expect(primary!.email).toBe("bruno@wbdigitalsolutions.com");
  });

  it("returns left on Gmail API failure", async () => {
    gmailPort.getSendAsAliases = async () => { throw new Error("Gmail API error"); };
    const result = await useCase.execute(USER_ID);
    expect(result.isLeft()).toBe(true);
  });
});
