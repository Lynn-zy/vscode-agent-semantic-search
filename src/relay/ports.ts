/**
 * @file ports.ts
 * @description 依赖倒置与六边形架构端口定义，隔离 VS Code 原生 API 以便测试与解耦
 */

import * as vscode from "vscode";

/**
 * 外部工具元数据描述接口
 */
export interface ToolDescriptor {
  /**
   * 工具唯一标识
   */
  readonly name: string;

  /**
   * 工具在提示词中引用的别名（若有）
   */
  readonly toolReferenceName?: string;

  /**
   * 工具入参的 JSON Schema
   */
  readonly inputSchema?: unknown;
}

/**
 * 底层工具返回的原始数据抽象
 */
export interface ToolRawResult {
  /**
   * 工具返回的内容部件列表
   */
  readonly content: readonly unknown[];
}

/**
 * 语言模型工具宿主端口契约
 */
export interface ToolHost {
  /**
   * 获取当前环境中所有已注册可用的工具描述符列表
   */
  listTools(): readonly ToolDescriptor[];

  /**
   * 调用指定的底层工具
   * @param name 工具名称
   * @param input 输入参数对象
   * @param token 取消通知 Token
   * @param toolInvocationToken 会话上下文关联 Token
   */
  invokeTool(
    name: string,
    input: Record<string, unknown>,
    token: vscode.CancellationToken,
    toolInvocationToken?: vscode.ChatParticipantToolToken,
  ): Promise<ToolRawResult>;
}

/**
 * VS Code 命令调度宿主端口契约
 */
export interface CommandHost {
  /**
   * 获取当前环境中已注册的所有命令 ID 列表
   */
  listCommands(): Promise<readonly string[]>;

  /**
   * 调度执行特定命令
   * @param command 命令 ID
   * @param args 传递给命令的参数
   */
  executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T>;
}
