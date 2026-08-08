import type { FormattedPromotionMessage, SendMessageResult } from '@shared/interfaces';
import type { Group } from '@prisma/client';

export interface IWhatsAppService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendToAllGroups(
    groups: Group[],
    message: FormattedPromotionMessage,
    onProgress?: (current: number, total: number, result: SendMessageResult) => void,
  ): Promise<SendMessageResult[]>;
  sendToGroup(group: Group, message: FormattedPromotionMessage): Promise<SendMessageResult>;
  formatPromotionMessage(input: FormatPromotionInput): FormattedPromotionMessage;
}

export interface FormatPromotionInput {
  title: string;
  description?: string;
  originalPrice?: number;
  discountPrice?: number;
  discountPercentage?: number;
  link: string;
  imageUrl?: string;
  platform: string;
  callToAction?: string;
}
