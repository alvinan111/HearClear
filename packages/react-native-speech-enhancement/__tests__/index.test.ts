/**
 * Speech Enhancement Module Tests
 */

describe('react-native-speech-enhancement', () => {
  beforeEach(() => {
    // Clear all mocks and reset modules before each test
    jest.clearAllMocks();
    jest.resetModules();
    
    // Re-mock React Native before each test
    jest.doMock('react-native', () => ({
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
  });

  afterEach(() => {
    jest.resetModules();
    jest.unmock('react-native');
  });

  describe('setEnabled', () => {
    it('should call AudioAPIModule.setSpeechEnhancementEnabled when module exists', () => {
      // Import fresh module
      const { setEnabled } = require('../src/index');
      const { NativeModules } = require('react-native');
      
      setEnabled(true);
      expect(NativeModules.AudioAPIModule.setSpeechEnhancementEnabled).toHaveBeenCalledWith(true);

      setEnabled(false);
      expect(NativeModules.AudioAPIModule.setSpeechEnhancementEnabled).toHaveBeenCalledWith(false);
    });

    it('should not throw error when AudioAPIModule is unavailable', () => {
      const { NativeModules } = require('react-native');
      NativeModules.AudioAPIModule = undefined;
      
      const { setEnabled } = require('../src/index');

      // Should not throw
      expect(() => {
        setEnabled(true);
      }).not.toThrow();
    });

    it('should not throw error when setSpeechEnhancementEnabled is not a function', () => {
      const { NativeModules } = require('react-native');
      NativeModules.AudioAPIModule = {
        setSpeechEnhancementEnabled: 'not-a-function',
      };
      
      const { setEnabled } = require('../src/index');

      // Should not throw
      expect(() => {
        setEnabled(true);
      }).not.toThrow();
    });

    it('should handle errors gracefully in __DEV__ mode', () => {
      const { NativeModules } = require('react-native');
      const mockError = new Error('Native module error');
      const mockSetEnabled = jest.fn(() => {
        throw mockError;
      });

      NativeModules.AudioAPIModule = {
        setSpeechEnhancementEnabled: mockSetEnabled,
      };

      const { setEnabled } = require('../src/index');
      const spyWarn = jest.spyOn(console, 'warn');

      setEnabled(true);
      expect(mockSetEnabled).toHaveBeenCalledWith(true);
      expect(spyWarn).toHaveBeenCalled();
      expect(spyWarn.mock.calls[0][0]).toContain('setSpeechEnhancementEnabled failed');

      spyWarn.mockRestore();
    });
  });

  describe('isAvailable', () => {
    it('should return true when AudioAPIModule.setSpeechEnhancementEnabled exists', () => {
      const { isAvailable } = require('../src/index');
      
      expect(isAvailable()).toBe(true);
    });

    it('should return false when AudioAPIModule does not exist', () => {
      const { NativeModules } = require('react-native');
      NativeModules.AudioAPIModule = undefined;

      const { isAvailable } = require('../src/index');

      expect(isAvailable()).toBe(false);
    });

    it('should return false when setSpeechEnhancementEnabled is not a function', () => {
      const { NativeModules } = require('react-native');
      NativeModules.AudioAPIModule = {
        setSpeechEnhancementEnabled: 'not-a-function',
      };

      const { isAvailable } = require('../src/index');

      expect(isAvailable()).toBe(false);
    });

    it('should return false when AudioAPIModule is null', () => {
      const { NativeModules } = require('react-native');
      NativeModules.AudioAPIModule = null;

      const { isAvailable } = require('../src/index');

      expect(isAvailable()).toBe(false);
    });
  });

  describe('ensureNativeInit', () => {
    it('should call SpeechEnhancementNative.init on first call', () => {
      const { NativeModules } = require('react-native');
      const { ensureNativeInit } = require('../src/index');

      ensureNativeInit();

      expect(NativeModules.SpeechEnhancementNative.init).toHaveBeenCalled();
    });

    it('should only call init once even if called multiple times', () => {
      const { NativeModules } = require('react-native');
      const { ensureNativeInit } = require('../src/index');

      ensureNativeInit();
      ensureNativeInit();
      ensureNativeInit();

      // Should be called only once
      expect(NativeModules.SpeechEnhancementNative.init).toHaveBeenCalledTimes(1);
    });

    it('should not throw when SpeechEnhancementNative.init fails', () => {
      const { NativeModules } = require('react-native');
      NativeModules.SpeechEnhancementNative = {
        init: jest.fn(() => {
          throw new Error('Init failed');
        }),
      };

      const { ensureNativeInit } = require('../src/index');

      // Should not throw
      expect(() => {
        ensureNativeInit();
      }).not.toThrow();
    });

    it('should not throw when SpeechEnhancementNative is undefined', () => {
      const { NativeModules } = require('react-native');
      NativeModules.SpeechEnhancementNative = undefined;

      const { ensureNativeInit } = require('../src/index');

      // Should not throw
      expect(() => {
        ensureNativeInit();
      }).not.toThrow();
    });

    it('should not throw when init method does not exist', () => {
      const { NativeModules } = require('react-native');
      NativeModules.SpeechEnhancementNative = {};

      const { ensureNativeInit } = require('../src/index');

      // Should not throw
      expect(() => {
        ensureNativeInit();
      }).not.toThrow();
    });
  });

  describe('module exports', () => {
    it('should export all required functions', () => {
      const module = require('../src/index');

      expect(typeof module.setEnabled).toBe('function');
      expect(typeof module.isAvailable).toBe('function');
      expect(typeof module.ensureNativeInit).toBe('function');
    });

    it('should have proper function signatures', () => {
      const module = require('../src/index');

      // setEnabled should accept a boolean
      expect(() => module.setEnabled(true)).not.toThrow();
      expect(() => module.setEnabled(false)).not.toThrow();

      // isAvailable should return a boolean
      const result = module.isAvailable();
      expect(typeof result).toBe('boolean');

      // ensureNativeInit should return undefined
      const initResult = module.ensureNativeInit();
      expect(initResult).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should initialize and then enable/disable feature', () => {
      const { NativeModules } = require('react-native');
      const { setEnabled, isAvailable, ensureNativeInit } = require('../src/index');

      // Scenario: initialize
      ensureNativeInit();
      expect(NativeModules.SpeechEnhancementNative.init).toHaveBeenCalled();

      // Check availability
      expect(isAvailable()).toBe(true);

      // Enable feature
      setEnabled(true);
      expect(NativeModules.AudioAPIModule.setSpeechEnhancementEnabled).toHaveBeenCalledWith(true);

      // Disable feature
      setEnabled(false);
      expect(NativeModules.AudioAPIModule.setSpeechEnhancementEnabled).toHaveBeenCalledWith(false);
    });

    it('should handle case where native modules are gradually available', () => {
      const { NativeModules } = require('react-native');
      const { setEnabled, isAvailable } = require('../src/index');

      // Initially not available
      NativeModules.AudioAPIModule = undefined;
      expect(isAvailable()).toBe(false);

      // setEnabled should not throw even when not available
      expect(() => setEnabled(true)).not.toThrow();

      // Module becomes available later
      NativeModules.AudioAPIModule = {
        setSpeechEnhancementEnabled: jest.fn(),
      };

      expect(isAvailable()).toBe(true);
      expect(() => setEnabled(true)).not.toThrow();
    });
  });
});
