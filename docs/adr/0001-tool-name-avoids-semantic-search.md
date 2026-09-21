# 工具名不使用 `semantic_search`

VS Code 的 Copilot 扩展在构建工具集时会按会话端点做类型判定，只要会话使用第三方 URL 端点，就硬编码禁用名为 `semantic_search` 的工具（`workbench.desktop.main.js` 中的 `chat.copilot.semanticSearch.enabled` 亦默认为 `false`，且只对内部会话类型放行）。而本扩展存在的全部意义正是把语义检索能力开放给第三方模型的 Agent，所以注册名取 `workspace_semantic_search`、引用别名取 `semanticSearch`，没有采用那个更直白的名字。代价是注册名看起来绕口，并且它同时被 `package.json` 的激活事件 `onLanguageModelTool:workspace_semantic_search` 与 `canBeReferencedInPrompt` 固定，改名会一并破坏激活与提示词引用。
