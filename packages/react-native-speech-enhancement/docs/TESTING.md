# react-native-speech-enhancement 测试指南

## 概览

这个 React Native 原生模块的测试框架包括:

- ✅ **单元测试** - Jest 测试套件，覆盖所有导出函数
- ✅ **Mock 设置** - React Native NativeModules 的完整 Mock
- ✅ **集成场景** - 真实使用场景的测试
- ✅ **自测脚本** - 一键验证测试环境和执行

## 项目结构

```
react-native-speech-enhancement/
├── src/
│   └── index.ts              # 单一导出模块（setEnabled, isAvailable, ensureNativeInit）
├── __tests__/
│   ├── setup.ts              # Jest 配置和 Mock 设置
│   └── index.test.ts         # 完整的单元测试套件
├── jest.config.js            # Jest 配置
├── self-test.js              # 自动化自测脚本
└── package.json              # 添加了 test 脚本
```

## 测试覆盖范围

### 1. `setEnabled(enabled: boolean)` 函数

| 场景 | 覆盖 | 说明 |
|------|------|------|
| 正常调用 | ✅ | 调用 AudioAPIModule.setSpeechEnhancementEnabled |
| AudioAPIModule 缺失 | ✅ | 不抛错，graceful degradation |
| 非函数方法 | ✅ | 正确检查类型 |
| 错误处理 | ✅ | 在 __DEV__ 模式下记录警告 |

### 2. `isAvailable()` 函数

| 场景 | 覆盖 | 说明 |
|------|------|------|
| 模块可用 | ✅ | 返回 true |
| 模块缺失 | ✅ | 返回 false |
| 方法非函数 | ✅ | 返回 false |
| null AudioAPIModule | ✅ | 返回 false |

### 3. `ensureNativeInit()` 函数

| 场景 | 覆盖 | 说明 |
|------|------|------|
| 首次调用 | ✅ | 执行 init() |
| 重复调用 | ✅ | 仅执行一次（单例保证） |
| init 失败 | ✅ | 不抛错 |
| 模块缺失 | ✅ | 无错 |

### 4. 集成场景

| 场景 | 说明 |
|------|------|
| 初始化 + 启用/禁用 | 完整工作流测试 |
| 动态模块可用性 | 从不可用到可用的转变 |

## 快速开始

### 运行所有测试

```bash
cd packages/react-native-speech-enhancement
npm test
```

### 监视模式

```bash
npm run test:watch
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

### 运行自测脚本

```bash
npm run self-test
```

这会输出:
- ✓ 环境验证
- ✓ 文件结构检查
- ✓ 依赖检查
- ✓ TypeScript 类型检查
- ✓ Jest 测试执行
- ✓ 导出验证
- ✓ 文档检查

## 自测脚本详解

`self-test.js` 是一个完整的验证脚本，检查:

### 1. 环境验证
- Node.js 版本
- npm 可用性
- TypeScript 安装
- Jest 安装

### 2. 文件结构
```
✓ package.json
✓ jest.config.js
✓ src/index.ts
✓ __tests__/index.test.ts
✓ __tests__/setup.ts
```

### 3. 依赖检查
- 测试脚本配置
- DevDependencies 完整性

### 4. TypeScript 类型检查
```bash
npx tsc --noEmit
```

### 5. Jest 测试执行
- 运行完整测试套件
- 解析测试结果
- 输出测试数量

### 6. 模块导出验证
- 检查 `setEnabled`
- 检查 `isAvailable`
- 检查 `ensureNativeInit`

### 7. 文档检查
- README.md（必需）
- docs/TESTING.md（可选）

## 输出示例

```
════════════════════════════════════════════════════════════
  1. Environment Verification
════════════════════════════════════════════════════════════

ℹ Node.js version: v18.17.1
✓ Node.js is available
✓ npm is available
✓ TypeScript is installed
✓ Jest is installed

════════════════════════════════════════════════════════════
  2. File Structure Verification
════════════════════════════════════════════════════════════

✓ File exists: package.json
✓ File exists: jest.config.js
✓ File exists: src/index.ts
✓ File exists: __tests__/index.test.ts
✓ File exists: __tests__/setup.ts

════════════════════════════════════════════════════════════
  5. Running Jest Tests
════════════════════════════════════════════════════════════

PASS __tests__/index.test.ts (5.234 s)
  react-native-speech-enhancement
    setEnabled
      ✓ should call AudioAPIModule.setSpeechEnhancementEnabled when module exists
      ✓ should not throw error when AudioAPIModule is unavailable
      ✓ should not throw error when setSpeechEnhancementEnabled is not a function
      ✓ should handle errors gracefully in __DEV__ mode
    isAvailable
      ✓ should return true when AudioAPIModule.setSpeechEnhancementEnabled exists
      ✓ should return false when AudioAPIModule does not exist
      ✓ should return false when setSpeechEnhancementEnabled is not a function
      ✓ should return false when AudioAPIModule is null
    ensureNativeInit
      ✓ should call SpeechEnhancementNative.init on first call
      ✓ should only call init once even if called multiple times
      ✓ should not throw when SpeechEnhancementNative.init fails
      ✓ should not throw when SpeechEnhancementNative is undefined
      ✓ should not throw when init method does not exist
    module exports
      ✓ should export all required functions
      ✓ should have proper function signatures
    integration scenarios
      ✓ should initialize and then enable/disable feature
      ✓ should handle case where native modules are gradually available

════════════════════════════════════════════════════════════
  Summary
╔══════════════════════════════════════════════════════════╗
║  TESTS PASSED                           │              16║
╚══════════════════════════════════════════════════════════╝

✓ All checks passed!
```

## 覆盖率目标

当前覆盖率阈值（在 `jest.config.js` 中设置）:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

## 模拟策略

该测试框架使用以下 Mock 策略:

### React Native 模拟

```typescript
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
    select: (obj) => obj.ios || obj.default,
  },
}));
```

### 清理程序

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});
```

这确保每个测试都在干净的状态下运行，没有相互干扰。

## 常见问题

### Q: 为什么要 Mock React Native？
A: 因为我们在 Node.js 环境中运行测试，React Native 原生模块不可用。Mock 让我们可以测试 TypeScript 代码的逻辑，而不依赖于真实的原生层。

### Q: 测试是否覆盖真实的 iOS/Android 行为？
A: 不是。这些是**单元测试**，测试 TypeScript 代码逻辑。真实的原生行为需要在真机或模拟器上进行集成测试。

### Q: 如何在真实设备上测试？
A: 参考父项目的 `DEPLOYMENT.md`，使用 `eas build` 在真实设备上进行 E2E 测试。

### Q: 我可以添加更多测试吗？
A: 当然！添加更多测试很简单:

```typescript
it('should do something specific', () => {
  const module = require('../src/index');
  // ... your test code
  expect(...).toBe(...);
});
```

### Q: self-test.js 脚本失败了怎么办？
A: 检查:
1. Node.js 版本 >= 14
2. npm 已安装
3. 依赖已安装 (`npm install` 在根目录)
4. TypeScript 版本兼容

## 集成到 CI/CD

在 GitHub Actions 中运行测试:

```yaml
- name: Test react-native-speech-enhancement
  run: |
    cd packages/react-native-speech-enhancement
    npm run self-test
```

## 相关文档

- [项目 README](README.md)
- [主项目 CONTRIBUTING.md](../../CONTRIBUTING.md)
- [主项目 TESTING 文档](../../docs/testing.md)

---

**最后更新**: 2024-03-22

**维护者**: HearClear 开发团队
