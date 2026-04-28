export interface MetaAdsResult {
  hasAds: boolean;
  activeCount: number;
  checkedAt: Date;
  searchTerm: string;
}

export abstract class MetaAdsCheckerPort {
  abstract check(instagramHandle: string): Promise<MetaAdsResult>;
}
