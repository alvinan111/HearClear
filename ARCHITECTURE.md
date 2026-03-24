# 架构说明

## 📐 系统概览

HearClear 是一个实时音频处理助听应用，采用客户端-服务器混合架构：

```
┌─────────────────────────────────────────────────────┐
│              HearClear 架构全景                       │
└─────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Mobile Client      │ (React Native + Expo)
│  ┌────────────────┐  │
│  │ Audio Engine   │  │ → 实时处理、播放、录音
│  │ UI Components  │  │ → 参数调节、显示反馈
│  │ State (Zustand)│  │ → 状态管理
│  └────────────────┘  │
└──────────────────────┘
         ↕ WebSocket/REST API
┌──────────────────────┐
│  Backend (Supabase)  │
│  ┌────────────────┐  │
│  │ Auth & DB      │  │ → User profiles、settings
│  │ Functions      │  │ → Signal processing tasks
│  │ Storage        │  │ → User data persistence
│  └────────────────┘  │
└──────────────────────┘

┌──────────────────────┐
│  Admin Dashboard     │ (Next.js + React)
│  ┌────────────────┐  │
│  │ User Management│  │ → Manage users、subscriptions
│  │ Analytics      │  │ → Usage stats、test results
│  │ Config         │  │ → Remote configuration
│  └────────────────┘  │
└──────────────────────┘
```

## 🏗️ 项目结构

```
HearClear/
├── app/                              # React Native/Expo 应用
│   ├── (tabs)/                      # 标签式导航
│   │   ├── index.tsx                # 🏠 主屏幕 - 助听控制
│   │   └── settings.tsx             # ⚙️  设置 - 参数调节
│   ├── (auth)/                      # 认证流程
│   └── legal/                       # 法律页面
│
├── src/                             # 核心逻辑
│   ├── services/
│   │   ├── audio/                   # 🎧 音频处理核心
│   │   │   ├── AudioEngine.ts       # → 主音频引擎
│   │   │   ├── AudioProcessor.ts    # → DSP处理
│   │   │   └── ...
│   │   ├── hearing-test/            # 👂 听力测试
│   │   ├── auth.ts                  # 认证服务
│   │   ├── payment.ts               # 支付管理
│   │   └── ...
│   │
│   ├── stores/                      # 状态管理 (Zustand)
│   │   ├── audio-store.ts           # 🎚️  音频参数
│   │   ├── auth-store.ts            # 🔐 用户认证
│   │   ├── subscription-store.ts    # 💳 订阅信息
│   │   └── ...
│   │
│   ├── components/                  # UI 组件库
│   │   ├── DualSpectrum.tsx         # 📊 频谱分析
│   │   ├── PrettySlider.tsx         # 🎛️  高级滑块
│   │   ├── QuickAdjustPanel.tsx     # 🎯 快速调节
│   │   └── ...
│   │
│   ├── hooks/                       # 自定义Hooks
│   │   ├── useAudioAnalyser.ts      # 频谱分析
│   │   ├── useHeadphoneDetection.ts # 耳机检测
│   │   └── ...
│   │
│   ├── i18n/                        # 国际化
│   │   ├── en.ts                    # 英文
│   │   └── zh.ts                    # 中文
│   │
│   └── constants/
│       └── theme.ts                 # 🎨 设计系统
│
├── admin/                           # 管理后台 (Next.js)
│   ├── src/
│   │   ├── app/                     # 页面路由
│   │   ├── lib/                     # 工具函数
│   │   └── components/              # UI组件
│   └── package.json
│
├── packages/                        # 本地包
│   └── react-native-speech-enhancement/  # 语音增强原生模块
│
├── docs/                            # 📚 完整文档
│   ├── QUICK_REFERENCE.md           # 快速开发指南
│   ├── native-audio-architecture.md # 音频系统详解
│   ├── hearing-test-and-prescription.md
│   ├── neural-denoiser-integration.md
│   └── ... (15+ 更多文档)
│
└── scripts/                         # 工具脚本
    ├── run-android-with-logs.mjs
    └── audio-regression/            # 音频回归测试
```

## 🎧 音频处理管道

```
┌─────────────────────────────────────────────┐
│         Real-Time Audio Pipeline            │
└─────────────────────────────────────────────┘

INPUT (麦克风)
    ↓
┌─────────────────────────────────────────────┐
│ 📊 频谱分析 (FFT)                            │
│ - 26-28 frequency bars                      │
│ - Environment vs Voice separation           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 🌿 噪音门限 (Noise Gate)                     │
│ - 阈值: 0-100%                              │
│ - 压制背景噪音                              │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 🗣️  语音增强 (Voice Enhancement)            │
│ - 频率响应调整                              │
│ - 清晰度提升                                │
│ - 倍数: 0.5x - 2.0x                         │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 🧠 神经降噪 (Neural Denoiser) - Optional   │
│ - 深度学习模型                              │
│ - 实时推理                                  │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 🔊 音量放大 (Gain Control)                  │
│ - 范围: -12 dB ~ +24 dB                     │
│ - 峰值限制器防止削波                        │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 📈 音频分析 + 用户反馈                       │
│ - 实时音量检测                              │
│ - 反馈correction: too-quiet/just-right/too-loud
└─────────────────────────────────────────────┘
    ↓
OUTPUT (耳机/扬声器)
```

## 🔄 状态管理 (Zustand)

核心状态存储：

```typescript
// audio-store.ts
{
  status: 'idle' | 'starting' | 'running' | 'stopping' | 'error'
  
  params: {
    gain: number                    // -12 ~ +24 dB
    voiceEnhance: number            // 0.5 ~ 2.0x
    noiseGate: number               // 0 ~ 1.0
    neuralDenoiser: boolean
    headphoneMode: 'normal' | 'bone_conduction'
    scene: 'default' | 'tv'         // 场景预设
    feedbackCorrection: {...}       // 用户反馈调整
  }
  
  configLocked: boolean             // 运行时是否锁定参数
  // ... 更多状态
}

// auth-store.ts
{
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  // ... 认证方法
}

// subscription-store.ts
{
  subscription: Subscription | null
  isPaid: boolean
  isInTrial: boolean
  trialDaysRemaining: number
  // ... 订阅方法
}
```

## 🏃 数据流示例

### 用户调节音量

```
User adjusts PrettySlider
    ↓
QuickAdjustPanel → onGainChange()
    ↓
audio-store.updateParams({ gain: value })
    ↓
Zustand store state updated
    ↓
AudioEngine.updateGain(value)
    ↓
Native audio layer applies dB adjustment
    ↓
RealTimeAudioAnalyser detects volume level
    ↓
UI updates with visual feedback (bars light up)
```

### 用户启动助听

```
User clicks SciFiPowerButton
    ↓
setStatus('starting')
    ↓
AudioEngine.start(latestParams)
    ↓
Initialize audio capture & playback
    ↓
Start processing pipeline
    ↓
Begin background service
    ↓
setStatus('running')
    ↓
DualSpectrum & controls become active
```

## 📱 关键组件

### AudioEngine (核心引擎)
- 单例模式
- 方法：`start()`, `stop()`, `updateParams()`
- 实时处理和输出
- 见 [音频架构文档](docs/native-audio-architecture.md)

### DualSpectrum (可视化)
- 实时频谱分析 (28 bars)
- 环境音 vs 人声分离显示
- 帮助用户理解音频处理效果

### QuickAdjustPanel (快速调节)
- 集成三个主要参数的滑块
- 音量反馈选项
- 快速预设（清晰对话、看电视、户外等）

## 🔌 API 集成

### Supabase
- Authentication (Phone auth)
- Database (User profiles、Hearing test results)
- Real-time subscriptions
- Storage (User data)

### Stripe (可选)
- Payment processing
- Subscription management
- Invoice management

## 🧪 测试策略

```
Unit Tests
├── Services (audio, auth, payment)
├── Stores (state management)
├── Hooks (custom hooks)
└── Utils (helper functions)

Integration Tests
├── Audio pipeline tests
├── Auth flow tests
├── Hearing test flow

E2E Tests
├── Mobile app scenarios
├── Admin dashboard workflows

Performance Tests
├── Audio latency monitoring
├── Memory usage tracking
├── Battery consumption (if applicable)

Regression Tests
├── Audio quality benchmarking
├── Hearing test accuracy
```

见 [测试指南](docs/testing.md)

## 🚀 部署架构

```
GitHub Repository
    ↓
├─→ EAS Build (Expo Application Services)
│   ├─→ iOS Build (.ipa)
│   └─→ Android Build (.apk/.aab)
│
├─→ Supabase Functions (Backend)
│   └─→ Signal processing、user data processing
│
└─→ Vercel (Admin Dashboard)
    └─→ Next.js deployment
```

见 [部署指南](DEPLOYMENT.md)

## 📊 设计系统

统一的设计系统（见 [theme.ts](src/constants/theme.ts)）：

```
Colors
├─ Primary: #38BDF8 (sky blue)
├─ Success: #00E887 (emerald)
├─ Warning: #FBBF24 (amber)
└─ Danger: #EF4444 (red)

Typography
├─ Font sizes: xs(11px) ~ display(56px)
├─ Font weights: regular(400) ~ bold(700)
└─ Line heights: compact ~ loose

Spacing
├─ Scale: xs(4px) → xxl(48px)
└─ Consistent 4px grid system

Shadows & Effects
├─ sm, md, lg, xl shadows
├─ Glassmorphism effects
└─ Corner radius: sm(8px) ~ full(9999px)
```

新组件应遵循此系统以保持一致性。

## 🔐 安全考虑

- 敏感信息存储在 `expo-secure-store`
- API 令牌不存储在代码中，使用环境变量
- Supabase RLS (Row-Level Security) 启用
- 定期依赖更新检查

## 📝 开发流程

1. **分支策略**：feature/, fix/, docs/ 前缀
2. **提交**：遵循 Conventional Commits
3. **PR**：代码审查 + 测试通过后合并
4. **版本**：语义版本化 (SemVer)

更多细节见 [CONTRIBUTING.md](CONTRIBUTING.md)

---

**想要深入了解？**
- 🎧 [音频架构详解](docs/native-audio-architecture.md)
- 👂 [听力测试实现](docs/hearing-test-and-prescription.md)
- 🧠 [神经降噪集成](docs/neural-denoiser-integration.md)
- 📚 [完整文档索引](docs/QUICK_REFERENCE.md)
