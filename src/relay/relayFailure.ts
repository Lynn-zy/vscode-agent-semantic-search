/**
 * @file relayFailure.ts
 * @description 错误分类与模型友好降级提示生成器
 */

import { RelayFailure, RelayFailureKind } from "../types";

/**
 * 根据错误上下文构建结构化的 RelayFailure 对象
 * @param kind 失败类别
 * @param message 错误信息
 * @param details 额外细节
 * @returns 统一结构化错误
 */
export function createRelayFailure(
  kind: RelayFailureKind,
  message: string,
  details?: string,
): RelayFailure {
  return { kind, message, details };
}

/**
 * 降级提示中「建议段」的统一标题
 * 注：失败路径与结果为空路径共用同一标题，避免同一概念的文本出现两种措辞
 */
export const DEGRADATION_SUGGESTION_TITLE = "💡 Suggestions for Agent:";

/**
 * 按失败类别生成建议段条目，为 Agent 给出明确的下一步动作，避免对失效的工具反复重试
 * @param failure 失败详情
 * @param originalQuery 原始查询文本
 * @returns 编号后的建议条目列表
 */
function buildSuggestionItems(
  failure: RelayFailure,
  originalQuery: string,
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
        `1. Search for '${originalQuery}' timed out.`,
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
 * 组装降级提示：原因段必出，建议段由调用方按配置决定是否附带
 * @param failure 失败详情
 * @param originalQuery 原始查询文本
 * @param includeSuggestion 是否附带建议段
 * @returns 分段拼装后的降级提示文本
 */
export function formatDegradationHint(
  failure: RelayFailure,
  originalQuery: string,
  includeSuggestion: boolean,
): string {
  // 原因段：只说明失败缘由，不含任何行动建议
  const sections: string[] = [`[Semantic Search Notice]: ${failure.message}`];
  if (failure.details) {
    sections.push(`Details: ${failure.details}`);
  }

  if (includeSuggestion) {
    sections.push(
      [
        DEGRADATION_SUGGESTION_TITLE,
        ...buildSuggestionItems(failure, originalQuery),
      ].join("\n"),
    );
  }

  return sections.join("\n");
}
