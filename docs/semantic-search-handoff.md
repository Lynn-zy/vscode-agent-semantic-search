# Handoff: Agent 语义检索桥接扩展开发与调试工作接力

## 1. 任务背景与核心目标

### 1.1 业务背景

用户在 VS Code 中使用 Agent（搭配第三方/兼容模型端点，如 `gcmp`、`antigravity` 等）时，发现官方文档宣称可自主调用的语义检索工具（`#codebase`）无法在工具列表中被 Agent 发现和自主调用。

### 1.2 源码级根因剖析（已核实的事实）

1. **VS Code 核心层拦截**：`workbench.desktop.main.js` 中的内部开关 `chat.copilot.semanticSearch.enabled` 默认为 `false`，且仅对内部 `agent-host-copilotcli` 会话类型放行；
2. **Copilot 扩展黑名单拦截**：Copilot 扩展在构建工具集 `OXe` 中存在类型判定 `if (!Exe(n)) m.semantic_search = false;`，当使用第三方 URL 端点时，硬编码强制禁用名为 `semantic_search` 的工具；
3. **标签命名空间限制**：第三方扩展注册语言模型工具时，`tags` 严禁以 `vscode_` 或 `copilot_` 开头，否则 Extension Host 会在启动时拒绝注册并拦截插件激活；
4. **提示词可见性门禁**：扩展贡献的语言模型工具必须在 `package.json` 中显式声明 `"canBeReferencedInPrompt": true`，否则不会出现在 VS Code 的“配置工具”（Manage Tools）面板中，也不会被注入 Agent 的活跃工具集。

### 1.3 解决方案

开发 VS Code 语言模型工具扩展 `vscode-agent-semantic-search`，注册工具 `workspace_semantic_search`（别名 `semanticSearch`），避开黑名单，在 Agent 自主调用时通过 `vscode.lm.invokeTool("copilot_searchCodebase", ...)` 间接转发给 Copilot 底层语义检索服务。

---

## 2. 工程迁移与当前路径

- **工作区路径**：仓库根目录（开发、编译、测试均在此目录下进行）
- **VS Code 扩展安装目录**：`~/.vscode/extensions/local.vscode-agent-semantic-search-0.1.0`

---

## 3. 核心实现与已完成的架构重构

### 3.1 模块结构（`src/`）

- `constants.ts`：单一事实源。定义工具名 `TOOL_NAME = "workspace_semantic_search"`、默认底层中继 ID `DEFAULT_RELAY_TOOL_ID = "copilot_searchCodebase"`、超时上下限（5s~180s）与命令 ID 常量。
- `types.ts`：定义入参结构 `SemanticSearchInput`、结果联合 `SearchOutcome`（`ok` / `empty` / `failed`）以及结构化失败类型 `RelayFailureKind`（`tool-missing` / `not-ready` / `timeout` / `invalid-input` / `relay-error`）。
- `relay/`：
  - `ports.ts`：定义 `ToolHost` 与 `CommandHost` 接口，隔离直接对 `vscode.lm` 与 `vscode.commands` 的硬依赖；
  - `toolResolver.ts`：按候选列表解析底层工具，包含严格的自引用排除守卫（防止递归调用自身），支持注册名与 `toolReferenceName` 兜底；
  - `semanticSearchRelay.ts`：编排参数规整（剥离 `#codebase`）、目录范围判定、带 `CancellationTokenSource` 的超时中继调用；修复了超时与外层取消的竞态判定；对未就绪状态映射为 `not-ready`；
  - `resultAdapter.ts`：深度遍历多态 `PromptTsx` AST 树（容纳 48 层嵌套组件深度），100% 无损原样透传底层代码正文，不实施人为字符截断（见 ADR-0003）；
  - `relayFailure.ts`：根据失败类型格式化可执行的降级提示（建议 Agent 改用 `grep_search` / `file_search`，避免陷入重试死循环）。
- `tools/semanticSearchTool.ts`：实现 `vscode.LanguageModelTool<SemanticSearchInput>`，包含防御性 `prepareInvocation`。
- `statusbar/indexStatusBar.ts`：右下角状态栏快捷入口与管理菜单，采用极简双状态模型（`idle` 与 `indexing`，见 ADR-0004），使用稳定枚举 `id` 派发命令。
- `commands/`：
  - `buildIndexCommand.ts`：转发触发 Copilot 建立远端工作区索引（`github.copilot.buildRemoteWorkspaceIndex`）；
  - `diagnosticsCommand.ts`：在输出面板 `Agent Semantic Search` 打印 LM 工具注册与配置快照。
- `extension.ts`：组合根，生命周期管理与 `context.subscriptions` 注册。

### 3.2 关键配置（`package.json`）

```json
{
  "name": "vscode-agent-semantic-search",
  "activationEvents": [
    "onStartupFinished",
    "onLanguageModelTool:workspace_semantic_search"
  ],
  "contributes": {
    "languageModelTools": [
      {
        "name": "workspace_semantic_search",
        "toolReferenceName": "semanticSearch",
        "displayName": "工作区代码语义检索",
        "canBeReferencedInPrompt": true,
        "tags": ["codesearch"],
        "inputSchema": { ... }
      }
    ]
  }
}
```

---

## 4. 后续接力事项与调试指引

### 4.1 立即验证步骤

1. 打开新工作区 `D:\private\semantic-search`；
2. 执行编译并安装至全局扩展目录：
   ```bash
   cd D:\private\semantic-search
   npm run compile
   npx @vscode/vsce package --no-dependencies --allow-missing-repository
   code --install-extension vscode-agent-semantic-search-0.1.0.vsix --force
   ```
3. 在 VS Code 中执行 `Developer: Reload Window`；
4. 检查 Chat 输入框左侧的“配置工具”面板（Manage Tools），确认列表中出现 **工作区代码语义检索 (`semanticSearch`)** 并处于勾选状态；
5. 新建 Chat 会话（`+`），向 Agent 提问概念性代码检索问题，验证 Agent 是否自主调用 `workspace_semantic_search`。

### 4.2 潜在优化与待完善项

1. **单元测试补齐**：当前项目缺乏自动化测试。`toolResolver.ts`、`resultAdapter.ts`、`relayFailure.ts` 为纯逻辑函数，建议引入测试框架（如 `vitest` 或 `@vscode/test-electron`）；
2. **工作区目录边界安全校验**：在 `semanticSearchRelay.ts` 中针对绝对路径入参增加与当前工作区文件夹前缀比对，收敛非工作区路径；
3. **输出可观测性增强**：在日常使用中如遇到底层不可用，可通过状态栏管理菜单点击“收集索引诊断信息”，在输出面板查看详细指标。

---

## 5. 建议使用的技能（Suggested Skills）

接力代理在后续工作推进中，建议优先加载以下技能：

- **`tdd`**：用于为 `ToolResolver`、`resultAdapter`、`semanticSearchRelay` 补充单元测试，确保中继边界与错误处理具备回归保护；
- **`codebase-design`**：用于持续审视和深化 `ports.ts` 的适配器分层，保持低耦合高内聚；
- **`troubleshoot`**：若在新工作区中 Agent 调用工具遇到意外阻碍，可结合 JSONL 日志排查工具上下文派发情况。
