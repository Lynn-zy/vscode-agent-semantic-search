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
export const DEGRADATION_SUGGESTION_TITLE = "💡 给 Agent 的后续建议：";

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
        "1. 当前工作区尚未构建代码库索引，或底层语义检索服务未启用。",
        "2. 【建议立即降级】：改用 `grep_search` 进行关键词文本搜索，或用 `file_search` 查找文件名。",
        "3. 提示用户可通过命令面板执行「语义搜索：构建工作区代码库索引」构建代码库索引。",
      ];

    case "tool-missing":
      return [
        "1. 未检测到底层 Copilot 检索工具，可能未安装或未启用 GitHub Copilot 扩展。",
        "2. 【建议立即降级】：优先使用 `grep_search`、`file_search` 或 `read_file` 完成当前任务。",
      ];

    case "timeout":
      return [
        `1. 检索「${originalQuery}」超时。`,
        "2. 建议尝试提供更具体的业务实体词、缩小 scopedDirectories 目录范围，或直接转用 `grep_search`。",
      ];

    case "invalid-input":
      return [
        "1. 入参格式不符合规范，query 不能为空。",
        "2. 请用一句自然语言明确描述需要寻找的代码逻辑或模块概念。",
      ];

    case "relay-error":
    default:
      return [
        "1. 底层中继调用出现异常。",
        "2. 【建议立即降级】：直接使用确定性更高的 `grep_search` 或 `file_search` 继续执行任务。",
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
  const sections: string[] = [`【语义检索提示】：${failure.message}`];
  if (failure.details) {
    sections.push(`详细信息：${failure.details}`);
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
