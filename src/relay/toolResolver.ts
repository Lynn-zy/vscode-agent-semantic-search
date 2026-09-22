/**
 * @file toolResolver.ts
 * @description 目标底层检索工具发现与入参能力自适应探测
 */

import { ToolDescriptor, ToolHost } from "./ports";
import { TOOL_NAME } from "../constants";

/**
 * 目标工具解析器
 */
export class ToolResolver {
  /**
   * 依赖注入工具宿主
   */
  constructor(private readonly toolHost: ToolHost) {}

  /**
   * 按照优先级候选列表查找匹配的目标工具描述（排除当前扩展自身注册的工具以防止自死循环）
   * @param candidates 按优先级排序的候选名称列表
   * @returns 匹配成功的工具描述对象，若均未匹配则返回 undefined
   */
  public resolveTargetTool(
    candidates: readonly string[],
  ): ToolDescriptor | undefined {
    const registeredTools = this.toolHost.listTools();
    for (const candidate of candidates) {
      const match = registeredTools.find((tool) => {
        const refName = tool.toolReferenceName;
        // 自引用防护：严禁解析为当前扩展自身注册的工具（无论是按注册名还是按引用别名）
        if (tool.name === TOOL_NAME || refName === TOOL_NAME) {
          return false;
        }
        return tool.name === candidate || refName === candidate;
      });
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  /**
   * 探测目标工具的输入 Schema 是否支持 scopedDirectories 参数
   * @param targetTool 目标工具描述
   * @returns true 表示支持目录过滤，false 表示不支持
   */
  public supportsScopedDirectories(targetTool: ToolDescriptor): boolean {
    if (!targetTool.inputSchema || typeof targetTool.inputSchema !== "object") {
      return false;
    }
    const schemaObj = targetTool.inputSchema as {
      properties?: Record<string, unknown>;
    };
    if (!schemaObj.properties || typeof schemaObj.properties !== "object") {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(
      schemaObj.properties,
      "scopedDirectories",
    );
  }
}
