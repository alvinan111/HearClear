export type PaymentChannel = 'wechat' | 'alipay';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  userId: string;
  subscriptionType: string;
  amountCents: number;
  channel: PaymentChannel;
  channelOrderId: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateOrderParams {
  subscriptionType: 'daily' | 'monthly' | 'yearly' | 'lifetime';
  channel: PaymentChannel;
  amountCents: number;
}
