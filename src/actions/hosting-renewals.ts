"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";

/**
 * Get organizations with hosting renewals in the next X days
 * @param days Number of days to look ahead (default: 30)
 */
export async function getUpcomingRenewals(days: number = 30) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const organizations = await prisma.organization.findMany({
    where: {
      ...ownerFilter,
      hasHosting: true,
      hostingRenewalDate: {
        gte: today,
        lte: futureDate,
      },
    },
    orderBy: {
      hostingRenewalDate: "asc",
    },
    select: {
      id: true,
      name: true,
      hasHosting: true,
      hostingRenewalDate: true,
      hostingPlan: true,
      hostingValue: true,
      hostingReminderDays: true,
      hostingNotes: true,
      email: true,
      phone: true,
    },
  });

  return organizations;
}

/**
 * Create a renewal reminder activity for an organization
 * @param organizationId The organization ID
 */
export async function createRenewalActivity(organizationId: string) {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Find the organization
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...ownerFilter,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  if (!organization.hasHosting) {
    throw new Error("Organização não possui hospedagem");
  }

  if (!organization.hostingRenewalDate) {
    throw new Error("Data de renovação não definida");
  }

  // Check if activity already exists
  const existingActivity = await prisma.activity.findFirst({
    where: {
      subject: {
        contains: `Renovação de Hospedagem - ${organization.name}`,
      },
      completed: false,
      ownerId: session.user.id,
    },
  });

  if (existingActivity) {
    return existingActivity;
  }

  // Calculate due date (renewal date - reminder days)
  const dueDate = new Date(organization.hostingRenewalDate);
  dueDate.setDate(dueDate.getDate() - organization.hostingReminderDays);

  // Build description with hosting details
  const descriptionParts = [
    `Renovação de hospedagem para ${organization.name}`,
    "",
    `Data de Vencimento: ${organization.hostingRenewalDate.toLocaleDateString("pt-BR")}`,
  ];

  if (organization.hostingPlan) {
    descriptionParts.push(`Plano: ${organization.hostingPlan}`);
  }

  if (organization.hostingValue) {
    descriptionParts.push(
      `Valor: R$ ${organization.hostingValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`
    );
  }

  if (organization.hostingNotes) {
    descriptionParts.push("", `Observações: ${organization.hostingNotes}`);
  }

  const activity = await prisma.activity.create({
    data: {
      type: "task",
      subject: `Renovação de Hospedagem - ${organization.name}`,
      description: descriptionParts.join("\n"),
      dueDate,
      completed: false,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/dashboard");

  return activity;
}

/**
 * Check all organizations and create renewal activities for those that need it
 * Creates activities for organizations where:
 * - hasHosting is true
 * - hostingRenewalDate is within hostingReminderDays from now
 * - No existing reminder activity exists
 */
export async function checkAndCreateRenewalActivities() {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Get organizations that need reminders
  // An org needs a reminder if: today >= (renewalDate - reminderDays)
  const today = new Date();

  const organizations = await prisma.organization.findMany({
    where: {
      ...ownerFilter,
      hasHosting: true,
      hostingRenewalDate: {
        not: null,
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const org of organizations) {
    if (!org.hostingRenewalDate) continue;

    // Calculate when reminder should be created
    const reminderDate = new Date(org.hostingRenewalDate);
    reminderDate.setDate(reminderDate.getDate() - org.hostingReminderDays);

    // Only create reminder if we're at or past the reminder date
    // and before the renewal date
    if (today >= reminderDate && today <= org.hostingRenewalDate) {
      // Check if activity already exists
      const existingActivity = await prisma.activity.findFirst({
        where: {
          subject: {
            contains: `Renovação de Hospedagem - ${org.name}`,
          },
          completed: false,
          ownerId: session.user.id,
        },
      });

      if (existingActivity) {
        skipped++;
        continue;
      }

      // Create the activity
      const dueDate = new Date(org.hostingRenewalDate);
      dueDate.setDate(dueDate.getDate() - org.hostingReminderDays);

      const descriptionParts = [
        `Renovação de hospedagem para ${org.name}`,
        "",
        `Data de Vencimento: ${org.hostingRenewalDate.toLocaleDateString("pt-BR")}`,
      ];

      if (org.hostingPlan) {
        descriptionParts.push(`Plano: ${org.hostingPlan}`);
      }

      if (org.hostingValue) {
        descriptionParts.push(
          `Valor: R$ ${org.hostingValue.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`
        );
      }

      if (org.hostingNotes) {
        descriptionParts.push("", `Observações: ${org.hostingNotes}`);
      }

      await prisma.activity.create({
        data: {
          type: "task",
          subject: `Renovação de Hospedagem - ${org.name}`,
          description: descriptionParts.join("\n"),
          dueDate,
          completed: false,
          ownerId: session.user.id,
        },
      });

      created++;
    }
  }

  revalidatePath("/activities");
  revalidatePath("/dashboard");

  return {
    created,
    skipped,
    total: organizations.length,
  };
}
