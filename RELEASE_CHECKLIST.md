# 发布清单

在发布新版本到GitHub之前，请按照此清单进行检查。

## 📋 预发布检查

### 代码质量
- [ ] 所有测试通过：`npm test`
- [ ] 代码覆盖率检查：`npm run test:coverage`
- [ ] TypeScript 无错误：`npm run type-check`
- [ ] 没有 console.log 或 debugger 语句
- [ ] 没有硬编码的 API 密钥或令牌

### 安全审计
- [ ] 依赖项安全检查：`npm audit`
- [ ] 敏感信息已移除
- [ ] .env 文件已添加到 .gitignore
- [ ] 数据库凭证未暴露
- [ ] Supabase 密钥已轮换

### 文档完整性
- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新
- [ ] API 文档已更新（如需要）
- [ ] 架构文档最新
- [ ] 快速参考指南完整

### 版本管理
- [ ] package.json 版本已更新
- [ ] app.json 版本已更新
- [ ] android/gradle.properties 版本已更新
- [ ] ios/Info.plist 版本已更新
- [ ] 遵循语义版本化

### Git 准备
- [ ] 所有更改已提交
- [ ] 分支已合并到 main
- [ ] 没有未跟踪的文件
- [ ] Git 历史任务清洁

### 功能验证
- [ ] 在 iOS 真机上测试
- [ ] 在 Android 真机上测试
- [ ] 所有主要功能正常工作
- [ ] 没有回归问题
- [ ] 性能基准正常

### GitHub 准备
- [ ] 仓库描述已更新
- [ ] 适当的标签/标签已应用
- [ ] 描述在GitHub上清晰准确

## 🚀 发布步骤

### 1. 最终检查
```bash
# 验证构建
npm run build

# 验证测试
npm test -- --coverage

# 检查安全性
npm audit
```

### 2. 创建 Git 标签
```bash
# 创建带注释的标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 推送标签
git push origin v1.0.0
```

### 3. 在 GitHub 上创建 Release

1. 访问 [Releases](https://github.com/alvinan111/HearClear/releases)
2. 点击 "Create a new release"
3. 选择刚创建的标签（v1.0.0）
4. 填写标题和描述
5. 附加构建工件（如需要）
6. 发布

### 4. 发布到应用商店

```bash
# iOS
eas build --platform ios --auto-submit

# Android
eas build --platform android --auto-submit
```

详见 [部署指南](DEPLOYMENT.md)

## 📝 Release Notes 模板

```markdown
## v1.0.0 - 2024-03-22

### 🎉 新增
- 功能 A
- 功能 B
- 功能 C

### 🔧 改进
- 改进 X
- 改进 Y

### 🐛 修复
- 修复 bug 1
- 修复 bug 2

### 🧹 其他
- 依赖项更新
- 文档改进

### 感谢
感谢所有贡献者...

### 安装

#### iOS
[下载链接]

#### Android
[下载链接]
```

## ✅ 发布后验证

发布后的 24 小时内：

- [ ] 监控应用商店评论
- [ ] 检查崩溃报告
- [ ] 验证用户反馈
- [ ] 监控性能指标
- [ ] 检查日志是否有异常

## 🚨 应急回滚程序

如果发现重大问题：

1. **立即行动**
   - [ ] 通知维护者和用户
   - [ ] 在社交媒体上发布公告

2. **应用商店回滚**
   - [ ] 从 app store 中删除或标记为不可用
   - [ ] 恢复先前版本

3. **后续行动**
   - [ ] 创建热修复分支
   - [ ] 重新测试
   - [ ] 再次发布

## 📊 发布指标

首次发布后跟踪：

| 指标 | 目标 | 实际 |
|------|------|------|
| 下载次数（首周） | 1000+ | _ |
| 应用商店评分 | 4.0+ | _ |
| 崩溃率 | <0.1% | _ |
| 性能 | <100ms 延迟 | _ |
| 用户保留率 | >50% | _ |

## 📞 联系信息

发布问题？

- 💬 GitHub Issues: [创建Issue](https://github.com/alvinan111/HearClear/issues)
- 📧 Email: contact@hearclear.app
- 🔐 安全问题: security@hearclear.app

---

**此清单最后更新：2024-03-22**
