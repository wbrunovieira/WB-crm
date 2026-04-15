export const DEFAULT_DIGITAL_PRESENCE_OPTIONS = [
  { value: "parado_inexistente", label: "Parado/Inexistente" },
  { value: "sem_frequencia",     label: "Sem frequência" },
  { value: "artes_frequentes",   label: "Artes frequentes" },
  { value: "artes_videos_frequentes", label: "Artes e vídeos frequentes" },
] as const;

export type DigitalPresenceCategory = "social_media" | "meta_ads" | "google_ads";

export const DIGITAL_PRESENCE_CATEGORY_LABELS: Record<DigitalPresenceCategory, string> = {
  social_media: "Social Media",
  meta_ads:     "Meta Ads",
  google_ads:   "Google Ads",
};
