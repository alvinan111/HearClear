# 安全政策

## 报告安全漏洞

**请勿在公开的 GitHub Issue 中报告安全漏洞。**

如果您发现安全漏洞，请通过电子邮件将详细信息发送至：

📧 **security@hearclear.app**

请在您的报告中包含：

1. 漏洞描述
2. 受影响的版本
3. 漏洞的潜在影响
4. 建议的修复（如有）
5. 您希望的披露时间表

我们将在收到您的报告后 48 小时内确认收到，并在可能的情况下向您提供定期的补救进展更新。

## 安全最佳实践

### 对于用户

- 始终使用最新版本
- 不要在公开环境中运行敏感操作
- 启用两因素认证（如可用）
- 定期检查您的账户活动

### 对于开发者

如果您在使用 HearClear 的代码或库，请遵循这些安全实践：

#### 1. 依赖管理
```bash
# 定期检查安全漏洞
npm audit

# 自动修复
npm audit fix

# 检查过期依赖
npm outdated
```

#### 2. 环境变量
```bash
# ✅ 正确做法：使用 .env 文件
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=sbp_xxxxxx

# ❌ 不要做：在代码中硬编码
const key = "sbp_xxxxxx"
```

#### 3. 敏感数据
- 使用 `expo-secure-store` 存储令牌和密钥
- 永远不要在 git 中提交 `.env` 文件
- 定期轮换 API 密钥
- 在 Supabase 中启用行级安全 (RLS)

#### 4. 认证
- 对密码使用强加密
- 使用 HTTPS 进行所有通信
- 实现速率限制防止暴力攻击
- 启用多因素认证 (MFA)

#### 5. 代码审查
- 所有代码更改都需经过 PR 审查
- 使用 TypeScript 进行类型安全
- 启用 ESLint 规则以捕获常见错误
- 定期进行安全代码审计

## 已知限制

### 当前版本已知的安全相关限制：

1. **音频数据**
   - 实时音频在内存中处理
   - 建议不要在不受信任的设备上使用

2. **离线模式**
   - 离线数据存储在设备本地
   - 建议在公共设备上禁用

3. **支付**
   - 由 Stripe 处理
   - 遵循 PCI DSS 标准

## 更新政策

- 安全修补程序：立即发布
- 小版本（minor）：每月一次
- 主版本（major）：根据需要（最多每个季度一次）

## 合规性

HearClear 致力于遵守：

- ✅ GDPR（通用数据保护规范）
- ✅ CCPA（加州消费者隐私法）
- ✅ HIPAA（如适用）
- ✅ 各地方数据保护法规

## 安全联系

- 🔐 Security Issues: security@hearclear.app
- 🐛 Bug Reports: issues@hearclear.app
- 💬 General Questions: contact@hearclear.app

---

感谢您帮助我们保持 HearClear 的安全！🙏
