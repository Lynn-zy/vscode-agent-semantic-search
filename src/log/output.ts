/**
 * @file output.ts
 * @description 扩展输出通道日志封装，便于调试和观测
 */

import * as vscode from "vscode";

/**
 * 统一日志输出通道管理器
 */
export class LogService implements vscode.Disposable {
  /**
   * VS Code 输出通道实例
   */
  private readonly channel: vscode.OutputChannel;

  /**
   * 构造函数：创建命名输出通道
   * @param name 输出通道显示名称
   */
  constructor(name: string = "Agent Semantic Search") {
    this.channel = vscode.window.createOutputChannel(name);
  }

  /**
   * 格式化错误对象为详细字符串
   * @param error 捕获的异常或错误对象
   * @returns 格式化后的错误详情
   */
  private formatError(error?: unknown): string {
    if (!error) {
      return "";
    }
    if (error instanceof Error) {
      return error.stack ?? error.message;
    }
    return String(error);
  }

  /**
   * 记录信息日志
   * @param message 日志文本
   */
  public info(message: string): void {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[INFO  ${timestamp}] ${message}`);
  }

  /**
   * 记录警告日志
   * @param message 警告文本
   * @param error 附加错误对象
   */
  public warn(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errorDetails = this.formatError(error);
    this.channel.appendLine(
      `[WARN  ${timestamp}] ${message}${errorDetails ? ` ${errorDetails}` : ""}`,
    );
  }

  /**
   * 记录错误日志
   * @param message 错误文本
   * @param error 错误对象
   */
  public error(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errorDetails = this.formatError(error);
    this.channel.appendLine(
      `[ERROR ${timestamp}] ${message}${errorDetails ? ` ${errorDetails}` : ""}`,
    );
  }

  /**
   * 显示输出面板
   */
  public show(): void {
    this.channel.show(true);
  }

  /**
   * 释放通道资源
   */
  public dispose(): void {
    this.channel.dispose();
  }
}
