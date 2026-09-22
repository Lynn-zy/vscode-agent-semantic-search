/**
 * @file vsCodeToolHost.ts
 * @description 基于 vscode.lm API 的 ToolHost 端口实现
 */

import * as vscode from "vscode";
import { ToolDescriptor, ToolHost, ToolRawResult } from "../relay/ports";

/**
 * VS Code 原生语言模型工具宿主适配器
 */
export class VsCodeToolHost implements ToolHost {
  /**
   * 获取当前 VS Code 运行环境中所有已注册的工具列表
   */
  public listTools(): readonly ToolDescriptor[] {
    return vscode.lm.tools.map((tool) => ({
      name: tool.name,
      toolReferenceName: (tool as { toolReferenceName?: string })
        .toolReferenceName,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * 通过 vscode.lm.invokeTool 转发执行底层工具
   * @param name 工具名称
   * @param input 输入参数字典
   * @param token 取消通知 Token
   * @param toolInvocationToken 会话上下文关联 Token
   */
  public async invokeTool(
    name: string,
    input: Record<string, unknown>,
    token: vscode.CancellationToken,
    toolInvocationToken?: vscode.ChatParticipantToolToken,
  ): Promise<ToolRawResult> {
    const result = await vscode.lm.invokeTool(
      name,
      {
        input,
        toolInvocationToken,
      },
      token,
    );

    return {
      content: result.content,
    };
  }
}
