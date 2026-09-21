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
 * 为 Agent 模型生成可执行的降级与补救建议，避免死循环
 * @param failure 失败详情
 * @param originalQuery 原始查询文本
 * @returns 格式化后的 Markdown 降级引导
 */
export function formatDegradationHint(
  failure: RelayFailure,
  originalQuery: string,
): string {
  const sections: string[] = [];

  // 第一部分：原因告知
  sections.push(`【语义检索提示】：${failure.message}`);
  if (failure.details) {
    sections.push(`详细信息：${failure.details}`);
  }

  // 第二部分：根据不同错误类型提供明确的下一步行动指引
  sections.push("\n💡 给 Agent 的后续排查建议：");

  switch (failure.kind) {
    case "not-ready":
      sections.push(
        "1. 当前工作区尚未完成代码语义索引（本地或远程向量未就绪）。",
      );
      sections.push(
        "2. 【建议立即降级】：改用 `grep_search` 进行关键词文本搜索，或用 `file_search` 查找文件名。",
      );
      sections.push(
        "3. 提示用户可通过命令面板执行「语义搜索：构建工作区代码库索引」建立索引。",
      );
      break;

    case "tool-missing":
      sections.push("1. 未检测到底层 Copilot 检索工具，可能未启用相关扩展。");
      sections.push(
        "2. 【建议立即降级】：优先使用 `grep_search`、`file_search` 或 `read_file` 完成当前任务。",
      );
      break;

    case "timeout":
      sections.push(`1. 检索「${originalQuery}」超时。`);
      sections.push(
        "2. 建议尝试提供更具体的业务实体词、缩小 scopedDirectories 目录范围，或直接转用 `grep_search`。",
      );
      break;

    case "invalid-input":
      sections.push("1. 入参格式不符合规范，query 不能为空。");
      sections.push(
        "2. 请用一句自然语言明确描述需要寻找的代码逻辑或模块概念。",
      );
      break;

    case "relay-error":
    default:
      sections.push("1. 底层中继调用出现异常。");
      sections.push(
        "2. 【建议立即降级】：直接使用确定性更高的 `grep_search` 或 `file_search` 继续执行任务。",
      );
      break;
  }

  return sections.join("\n");
}
