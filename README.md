# Agent Semantic Search Bridge (`vscode-agent-semantic-search`)

这是一个为 VS Code 设计的中继扩展插件，旨在将工作区代码语义检索工具（`semanticSearch`）开放给所有智能体（Agent），让使用第三方或兼容模型（如 DeepSeek、Gemini、Claude 等）的 Agent 能够自主调用工作区语义代码搜索能力。

---

## 🌟 核心特性

1. **自主语义检索工具（Language Model Tool）**：
   - 工具注册名与引用别名：`semanticSearch`
   - 入参：
     - `query` (string, 必填)：自然语言语义描述或功能意图（例如：“用户权限拦截器”、“WebSocket 心跳保活”）。
     - `scopedDirectories` (string[], 可选)：限定搜索的子目录路径列表。
   - 自动中继转发至底层 Copilot 的 `copilot_searchCodebase` 工具，获取高质量代码片段。

2. **多态数据适配与防幻觉降级（Graceful Degradation）**：
   - 自动解析底层返回的 `PromptTsx` 复杂树状结构为 Markdown 纯文本。
   - 当代码库索引尚未构建或检索无匹配结果时，自动附带明确的排查与降级建议，引导 Agent 立即使用 `grep_search` 或 `file_search` 继续推进，避免陷入工具调用死循环。

3. **工作区索引一键构建与管理**：
   - 状态栏右下角入口：实时展示语义检索状态（就绪 / 未就绪 / 异常）。
   - 命令面板（Command Palette）：
     - `语义搜索：构建工作区代码库索引`（触发 Copilot 构建代码库索引）
     - `语义搜索：收集工作区索引诊断信息`（一键生成环境工具与配置诊断报告）
     - `语义搜索：打开管理菜单`

4. **高度可配置**：
   - `semanticSearch.timeoutMs`：自定义单次检索超时（默认 45000 毫秒）。
   - `semanticSearch.statusBar.enabled`：状态栏图标显隐。
   - `semanticSearch.showDegradationHints`：结果为空或检索失败时，是否向模型附带下一步排查与降级建议。
   - `semanticSearch.relayToolId`：底层中继目标工具 ID（默认 `copilot_searchCodebase`）。

---

## 🚀 本地调试与安装方法

### 方法 A：直接作为开发插件加载（最推荐）

在项目根目录下，直接通过 PowerShell 将本项目软链接（或复制）到 VS Code 扩展目录：

```powershell
# 在本项目根目录下执行软链接命令
New-Item -ItemType SymbolicLink -Path "$HOME\.vscode\extensions\vscode-agent-semantic-search" -Target $PWD
```

或者直接复制：

```powershell
Copy-Item -Recurse -Path $PWD -Destination "$HOME\.vscode\extensions\vscode-agent-semantic-search"
```

### 方法 B：按 F5 启动 Extension Development Host

1. 在 VS Code 中打开本项目根目录；
2. 按 `F5` 启动调试窗口；
3. 在弹出的新 VS Code 窗口中开启 Chat，即可测试 Agent 自主调用 `semanticSearch`。
