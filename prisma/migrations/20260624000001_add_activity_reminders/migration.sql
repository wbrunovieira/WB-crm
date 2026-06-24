-- AlterTable: campo de lembrete da atividade ("notificar-me")
ALTER TABLE "activities" ADD COLUMN "remindAt" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "remindedAt" TIMESTAMP(3);
