# 更改日志 (Change Log)

本项目的所有重要更改均将记录在此文件中。

版本格式遵循 [Semantic Versioning](https://semver.org/) 规范。

---

## [0.1.1] - 2026-09-22

### 重构与优化 (Refactored)

- **收敛终态呈现为单一深模块 (`outcomePresenter`)**：
  - 新增纯函数深模块 `src/relay/outcomePresenter.ts`，统一集中持有 `ok`、`empty`、`failed` 三类终态的呈现逻辑与降级提示；
  - 纯化 `SearchOutcome.empty` 领域契约，由硬编码中文数组重构为纯结构化数据 `{ query, dirNote }`；
  - 消除跨目录分散的降级提示与中英文混杂，规范化面向 Agent 模型的英文排查与命令引导文本；
  - 移除纯做字段浅透传的浅模块 `src/relay/relayFailure.ts` 与 `createRelayFailure` 函数；
  - 将 `SemanticSearchTool` 精简退化为极薄的 VS Code 宿主接口适配器。
- **自动化测试增强**：
  - 新增 `test/outcomePresenter.test.mjs`，包含 9 个脱离 VS Code Mock 依赖的纯逻辑单元测试，全量测试用例扩充至 17 项并全数通过。

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
