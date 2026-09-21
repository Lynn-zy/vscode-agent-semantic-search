/**
 * @file vsCodeCommandHost.ts
 * @description 基于 vscode.commands API 的 CommandHost 端口实现
 */

import * as vscode from "vscode";
import { CommandHost } from "../relay/ports";

/**
 * VS Code 原生命令执行宿主适配器
 */
export class VsCodeCommandHost implements CommandHost {
  /**
   * 收集环境中全部已注册的命令标识列表
   */
  public async listCommands(): Promise<readonly string[]> {
    return vscode.commands.getCommands(true);
  }

  /**
   * 调度执行特定 VS Code 命令
   * @param command 命令 ID
   * @param args 参数列表
   */
  public async executeCommand<T = unknown>(
    command: string,
    ...args: unknown[]
  ): Promise<T> {
    return vscode.commands.executeCommand<T>(command, ...args);
  }
}
