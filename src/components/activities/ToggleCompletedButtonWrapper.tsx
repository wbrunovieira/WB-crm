"use client";

import { useState, useEffect } from "react";
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
  const [availableData, setAvailableData] = useState<{
    deals: Array<{ id: string; title: string }>;
    contacts: Array<{ id: string; name: string }>;
    leads: Array<{ id: string; businessName: string }>;
    partners: Array<{ id: string; name: string }>;
  } | null>(null);

  useEffect(() => {
    // Fetch available data when component mounts
    const fetchData = async () => {
      try {
        const [dealsRes, contactsRes, leadsRes, partnersRes] = await Promise.all([
          fetch("/api/deals"),
          fetch("/api/contacts"),
          fetch("/api/leads"),
          fetch("/api/partners"),
        ]);

        const [deals, contacts, leads, partners] = await Promise.all([
          dealsRes.ok ? dealsRes.json() : [],
          contactsRes.ok ? contactsRes.json() : [],
          leadsRes.ok ? leadsRes.json() : [],
          partnersRes.ok ? partnersRes.json() : [],
        ]);

        setAvailableData({
          deals: deals.map((d: { id: string; title: string }) => ({ id: d.id, title: d.title })),
          contacts: contacts.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
          leads: leads.map((l: { id: string; businessName: string }) => ({ id: l.id, businessName: l.businessName })),
          partners: partners.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setAvailableData({
          deals: [],
          contacts: [],
          leads: [],
          partners: [],
        });
      }
    };

    fetchData();
  }, []);

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
