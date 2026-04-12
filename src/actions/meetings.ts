"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createMeetEvent, cancelMeetEvent, updateMeetEvent } from "@/lib/google/calendar";

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

const updateMeetingSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").optional(),
  startAt: z.date().optional(),
  endAt: z.date().optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
  description: z.string().optional(),
  timeZone: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Types

export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

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
  const { googleEventId, meetLink, attendees } = await createMeetEvent({
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
      // Store as [{email, responseStatus}] — starts as needsAction for all
      attendeeEmails: JSON.stringify(attendees),
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

// ---------------------------------------------------------------------------
// checkMeetingTitleExists
// Lightweight check called by the modal client-side BEFORE submitting.
// Returns the existing meeting title if a conflict exists, null if available.
// (Server Actions throw messages are sanitized in Next.js production builds,
//  so validation errors must originate from client code, not from throws.)

export async function checkMeetingTitleExists(
  title: string,
  excludeMeetingId?: string
): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const duplicate = await prisma.meeting.findFirst({
    where: {
      title: { equals: title.trim(), mode: "insensitive" },
      status: { not: "cancelled" },
      ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
    },
    select: { title: true },
  });

  return duplicate?.title ?? null;
}

// ---------------------------------------------------------------------------
// updateMeetingSummary

export async function updateMeetingSummary(meetingId: string, summary: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Reunião não encontrada");
  if (session.user.role !== "admin" && meeting.ownerId !== session.user.id) {
    throw new Error("Acesso negado");
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: { meetingSummary: summary.trim() || null },
  });

  if (meeting.leadId) revalidatePath(`/leads/${meeting.leadId}`);
  if (meeting.dealId) revalidatePath(`/deals/${meeting.dealId}`);
  if (meeting.contactId) revalidatePath(`/contacts/${meeting.contactId}`);

  return updated;
}

// ---------------------------------------------------------------------------
// updateMeeting

export async function updateMeeting(meetingId: string, input: UpdateMeetingInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const validated = updateMeetingSchema.parse(input);

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) throw new Error("Reunião não encontrada");

  if (session.user.role !== "admin" && meeting.ownerId !== session.user.id) {
    throw new Error("Acesso negado");
  }

  if (meeting.status !== "scheduled") {
    throw new Error("Somente reuniões agendadas podem ser editadas");
  }

  // Update Google Calendar event
  let updatedAttendees = JSON.parse(meeting.attendeeEmails as string) as Array<{
    email: string;
    responseStatus: string;
  }>;

  if (meeting.googleEventId) {
    const result = await updateMeetEvent(meeting.googleEventId, {
      title: validated.title,
      startAt: validated.startAt,
      endAt: validated.endAt,
      attendeeEmails: validated.attendeeEmails,
      description: validated.description,
      timeZone: validated.timeZone,
    });
    updatedAttendees = result.attendees;
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    attendeeEmails: JSON.stringify(updatedAttendees),
  };
  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.startAt !== undefined) updateData.startAt = validated.startAt;
  if (validated.endAt !== undefined) updateData.endAt = validated.endAt;

  // Update activity dueDate and subject if timing/title changed
  if (meeting.activityId && (validated.startAt || validated.title)) {
    const activityData: Record<string, unknown> = {};
    if (validated.startAt) activityData.dueDate = validated.startAt;
    if (validated.title) activityData.subject = `Reunião: ${validated.title}`;
    await prisma.activity.update({
      where: { id: meeting.activityId },
      data: activityData,
    });
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: updateData,
  });

  // Revalidate
  if (meeting.leadId) revalidatePath(`/leads/${meeting.leadId}`);
  if (meeting.dealId) revalidatePath(`/deals/${meeting.dealId}`);
  if (meeting.contactId) revalidatePath(`/contacts/${meeting.contactId}`);

  return updated;
}
