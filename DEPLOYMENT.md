# 部署指南

本指南涵盖 HearClear 应用和管理后台的部署流程。

## 📋 前置条件

在部署前，确保您有：

- GitHub 账户与访问权限
- EAS 账户 (Expo Application Services)
- Supabase 项目
- Vercel 账户（用于管理后台）
- 适用的 API 密钥和凭证
- Apple Developer 账户（iOS）
- Google Play 开发者账户（Android）

## 🏗️ 部署架构

```
┌─────────────────────┐
│ React Native App    │
├─────────────────────┤
│ • iOS (.ipa)       │ → Apple App Store
│ • Android (.apk)   │ → Google Play Store
│ • Expo Go          │ → Testing
└─────────────────────┘

┌─────────────────────┐
│ Backend Services    │
├─────────────────────┤
│ • Supabase Auth     │
│ • PostgreSQL DB     │
│ • Storage Buckets   │
└─────────────────────┘

┌─────────────────────┐
│ Admin Dashboard     │
├─────────────────────┤
│ Next.js → Vercel    │
└─────────────────────┘
```

## 📱 移动应用部署

### 1. EAS Build 设置

#### 安装 EAS CLI
```bash
npm install -g eas-cli
```

#### 配置 EAS 项目
```bash
eas build:configure
```

这将生成或更新 `eas.json`：

```json
{
  "cli": {
    "version": ">= 5.0.0",
    "requireCommit": true
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "...",
        "track": "internal"
      },
      "ios": {
        "ascAppId": "...",
        "appleId": "..."
      }
    }
  }
}
```

### 2. 环境变量配置

创建 `.env.production`：

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_PROJECT_ID=your-project-id

# API
API_BASE_URL=https://api.hearclear.app

# Feature flags
ENABLE_NEURAL_DENOISER=true
ENABLE_ANALYTICS=true
```

配置 `app.json` 以支持环境变量：

```json
{
  "expo": {
    "name": "HearClear",
    "slug": "hearclear",
    "version": "1.0.0",
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    },
    "plugins": [
      ["expo-audio", {}],
      ["expo-secure-store", {}]
    ]
  }
}
```

### 3. iOS 部署

#### 使用 App Store Connect：

```bash
# 为应用编号
eas build --platform ios --auto-submit

# 或手动步骤：
eas build --platform ios
# 上传 .ipa 至 App Store Connect
# 提交审核
```

**注意事项：**
- 需要 Apple Developer 账户和证书
- App Store 审核可能需要 1-3 天
- 需要隐私政策 URL
- 必须符合可访问性指南

### 4. Android 部署

#### 使用 Google Play：

```bash
# 生成签名密钥
eas credentials

# 构建并提交
eas build --platform android --auto-submit

# 或分步：
eas build --platform android
# 上传 .aab 至 Google Play Console
# 提交审核
```

**注意事项：**
- 需要 Google Play 开发者账户
- 首次发布需要详细的应用信息
- 审核通常 2-4 小时
- 需要隐私政策和使用条款

### 5. 版本管理

遵循语义版本化：

```
MAJOR.MINOR.PATCH
1.0.0 = Initial release
1.1.0 = New features
1.0.1 = Bug fixes
```

更新版本：

```bash
# package.json
"version": "1.0.1"

# app.json
"expo": {
  "version": "1.0.1"
}

# android/gradle.properties (Android Studio)
versionCode=2
versionName=1.0.1

# ios/HearClear/Info.plist (Xcode)
<key>CFBundleShortVersionString</key>
<string>1.0.1</string>
```

## 🖥️ 后端部署

### Supabase 部署

#### 1. 数据库迁移

```bash
# 连接至 Supabase
supabase link

# 创建迁移
supabase migration new add_users_table

# 应用迁移
supabase db push
```

#### 2. 启用安全策略 (RLS)

在 Supabase 控制台启用行级安全 (Row-Level Security)：

```sql
-- 示例：users 表
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = user_id);
```

#### 3. 设置 Auth

- 启用电话认证
- 配置 SMTP 供应商（邮件发送）
- 设置 JWT 密钥

#### 4. 存储桶配置

创建必要的存储桶：

```
- user-data/         (private)
- hearing-tests/     (private)
- admin-uploads/     (private)
```

## 🎨 管理后台部署（Vercel）

### 1. 连接 GitHub

```bash
# 推送 admin 目录到 GitHub
git push origin main
```

### 2. 在 Vercel 导入项目

1. 访问 [vercel.com/new](https://vercel.com/new)
2. 选择 GitHub 仓库
3. 设置根目录：`./admin`
4. 配置环境变量

### 3. 环境变量

在 Vercel 项目设置中添加：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 自动部署

Vercel 将在每个 push 时自动部署：

```
main branch → Production
dev branch → Preview (可选)
```

## ✅ 预发布检查清单

在每次发布前：

### 代码质量
- [ ] 所有测试通过：`npm test`
- [ ] 代码覆盖率 ≥ 70%：`npm run test:coverage`
- [ ] 没有 linting 错误：`npm run lint`
- [ ] TypeScript 通过检查：`npm run type-check`

### 安全
- [ ] 没有硬编码的密钥或令牌
- [ ] 依赖项已审计：`npm audit`
- [ ] 敏感数据使用 env vars
- [ ] 已更新隐私政策和使用条款

### 文档
- [ ] README 已更新
- [ ] 变更日志已更新
- [ ] API 文档已更新
- [ ] 迁移指南（如需要）

### 版本
- [ ] 版本号已更新（app.json, package.json）
- [ ] 标签创建：`git tag v1.0.0`
- [ ] Release notes 已准备

### 功能
- [ ] 所有新功能已测试
- [ ] 向后兼容性已验证
- [ ] 已在实际设备上测试
- [ ] 性能基准已检查

## 📈 部署后监控

### 应用性能

```bash
# 监控崩溃和错误
# 通过 Sentry（如果配置）或原生日志查看

# 检查用户反馈
# 通过 app 内反馈表单或应用商店评论
```

### 用户指标

监控：
- Daily Active Users (DAU)
- Session duration
- Feature usage
- Audio processing statistics

### 基础设施

监控：
- Supabase 数据库性能
- API 响应时间
- 存储使用情况
- 事务成本

## 🔄 回滚策略

如果发现严重问题：

### 应用商店
1. 在应用商店中删除新版本
2. 恢复到之前的版本
3. 发布修复版本

### Vercel（管理后台）
1. 在 Vercel 部署历史中选择上一版本
2. 一键回滚

### Supabase
1. 检查数据库备份
2. 恢复到之前的迁移状态
3. 重新部署应用

## 📚 有用的命令

```bash
# 构建 & 部署
eas build --platform ios --auto-submit
eas build --platform android --auto-submit
eas submit --platform ios --latest
eas submit --platform android --latest

# 查看构建历史
eas build:list

# 查看部署历史
eas insights

# 查看日志
eas logs
```

## 🆘 常见问题

### Q: Build 失败了怎么办？
A: 检查 `eas logs` 的详细信息，通常是依赖问题或配置错误。

### Q: 如何推送紧急修复？
A: 应用补丁 → 更新版本号 → 快速跟踪 App Store 审核。

### Q: 如何处理数据库迁移？
A: 始终使用向后兼容的迁移，在部署前测试。

### Q: 如何监控崩溃？
A: 使用 Sentry、LogRocket 或其他 APM 工具。

## 📞 获取帮助

- 📖 [Expo 部署文档](https://docs.expo.dev)
- 📖 [React Native 发布指南](https://reactnative.dev/docs/publishing)
- 💬 EAS 社区论坛
- 🐛 创建 GitHub Issue

---

**Happy deploying! 🚀**
