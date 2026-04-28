import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MetaAdsCheckerPort, type MetaAdsResult } from "../application/ports/meta-ads-checker.port";

@Injectable()
export class MetaGraphApiAdapter extends MetaAdsCheckerPort {
  private readonly logger = new Logger(MetaGraphApiAdapter.name);
  private readonly appToken: string;
  private readonly apiVersion = "v19.0";

  constructor(private readonly config: ConfigService) {
    super();
    const appId = config.get<string>("META_APP_ID");
    const appSecret = config.get<string>("META_APP_SECRET");
    if (!appId || !appSecret) {
      throw new Error("META_APP_ID and META_APP_SECRET must be set");
    }
    this.appToken = `${appId}|${appSecret}`;
  }

  async check(instagramHandle: string): Promise<MetaAdsResult> {
    const params = new URLSearchParams({
      search_terms: instagramHandle,
      ad_reached_countries: '["BR"]',
      ad_type: "ALL",
      ad_active_status: "ACTIVE",
      limit: "25",
      fields: "id,page_name,ad_creative_bodies,ad_delivery_start_time",
      access_token: this.appToken,
    });

    const url = `https://graph.facebook.com/${this.apiVersion}/ads_archive?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Meta API error ${res.status}: ${body}`);
      throw new Error(`Meta API respondeu com status ${res.status}`);
    }

    const data = await res.json() as { data: unknown[]; error?: { message: string } };

    if (data.error) {
      throw new Error(data.error.message);
    }

    const activeCount = data.data?.length ?? 0;

    return {
      hasAds: activeCount > 0,
      activeCount,
      checkedAt: new Date(),
      searchTerm: instagramHandle,
    };
  }
}
