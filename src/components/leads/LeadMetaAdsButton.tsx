"use client";

interface LeadMetaAdsButtonProps {
  instagram: string;
  businessName?: string;
}

export function LeadMetaAdsButton({ instagram, businessName }: LeadMetaAdsButtonProps) {
  const searchTerm = businessName ?? instagram.replace(/^@/, "");
  const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(searchTerm)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Ver anúncios Meta de ${instagram}`}
      className="inline-flex items-center justify-center rounded-full border border-blue-400/50 bg-blue-950/40 p-1 text-blue-400 hover:bg-blue-900/60 hover:border-blue-300 transition-colors"
    >
      <AdsIcon className="h-3.5 w-3.5" />
    </a>
  );
}

function AdsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M7 8h3v5H7zM14 8l3 5M14 13l3-5" />
    </svg>
  );
}
