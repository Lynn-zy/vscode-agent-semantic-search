# Agent Semantic Search Bridge (`vscode-agent-semantic-search`)

<p align="center">
  <a href="#english">English</a> | <a href="#简体中文">简体中文</a>
</p>

---

<a name="english"></a>

## English

A lightweight, reliable bridge extension for VS Code that exposes the workspace codebase semantic search tool (`semanticSearch`) to all AI Agents. It enables third-party and custom model endpoints (e.g., DeepSeek, Claude, Gemini, local models) to autonomously perform semantic code retrieval across your workspace.

### What is Semantic Search & Why Agents Need It

According to the official [VS Code Workspace Context Reference](https://code.visualstudio.com/docs/agents/reference/workspace-context#_semantic-search), Copilot agents navigate codebases iteratively like human developers:

1. **Semantic search (`#codebase` / `semanticSearch`)**: Locates code by functional meaning and conceptual intent rather than exact keywords (e.g., _"where is authentication handled?"_ or _"payment error handling logic"_).
2. **Text search / Grep (`grep_search`)**: Searches for exact keywords, function names, or regex patterns once specific terms are identified.
3. **Symbol usages (`usages`)**: Traces definitions, references, and implementations across files.
4. **File search (`file_search`)**: Locates related configurations, tests, or companion files.
5. **Read file (`read_file`)**: Inspects concrete implementations and applies coordinated changes.

#### The Problem Solved by This Bridge

In standard VS Code, the native `semantic_search` tool is restricted to first-party Copilot models and hardcode-disabled for third-party or custom model endpoints (e.g., DeepSeek, Gemini, Claude via API). Agents using those models could not autonomously call semantic search and relied on users manually adding `#codebase` in the prompt.

**Agent Semantic Search Bridge** registers `semanticSearch` as a first-class Language Model Tool without name collision or blacklist blocks, seamlessly relaying requests to the underlying `copilot_searchCodebase` service and returning clean Markdown code excerpts with lossless AST extraction.

#### Tool Comparison Matrix

| Tool                            | Principle                              | Best Used When...                                                                           | Index Required?                   |
| :------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------------------ | :-------------------------------- |
| **`semanticSearch`**            | Vector Embedding & Semantic Similarity | You know the feature intent or logic concept, but don't know the symbol names or file paths | **Yes** (Codebase Semantic Index) |
| **`grep_search` / Text Search** | Literal String & Regex Matching        | You know the exact function, identifier, error string, or pattern                           | No                                |
| **`file_search`**               | Glob Pattern & Filename Matching       | You want to locate files by name or path pattern (`**/*.service.ts`)                        | No                                |
| **`usages`**                    | Code Intelligence / Language Server    | You need to trace definitions, references, or implementations of a known symbol             | Language Server                   |

---

### Key Features

1. **Autonomous Semantic Search Tool (`semanticSearch`)**:
   - **Unified Tool Name & Reference**: Both tool registration name and prompt reference are identical: `semanticSearch`.
   - **Inputs**:
     - `query` (string, required): Natural language description or functional intent (e.g., `"user authentication interceptor"`, `"websocket heartbeat mechanism"`).
     - `scopedDirectories` (string[], optional): Filter search scope to specific directories.
   - Transparently relays requests to Copilot's underlying `copilot_searchCodebase` service for high-quality code snippets.

2. **Lossless AST Unwrapping & Graceful Degradation**:
   - Deeply traverses `@vscode/prompt-tsx` AST trees (up to 48 layers) to extract code excerpts 100% losslessly without arbitrary truncation.
   - Automatically provides actionable English fallback guidance when the codebase index is not yet built or returns empty, guiding the Agent to immediately use `grep_search` or `file_search` instead of looping indefinitely.

3. **Minimalist Status Bar & Index Management**:
   - **Binary Status Bar**: Displays clean states: Ready (`$(search) Semantic Search`) and Building (`$(sync~spin) Semantic Search: Indexing...`).
   - **Quick Actions Menu**: Click status bar item or open Command Palette to:
     - `Semantic Search: Build Codebase Index` (trigger Copilot codebase index build with concurrency protection)
     - `Semantic Search: Collect Index Diagnostics` (generate instant diagnostic report)
     - `Semantic Search: Open Management Menu`

4. **Highly Configurable**:
   - `semanticSearch.timeoutMs`: Timeout threshold for single relay search (default `45000` ms).
   - `semanticSearch.statusBar.enabled`: Toggle status bar entry visibility.
   - `semanticSearch.showDegradationHints`: Toggle whether to append fallback suggestions on empty or failed searches.
   - `semanticSearch.appendCodeUsagesHint`: Toggle whether to append an actionable hint suggesting `vscode_listCodeUsages` to the Agent when code excerpts are found (default `true`).
   - `semanticSearch.relayToolId`: Target underlying tool ID (default `copilot_searchCodebase`).

### Usage

#### 1. Prerequisites

- Install and enable the **GitHub Copilot Chat** extension (provides underlying embedding and index services);
- Build the codebase semantic index for your workspace (via the status bar entry or Command Palette `Semantic Search: Build Codebase Index`).

#### 2. How to Use

- **Autonomous Agent Invocation**: In any VS Code Agent / Chat conversation, models will automatically call the `semanticSearch` tool when searching for code by concept or logic;
- **Explicit Reference**: Type `#semanticSearch` in the Chat input box to directly attach semantic search context;
- **Seamless Symbol Usages Tracing**: When code excerpts are found, the Agent can seamlessly invoke `vscode_listCodeUsages` using the returned `filePath`, `symbol`, and `lineContent` to trace callers, references, and blast radius across the project.

---

<a name="简体中文"></a>

## 简体中文

这是一个为 VS Code 设计的中继扩展插件，旨在将工作区代码语义检索工具（`semanticSearch`）开放给所有智能体（Agent），让使用第三方或兼容模型（如 DeepSeek、Gemini、Claude 等）的 Agent 能够自主调用工作区代码语义搜索能力。

### 什么是语义检索？为什么 Agent 需要它？

参考官方 [VS Code 工作区上下文文档（Workspace Context Reference）](https://code.visualstudio.com/docs/agents/reference/workspace-context#_semantic-search)，Copilot Agent 在理解与修改代码时，像人类开发者一样通过多层次的检索工具协同推进：

1. **语义搜索（`#codebase` / `semanticSearch`）**：按**自然语言意图和业务概念**检索代码，而不是局限于字面关键词（例如查询 _“身份认证拦截器在哪”_、_“支付模块异常处理流程”_）。
2. **文本搜索 / Grep（`grep_search`）**：一旦初步锁定了概念或关键符号名，用精确字符串或正则表达式排查具体的语法结构和引用。
3. **符号与引用分析（`usages`）**：结合查找所有引用、接口实现与定义跳转，追踪符号在各文件中的调用与依赖关系。
4. **文件搜索（`file_search`）**：按名称或 glob 路径模式匹配相关联的配置文件或测试用例。
5. **文件读取（`read_file`）**：定位具体文件行范围并执行协同代码编辑。

#### 本中继插件解决的问题

在 VS Code 官方实现中，原生的 `semantic_search` 工具仅对第一方 Copilot 模型开放，并对使用第三方模型 API（如 DeepSeek、Gemini、Claude 端点）的 Agent 设置了硬编码黑名单拦截；此前第三方模型 Agent 无法在工具列表中自主发现和调用语义搜索，只能依赖用户在聊天框中手动敲入 `#codebase` 触发。

**Agent Semantic Search Bridge** 通过统一的 `semanticSearch` 注册名避开拦截限制，将 Agent 发起的语义检索请求透明中继到底层 `copilot_searchCodebase` 服务，实现 100% 无损的多态 AST 抽取与结果格式化，让第三方模型的 Agent 也能像第一方模型一样自主调用代码库语义检索。

#### 工具能力对比矩阵

| 工具                         | 检索原理                | 最佳适用场景                                           | 是否依赖索引                                     |
| :--------------------------- | :---------------------- | :----------------------------------------------------- | :----------------------------------------------- |
| **`semanticSearch`**         | 向量嵌入与语义相似度    | 明确业务意图或功能概念，但**未知**具体符号名或文件路径 | **是**（代码库语义索引 Codebase Semantic Index） |
| **`grep_search` / 文本搜索** | 字符串字面量 / 正则匹配 | 已知确切的函数名、变量名、错误码或正则文本             | 否                                               |
| **`file_search`**            | 文件名 / Glob 模式      | 按文件名规则筛选文件列表（如 `**/*.controller.ts`）    | 否                                               |
| **`usages`**                 | 代码智能与语言服务(AST) | 跨文件追溯已知符号的定义、调用路径与引用链             | 依赖语言服务（Language Server）                  |

---

### 核心特性

1. **自主语义检索工具（Language Model Tool）**：
   - **注册名与别名统一**：工具注册名与提示词引用别名完全一致，统一为 `semanticSearch`。
   - **入参**：
     - `query` (string, 必填)：自然语言语义描述或功能意图（例如：“用户权限拦截器”、“WebSocket 心跳保活”）。
     - `scopedDirectories` (string[], 可选)：限定搜索的子目录路径列表。
   - 自动中继转发至底层 Copilot 的 `copilot_searchCodebase` 工具，获取高质量代码片段。

2. **多态数据无损适配与防幻觉降级（Graceful Degradation）**：
   - 深度遍历 `@vscode/prompt-tsx` 抽象语法树（深达 48 层嵌套组件），100% 原样提取代码正文，不实施人为截断。
   - 当代码库索引尚未构建或检索无匹配结果时，自动附带明确的排查与降级建议，引导 Agent 立即使用 `grep_search` 或 `file_search` 继续推进，避免陷入工具调用死循环。

3. **极简状态栏管理（Status Bar）**：
   - **双状态模型**：状态栏仅维护就绪态（`$(search) 语义搜索`）与构建中态（`$(sync~spin) 语义搜索: 构建索引中`），不被单次瞬态结果干扰。
   - **快捷管理菜单**：点击状态栏图标或通过命令面板快速执行：
     - `语义搜索：构建工作区代码库索引`（带防重入保护）
     - `语义搜索：收集工作区索引诊断信息`（一键生成环境工具与配置诊断报告）
     - `语义搜索：打开管理菜单`

4. **高度可配置**：
   - `semanticSearch.timeoutMs`：自定义单次检索超时（默认 45000 毫秒）。
   - `semanticSearch.statusBar.enabled`：状态栏图标显隐。
   - `semanticSearch.showDegradationHints`：结果为空或检索失败时，是否向模型附带下一步排查与降级建议。
   - `semanticSearch.appendCodeUsagesHint`：检索成功命中代码切片时，是否向 Agent 追加结合 `vscode_listCodeUsages` 追踪引用的操作指引（默认 `true`）。
   - `semanticSearch.relayToolId`：底层中继目标工具 ID（默认 `copilot_searchCodebase`）。

### 使用说明

#### 1. 前置要求

- 安装并启用 **GitHub Copilot Chat** 扩展（本插件依赖底层代码库语义索引服务）；
- 在当前工作区中完成代码库语义索引构建（可通过右下角状态栏或命令面板执行 `构建工作区代码库索引`）。

#### 2. 使用方式

- **Agent 自主调用**：在任何 VS Code Agent / Chat 会话中，当遇到需要按功能意图检索代码时，模型会自动调用 `semanticSearch` 工具；
- **提示词显式引用**：在 Chat 输入框中键入 `#semanticSearch`，即可显式引用本工具并附带查询上下文；
- **无缝符号引用追踪**：检索返回相关代码片段后，Agent 可直接利用切片包含的文件路径、符号名与行内容，精准调用 `vscode_listCodeUsages` 追踪全库调用链与影响面。

---

## 📄 License

[MIT License](LICENSE) © 2026 Lynn-zy
