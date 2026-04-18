import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Request logger ───────────────────────────────────────────────────────
  app.use((req: { method: string; url: string }, _res: unknown, next: () => void) => {
    const method = req.method;
    if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      console.log(`[${new Date().toISOString()}] ${method} ${req.url}`);
    }
    next();
  });
  // ─────────────────────────────────────────────────────────────────────────

  app.enableCors({
    origin: process.env.CRM_URL ?? "http://localhost:3000",
    credentials: true,
  });

  // ── Swagger ──────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle("WB CRM API")
    .setDescription(
      "API REST do WB CRM — construída com NestJS + DDD.\n\n" +
      "**Autenticação:** Bearer JWT (mesmo token emitido pelo NextAuth).\n" +
      "Clique em **Authorize** e cole o token no formato `<token>` (sem Bearer).",
    )
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
      "JWT",
    )
    .addTag("Auth", "Autenticação — obter JWT")
    .addTag("Health", "Status da aplicação e banco de dados")
    .addTag("Contacts", "Gestão de contatos do CRM")
    .addTag("Campaigns", "Campanhas de envio em massa via WhatsApp")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  // ─────────────────────────────────────────────────────────────────────────

  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  console.log(`[backend] running on http://localhost:${port}`);
  console.log(`[backend] Swagger UI → http://localhost:${port}/docs`);
}

bootstrap();
