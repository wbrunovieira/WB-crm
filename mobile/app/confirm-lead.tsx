import { ManualLeadForm } from "@/components/ManualLeadForm";

// The Google flow now lands on the same capture hub, seeded from the selected place.
export default function ConfirmLeadScreen() {
  return <ManualLeadForm fromGoogle />;
}
