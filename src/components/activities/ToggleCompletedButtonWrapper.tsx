"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import ToggleCompletedButton from "./ToggleCompletedButton";

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  completed: boolean;
  dealId: string | null;
  contactId: string | null;
  contactIds: string | null;
  leadId: string | null;
  partnerId: string | null;
  deal?: { id: string; title: string } | null;
  contact?: { id: string; name: string } | null;
  lead?: { id: string; businessName: string } | null;
  partner?: { id: string; name: string } | null;
}

interface ToggleCompletedButtonWrapperProps {
  activity: Activity;
}

export default function ToggleCompletedButtonWrapper({
  activity,
}: ToggleCompletedButtonWrapperProps) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [availableData, setAvailableData] = useState<{
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [deals, contacts, leadsData, partners] = await Promise.all([
          apiFetch<{ id: string; title: string }[]>("/deals", token).catch(() => []),
          apiFetch<{ id: string; name: string }[]>("/contacts", token).catch(() => []),
          apiFetch<{ leads: { id: string; businessName: string }[] }>("/leads?pageSize=200", token).catch(() => ({ leads: [] })),
          apiFetch<{ id: string; name: string }[]>("/partners", token).catch(() => []),
        ]);

        setAvailableData({
          deals: deals.map((d) => ({ id: d.id, title: d.title })),
          contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
          leads: leadsData.leads.map((l) => ({ id: l.id, businessName: l.businessName })),
          partners: partners.map((p) => ({ id: p.id, name: p.name })),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setAvailableData({ deals: [], contacts: [], leads: [], partners: [] });
      }
    };

    fetchData();
  }, [token]);

  if (!availableData) {
    return (
      <button
        disabled
        className="h-6 w-6 flex-shrink-0 rounded-full border-2 border-gray-300 opacity-50"
      />
    );
  }

  return (
    <ToggleCompletedButton
      activityId={activity.id}
      completed={activity.completed}
      dealId={activity.dealId}
      contactId={activity.contactId}
      leadId={activity.leadId}
      partnerId={activity.partnerId}
      previousActivity={{
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        dealId: activity.dealId,
        dealTitle: activity.deal?.title,
        contactId: activity.contactId,
        contactName: activity.contact?.name,
        contactIds: activity.contactIds,
        leadId: activity.leadId,
        leadName: activity.lead?.businessName,
        partnerId: activity.partnerId,
        partnerName: activity.partner?.name,
      }}
      availableData={availableData}
    />
  );
}
