"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendFetch } from "@/lib/backend/client";

const scheduleMeetingSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  startAt: z.date(),
  endAt: z.date(),
  attendeeEmails: z.array(z.string().email()).default([]),
  description: z.string().optional(),
  timeZone: z.string().optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  organizationId: z.string().optional(),
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

export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

export async function getMeetings({
  leadId, contactId, organizationId, dealId,
}: { leadId?: string; contactId?: string; organizationId?: string; dealId?: string }): Promise<unknown[]> {
  try {
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (contactId) params.set("contactId", contactId);
    if (organizationId) params.set("organizationId", organizationId);
    if (dealId) params.set("dealId", dealId);
    return await backendFetch<unknown[]>(`/meetings?${params.toString()}`);
  } catch {
    return [];
  }
}

export async function scheduleMeeting(input: ScheduleMeetingInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const validated = scheduleMeetingSchema.parse(input);

  const meeting = await backendFetch("/meetings", {
    method: "POST",
    body: JSON.stringify({
      title: validated.title,
      startAt: validated.startAt.toISOString(),
      endAt: validated.endAt.toISOString(),
      attendeeEmails: validated.attendeeEmails,
      description: validated.description,
      leadId: validated.leadId,
      contactId: validated.contactId,
      organizationId: validated.organizationId,
      dealId: validated.dealId,
      createActivity: true,
    }),
  });

  if (validated.leadId) revalidatePath(`/leads/${validated.leadId}`);
  if (validated.dealId) revalidatePath(`/deals/${validated.dealId}`);
  if (validated.contactId) revalidatePath(`/contacts/${validated.contactId}`);
  if (validated.organizationId) revalidatePath(`/organizations/${validated.organizationId}`);

  return meeting;
}

export async function cancelMeeting(meetingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const meeting = await backendFetch<{ id: string; googleEventId: string | null; leadId: string | null; dealId: string | null; contactId: string | null; organizationId: string | null }>(`/meetings/${meetingId}`);

  if (!meeting) throw new Error("Reunião não encontrada");

  await backendFetch(`/meetings/${meetingId}/cancel`, { method: "PATCH" });

  if (meeting.leadId) revalidatePath(`/leads/${meeting.leadId}`);
  if (meeting.dealId) revalidatePath(`/deals/${meeting.dealId}`);
  if (meeting.contactId) revalidatePath(`/contacts/${meeting.contactId}`);
  if (meeting.organizationId) revalidatePath(`/organizations/${meeting.organizationId}`);
}

export async function checkMeetingTitleExists(title: string, excludeMeetingId?: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title: title.trim() });
    if (excludeMeetingId) params.set("excludeId", excludeMeetingId);
    const result = await backendFetch<{ exists: boolean }>(`/meetings/check-title?${params.toString()}`);
    return result.exists ? title.trim() : null;
  } catch {
    return null;
  }
}

export async function updateMeetingSummary(meetingId: string, summary: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  try {
    await backendFetch(`/meetings/${meetingId}/summary`, {
      method: "PATCH",
      body: JSON.stringify({ summary: summary.trim() || null }),
    });

    const meeting = await backendFetch<{ leadId: string | null; dealId: string | null; contactId: string | null }>(`/meetings/${meetingId}`);
    if (meeting.leadId) revalidatePath(`/leads/${meeting.leadId}`);
    if (meeting.dealId) revalidatePath(`/deals/${meeting.dealId}`);
    if (meeting.contactId) revalidatePath(`/contacts/${meeting.contactId}`);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export async function updateMeeting(meetingId: string, input: UpdateMeetingInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");

  const validated = updateMeetingSchema.parse(input);

  const meeting = await backendFetch<{ id: string; googleEventId: string | null; leadId: string | null; dealId: string | null; contactId: string | null; status: string; attendeeEmails: string }>(`/meetings/${meetingId}`);

  if (!meeting) throw new Error("Reunião não encontrada");
  if (meeting.status !== "scheduled") throw new Error("Somente reuniões agendadas podem ser editadas");

  const updated = await backendFetch(`/meetings/${meetingId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: validated.title,
      startAt: validated.startAt?.toISOString(),
      endAt: validated.endAt?.toISOString(),
      attendeeEmails: validated.attendeeEmails,
    }),
  });

  if (meeting.leadId) revalidatePath(`/leads/${meeting.leadId}`);
  if (meeting.dealId) revalidatePath(`/deals/${meeting.dealId}`);
  if (meeting.contactId) revalidatePath(`/contacts/${meeting.contactId}`);

  return updated;
}
