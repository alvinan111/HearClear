# 仓库公开清单

在将本仓库在 GitHub 上设为 **Public** 前/后，请按本清单核对。

## 公开前（本清单已完成的项）

- [x] **README**：项目说明、快速开始、脚本与文档链接已写好。
- [x] **LICENSE**：已添加 MIT 许可证。
- [x] **敏感信息**：已从代码库中移除（`package.json` 的 `test:db` 与 `schema.test.ts` 中的 Supabase 凭据已改为仅从环境变量读取）。
- [x] **.gitignore**：已忽略 `.env`、`credentials.json`、`*.key`、签名与构建产物等。
- [x] **SECURITY.md**：漏洞报告方式已说明。
- [x] **CONTRIBUTING.md**：贡献流程与约定已简要说明。

## 你需要在 GitHub 上做的

1. **改为公开**
   - 打开仓库 → **Settings** → **General** → **Danger zone** → **Change repository visibility** → 选 **Public**。

2. **（推荐）仓库描述与主题**
   - Settings → **General** → **Description** 可填：`Smart hearing aid app - Expo, React Native, real-time speech enhancement, hearing test & prescription`
   - 可添加 **Topics**：`expo`, `react-native`, `hearing-aid`, `supabase`, `speech-enhancement` 等。

## 公开后建议

- **轮换 Supabase 凭据**：此前若在 `package.json` 或其它已提交文件中暴露过 `SUPABASE_ACCESS_TOKEN` 或项目 ref，请在 Supabase Dashboard 中重新生成/轮换，并只在本地 `.env` 或 CI Secrets 中使用。
- **远程 URL**：若本地 `git remote` 曾使用带 token 的 URL（如 `https://ghp_xxx@github.com/...`），建议改为 HTTPS 无 token 或 SSH，避免误提交到配置中。
- **CI/Secrets**：若使用 GitHub Actions 等，敏感变量请只放在 Repository Secrets 中，不要写在仓库内。

---

完成上述步骤后，仓库即可安全地保持公开状态。
