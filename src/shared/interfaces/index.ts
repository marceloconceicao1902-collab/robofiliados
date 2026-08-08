export const PlatformEnum = {
  SHOPEE: 'SHOPEE',
  MERCADO_LIVRE: 'MERCADO_LIVRE',
  GENERIC: 'GENERIC',
} as const;
export type Platform = (typeof PlatformEnum)[keyof typeof PlatformEnum];

export const GroupStatusEnum = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BANNED: 'BANNED',
} as const;
export type GroupStatus = (typeof GroupStatusEnum)[keyof typeof GroupStatusEnum];

export const SendStatusEnum = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED_DUPLICATE: 'SKIPPED_DUPLICATE',
  SKIPPED_RATE_LIMIT: 'SKIPPED_RATE_LIMIT',
} as const;
export type SendStatus = (typeof SendStatusEnum)[keyof typeof SendStatusEnum];

export interface ProductInfo {
  originalUrl: string;
  affiliateUrl: string;
  shortUrl?: string;
  platform: Platform;
  productId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  originalPrice?: number;
  discountPrice?: number;
  discountPercentage?: number;
  category?: string;
  brand?: string;
}

export interface FormattedPromotionMessage {
  text: string;
  imageUrl?: string;
}

export interface SendMessageResult {
  groupId: string;
  groupName: string;
  success: boolean;
  errorMessage?: string;
  deliveredAt?: Date;
}

export interface CampaignSummary {
  totalGroups: number;
  sent: number;
  failed: number;
  skippedDuplicate: number;
  skippedRateLimit: number;
  startedAt: Date;
  finishedAt?: Date;
  productTitle: string;
}

export interface WhatsAppProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendTextMessage(toId: string, text: string): Promise<boolean>;
  sendImageMessage(toId: string, caption: string, imageUrl: string): Promise<boolean>;
}

export type AffiliatePlatformType = Platform;
