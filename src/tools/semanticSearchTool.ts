/**
 * @file semanticSearchTool.ts
 * @description 注册给 VS Code LanguageModelTools 的工具封装类
 */

import * as vscode from "vscode";
import { SemanticSearchInput } from "../types";
import { ConfigService } from "../config/configService";
import { SemanticSearchRelay } from "../relay/semanticSearchRelay";
import { presentOutcome } from "../relay/outcomePresenter";

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

    // 经由呈现深模块统一规整为面向模型的 Markdown 纯文本
    const markdown = presentOutcome(outcome, config);

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(markdown),
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
        vscode.l10n.t("Searching workspace: `{0}`", query || "..."),
      ),
    };
  }
}
