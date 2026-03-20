# HearClear · AI 助听器

**HearClear** 是一款面向普通用户的智能助听 App：实时人声增强与降噪、可选听力测试与个性化处方、多段 EQ、反馈抑制，支持骨传导与适老化 UI。  
*Smart hearing aid app: real-time speech enhancement, optional hearing test & prescription, multi-band EQ, feedback suppression.*

---

## 功能特性

- **实时助听**：麦克风 → 人声增强 → 降噪 → 耳机输出
- **可选听力测试**：纯音测听 250–8k Hz，简化 Hughson-Westlake，生成听力图；可跳过使用默认均匀放大
- **个性化处方**：基于听力图的半增益 G(f)=k·HL(f)，映射到 7 段 EQ
- **运行中反馈修正**：太大声/太小声/刚好 + 低/中/高频微调，修正持久化
- **多段 EQ 人声增强**：200Hz~4kHz 多频点提升
- **自适应反馈抑制**：实时检测啸叫，Notch 滤波抑制
- **骨传导专项优化**：更低增益上限、更激进 AEC、低频补偿
- **灵活付费**：终身/年/月/日卡，管理员可授予无限制会员
- **远程配置 + 离线容灾**：断网后付费用户正常使用
- **适老化 UI**：大字体、大触控区；中英文双语

---

## 技术栈

| 端       | 技术 |
|----------|------|
| 移动 App | Expo 54、React Native、Expo Router、react-native-audio-api |
| 管理后台 | Next.js（`admin/`） |
| 后端     | Supabase（Auth、DB、Edge Functions 可选） |
| 状态     | Zustand |

---

## 目录结构

```
HearClear/
├── app/                    # Expo Router 页面
│   ├── (tabs)/             # 首页、设置
│   ├── onboarding.tsx      # 引导
│   ├── hearing-test.tsx    # 听力测试
│   └── paywall.tsx         # 付费墙
├── src/
│   ├── components/         # 通用组件
│   ├── config/             # 音频与 App 配置
│   ├── i18n/               # 中英文
│   ├── services/           # Supabase、音频引擎、听力测试、支付等
│   ├── stores/             # Zustand
│   └── types/
├── admin/                  # Next.js 管理后台
├── docs/                   # 架构与产品文档
├── scripts/               # 构建与测试脚本
└── supabase/migrations/    # SQL Schema
```

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- Expo CLI（`npm install -g expo-cli` 可选）
- 真机或模拟器（音频相关功能建议真机）

### 1. 克隆与安装

```bash
git clone https://github.com/alvinan111/HearClear.git
cd HearClear
npm install
```

### 2. 环境变量

**根目录（App）：**

```bash
cp .env.example .env
# 编辑 .env：填写 EXPO_PUBLIC_SUPABASE_URL、EXPO_PUBLIC_SUPABASE_ANON_KEY
# 可选：穿山甲 EXPO_PUBLIC_PANGLE_APP_ID_*
```

**管理后台：**

```bash
cd admin
cp .env.example .env
# 填写 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
```

### 3. 数据库

在 Supabase 项目中执行：

- `supabase/migrations/` 下 SQL（或 Dashboard SQL Editor 中执行对应 schema）

### 4. 运行

```bash
# 根目录
npm start
# 或
npm run android
npm run ios
```

```bash
# 管理后台
cd admin && npm run dev
# 访问 http://localhost:3000
```

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Expo 开发服务器 |
| `npm run android` / `npm run ios` | 运行 Android / iOS |
| `npm test` | 单元测试 |
| `npm run test:coverage` | 单元测试 + 覆盖率 |
| `npm run test:db` | 数据库 Schema 测试（需见下方环境变量） |
| `npm run test:audio-regression` | 音频回归测试 |

**运行 `test:db` 前** 需设置 Supabase 管理 API 凭据（用于校验表结构，不提交到仓库）：

```bash
export SUPABASE_PROJECT_ID=你的项目 ref
export SUPABASE_ACCESS_TOKEN=你的 access token
npm run test:db
```

Token 可在 [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API 中创建。

---

## 文档

- [听力测试与处方、反馈修正](docs/hearing-test-and-prescription.md)
- [原生音频架构与演进](docs/native-audio-architecture.md)

---

## 注意事项

- **音频**：需真机测试（模拟器无麦克风）。
- **支付**：微信/支付宝需企业主体与对应 Native SDK。
- **穿山甲广告**：需申请穿山甲开发者账号，通过 Config Plugin 集成。
- **Supabase 短信**：Phone Auth 需配置自定义 SMS 提供商（如阿里云）。

---

## 贡献与安全

- 欢迎提 Issue 与 Pull Request，参见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 安全相关问题请勿公开披露，请参见 [SECURITY.md](SECURITY.md)。
- 若要将本仓库设为公开，请按 [docs/repo-public-checklist.md](docs/repo-public-checklist.md) 核对。

---

## 许可证

[MIT](LICENSE) © HearClear
