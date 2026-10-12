/**
 * @file resetIndexCacheCommand.ts
 * @description 重置并清理远程代码库索引缓存命令处理器
 */

import * as vscode from "vscode";
import {
  COMMAND_RESET_INDEX_CACHE,
  DELETE_INDEX_CACHE_COMMAND_CANDIDATES,
} from "../constants";
import { CommandHost } from "../relay/ports";
import { LogService } from "../log/output";
import { IndexStatusBar } from "../statusbar/indexStatusBar";
import { l10n } from "../l10n/l10nService";

/**
 * 注册重置远程索引缓存命令
 * @param commandHost 命令宿主
 * @param logger 日志服务
 * @param statusBar 可选的状态栏控制器，用于观察索引构建状态以执行并发互斥拦截
 * @returns Disposable 命令释放对象
 */
export function registerResetIndexCacheCommand(
  commandHost: CommandHost,
  logger: LogService,
  statusBar?: IndexStatusBar,
): vscode.Disposable {
  // 单任务执行锁，防止连续多次点击造成并发重复重置
  let isResetting = false;

  return vscode.commands.registerCommand(
    COMMAND_RESET_INDEX_CACHE,
    async () => {
      logger.info("收到用户触发重置远程索引缓存命令。");

      // 1. 检查构建状态互斥：若当前正在构建代码库索引，则拦截重置操作
      if (statusBar?.state === "indexing") {
        logger.warn(
          "当前工作区代码库索引正在构建中，互斥拦截重置索引缓存操作。",
        );
        void vscode.window.showWarningMessage(
          l10n.t(
            "Cannot reset index cache while codebase index is currently building.",
          ),
        );
        return;
      }

      // 2. 检查重置任务防重入：若已有正在执行的重置任务，则忽略本次重复触发
      if (isResetting) {
        logger.warn("已有执行中的重置索引缓存任务，已忽略本次重复触发。");
        void vscode.window.showInformationMessage(
          l10n.t("Codebase index cache is currently resetting, please wait..."),
        );
        return;
      }

      isResetting = true;

      // 3. 静默清空状态栏 Tooltip，避免菜单关闭后焦点复位自动弹出悬停提示
      statusBar?.clearTooltip();

      try {
        // 4. 探测环境中匹配的底层 Copilot 删除远程索引命令候选
        const registeredCommands = await commandHost.listCommands();
        const matchedCommand = DELETE_INDEX_CACHE_COMMAND_CANDIDATES.find(
          (cmd) => registeredCommands.includes(cmd),
        );

        if (!matchedCommand) {
          const candidatesStr =
            DELETE_INDEX_CACHE_COMMAND_CANDIDATES.join(" | ");
          const warning = l10n.t(
            "Could not find Copilot index delete command ({0}). Please ensure GitHub Copilot is installed and active.",
            candidatesStr,
          );
          logger.warn(warning);
          void vscode.window.showWarningMessage(warning);
          return;
        }

        logger.info(`转发执行底层重置/删除索引缓存命令: ${matchedCommand}`);

        // 4. 静默执行底层命令（由底层 Copilot 呈现窗口进度反馈与完成消息）
        await commandHost.executeCommand(matchedCommand);

        logger.info("底层代码库索引缓存重置任务已完成。");
      } catch (error) {
        const errStr = error instanceof Error ? error.message : String(error);
        const msg = l10n.t("Error while resetting index cache: {0}", errStr);
        logger.error(msg, error);
        void vscode.window.showErrorMessage(msg);
      } finally {
        // 5. 退出执行锁（纯后台静默完成，不主动触发状态栏刷新与就绪气泡提示）
        isResetting = false;
      }
    },
  );
}
