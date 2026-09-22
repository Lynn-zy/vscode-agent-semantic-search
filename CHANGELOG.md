# 更改日志 (Change Log)

本项目的所有重要更改均将记录在此文件中。

版本格式遵循 [Semantic Versioning](https://semver.org/) 规范。

---

## [0.1.1] - 2026-09-22

### 修复与规范 (Fixed)

- **命令标题与分类规范化 (`vscode-ext-commands`)**：
  - 移除 `package.nls.*.json` 中各命令标题包含的 `Semantic Search: ` 与 `语义搜索：` 前缀，解决 VS Code 命令面板中自动追加分类前缀导致的冗余重复展示问题；
  - 规范声明 `contributes.commands` 中各命令的 `category` 为 `%commands.category%` 占位符，在多语言配置中统一维护分类名称。
- **扩展配置与错误提示多语言国际化 (`vscode-ext-localization`)**：
  - 将 `package.json` 中的 `configuration.title` 接入 `%config.title%` 国际化占位符；
  - 修复 `src/commands/diagnosticsCommand.ts` 捕获异常时错误弹窗使用硬编码中文的问题，改为使用 `vscode.l10n.t` 封装；
  - 在 `bundle.l10n.json`、`bundle.l10n.zh-cn.json` 和 `bundle.l10n.zh-hans.json` 中补齐 `Error while collecting diagnostics: {0}` 翻译词条。

### 重构与优化 (Refactored)

- **收敛终态呈现为单一深模块 (`outcomePresenter`)**：
  - 新增纯函数深模块 `src/relay/outcomePresenter.ts`，统一集中持有 `ok`、`empty`、`failed` 三类终态的呈现逻辑与降级提示；
  - 纯化 `SearchOutcome.empty` 领域契约，由硬编码中文数组重构为纯结构化数据 `{ query, dirNote }`；
  - 消除跨目录分散的降级提示与中英文混杂，规范化面向 Agent 模型的英文排查与命令引导文本；
  - 移除纯做字段浅透传的浅模块 `src/relay/relayFailure.ts` 与 `createRelayFailure` 函数；
  - 将 `SemanticSearchTool` 精简退化为极薄的 VS Code 宿主接口适配器。
- **收敛索引构建状态源与单点复位保护**：
  - 在 `buildIndexCommand` 中通过 `finally` 块实现单一出口状态复位，确保无论执行成功、底层命令缺失还是发生异常，均原子保证 `isBuilding` 释放与状态栏复位为 `idle`；
  - 为 `IndexStatusBar` 增加只读 `state` 属性，测试可直接断言状态栏领域状态，消除对私有属性的穿透。
- **补全工具别名契约映射与测试**：
  - 在 `ToolDescriptor` 接口中显式声明 `toolReferenceName` 属性并在 `VsCodeToolHost` 中如实映射，消除类型欺骗与潜在死代码；
  - 新增 `test/toolResolver.test.mjs` 测试套件，验证别名匹配与自引用排除逻辑。
- **中继核心规整解耦与全链路自动化测试**：
  - 将 `normalizeQuery` 与 `normalizeScopedDirectories` 纯化为独立纯函数并支持自定义 `workspaceRoots` 参数，彻底解耦全局 VS Code 工作区状态；
  - 完善测试运行时 Mock，轻量实现 `CancellationTokenSource` 与 `CancellationError`；
  - 新增 `test/semanticSearchRelay.test.mjs` 测试套件（包含 12 项细粒度用例），完整覆盖超时竞态、外层取消抛错、未就绪判定（符合 ADR-0002）、目录 Schema 自适应以及各种失败分类分支。
- **自动化测试增强**：
  - 新增 `test/outcomePresenter.test.mjs`、`test/toolResolver.test.mjs` 与 `test/semanticSearchRelay.test.mjs`，全量测试用例扩充至 31 项并全数通过。

---

## [0.1.0] - 2026-09-22

### 新增特性 (Added)

- **语言模型工具 `semanticSearch`**：
  - 为所有 VS Code Agent 开放工作区代码语义检索能力；
  - 自动避开 Copilot 对 `semantic_search` 的硬编码端点黑名单；
  - 注册名与提示词引用别名完全一致，统一为 `semanticSearch`。
- **全量无损透传 (Lossless Relay)**：
  - 深度遍历多态 `@vscode/prompt-tsx` 语法树（穿透深达 48 层嵌套组件）；
  - 100% 完整原样提取底层代码片段，不实施人为字符截断，完整保留代码与上下文。
- **智能降级机制 (Graceful Degradation)**：
  - 当工作区代码库索引尚未就绪或底层服务异常时，自动返回结构化排查指引；
  - 引导 Agent 立即改用 `grep_search` 或 `file_search`，彻底避免工具重试死循环。
- **极简状态栏管理 (Status Bar)**：
  - 采用极简双状态模型：就绪态（`$(search) 语义搜索`）与构建中态（`$(sync~spin) 语义搜索: 构建索引中`）；
  - 提供快捷管理菜单，支持一键触发代码库索引构建与诊断报告生成；
  - 具备防重入并发拦截保护。
- **测试与可靠性保障**：
  - 包含状态栏生命周期、并发守卫、深层 AST 解析等全套端到端自动化测试。
