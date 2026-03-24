/**
 * 全局类型和变量定义
 */

declare const __DEV__: boolean;

declare module 'expo-constants' {
  export interface Constants {
    expoVersion: string;
    manifest: any;
    platform: any;
  }
  
  const constants: Constants;
  export default constants;
}
