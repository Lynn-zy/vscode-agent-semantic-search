/**
 * @file buildIndexCommand.ts
 * @description 构建代码库索引命令处理器
 */

import * as vscode from "vscode";
import {
  BUILD_INDEX_COMMAND_CANDIDATES,
  COMMAND_BUILD_INDEX,
} from "../constants";
import { CommandHost } from "../relay/ports";
import { LogService } from "../log/output";
import { IndexStatusBar } from "../statusbar/indexStatusBar";

/**
 * 注册构建索引命令
 * @param commandHost 命令宿主
 * @param logger 日志服务
 * @param statusBar 状态栏控制器
 * @returns Disposable 命令释放对象
 */
export function registerBuildIndexCommand(
  commandHost: CommandHost,
  logger: LogService,
  statusBar?: IndexStatusBar,
): vscode.Disposable {
  let isBuilding = false;

  return vscode.commands.registerCommand(COMMAND_BUILD_INDEX, async () => {
    logger.info("收到用户触发构建代码库索引命令。");

    if (isBuilding) {
      logger.warn("已有执行中的代码库索引构建任务，已忽略本次重复触发。");
      void vscode.window.showInformationMessage(
        vscode.l10n.t("Codebase index is currently building, please wait..."),
      );
      return;
    }

    isBuilding = true;
    statusBar?.updateState("indexing");

    try {
      const registeredCommands = await commandHost.listCommands();
      const matchedCommand = BUILD_INDEX_COMMAND_CANDIDATES.find((cmd) =>
        registeredCommands.includes(cmd),
      );

      if (!matchedCommand) {
        const candidatesStr = BUILD_INDEX_COMMAND_CANDIDATES.join(" | ");
        const warning = vscode.l10n.t(
          "Could not find Copilot index build command ({0}). Please ensure GitHub Copilot is installed and active.",
          candidatesStr,
        );
        logger.warn(warning);
        void vscode.window.showWarningMessage(warning);
        return;
      }

      logger.info(`转发执行底层索引命令: ${matchedCommand}`);

      await commandHost.executeCommand(matchedCommand);

      logger.info("底层代码库索引构建任务已完成。");
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      const msg = vscode.l10n.t(
        "Error while triggering index build: {0}",
        errStr,
      );
      logger.error(msg, error);
      void vscode.window.showErrorMessage(msg);
    } finally {
      // 无论构建成功、底层命令缺失还是发生异常，均在单一出口保证复位
      isBuilding = false;
      statusBar?.updateState("idle");
    }
  });
}
