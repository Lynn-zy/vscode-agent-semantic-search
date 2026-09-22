/**
 * @file outcomePresenter.ts
 * @description 检索终态呈现器（深模块）：负责将检索结果（SearchOutcome）按配置格式化为模型可读的纯文本 Markdown
 */

import { ExtensionConfig, RelayFailure, SearchOutcome } from "../types";

/**
 * 降级提示中「建议段」的统一样式标题
 * 供模型识别后续内容为操作建议，避免在失效工具上重复盲目重试
 */
export const DEGRADATION_SUGGESTION_TITLE = "💡 Suggestions for Agent:";

/**
 * 根据具体的失败类别生成面向模型的建议清单
 * 统一确定性工具（grep_search、file_search）与命令名称的表述
 *
 * @param failure 失败详情对象
 * @param query 原始查询语句
 * @returns 格式化后的建议条目数组
 */
function buildFailureSuggestions(
  failure: RelayFailure,
  query: string,
): string[] {
  switch (failure.kind) {
    case "not-ready":
      return [
        "1. Codebase index is not yet built, or the semantic search service is unavailable.",
        "2. [Action required]: Immediately fall back to `grep_search` for keywords or `file_search` for filenames.",
        "3. The user can build the index via Command Palette: 'Semantic Search: Build Codebase Index'.",
      ];

    case "tool-missing":
      return [
        "1. Underlying Copilot search tool was not detected. Ensure GitHub Copilot Chat extension is enabled.",
        "2. [Action required]: Fall back to `grep_search`, `file_search`, or `read_file` to proceed.",
      ];

    case "timeout":
      return [
        `1. Search for '${query}' timed out.`,
        "2. Try providing more specific entities, narrowing scopedDirectories, or switching to `grep_search`.",
      ];

    case "invalid-input":
      return [
        "1. Invalid input: query cannot be empty.",
        "2. Please provide a clear natural language description of the code logic or concept.",
      ];

    case "relay-error":
    default:
      return [
        "1. Underlying search relay encountered an unexpected error.",
        "2. [Action required]: Immediately fall back to `grep_search` or `file_search`.",
      ];
  }
}

/**
 * 构造检索无匹配（empty）时的建议清单
 *
 * @returns 建议条目数组
 */
function buildEmptySuggestions(): string[] {
  return [
    "1. If exact keywords or symbols are known, immediately switch to `grep_search` or `file_search`.",
    "2. If the codebase index has not been built yet, run 'Semantic Search: Build Codebase Index' via the command palette.",
  ];
}

/**
 * 格式化失败（failed）状态的呈现文本
 *
 * @param failure 失败详情
 * @param query 原始查询语句
 * @param showDegradationHints 是否开启建议段输出
 * @returns 格式化后的 Markdown 文本
 */
function presentFailedOutcome(
  failure: RelayFailure,
  query: string,
  showDegradationHints: boolean,
): string {
  // 原因段：明确说明失败原因与上下文详情
  const sections: string[] = [`[Semantic Search Notice]: ${failure.message}`];
  if (failure.details) {
    sections.push(`Details: ${failure.details}`);
  }

  // 建议段：受配置开关控制
  if (showDegradationHints) {
    const suggestions = buildFailureSuggestions(failure, query);
    sections.push([DEGRADATION_SUGGESTION_TITLE, ...suggestions].join("\n"));
  }

  return sections.join("\n");
}

/**
 * 格式化无匹配（empty）状态的呈现文本
 *
 * @param query 原始查询语句
 * @param dirNote 可选的目录范围调整说明
 * @param showDegradationHints 是否开启建议段输出
 * @returns 格式化后的 Markdown 文本
 */
function presentEmptyOutcome(
  query: string,
  dirNote: string | undefined,
  showDegradationHints: boolean,
): string {
  // 原因段：说明未命中并带上查询语句及目录说明
  const reasonLines: string[] = [
    "[Semantic Search: No matching code found]",
    `No matching code snippets found in workspace for: '${query}'.`,
  ];

  if (dirNote) {
    reasonLines.push(`Note: ${dirNote}`);
  }

  const sections: string[] = [reasonLines.join("\n")];

  // 建议段：引导模型改用确定性检索或构建索引
  if (showDegradationHints) {
    const suggestions = buildEmptySuggestions();
    sections.push([DEGRADATION_SUGGESTION_TITLE, ...suggestions].join("\n"));
  }

  return sections.join("\n\n");
}

/**
 * 呈现检索结果的主入口（纯函数深模块接口）
 * 接收底层中继返回的统一 SearchOutcome 结构并格式化为最终模型呈现字符串
 *
 * @param outcome 语义检索终态结构体
 * @param config 插件运行时配置快照
 * @returns 规整完成的 Markdown 文本字符串
 */
export function presentOutcome(
  outcome: SearchOutcome,
  config: ExtensionConfig,
): string {
  switch (outcome.status) {
    case "ok":
      // 成功状态：原样无损透传底层检索得到的 Markdown 内容（遵循 ADR-0003）
      return outcome.markdown;

    case "empty":
      // 无匹配状态：格式化未命中说明并根据配置附加降级建议
      return presentEmptyOutcome(
        outcome.query,
        outcome.dirNote,
        config.showDegradationHints,
      );

    case "failed":
      // 失败状态：格式化失败原因与降级指引
      return presentFailedOutcome(
        outcome.failure,
        outcome.query,
        config.showDegradationHints,
      );
  }
}
