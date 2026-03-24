/**
 * 支付服务层
 *
 * 当前实现：通过 Supabase Edge Function 创建订单，
 * 由 Edge Function 调用微信支付/支付宝 API 并返回支付参数，
 * 客户端再调用对应 SDK 拉起支付界面。
 *
 * WeChat Pay & Alipay SDK 集成说明：
 *   - iOS/Android 原生 SDK 通过 Expo Config Plugin 或 bare workflow 接入
 *   - 调用 WeChat: WeChat.pay(params) (react-native-wechat-lib)
 *   - 调用 Alipay: 通过 deep link 唤起支付宝 App
 */

import { supabase } from './supabase';
import type { CreateOrderParams, Payment } from '@/types/payment';
import type { Subscription } from '@/types/subscription';

/**
 * 创建支付订单（调用 Supabase Edge Function）
 */
export async function createOrder(
  params: CreateOrderParams
): Promise<{ payment: Payment | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-order', {
      body: {
        subscription_type: params.subscriptionType,
        channel: params.channel,
        amount_cents: params.amountCents,
      },
    });

    if (error) {
      return { payment: null, error: error.message };
    }

    // Edge Function 返回支付参数后，调用对应 SDK 拉起支付
    if (params.channel === 'alipay') {
      await launchAlipay(data.alipay_order_string);
    } else if (params.channel === 'wechat') {
      await launchWechatPay(data.wechat_params);
    }

    return {
      payment: mapPayment(data.payment),
      error: null,
    };
  } catch (e) {
    const err = e as Error;
    return { payment: null, error: err.message };
  }
}

/**
 * 查询订单支付结果（轮询）
 */
export async function queryOrderStatus(
  paymentId: string
): Promise<{ isPaid: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from('payments')
    .select('status, subscriptions(*)')
    .eq('id', paymentId)
    .single();

  if (error || !data) {
    return { isPaid: false, error: error?.message ?? '查询失败' };
  }

  return { isPaid: data.status === 'paid', error: null };
}

/**
 * 拉起支付宝支付（通过 Deep Link）
 * @param orderString 支付宝订单字符串（由 Edge Function 生成）
 */
async function launchAlipay(orderString: string): Promise<void> {
  const { Linking } = await import('react-native');
  const url = `alipays://platformapi/startapp?saId=10000007&qrcode=${encodeURIComponent(orderString)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // 未安装支付宝 App，尝试 H5 支付
    throw new Error('请先安装支付宝 App');
  }
}

/**
 * 拉起微信支付（需 react-native-wechat-lib）
 * @param params 微信支付参数（由 Edge Function 生成）
 */
async function launchWechatPay(params: Record<string, string>): Promise<void> {
  try {
    const WeChat = await import('react-native-wechat-lib');
    await WeChat.pay({
      partnerId: params.partnerId,
      prepayId: params.prepayId,
      nonceStr: params.nonceStr,
      timeStamp: params.timeStamp,
      packageValue: params.packageValue ?? 'Sign=WXPay',
      sign: params.sign,
    });
  } catch {
    throw new Error('微信支付失败，请确保已安装微信');
  }
}

function mapPayment(data: Record<string, unknown>): Payment {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    subscriptionType: data.subscription_type as string,
    amountCents: data.amount_cents as number,
    channel: data.channel as Payment['channel'],
    channelOrderId: (data.channel_order_id as string) ?? null,
    status: data.status as Payment['status'],
    paidAt: (data.paid_at as string) ?? null,
    createdAt: data.created_at as string,
  };
}

export type { CreateOrderParams, Subscription };
