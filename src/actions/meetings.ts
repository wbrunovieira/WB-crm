"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createMeetEvent, cancelMeetEvent } from "@/lib/google/calendar";

// ---------------------------------------------------------------------------
// Schemas

const scheduleMeetingSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  startAt: z.date(),
  endAt: z.date(),
  attendeeEmails: z.array(z.string().email()).default([]),
  description: z.string().optional(),
  timeZone: z.string().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Types

export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;

// ---------------------------------------------------------------------------
// getMeetings

export async function getMeetings({
  leadId,
  contactId,
  dealId,
}: {
  leadId?: string;
  contactId?: string;
  dealId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const where: Record<string, unknown> = { ownerId: session.user.id };
  if (leadId) where.leadId = leadId;
  if (contactId) where.contactId = contactId;
  if (dealId) where.dealId = dealId;

  return prisma.meeting.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      activity: {
        select: { id: true, completed: true, completedAt: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// scheduleMeeting

export async function scheduleMeeting(input: ScheduleMeetingInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const validated = scheduleMeetingSchema.parse(input);

  // 1. Create Google Calendar event with Meet link
  const { googleEventId, meetLink } = await createMeetEvent({
    title: validated.title,
    startAt: validated.startAt,
    endAt: validated.endAt,
    attendeeEmails: validated.attendeeEmails,
    description: validated.description,
    timeZone: validated.timeZone,
  });

  // 2. Create pending Activity (type=meeting)
  const activity = await prisma.activity.create({
    data: {
      type: "meeting",
      subject: `Reunião: ${validated.title}`,
      description: validated.description,
      dueDate: validated.startAt,
      completed: false,
      leadId: validated.leadId,
      contactId: validated.contactId,
      dealId: validated.dealId,
      ownerId: session.user.id,
    },
  });

  // 3. Create Meeting record linked to the Activity
  const meeting = await prisma.meeting.create({
    data: {
      title: validated.title,
      googleEventId,
      meetLink,
      startAt: validated.startAt,
      endAt: validated.endAt,
      attendeeEmails: JSON.stringify(validated.attendeeEmails),
      status: "scheduled",
      leadId: validated.leadId,
      contactId: validated.contactId,
      dealId: validated.dealId,
      activityId: activity.id,
      ownerId: session.user.id,
    },
  });

  // Revalidate
  if (validated.leadId) revalidatePath(`/leads/${validated.leadId}`);
  if (validated.dealId) revalidatePath(`/deals/${validated.dealId}`);
  if (validated.contactId) revalidatePath(`/contacts/${validated.contactId}`);

  return meeting;
}

// ---------------------------------------------------------------------------
// cancelMeeting

export async function cancelMeeting(meetingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) throw new Error("Reunião não encontrada");

  if (session.user.role !== "admin" && meeting.ownerId !== session.user.id) {
    throw new Error("Acesso negado");
  }

  // Cancel Google Calendar event
  if (meeting.googleEventId) {
    await cancelMeetEvent(meeting.googleEventId);
  }

  // Update meeting status
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "cancelled" },
  });

  // Mark activity as skipped if it exists and is not completed
  if (meeting.activityId) {
    await prisma.activity.update({
      where: { id: meeting.activityId },
      data: { skippedAt: new Date(), skipReason: "Reunião cancelada" },
    });
  }

  // Revalidate
  if (meeting.leadId) revalidatePath(`/leads/${meeting.leadId}`);
  if (meeting.dealId) revalidatePath(`/deals/${meeting.dealId}`);
  if (meeting.contactId) revalidatePath(`/contacts/${meeting.contactId}`);
}
