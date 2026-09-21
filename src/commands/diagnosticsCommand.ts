/**
 * @file diagnosticsCommand.ts
 * @description 收集语义索引诊断信息命令处理器
 */

import * as vscode from "vscode";
import {
  COMMAND_COLLECT_DIAGNOSTICS,
  DIAGNOSTICS_COMMAND_CANDIDATES,
  TOOL_NAME,
} from "../constants";
import { CommandHost } from "../relay/ports";
import { LogService } from "../log/output";
import { ConfigService } from "../config/configService";

/**
 * 注册收集索引诊断信息命令
 * @param commandHost 命令宿主
 * @param logger 日志服务
 * @returns Disposable 释放对象
 */
export function registerDiagnosticsCommand(
  commandHost: CommandHost,
  logger: LogService,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    COMMAND_COLLECT_DIAGNOSTICS,
    async () => {
      logger.info("收到用户收集索引诊断信息命令。");

      try {
        const registeredCommands = await commandHost.listCommands();
        const matchedCommand = DIAGNOSTICS_COMMAND_CANDIDATES.find((cmd) =>
          registeredCommands.includes(cmd),
        );

        if (matchedCommand) {
          logger.info(`转发执行底层诊断命令: ${matchedCommand}`);
          await commandHost.executeCommand(matchedCommand);
          return;
        }

        // 若底层内部诊断命令不存在，在输出面板输出本地环境诊断分析
        const config = ConfigService.getConfig();
        const allLmTools = vscode.lm.tools.map((t) => t.name);

        logger.info("=== 本地语义检索环境诊断报告 ===");
        logger.info(`1. 插件配置快照: ${JSON.stringify(config, null, 2)}`);
        logger.info(`2. 当前环境中全部已注册 LM 工具数: ${allLmTools.length}`);
        logger.info(
          `3. 是否包含底层中继工具 (${config.relayToolId}): ${allLmTools.includes(config.relayToolId)}`,
        );
        logger.info(
          `4. 是否包含 copilot_searchCodebase: ${allLmTools.includes("copilot_searchCodebase")}`,
        );
        logger.info(
          `5. 是否包含 ${TOOL_NAME}: ${allLmTools.includes(TOOL_NAME)}`,
        );
        logger.info("=================================");
        logger.show();

        void vscode.window.showInformationMessage(
          "已在输出面板「Agent Semantic Search」生成本地环境诊断报告。",
        );
      } catch (error) {
        const msg = `收集诊断信息失败: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(msg, error);
        void vscode.window.showErrorMessage(msg);
      }
    },
  );
}
