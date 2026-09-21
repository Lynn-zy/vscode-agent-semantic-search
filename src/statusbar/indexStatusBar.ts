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
 * 状态栏状态枚举
 */
export type StatusBarState = "idle" | "ok" | "empty" | "failed";

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
      case "ok":
        this.statusBarItem.text = "$(check) 语义搜索: 正常";
        this.statusBarItem.tooltip =
          "最近一次语义检索调用正常。点击打开管理菜单。";
        break;
      case "empty":
        this.statusBarItem.text = "$(info) 语义搜索: 无匹配";
        this.statusBarItem.tooltip =
          "最近一次语义检索未匹配到相关代码片段。点击打开管理菜单。";
        break;
      case "failed":
        this.statusBarItem.text = "$(warning) 语义搜索: 异常";
        this.statusBarItem.tooltip =
          "最近一次检索出现错误或超时。点击打开管理菜单。";
        break;
      case "idle":
      default:
        this.statusBarItem.text = "$(search) 语义搜索";
        this.statusBarItem.tooltip =
          "Agent 语义检索桥接已就绪。点击打开管理菜单。";
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
          label: "$(database) 构建工作区代码库索引",
          description: "触发 Copilot 构建当前工作区的代码库索引",
        },
        {
          id: "diagnostics",
          label: "$(output) 收集索引诊断信息",
          description: "查看当前环境中的 LM 工具状态与诊断报告",
        },
        {
          id: "settings",
          label: "$(gear) 打开语义搜索设置",
          description: "调整超时时限、降级提示与中继工具目标",
        },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        title: "语义搜索管理菜单",
        placeHolder: "选择要执行的操作",
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
