import { ManualLeadForm } from "@/components/ManualLeadForm";

// Same form as manual capture, but opens the photo source picker on mount.
export default function CardScreen() {
  return <ManualLeadForm autoOpenCamera />;
}
