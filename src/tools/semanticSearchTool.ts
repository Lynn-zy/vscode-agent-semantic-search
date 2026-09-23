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

    // 关键路径优化：当检索命中且底层返回了原生多态部件（如 LanguageModelPromptTsxPart）时，
    // 优先原样透传底层原生部件，保持与官方 semantic_search 完全一致的 AST 渲染链路。
    // 这既能完整继承底层内置的 <TokenLimit> 预算管控，又彻底避免了因展平成超长纯文本（>8KB）
    // 而触发 Copilot Chat 运行时的磁盘转储保护（写入 content.txt 临时文件并要求 Agent 用 read_file 读取）。
    if (
      outcome.status === "ok" &&
      outcome.rawContent &&
      outcome.rawContent.length > 0
    ) {
      return new vscode.LanguageModelToolResult(
        outcome.rawContent as (
          vscode.LanguageModelTextPart | vscode.LanguageModelPromptTsxPart
        )[],
      );
    }

    // 当检索无匹配（empty）或发生异常（failed）时，经由呈现深模块格式化为短文本 Markdown 降级提示
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
