/**
 * @file buildIndexCommand.ts
 * @description 构建工作区语义索引命令处理器
 */

import * as vscode from "vscode";
import {
  BUILD_INDEX_COMMAND_CANDIDATES,
  COMMAND_BUILD_INDEX,
} from "../constants";
import { CommandHost } from "../relay/ports";
import { LogService } from "../log/output";

/**
 * 注册构建索引命令
 * @param commandHost 命令宿主
 * @param logger 日志服务
 * @returns Disposable 命令释放对象
 */
export function registerBuildIndexCommand(
  commandHost: CommandHost,
  logger: LogService,
): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_BUILD_INDEX, async () => {
    logger.info("收到用户触发构建工作区代码库语义索引命令。");

    try {
      const registeredCommands = await commandHost.listCommands();
      const matchedCommand = BUILD_INDEX_COMMAND_CANDIDATES.find((cmd) =>
        registeredCommands.includes(cmd),
      );

      if (!matchedCommand) {
        const candidatesStr = BUILD_INDEX_COMMAND_CANDIDATES.join(" 或 ");
        const warning = `未在当前环境中找到 Copilot 的索引构建命令（${candidatesStr}）。请确认 GitHub Copilot 扩展已安装并处于启用状态。`;
        logger.warn(warning);
        void vscode.window.showWarningMessage(warning);
        return;
      }

      logger.info(`转发执行底层索引命令: ${matchedCommand}`);
      await commandHost.executeCommand(matchedCommand);
    } catch (error) {
      const msg = `触发构建索引时发生异常: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(msg, error);
      void vscode.window.showErrorMessage(msg);
    }
  });
}
