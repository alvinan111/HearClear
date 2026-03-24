/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // 关闭 TS 类型诊断：@types/* 别名会触发 TS6137（保留命名空间冲突），
      // 测试环境只验证运行时行为，类型安全由 tsc 在构建时保证
      diagnostics: false,
      tsconfig: {
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        baseUrl: '.',
        paths: {
          '@/*':            ['src/*'],
          '@components/*':  ['src/components/*'],
          '@services/*':    ['src/services/*'],
          '@stores/*':      ['src/stores/*'],
          '@hooks/*':       ['src/hooks/*'],
          '@config/*':      ['src/config/*'],
          '@types/*':       ['src/types/*'],
          '@utils/*':       ['src/utils/*'],
          '@constants/*':   ['src/constants/*'],
          '@i18n/*':        ['src/i18n/*'],
        },
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$':                     '<rootDir>/src/$1',
    '^@components/(.*)$':           '<rootDir>/src/components/$1',
    '^@services/(.*)$':             '<rootDir>/src/services/$1',
    '^@stores/(.*)$':               '<rootDir>/src/stores/$1',
    '^@hooks/(.*)$':                '<rootDir>/src/hooks/$1',
    '^@config/(.*)$':               '<rootDir>/src/config/$1',
    '^@utils/(.*)$':                '<rootDir>/src/utils/$1',
    '^@constants/(.*)$':            '<rootDir>/src/constants/$1',
    '^@i18n/(.*)$':                 '<rootDir>/src/i18n/$1',
    '^app/(.*)$':                   '<rootDir>/app/$1',
    // Mock React Native 原生模块
    '^react-native$':               '<rootDir>/src/__mocks__/react-native.ts',
    '^@react-native-async-storage/async-storage$':
                                    '<rootDir>/src/__mocks__/@react-native-async-storage/async-storage.ts',
    '^@react-native-community/netinfo$':
                                    '<rootDir>/src/__mocks__/@react-native-community/netinfo.ts',
    // 忽略无法在 node 下运行的 RN 原生包
    '^react-native-reanimated$':    '<rootDir>/src/__mocks__/empty.ts',
    '^expo-.*$':                    '<rootDir>/src/__mocks__/empty.ts',
    '^react-native-device-info$':   '<rootDir>/src/__mocks__/empty.ts',
    '^react-native-wechat-lib$':    '<rootDir>/src/__mocks__/empty.ts',
    '^react-native-audio-api$':     '<rootDir>/src/__mocks__/empty.ts',
    '^react-native-speech-enhancement$': '<rootDir>/src/__mocks__/empty.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 15000,
};
