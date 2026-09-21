/**
 * @file semanticSearchTool.ts
 * @description 注册给 VS Code LanguageModelTools 的工具封装类
 */

import * as vscode from "vscode";
import { SemanticSearchInput } from "../types";
import { ConfigService } from "../config/configService";
import { SemanticSearchRelay } from "../relay/semanticSearchRelay";
import {
  DEGRADATION_SUGGESTION_TITLE,
  formatDegradationHint,
} from "../relay/relayFailure";

/**
 * 语义检索工具类：实现 VS Code LanguageModelTool 规范接口
 */
export class SemanticSearchTool implements vscode.LanguageModelTool<SemanticSearchInput> {
  /**
   * 构造函数：注入中继执行器
   * @param relay 中继核心实例
   */
  constructor(private readonly relay: SemanticSearchRelay) {}

  /**
   * 执行工具调用入口
   * @param options 工具调用参数（入参、Token 等）
   * @param token 取消通知 Token
   * @returns 构造完成的 LanguageModelToolResult 对象
   */
  public async invoke(
    options: vscode.LanguageModelToolInvocationOptions<SemanticSearchInput>,
    token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const config = ConfigService.getConfig();
    const outcome = await this.relay.execute(
      options.input,
      config,
      token,
      options.toolInvocationToken,
    );

    if (outcome.status === "ok") {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(outcome.markdown),
      ]);
    }

    if (outcome.status === "empty") {
      const emptyNote = [
        "【语义检索未返回匹配代码】",
        ...outcome.notes,
        "",
        config.showDegradationHints
          ? `${DEGRADATION_SUGGESTION_TITLE}\n1. 如果需要精确搜索，请立即改用 \`grep_search\` 或 \`file_search\`。\n2. 如需构建代码库索引，用户可通过命令面板执行「语义搜索：构建工作区代码库索引」。`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(emptyNote),
      ]);
    }

    // outcome.status === 'failed'
    const failureMessage = formatDegradationHint(
      outcome.failure,
      outcome.query,
      config.showDegradationHints,
    );
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(failureMessage),
    ]);
  }

  /**
   * 工具调用前置提示准备，返回给 UI 展示
   * @param options 参数对象
   * @returns 准备配置
   */
  public prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<SemanticSearchInput>,
  ): vscode.PreparedToolInvocation {
    const query = (options.input?.query ?? "").trim();
    return {
      invocationMessage: new vscode.MarkdownString(
        `正在语义检索工作区：\`${query || "..."}\``,
      ),
    };
  }
}
