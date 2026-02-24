# Cursor 扩展推荐：Plugin / Rule / Skill / MCP / Subagent

本文档汇总**好用且可自执行**的 Cursor 扩展，便于提升「够用」程度。安装后尽量让 AI 自己执行命令、查代码、跑测试，减少你的手动操作。

---

## 一、规则（Rules）

### 已在本项目中的规则
- `.cursor/rules/general.mdc`：通用约定 + **执行优先**（能自己跑就自己跑，不行再找 MCP/Skill）
- `.cursor/rules/typescript-react-native.mdc`：TS/React Native 约定
- `.cursor/rules/expo-react-native.mdc`：Expo + React Native + TypeScript 最佳实践（见下）
- `.cursor/rules/jest-unit-testing.mdc`：Jest 单元测试（来自 awesome-cursorrules，作用于测试文件）
- `.cursor/rules/typescript-expo-jest-detox.mdc`：TypeScript + Expo + Jest + Detox 大纲（来自 awesome-cursorrules）

### 更多规则（从 awesome-cursorrules 摘录）
从 [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) 里挑「TypeScript (Expo, Jest, Detox)」「Jest Unit Testing」等，把对应 `.cursorrules` 内容复制到 `.cursor/rules/` 下新建的 `.mdc`，**前面加上 `description` 和 `globs` 的 frontmatter** 即可。例如：
- `globs: "**/*.test.{ts,tsx}"` 或 `"**/*.spec.{ts,tsx}"` 让规则只对测试文件生效
- `description: "Jest 单元测试约定"` 便于在设置里识别

### 推荐外部规则来源（按需复制到 `.cursor/rules/*.mdc`）

| 来源 | 说明 | 链接 |
|------|------|------|
| **awesome-cursorrules** | 大量按技术栈分类的 `.cursorrules`，可改写成 `.mdc`。推荐子类：Mobile（React Native Expo、TypeScript Expo Jest Detox）、Testing（Jest、Playwright） | https://github.com/PatrickJS/awesome-cursorrules |
| **cursor.directory** | 社区规则，可搜索 Expo / React Native / TypeScript | https://cursor.directory/ → Rules |
| **Expo React Native TS** | 已摘录到本仓库 `expo-react-native.mdc` | https://cursor.directory/expo-react-native-typescript-cursor-rules |

---

## 二、MCP 服务器（推荐优先装）

**添加步骤**：打开 **Cursor 设置 → Features → MCP → Add New MCP Server**，到 [cursor.directory/mcp](https://cursor.directory/mcp) 选一个（例如 **Fetch** 或 **GitHub**），按页面上的安装命令填进去，保存后刷新工具列表。

MCP 添加后 Composer 里的 Agent 才能用。

### 开发常用（建议安装）

| MCP | 用途 | 安装/配置 |
|-----|------|------------|
| **Filesystem** | 读写在沙箱外的路径、多项目 | cursor.directory → MCP → Filesystem 查看安装命令 |
| **GitHub** | 查/创 Issue、PR 等 | https://github.com/modelcontextprotocol/servers/tree/main/src/github |
| **Fetch** | 把网页 HTML 转 Markdown 给 AI 读 | cursor.directory → MCP → Fetch |
| **PostgreSQL** | 只读查库、看 schema | cursor.directory → MCP → PostgreSQL（需连接串） |

### 官方/常用 MCP 仓库
- 官方示例与服务器列表：https://github.com/modelcontextprotocol/servers
- Cursor MCP 文档：https://cursor.com/docs/context/mcp
- 社区目录：https://cursor.directory/mcp

配置方式一般为：**stdio**（本地命令，如 `npx -y @modelcontextprotocol/server-filesystem /path`）或 **SSE**（URL）。需要 API Key 的（如 GitHub）在环境变量或 Cursor MCP 配置里填。

---

## 三、Skill（技能）

Skill 放在 **用户目录** `.cursor/skills/` 或项目 `.cursor/skills/`，每个技能一个文件夹，内含 `SKILL.md`。

### 你已有 Skill（用户级）
- `create-rule`：创建/维护 Cursor 规则
- `create-skill`：创建新 Skill
- `update-cursor-settings`：改 settings.json

### 推荐额外 Skill
- **cursor-skill-creator**：按规范生成新 Skill 的 `SKILL.md` 和目录结构  
  - 来源：https://skills.rest/skill/cursor-skill-creator（安装说明里是 Claude；Cursor 可把内容抄到 `.cursor/skills/cursor-skill-creator/SKILL.md` 手动建）
- **cursor-subagent-creator**：创建标准 subagent 配置（`.cursor/agents/`）  
  - 来源：https://skills.rest/skill/cursor-subagent-creator

### Skill 目录索引（找现成技能）
- **skills.rest**：https://skills.rest/  
- **Agnxi（10K+ Agent Skills）**：https://agnxi.com（与 Cursor/Claude 兼容的技能目录）

---

## 四、Subagent（子代理）

在 Composer 里通过 **mcp_task** 等能力调用，适合「并行、隔离上下文」的任务。

### 默认类型与建议用法
| 类型 | 建议用途 |
|------|----------|
| **explore** | 快速搜代码、按模式找文件、理解项目结构（thoroughness: quick/medium/very thorough） |
| **shell** | 执行 git、构建、测试、patch 等终端命令 |
| **generalPurpose** | 多步研究、复杂推理、不确定用哪个子代理时 |

### 使用原则
- 能直接跑命令/搜代码就先用本机工具；**大范围探索、多步任务**再交给 subagent。
- 一次可并行发起多个 mcp_task（例如一个 explore + 一个 shell），减少等待。

---

## 五、Plugin（插件）

在 **Cursor Marketplace** 安装：https://cursor.com/marketplace（或设置里 Plugins）。

### 常见有用插件
- **Linear / Figma**：需求与设计稿联动
- **GitHub**：Issue/PR 集成
- **Vercel / Cloudflare / AWS**：部署与配置
- **Stripe**：支付相关
- **Cursor Team Kit**：CI、代码审查、测试等

按你技术栈选装即可。

---

## 六、安装与维护建议

1. **规则**：优先用本项目 `.cursor/rules/` 里的；再从 awesome-cursorrules / cursor.directory 挑 1～2 个转成 `.mdc` 放进项目，避免堆太多冲突。
2. **MCP**：先上 **Filesystem + Fetch**（或加 GitHub），再按需加数据库/云厂商。
3. **Skill**：保留现有 create-rule / create-skill / update-cursor-settings；要批量建 Skill 时再考虑 cursor-skill-creator。
4. **Subagent**：不装东西，直接用；复杂任务时在对话里明确说「用 explore 搜」「用 shell 执行」即可。

---

## 七、参考与验证（禁止瞎想）

已写入 **`.cursor/rules/general.mdc`**，全局生效：

- **优先查 GitHub 高 star**：方案、最佳实践、兼容性先搜 GitHub 高 star 仓库（awesome-*、官方示例、社区标杆）再写代码，不凭印象编。
- **再查技术社区**：GitHub 不够时用 Stack Overflow、技术博客、官方文档、cursor.directory、npm 页等，有据可查。
- **Web 类必须自测**：网页/前端/H5/PWA 等要在**本机浏览器**跑起来做基本验证（如 `npm run dev`、`npx expo start --web`），不能只改代码不跑不点。

---

## 八、快速上手（2 分钟可做）

1. **规则**：本项目已加 `expo-react-native.mdc`，打开任意 `**/*.ts` / `**/*.tsx` 时会自动应用。
2. **执行优先**：`general.mdc` 已要求「能自己执行就自己执行」「找不到再找 MCP/Skill」，无需再配。
3. **Subagent**：在 Composer 里直接说「用 explore 搜一下 xxx」「用 shell 执行 npm test」即可调用，无需安装。
4. **MCP**：打开 **设置 → Features → MCP → Add New MCP Server**，到 [cursor.directory/mcp](https://cursor.directory/mcp) 选一个（例如 Fetch 或 GitHub），按页面上的安装命令填进去，保存后刷新工具列表。

文档会随 Cursor 更新而过时，重要改动以官方文档为准：  
https://cursor.com/docs 、 https://cursor.com/changelog
