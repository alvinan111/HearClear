export const Platform = { OS: 'ios' };
export const Alert = { alert: jest.fn() };
/** 测试可注入 AudioAPIModule 等，用于语音增强 / setSpeechEnhancementEnabled 相关用例 */
export const NativeModules: Record<string, unknown> = {};
