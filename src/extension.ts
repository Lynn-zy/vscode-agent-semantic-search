/**
 * @file extension.ts
 * @description 插件生命周期入口（组合根），装配各个模块依赖并向 VS Code 注册
 */

import * as vscode from "vscode";
import { TOOL_NAME } from "./constants";
import { LogService } from "./log/output";
import { VsCodeToolHost } from "./adapters/vsCodeToolHost";
import { VsCodeCommandHost } from "./adapters/vsCodeCommandHost";
import { SemanticSearchRelay } from "./relay/semanticSearchRelay";
import { SemanticSearchTool } from "./tools/semanticSearchTool";
import { registerBuildIndexCommand } from "./commands/buildIndexCommand";
import { registerDiagnosticsCommand } from "./commands/diagnosticsCommand";
import { IndexStatusBar } from "./statusbar/indexStatusBar";

/**
 * 插件激活生命周期函数
 * @param context VS Code 扩展上下文
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. 初始化日志输出服务
  const logger = new LogService();
  context.subscriptions.push(logger);
  logger.info("Agent Semantic Search Bridge 插件开始激活。");

  // 2. 初始化核心适配器与中继执行器
  const toolHost = new VsCodeToolHost();
  const commandHost = new VsCodeCommandHost();
  const relay = new SemanticSearchRelay(toolHost, logger);

  // 3. 初始化状态栏管理器
  const statusBar = new IndexStatusBar();
  context.subscriptions.push(statusBar);
  context.subscriptions.push(statusBar.registerMenuCommand());

  // 4. 初始化并注册 LanguageModelTool
  const semanticTool = new SemanticSearchTool(relay, (outcomeState) => {
    statusBar.updateState(outcomeState);
  });

  const toolRegistration = vscode.lm.registerTool(TOOL_NAME, semanticTool);
  context.subscriptions.push(toolRegistration);
  logger.info(`已成功注册语言模型工具: ${TOOL_NAME}`);

  // 5. 注册命令处理程序
  context.subscriptions.push(
    registerBuildIndexCommand(commandHost, logger, statusBar),
  );
  context.subscriptions.push(registerDiagnosticsCommand(commandHost, logger));

  // 6. 监听配置项变更以动态刷新状态栏显示
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("semanticSearch.statusBar.enabled")) {
        statusBar.updateState();
      }
    }),
  );

  logger.info("Agent Semantic Search Bridge 插件激活完成。");
}

/**
 * 插件休眠/注销生命周期函数
 */
export function deactivate(): void {
  // 资源由 context.subscriptions 自动统一释放
}
