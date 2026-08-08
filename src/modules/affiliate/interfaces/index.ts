import type { Platform } from '../../../shared/interfaces';

export interface IAffiliateLinkExtractor {
  readonly platform: Platform;
  canHandle(url: string): boolean;
  extractProductId(url: string): string | null;
  convertToAffiliateLink(url: string): Promise<string>;
  fetchProductDetails(url: string): Promise<PartialProductInfo>;
}

export interface PartialProductInfo {
  productId?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  originalPrice?: number;
  discountPrice?: number;
  category?: string;
  brand?: string;
}

export interface IUrlShortener {
  shorten(url: string): Promise<string>;
}

export interface IAffiliateService {
  processLink(rawUrl: string): Promise<import('../../../shared/interfaces').ProductInfo>;
  detectPlatform(url: string): Platform;
}
