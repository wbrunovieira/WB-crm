import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";

let app: INestApplication;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe("Health (e2e)", () => {
  it("GET /health retorna ok", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});
