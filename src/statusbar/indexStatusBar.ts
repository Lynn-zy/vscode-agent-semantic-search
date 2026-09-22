/**
 * @file indexStatusBar.ts
 * @description 状态栏快捷管理项：负责展示状态与快捷菜单交互
 */

import * as vscode from "vscode";
import {
  COMMAND_BUILD_INDEX,
  COMMAND_COLLECT_DIAGNOSTICS,
  COMMAND_SHOW_MENU,
  STATUS_BAR_ALIGNMENT_PRIORITY,
} from "../constants";
import { ConfigService } from "../config/configService";

/**
 * 状态栏状态枚举：仅保留就绪态与构建中态
 */
export type StatusBarState = "idle" | "indexing";

/**
 * 快速选择菜单项接口定义
 */
interface ManagementMenuItem extends vscode.QuickPickItem {
  readonly id: "buildIndex" | "diagnostics" | "settings";
}

/**
 * 状态栏控制器
 */
export class IndexStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private currentState: StatusBarState = "idle";

  /**
   * 构造函数：初始化状态栏项并绑定点击菜单命令
   */
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      STATUS_BAR_ALIGNMENT_PRIORITY,
    );
    this.statusBarItem.command = COMMAND_SHOW_MENU;
    this.updateState("idle");
  }

  /**
   * 更新状态栏显示外观与提示（支持保持历史状态动态刷新）
   * @param state 可选的目标状态；若缺省则使用当前已持有的状态进行重绘
   */
  public updateState(state?: StatusBarState): void {
    if (state !== undefined) {
      this.currentState = state;
    }

    const config = ConfigService.getConfig();
    if (!config.statusBarEnabled) {
      this.statusBarItem.hide();
      return;
    }

    switch (this.currentState) {
      case "indexing":
        this.statusBarItem.text = `$(sync~spin) ${vscode.l10n.t("Semantic Search: Indexing...")}`;
        this.statusBarItem.tooltip = vscode.l10n.t(
          "Building codebase index, please wait...",
        );
        break;
      case "idle":
      default:
        this.statusBarItem.text = `$(search) ${vscode.l10n.t("Semantic Search")}`;
        this.statusBarItem.tooltip = vscode.l10n.t(
          "Agent semantic search is ready. Click to open management menu.",
        );
        break;
    }

    this.statusBarItem.show();
  }

  /**
   * 注册菜单弹窗命令
   * @returns Disposable
   */
  public registerMenuCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(COMMAND_SHOW_MENU, async () => {
      const items: ManagementMenuItem[] = [
        {
          id: "buildIndex",
          label: `$(database) ${vscode.l10n.t("Build Codebase Index")}`,
          description: vscode.l10n.t(
            "Trigger Copilot to build codebase semantic index",
          ),
        },
        {
          id: "diagnostics",
          label: `$(output) ${vscode.l10n.t("Collect Index Diagnostics")}`,
          description: vscode.l10n.t(
            "View language model tools status and diagnostic report",
          ),
        },
        {
          id: "settings",
          label: `$(gear) ${vscode.l10n.t("Open Semantic Search Settings")}`,
          description: vscode.l10n.t(
            "Configure timeout, degradation hints and relay target",
          ),
        },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        title: vscode.l10n.t("Semantic Search Management"),
        placeHolder: vscode.l10n.t("Select an action to perform"),
      });

      if (!selected) {
        return;
      }

      switch (selected.id) {
        case "buildIndex":
          await vscode.commands.executeCommand(COMMAND_BUILD_INDEX);
          break;
        case "diagnostics":
          await vscode.commands.executeCommand(COMMAND_COLLECT_DIAGNOSTICS);
          break;
        case "settings":
          await vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "semanticSearch",
          );
          break;
      }
    });
  }

  /**
   * 释放状态栏资源
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
