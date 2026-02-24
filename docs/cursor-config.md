# Cursor 配置说明（本项目推荐）

## Rules（规则）

规则在 **`.cursor/rules/`**，当前有：

| 文件 | 说明 | 生效范围 |
|------|------|----------|
| `general.mdc` | 通用约定（中文回复、保持风格、跑测试） | 始终 |
| `typescript-react-native.mdc` | TS/RN/Expo 写法、路径、性能注意 | `**/*.ts`, `**/*.tsx` |

编辑或新增规则请用 `.mdc`，并写清楚 `description` 和 `globs`（或 `alwaysApply: true`）。

---

## Skills（技能）

### 已内置（Cursor 自带）
- **create-rule**：创建/修改规则（.cursor/rules、AGENTS.md）
- **create-skill**：新建或调整 Skill
- **update-cursor-settings**：改 Cursor/VSCode 的 settings.json

### 个人 Skill（本机 `~/.cursor/skills/`）
- **react-native-expo**：RN/Expo 常用命令、调试、性能注意
- **commit-messages**：生成规范化的 Git 提交信息

在对话里提到「写 commit」「提交信息」或「跑 Android/Expo」时，Agent 会按需使用这些技能。

---

## 推荐 settings.json（可选）

在 **Cursor → Settings → 搜索 “settings json” → 打开 User settings.json** 可加入：

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit"
  },
  "editor.tabSize": 2,
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "files.associations": {
    "*.mdc": "markdown"
  }
}
```

需要改主题、字体、快捷键等，可说「用 update-cursor-settings 把 xxx 改成 xxx」，或直接改 settings.json。

---

## 全局规则（可选）

若希望**所有项目**都遵守同一套通用约定，可在本机创建：

- **路径**：`~/.cursor/rules/general.mdc`
- **内容**：与项目内 `general.mdc` 类似，`alwaysApply: true` 即可。

当前已在 `~/.cursor/rules/general.mdc` 放了一份通用约定，对所有项目生效。
