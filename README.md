# AI助听器 · HearClear

一款面向中国用户的智能助听 App，基于 Expo (React Native) + Supabase 构建。

## 功能特性

- **实时助听**：麦克风输入 → 人声增强 → 降噪 → 耳机输出
- **可选听力测试**：纯音测听 250–8k Hz，简化 Hughson-Westlake，生成听力图；可跳过使用默认均匀放大
- **个性化处方**：基于听力图的半增益简化 G(f)=k·HL(f)，映射到 7 段 EQ，因人而异放大
- **运行中反馈修正**：太大声/太小声/刚好 + 可展开低/中/高频微调，修正持久化
- **多段 EQ 人声增强**：200Hz~4kHz 多频点提升，语音更清晰
- **自适应反馈抑制**：实时频谱检测啸叫，自动 Notch 滤波抑制
- **骨传导耳机专项优化**：更低增益上限、更激进 AEC、低频补偿
- **灵活付费体系**：终身 / 年付 / 月付 / 日卡，管理员可授予无限制会员
- **远程配置 + 离线容灾**：断网后付费用户正常使用，未付费用户基础放大可用
- **适老化 UI**：大字体、大触控区、首页完成核心操作
- **中英文双语**：自动跟随系统语言
- **广告系统**：穿山甲开屏 + Banner，付费用户免广告

## 目录结构

```
HearClear/
├── app/                    # Expo Router 页面
│   ├── (tabs)/             # 主 Tab：首页、设置
│   ├── (auth)/             # 登录
│   ├── legal/              # 隐私政策、用户协议、订阅条款
│   ├── onboarding.tsx      # 引导页
│   └── paywall.tsx         # 付费墙
├── src/
│   ├── components/         # 通用组件（LargeSlider 等）
│   ├── config/             # 音频配置、App 配置
│   ├── constants/          # 主题、存储键
│   ├── i18n/               # 中英文翻译
│   ├── services/           # Supabase、认证、API、音频引擎、支付、广告
│   ├── stores/             # Zustand 状态管理
│   ├── types/              # TypeScript 类型
│   └── utils/              # 工具函数
├── admin/                  # Next.js 管理后台
│   └── src/app/            # Dashboard、用户、订单、配置、版本等页面
└── supabase/
    └── migrations/         # SQL Schema
```

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 填写 Supabase URL 和 anon key
```

### 2. 初始化数据库

在 Supabase Dashboard 中执行：
```
supabase/migrations/001_initial_schema.sql
```

### 3. 启动 App

```bash
npm start
# 或
npm run ios / npm run android
```

### 4. 启动管理后台

```bash
cd admin
cp .env.example .env
npm install
npm run dev
# 访问 http://localhost:3000
```

## 注意事项

- **音频引擎**：需要真机测试（模拟器无麦克风）
- **支付集成**：微信支付/支付宝需要企业主体和对应 SDK native 集成
- **穿山甲广告**：需要申请穿山甲开发者账号，通过 Config Plugin 集成 SDK
- **Supabase Phone Auth**：需在 Supabase 配置阿里云短信自定义 SMS 提供商
