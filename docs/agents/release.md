# 扩展发布工作流（Release Workflow）

本仓库通过向远程推送以 `v` 开头的 Git 标签，触发 GitHub Actions（`.github/workflows/release.yml`）自动编译、测试、打包 VSIX 并创建 GitHub Release。

## 触发场景

当被要求「发布新版本」、「发版」、「bump version」、「创建 release」或更新扩展版本号并发布时执行本流程。

## 发布步骤

按序执行以下步骤。每一步均有明确的完成准则，未满足前不得推进至下一步。

### 1. 预检（Preflight）

- 确认当前处于 `main` 分支。
- 确认工作区无无关改动（`git status --short` 干净）。
- 运行测试套件：`npm test`。
- **完成准则**：`npm test` 退出码为 0 且工作区处于干净状态。

### 2. 更新更改日志（CHANGELOG.md）

- 在 [CHANGELOG.md](../../CHANGELOG.md) 顶部记录新版本条目：
  - 标题格式：`## [x.y.z] - YYYY-MM-DD`
  - 分类章节（按需采用）：`### 新增特性 (Added)`、`### 优化与改进 (Improved)`、`### 修复与优化 (Fixed)`
- 暂存改动：`git add CHANGELOG.md`
- **完成准则**：`CHANGELOG.md` 已准确描述新版本改动点并完成暂存。

### 3. 升级版本与生成标签

- 根据变更性质确定升级类型（遵循 SemVer：`patch` / `minor` / `major`）。
- 运行 npm version 原子升级版本并生成标签：
  ```bash
  npm version <patch|minor|major> -m "release: v%s <简短摘要>"
  ```
- **完成准则**：`package.json` 中的 `version` 字段已递增，本地存在以 `v` 开头的对应 Git 标签（例如 `v0.1.5`）。

### 4. 推送至远程触发流水线

- 推送提交与标签：
  ```bash
  git push origin main --tags
  ```
- **完成准则**：远程仓库已接收到新 commit 与对应标签。

### 5. 校验发布状态

- 监控工作流执行状态：
  ```bash
  gh run list --workflow=release.yml --limit 1
  ```
- **完成准则**：工作流执行成功（`status: completed, conclusion: success`），GitHub Releases 页面中该版本已生成并挂载 `.vsix` 文件。

## 约束与规范

- **禁止提交 VSIX 文件**：打包资产由 GitHub Actions 自动构建并上传至 Release，本地生成的 `*.vsix` 严禁提交至 Git 仓库。
- **标签必须以 v 开头**：工作流由 `tags: ['v*']` 触发，纯数字标签（如 `0.1.5`）无法激活自动发布。
