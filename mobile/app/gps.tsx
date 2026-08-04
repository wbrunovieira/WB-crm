import { ManualLeadForm } from "@/components/ManualLeadForm";

// Same form as manual capture, but pre-fills the address from GPS on mount.
export default function GpsScreen() {
  return <ManualLeadForm autoLocate />;
}
