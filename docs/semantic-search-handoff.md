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

开发 VS Code 语言模型工具扩展 `vscode-agent-semantic-search`，注册工具 `semanticSearch`（工具注册名与别名完全一致），避开黑名单，在 Agent 自主调用时通过 `vscode.lm.invokeTool("copilot_searchCodebase", ...)` 间接转发给 Copilot 底层语义检索服务。

---

## 2. 工程迁移与当前路径

- **工作区路径**：仓库根目录（开发、编译、测试均在此目录下进行）
- **当前版本**：`0.1.1`
- **VS Code 扩展安装包**：`vscode-agent-semantic-search-0.1.1.vsix`
- **VS Code 扩展安装目录**：`~/.vscode/extensions/local.vscode-agent-semantic-search-0.1.1`

---

## 3. 核心实现与已完成的架构重构

### 3.1 模块结构（`src/`）

- `constants.ts`：单一事实源。定义工具名 `TOOL_NAME = "semanticSearch"`、默认底层中继 ID `DEFAULT_RELAY_TOOL_ID = "copilot_searchCodebase"`、超时上下限（5s~180s）与命令 ID 常量。
- `types.ts`：定义入参结构 `SemanticSearchInput`、结果联合 `SearchOutcome`（`ok` / `empty` / `failed`）以及结构化失败类型 `RelayFailureKind`（`tool-missing` / `not-ready` / `timeout` / `invalid-input` / `relay-error`）。`empty` 分支采用纯数据契约 `{ query, dirNote }`。
- `relay/`：
  - `ports.ts`：定义 `ToolHost` 与 `CommandHost` 接口，隔离直接对 `vscode.lm` 与 `vscode.commands` 的硬依赖；`ToolDescriptor` 完整声明 `toolReferenceName`；
  - `toolResolver.ts`：按候选列表解析底层工具，包含严格的自引用排除守卫（防止递归调用自身），支持注册名与 `toolReferenceName` 兜底；
  - `semanticSearchRelay.ts`：核心中继调度器。包含解耦的 `normalizeQuery` 与 `normalizeScopedDirectories` 纯函数；编排带 `CancellationTokenSource` 的超时中继调用；修复了超时与外层取消的竞态判定；对未就绪状态映射为 `not-ready`；
  - `resultAdapter.ts`：深度遍历多态 `PromptTsx` AST 树（容纳 48 层嵌套组件深度），100% 无损原样透传底层代码正文，不实施人为字符截断（见 ADR-0003）；
  - `outcomePresenter.ts`：检索终态呈现深模块，统一将命中、无匹配与失败三种终态格式化为模型可读的 Markdown 文本与确定性降级提示（彻底消灭旧 `relayFailure.ts` 浅模块）。
- `tools/semanticSearchTool.ts`：实现 `vscode.LanguageModelTool<SemanticSearchInput>` 的 Adapter。命中时优先直接透传底层原生 `LanguageModelPromptTsxPart` 避免触发 8KB 临时文件落盘，空结果/失败时经 `presentOutcome` 包装短文本降级提示。
- `statusbar/indexStatusBar.ts`：右下角状态栏快捷入口与管理菜单，采用极简双状态模型（`idle` 与 `indexing`，见 ADR-0004），提供只读 `state` 属性供外部与测试观察。
- `commands/`：
  - `buildIndexCommand.ts`：转发触发 Copilot 建立远端工作区索引（`github.copilot.buildRemoteWorkspaceIndex`），在 `finally` 块中原子保证 `isBuilding` 释放与状态栏安全复位；
  - `diagnosticsCommand.ts`：在输出面板 `Agent Semantic Search` 打印 LM 工具注册与配置快照。
- `extension.ts`：组合根，生命周期管理与 `context.subscriptions` 注册。

### 3.2 自动化测试设施（`test/`）

全库构建了脱机运行的轻量级测试体系，覆盖全部 6 大核心模块（共 35 项测试全部通过）：

- `test/mocks/vscode.cjs`：提供轻量级 Node.js 运行时 Mock（含 `commands`、`window`、`workspace`、`CancellationTokenSource`、`CancellationError`、`LanguageModelPromptTsxPart` 等）；
- `test/buildIndexFeedbackLoop.test.mjs`：测试索引构建反馈循环、生命周期状态演进与防重入守卫；
- `test/outcomePresenter.test.mjs`：测试 3 大终态在各配置分支下的呈现文本与降级提示；
- `test/resultAdapter.test.mjs`：测试多态 PromptTsx 树深层展平与无损透传；
- `test/semanticSearchRelay.test.mjs`：测试核心规整、超时竞态、取消、未就绪判定（ADR-0002）与目录 Schema 适配；
- `test/toolResolver.test.mjs`：测试工具别名匹配与自引用排除逻辑；
- `test/semanticSearchTool.test.mjs`：测试原生多态部件直接透传、降级提示分支与 `appendCodeUsagesHint` 配置切换。

### 3.3 关键配置（`package.json`）

```json
{
  "name": "vscode-agent-semantic-search",
  "activationEvents": [
    "onStartupFinished",
    "onLanguageModelTool:semanticSearch"
  ],
  "contributes": {
    "languageModelTools": [
      {
        "name": "semanticSearch",
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

1. 打开工作区 `D:\private\semantic-search`；
2. 执行编译并打包安装扩展：
   ```bash
   cd D:\private\semantic-search
   npm test
   npx @vscode/vsce package
   code --install-extension vscode-agent-semantic-search-0.1.1.vsix --force
   ```
3. 在 VS Code 中执行 `Developer: Reload Window`；
4. 检查 Chat 输入框左侧的“配置工具”面板（Manage Tools），确认列表中出现 **工作区代码语义检索 (`semanticSearch`)** 并处于勾选状态；
5. 新建 Chat 会话（`+`），向 Agent 提问概念性代码检索问题，验证 Agent 是否自主调用 `semanticSearch`。

### 4.2 潜在优化与后续探索项

1. **自动化测试现状**：测试体系已全面建立。全库覆盖 31 项端到端及单元测试（涵盖 PromptTsx 抽取、终态呈现、状态栏原子复位、中继全链路调度与工具别名解析），均可在无 Electron 依赖下高速运行（`npm test`）；
2. **工作区目录边界安全校验**：可在 `normalizeScopedDirectories` 中针对绝对路径入参增加与当前生效 `workspaceRoots` 的前缀比对，进一步收敛非工作区逃逸路径；
3. **输出可观测性增强**：在日常使用中如遇到底层不可用，可通过状态栏管理菜单点击“收集索引诊断信息”，在输出面板查看详细指标。

---

## 5. 建议使用的技能（Suggested Skills）

接力代理在后续工作推进中，应根据任务类型优先加载以下技能：

### 5.1 工作区内建技能（Workspace Local Skills）

- **`vscode-ext-commands`**（位于 `.agents/skills/vscode-ext-commands/`）：
  - **用途**：VS Code 扩展命令贡献规范。在新增、修改或重构插件命令时，规范命令 ID 命名、Category 分类、Title 标题、菜单展示与 `when` 门禁可见性。
- **`vscode-ext-localization`**（位于 `.agents/skills/vscode-ext-localization/`）：
  - **用途**：VS Code 扩展多语言国际化规范。规范 `package.nls.json` / `package.nls.zh-cn.json`（清单配置与命令本地化）以及 `l10n/bundle.l10n.*.json`（源码运行时用户提示字符串）的维护流程。

### 5.2 架构与领域建模技能（Architecture & Domain Skills）

- **`domain-modeling`**：
  - **用途**：维护单上下文领域模型。当重构调整领域概念、新增失败分类或更新规则时，用于同步维护根目录 [CONTEXT.md](CONTEXT.md) 与 [docs/adr/](docs/adr/) 架构决策记录，杜绝术语分叉。
- **`codebase-design`**：
  - **用途**：深模块与接缝纪律设计。用于审视模块深度（Depth）、避免浅层透传（Shallow Wrapper）、消除跨模块知识泄漏，以及保持“测试面即接口（The interface is the test surface）”的高杠杆设计。
- **`code-review`**：
  - **用途**：在代码提交或发布前，沿 Standards（编码与注释规范）和 Spec（需求契约）双轴执行审查。

### 5.3 调试与排查技能（Diagnostics & Troubleshooting）

- **`diagnosing-bugs`**：若后续遇到底层 Copilot 会话超时、AST 抽取异常或未就绪误判，用于系统化排查根因。
- **`troubleshoot`**：若在新工作区中 Agent 无法发现或自主调用 `semanticSearch` 工具，结合 VS Code 与 Copilot 的 JSONL 日志排查工具上下文派发情况。
