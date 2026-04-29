"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  MapPin,
  Phone,
  Globe,
  Star,
  Clock,
  Tag,
  ExternalLink,
  Building2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PhoneLink } from "@/components/ui/phone-link";

interface ProspectDetail {
  id: string;
  businessName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  businessStatus: string | null;
  types: string | null;
  categories: string | null;
  description: string | null;
  googleMapsUrl: string | null;
  openingHours: string | null;
  searchTerm: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  createdAt: string | Date;
}

interface Props {
  prospectId: string;
  onClose: () => void;
}

const BUSINESS_STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: "Operacional",
  CLOSED_TEMPORARILY: "Fechado temporariamente",
  CLOSED_PERMANENTLY: "Fechado permanentemente",
};

function parseOpeningHours(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    return [];
  }
  return [];
}

function parseTypes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return (parsed as string[]).filter(
      (t) => !["point_of_interest", "establishment"].includes(t)
    );
  } catch {
    return [];
  }
  return [];
}

export function ProspectDetailModal({ prospectId, onClose }: Props) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const [detail, setDetail] = useState<ProspectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<ProspectDetail>(`/leads/${prospectId}`, token)
      .then((data) => setDetail(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [prospectId, token]);

  const openingHours = parseOpeningHours(detail?.openingHours ?? null);
  const types = parseTypes(detail?.types ?? null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {detail?.businessName ?? "Carregando..."}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading && (
            <div className="py-8 text-center text-sm text-gray-400">Carregando dados...</div>
          )}
          {error && (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          )}

          {detail && (
            <>
              {/* Status + Rating */}
              <div className="flex flex-wrap items-center gap-3">
                {detail.businessStatus && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    detail.businessStatus === "OPERATIONAL"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {BUSINESS_STATUS_LABELS[detail.businessStatus] ?? detail.businessStatus}
                  </span>
                )}
                {detail.rating != null && (
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{detail.rating.toFixed(1)}</span>
                    {detail.userRatingsTotal != null && (
                      <span className="text-gray-400 text-xs">({detail.userRatingsTotal} avaliações)</span>
                    )}
                  </div>
                )}
                {detail.searchTerm && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs text-purple-600">
                    <Tag className="h-3 w-3 mr-1" />
                    {detail.searchTerm}
                  </span>
                )}
              </div>

              {/* Address */}
              {(detail.address || detail.city) && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <div>
                    {detail.address && <p>{detail.address}</p>}
                    {(detail.city || detail.state) && (
                      <p className="text-gray-500">
                        {[detail.city, detail.state, detail.country].filter(Boolean).join(", ")}
                        {detail.zipCode ? ` — CEP ${detail.zipCode}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="space-y-2">
                {detail.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <PhoneLink phone={detail.phone} className="hover:text-purple-600" />
                  </div>
                )}
                {detail.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                    <a
                      href={detail.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-sm"
                    >
                      {detail.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </div>
                )}
                {detail.googleMapsUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                    <a
                      href={detail.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Ver no Google Maps
                    </a>
                  </div>
                )}
              </div>

              {/* Description */}
              {detail.description && (
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {detail.description}
                </div>
              )}

              {/* Categories / Types */}
              {(detail.categories || types.length > 0) && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Categorias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.categories && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                        {detail.categories}
                      </span>
                    )}
                    {types.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Opening Hours */}
              {openingHours.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Horário de funcionamento
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {openingHours.map((line, i) => {
                      const [day, hours] = line.split(": ");
                      return (
                        <li key={i} className="flex justify-between gap-4">
                          <span className="font-medium text-gray-600 capitalize">{day}</span>
                          <span className="text-gray-500">{hours}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Coordinates */}
              {(detail.latitude != null && detail.longitude != null) && (
                <p className="text-xs text-gray-400">
                  Coords: {detail.latitude.toFixed(6)}, {detail.longitude.toFixed(6)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
