# 贡献指南

欢迎为 HearClear 贡献代码或文档。

## 开发流程

1. Fork 本仓库，克隆到本地。
2. 从 `main` 拉取最新代码，在分支上开发（如 `feat/xxx` / `fix/xxx`）。
3. 确保通过 `npm test`，必要时补充或更新测试。
4. 提交信息建议使用约定前缀：`feat:` / `fix:` / `docs:` / `chore:` 等，见仓库根目录或 `.cursor/rules` 中的提交约定。
5. 推送分支并创建 Pull Request，描述改动与动机。

## 代码与测试

- 修改音频相关逻辑时，请尽量在真机验证；单元测试见 `src/__tests__/`。
- 涉及数据库 Schema 时，请在 `supabase/migrations/` 中提供可重复执行的 SQL。

## 行为准则

- 尊重他人，就事论事讨论技术。
- 安全相关问题请按 [SECURITY.md](SECURITY.md) 私下报告，勿在公开 Issue 中披露敏感细节。
