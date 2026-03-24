/**
 * 全局类型和变量定义
 */

declare const __DEV__: boolean;

declare module 'expo-constants' {
  export interface Constants {
    expoVersion?: string;
    appOwnership?: string | null;
    expoConfig?: {
      version?: string;
      scheme?: string;
    } | null;
    manifest: unknown;
    platform: unknown;
  }
  
  const constants: Constants;
  export default constants;
}

declare module 'react-native-wechat-lib' {
  export function pay(params: {
    partnerId: string;
    prepayId: string;
    nonceStr: string;
    timeStamp: string;
    packageValue: string;
    sign: string;
  }): Promise<void>;
}
