# Agent Semantic Search Bridge (`vscode-agent-semantic-search`)

<p align="center">
  <a href="#english">English</a> | <a href="#简体中文">简体中文</a>
</p>

---

<a name="english"></a>

## English

A lightweight, reliable bridge extension for VS Code that exposes the workspace codebase semantic search tool (`semanticSearch`) to all AI Agents. It enables third-party and custom model endpoints (e.g., DeepSeek, Claude, Gemini, local models) to autonomously perform semantic code retrieval across your workspace.

### 🌟 Key Features

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
   - `semanticSearch.relayToolId`: Target underlying tool ID (default `copilot_searchCodebase`).

### 📖 Usage

#### 1. Prerequisites

- Install and enable the **GitHub Copilot Chat** extension (provides underlying embedding and index services);
- Build the codebase semantic index for your workspace (via the status bar entry or Command Palette `Semantic Search: Build Codebase Index`).

#### 2. How to Use

- **Autonomous Agent Invocation**: In any VS Code Agent / Chat conversation, models will automatically call the `semanticSearch` tool when searching for code by concept or logic;
- **Explicit Reference**: Type `#semanticSearch` in the Chat input box to directly attach semantic search context.

---

<a name="简体中文"></a>

## 简体中文

这是一个为 VS Code 设计的中继扩展插件，旨在将工作区代码语义检索工具（`semanticSearch`）开放给所有智能体（Agent），让使用第三方或兼容模型（如 DeepSeek、Gemini、Claude 等）的 Agent 能够自主调用工作区代码语义搜索能力。

### 🌟 核心特性

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
   - `semanticSearch.relayToolId`：底层中继目标工具 ID（默认 `copilot_searchCodebase`）。

### 📖 使用说明

#### 1. 前置要求

- 安装并启用 **GitHub Copilot Chat** 扩展（本插件依赖底层代码库语义索引服务）；
- 在当前工作区中完成代码库语义索引构建（可通过右下角状态栏或命令面板执行 `构建工作区代码库索引`）。

#### 2. 使用方式

- **Agent 自主调用**：在任何 VS Code Agent / Chat 会话中，当遇到需要按功能意图检索代码时，模型会自动调用 `semanticSearch` 工具；
- **提示词显式引用**：在 Chat 输入框中键入 `#semanticSearch`，即可显式引用本工具并附带查询上下文。

---

## 📄 License

[MIT License](LICENSE) © 2026 Lynn-zy
