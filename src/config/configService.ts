/**
 * @file configService.ts
 * @description 扩展配置管理服务，负责读取与监听配置变更
 */

import * as vscode from "vscode";
import { ExtensionConfig } from "../types";
import {
  DEFAULT_RELAY_TOOL_ID,
  DEFAULT_TIMEOUT_MILLISECONDS,
  MAX_TIMEOUT_MILLISECONDS,
  MIN_TIMEOUT_MILLISECONDS,
} from "../constants";

/**
 * 扩展全局配置管理类
 */
export class ConfigService {
  /**
   * 读取当前配置快照，使用只读对象避免运行时副作用
   * @returns 统一归一化后的配置对象
   */
  public static getConfig(): ExtensionConfig {
    const configuration = vscode.workspace.getConfiguration("semanticSearch");

    const timeoutMs = configuration.get<number>(
      "timeoutMs",
      DEFAULT_TIMEOUT_MILLISECONDS,
    );
    const statusBarEnabled = configuration.get<boolean>(
      "statusBar.enabled",
      true,
    );
    const showDegradationHints = configuration.get<boolean>(
      "showDegradationHints",
      true,
    );
    const relayToolId = configuration.get<string>(
      "relayToolId",
      DEFAULT_RELAY_TOOL_ID,
    );

    // 钳制超时区间 [MIN_TIMEOUT_MILLISECONDS, MAX_TIMEOUT_MILLISECONDS]
    const clampedTimeoutMs = Math.min(
      MAX_TIMEOUT_MILLISECONDS,
      Math.max(MIN_TIMEOUT_MILLISECONDS, timeoutMs),
    );

    return {
      timeoutMs: clampedTimeoutMs,
      statusBarEnabled,
      showDegradationHints,
      relayToolId: relayToolId.trim() || DEFAULT_RELAY_TOOL_ID,
    };
  }
}
