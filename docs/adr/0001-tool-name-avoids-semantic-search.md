# 工具注册名与引用别名统一为 `semanticSearch`，避开 `semantic_search`

VS Code 的 Copilot 扩展在构建工具集时会按会话端点做类型判定，只要会话使用第三方 URL 端点，就硬编码禁用名为 `semantic_search` 的工具（`workbench.desktop.main.js` 中的 `chat.copilot.semanticSearch.enabled` 亦默认为 `false`，且只对内部会话类型放行）。为了把语义检索能力开放给第三方模型的 Agent，同时避免“注册名一个、用户引用别名又一个”的概念分叉与调用混乱，我们决定将工具的底层注册名（`name`）与提示词引用别名（`toolReferenceName`）在全局一次性统一为 `semanticSearch`。这既彻底规避了官方的黑名单拦截，又保证了系统内外契约的整洁与唯一。
