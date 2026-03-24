/**
 * Test setup file for react-native-speech-enhancement
 */

// Mock React Native
jest.mock('react-native', () => ({
  NativeModules: {
    AudioAPIModule: {
      setSpeechEnhancementEnabled: jest.fn(),
    },
    SpeechEnhancementNative: {
      init: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, any>) => obj.ios || obj.default,
  },
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Reset the nativeInitDone flag by clearing the module cache
  jest.resetModules();
});

// Suppress console output in tests unless explicitly checking for it
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};
