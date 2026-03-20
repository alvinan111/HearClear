# 安全策略

## 支持的版本

我们会对当前主分支（如 `main`）提供安全相关更新。重大漏洞会视情况 backport 到最近一版 release。

## 报告漏洞

如发现安全漏洞，**请勿在公开 Issue 中披露**。请通过以下方式私下报告：

- **GitHub Security Advisories**：在本仓库的 **Security** 标签页选择 **Report a vulnerability**，或  
- **邮件**：在仓库维护者资料中查找可用联系方式。

我们会尽快确认并回复，并在修复后（视严重程度）发布安全说明或 CVE。

## 敏感信息

- 请勿在 Issue、PR、提交信息或代码中提交 API Key、Token、密码或 `.env` 内容。
- 若误提交，请立即在对应服务中**撤销/轮换**该凭据，并从历史中移除（如 `git filter-branch` / BFG），或联系维护者协助。

感谢您帮助 HearClear 更安全。
