# Contributing to HearClear

🙏 感谢您对HearClear的贡献兴趣！我们欢迎来自社区的贡献，无论是代码、文档、测试还是建议。

## 📋 行为守则

本项目遵守我们的[行为守则](CODE_OF_CONDUCT.md)。参与此项目即表示您同意遵守其中的条款。

## 🚀 快速开始

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/HearClear.git
cd HearClear
```

### 2. 设置开发环境
```bash
# 安装依赖
npm install

# 安装admin dashboard依赖
cd admin && npm install && cd ..

# 配置环境变量（参考 .env.example）
cp .env.example .env.local

# 启动开发服务器
npm start
```

### 3. 创建特性分支
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

## 💡 贡献类型

### 🐛 Bug 修复
1. 创建 Issue 描述 bug
2. Fork 并创建 fix 分支
3. 修复问题并添加测试
4. 提交 PR 并参考该 Issue

### ✨ 新功能
1. 创建 Issue 讨论功能设计
2. 等待维护者反馈
3. 实现功能并编写测试
4. 提交 PR

### 📚 文档改进
1. Fork 并创建 docs 分支
2. 更新或添加文档
3. 确保格式和链接正确
4. 提交 PR

### 🎨 UI/UX 改进
- 遵循现有的设计系统（见 [主题常数](src/constants/theme.ts)）
- 保持可访问性标准
- 提交截图或演示视频

## 🔧 开发工作流

### 代码风格
遵循项目的最佳实践指南：
- TypeScript：严格模式
- React/React Native：函数式组件 + Hooks
- 命名约定：camelCase（变量）、PascalCase（组件）
- 最多100行代码/组件（考虑拆分）

详见 [最佳实践](docs/BEST_PRACTICES.md)

### 测试要求

**所有 PR 必须包含：**
```bash
# 运行测试
npm test

# 检查覆盖率
npm run test:coverage

# 对于音频相关改动
npm run test:audio-regression
```

**最小覆盖率目标：**
- 新代码：≥ 80%
- 全项目平均：≥ 70%

### 提交消息格式

遵循 Conventional Commits：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型：**
- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 文档改动
- `style`: 格式（不影响代码运行）
- `refactor`: 重构（既不修复bug也不添加功能）
- `perf`: 性能优化
- `test`: 添加或更新测试
- `chore`: 构建脚本、依赖更新等

**示例：**
```
feat(audio): add frequency-specific noise reduction

- Implement 3-band EQ for noise suppression
- Add user presets for common scenarios
- Update settings UI with new sliders

Closes #123
```

## 📝 Pull Request 流程

### PR 前的检查清单
- [ ] 代码遵循项目风格指南
- [ ] 提交了相关的单元测试和集成测试
- [ ] 新代码添加了 TypeScript 类型
- [ ] 文档已更新（如适用）
- [ ] 提交消息格式正确
- [ ] 没有 console.log 或 debugger 语句
- [ ] 没有提交敏感信息（密钥、令牌等）

### PR 描述模板
```markdown
## 描述
简要说明此 PR 做了什么。

## 关联 Issue
关闭 #(issue号)

## 改动类型
- [ ] 缺陷修复 (non-breaking change)
- [ ] 新功能 (non-breaking change)
- [ ] Breaking change (修复或功能导致现有功能改变)

## 测试
说明如何验证更改。

## 截图（如适用）
附加 UI 改动的截图。
```

## 🎯 审查过程

1. **自动检查**：CI/CD 运行测试和 linter
2. **代码审查**：维护者审查代码质量和设计
3. **讨论**：可能需要进行讨论和调整
4. **批准与合并**：获得批准后由维护者合并

## 📚 相关文档

- [快速参考](docs/QUICK_REFERENCE.md) - 开发快速入门
- [架构说明](ARCHITECTURE.md) - 系统设计
- [最佳实践](docs/BEST_PRACTICES.md) - 编码指南
- [测试指南](docs/testing.md) - 测试策略
- [音频架构](docs/native-audio-architecture.md) - 音频系统详解

## 🔐 安全问题

**请勿在 Issue 中公开安全漏洞！**

改为发送电子邮件至 [安全联系方式] 或在 GitHub 上私下报告。

## 📞 需要帮助？

- 📖 查看 [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)
- 💬 在 Issue 中提出问题（添加 `question` 标签）
- 💌 联系维护者

## 🙌 致谢

感谢所有做出贡献的人！您的工作使 HearClear 更好。

---

**Happy coding! 🎧✨**
