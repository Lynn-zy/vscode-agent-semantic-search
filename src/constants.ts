/**
 * @file constants.ts
 * @description 核心常量与配置默认值定义（单一事实源）
 */

/**
 * 暴露给 VS Code Agent 的语言模型工具注册名称
 * 注：避免直接使用 "semantic_search"，以防命中 Copilot 对其内置工具的黑名单过滤
 */
export const TOOL_NAME = "workspace_semantic_search";

/**
 * 默认底层 Copilot 语义检索工具注册 ID
 */
export const DEFAULT_RELAY_TOOL_ID = "copilot_searchCodebase";

/**
 * 底层 Copilot 语义检索工具的候选名称列表（按检索优先级排序，严禁包含自身以防死循环）
 */
export const DEFAULT_RELAY_TOOL_CANDIDATES: readonly string[] = [
  DEFAULT_RELAY_TOOL_ID,
];

/**
 * 尝试触发构建代码库索引的候选命令 ID 列表（当前 Copilot 版本有效命令）
 */
export const BUILD_INDEX_COMMAND_CANDIDATES: readonly string[] = [
  "github.copilot.buildRemoteWorkspaceIndex",
];

/**
 * 尝试收集代码库索引诊断信息的候选命令 ID 列表
 */
export const DIAGNOSTICS_COMMAND_CANDIDATES: readonly string[] = [
  "github.copilot.debug.collectWorkspaceIndexDiagnostics",
];

/**
 * 插件命令 ID 单一事实源
 */
export const COMMAND_BUILD_INDEX = "semanticSearch.buildIndex";
export const COMMAND_COLLECT_DIAGNOSTICS =
  "semanticSearch.collectIndexDiagnostics";
export const COMMAND_SHOW_MENU = "semanticSearch.showMenu";

/**
 * 单次请求支持的限定目录上限，防止超长参数拖慢底层检索
 */
export const MAX_SCOPED_DIRECTORIES_LIMIT = 20;

/**
 * 默认超时时限（45 秒，高于底层 Copilot 的 20 秒内置超时以保证充足缓冲）
 */
export const DEFAULT_TIMEOUT_MILLISECONDS = 45000;

/**
 * 超时时限允许的下限与上限（毫秒）
 */
export const MIN_TIMEOUT_MILLISECONDS = 5000;
export const MAX_TIMEOUT_MILLISECONDS = 180000;

/**
 * 状态栏项对齐优先级
 */
export const STATUS_BAR_ALIGNMENT_PRIORITY = 100;
