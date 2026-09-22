/**
 * @file resultAdapter.ts
 * @description 工具返回数据适配器：负责将底层返回的多态部件（文本、PromptTsx等）规整抽取为 Markdown 文本
 */

import { MAX_RESULT_CHARACTERS_LIMIT } from "../constants";

/**
 * 递归展平 PromptTsx 树状节点为纯文本/Markdown
 * @param node 当前节点
 * @param depth 递归保护深度，避免潜在循环引用（PromptTsx 嵌套组件树深度通常达 12~20 层）
 * @returns 抽取得到的文本
 */
function flattenPromptTsxNode(node: unknown, depth: number = 0): string {
  if (depth > 48 || node == null) {
    return "";
  }

  // 纯文本直接返回
  if (typeof node === "string") {
    return node;
  }

  // 数组节点逐项展开
  if (Array.isArray(node)) {
    return node
      .map((item) => flattenPromptTsxNode(item, depth + 1))
      .filter((item) => Boolean(item && item.trim()))
      .join("\n");
  }

  // 对象结构检查
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;

    // 检查自身携带的直接文本属性（text 或 value）
    const directTexts: string[] = [];
    if (typeof obj.text === "string" && obj.text.trim()) {
      directTexts.push(obj.text.trim());
    }
    if (typeof obj.value === "string" && obj.value.trim()) {
      directTexts.push(obj.value.trim());
    }
    const ownText = directTexts.join("\n");

    // 检查常见子节点容器（node, children, content, parts）
    const childKeys = ["node", "children", "content", "parts"];
    const childrenParts: string[] = [];

    for (const key of childKeys) {
      if (key in obj && obj[key] != null) {
        const text = flattenPromptTsxNode(obj[key], depth + 1);
        if (text) {
          childrenParts.push(text);
        }
      }
    }

    // 若 value 自身是嵌套对象或数组，递归向下展开
    if (obj.value != null && typeof obj.value === "object") {
      const valueText = flattenPromptTsxNode(obj.value, depth + 1);
      if (valueText) {
        childrenParts.push(valueText);
      }
    }

    const combinedChildren = childrenParts.join("\n\n");
    if (ownText && combinedChildren) {
      return `${ownText}\n\n${combinedChildren}`;
    }
    return ownText || combinedChildren;
  }

  return "";
}

/**
 * 将底层返回的 content 部件数组全面抽取合并为最终 Markdown 字符串
 * @param contentParts 部件列表
 * @returns 规整后的纯文本 Markdown
 */
export function adaptContentToMarkdown(
  contentParts: readonly unknown[],
): string {
  if (!contentParts || !contentParts.length) {
    return "";
  }

  const collectedSnippets: string[] = [];

  for (const part of contentParts) {
    if (typeof part === "string") {
      collectedSnippets.push(part);
      continue;
    }

    if (typeof part === "object" && part !== null) {
      const partObj = part as Record<string, unknown>;

      // 场景一：直接包含 value 属性（LanguageModelPromptTsxPart 或包装对象）
      if ("value" in partObj) {
        const extracted = flattenPromptTsxNode(partObj.value);
        if (extracted) {
          collectedSnippets.push(extracted);
          continue;
        }
      }

      // 场景二：直接包含 text 属性（LanguageModelTextPart）
      if (typeof partObj.text === "string") {
        collectedSnippets.push(partObj.text);
        continue;
      }

      // 场景三：通用的深度解析
      const genericExtracted = flattenPromptTsxNode(partObj);
      if (genericExtracted) {
        collectedSnippets.push(genericExtracted);
      }
    }
  }

  const fullText = collectedSnippets
    .map((snippet) => snippet.trim())
    .filter((snippet) => snippet.length > 0)
    .join("\n\n");

  // 防止超长代码片段填满模型上下文窗口，实施安全阈值截断保护
  if (fullText.length > MAX_RESULT_CHARACTERS_LIMIT) {
    const truncated = fullText.slice(0, MAX_RESULT_CHARACTERS_LIMIT);
    return `${truncated}\n\n⚠️ 【内容超出上限已截断】：原始代码检索结果共 ${fullText.length} 字符，已截取前 ${MAX_RESULT_CHARACTERS_LIMIT} 字符以节省上下文窗口。建议在提问时限定 scopedDirectories 目录范围或提供更具体的查询描述。`;
  }

  return fullText;
}
