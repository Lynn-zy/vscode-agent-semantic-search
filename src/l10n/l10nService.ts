/**
 * @file l10nService.ts
 * @description 本地化翻译适配服务：支持手动设置语言与 VS Code 原生 l10n 动态切换
 */

import * as vscode from "vscode";
import { ConfigService } from "../config/configService";
import { DisplayLanguage } from "../types";

/**
 * 简体中文词条对照字典
 */
export const ZH_CN_MESSAGES: Readonly<Record<string, string>> = {
  "Semantic Search": "语义搜索",
  "Semantic Search: Indexing...": "语义搜索: 构建索引中",
  "Semantic Search: Click to open management menu.":
    "语义搜索：点击打开管理菜单。",
  "Agent semantic search is ready. Click to open management menu.":
    "Agent 语义检索就绪。点击打开管理菜单。",
  "Building codebase index, please wait...":
    "正在构建工作区代码库索引，请稍候...",
  "Semantic Search Management": "语义搜索管理菜单",
  "Select an action to perform": "选择要执行的操作",
  "Build Codebase Index": "构建工作区代码库索引",
  "Trigger Copilot to build codebase semantic index":
    "触发 Copilot 构建当前工作区的代码库索引",
  "Reset Remote Index Cache": "重置远程索引缓存",
  "Clear remote cached codebase index for rebuilding":
    "清理远程已缓存的代码库索引，以便在异常时重建",
  "Collect Index Diagnostics": "收集索引诊断信息",
  "View language model tools status and diagnostic report":
    "查看当前环境中的 LM 工具状态与诊断报告",
  "Open Semantic Search Settings": "打开语义搜索设置",
  "Configure timeout, degradation hints and relay target":
    "调整超时时限、降级提示与中继工具目标",
  "Codebase index is currently building, please wait...":
    "工作区代码库索引正在构建中，请稍候...",
  "Codebase index cache is currently resetting, please wait...":
    "远程索引缓存正在重置清理中，请稍候...",
  "Cannot reset index cache while codebase index is currently building.":
    "工作区代码库索引正在构建中，无法同时重置缓存。",
  "Could not find Copilot index build command ({0}). Please ensure GitHub Copilot is installed and active.":
    "未在当前环境中找到 Copilot 的索引构建命令（{0}）。请确认 GitHub Copilot 扩展已安装并处于启用状态。",
  "Could not find Copilot index delete command ({0}). Please ensure GitHub Copilot is installed and active.":
    "未在当前环境中找到 Copilot 的索引缓存删除命令（{0}）。请确认 GitHub Copilot 扩展已安装并处于启用状态。",
  "Error while triggering index build: {0}": "触发构建索引时发生异常: {0}",
  "Error while resetting index cache: {0}": "重置远程索引缓存时发生异常: {0}",
  "Error while collecting diagnostics: {0}": "收集诊断信息失败: {0}",
  "Local environment diagnostic report has been generated in output channel 'Agent Semantic Search'.":
    "已在输出面板「Agent Semantic Search」生成本地环境诊断报告。",
  "Searching workspace: `{0}`": "正在语义检索工作区：`{0}`",
};

/**
 * 格式化占位符消息，将 `{0}`, `{1}` 替换为对应参数
 * @param template 带有序号占位符的模板字符串
 * @param args 替换参数列表
 * @returns 格式化后的字符串
 */
export function formatPattern(
  template: string,
  args: (string | number | boolean)[],
): string {
  if (args.length === 0) {
    return template;
  }
  return template.replace(/\{(\d+)\}/g, (match, indexStr) => {
    const index = Number(indexStr);
    if (index >= 0 && index < args.length) {
      return String(args[index]);
    }
    return match;
  });
}

/**
 * 本地化翻译工具统一门面
 */
export class LocalizationService {
  /**
   * 按指定语言或当前配置将消息模板翻译为本地化文本
   * @param message 英文消息原文（唯一翻译键）
   * @param args 可选的格式化替换参数
   * @returns 翻译并格式化后的本地化文本
   */
  public static t(
    message: string,
    ...args: (string | number | boolean)[]
  ): string {
    const config = ConfigService.getConfig();
    return this.translateWithLanguage(config.displayLanguage, message, ...args);
  }

  /**
   * 指定语言解析翻译文本（支持纯单元测试）
   * @param language 显示语言设置
   * @param message 英文消息原文
   * @param args 替换参数
   * @returns 本地化文本
   */
  public static translateWithLanguage(
    language: DisplayLanguage,
    message: string,
    ...args: (string | number | boolean)[]
  ): string {
    switch (language) {
      case "zh-cn": {
        const translatedTemplate = ZH_CN_MESSAGES[message] || message;
        return formatPattern(translatedTemplate, args);
      }
      case "en": {
        // 英文模式直接使用 message 原文作为模板
        return formatPattern(message, args);
      }
      case "auto":
      default: {
        // 默认 auto 模式委托给 VS Code 原生 l10n 接口
        return vscode.l10n.t(message, ...(args as any));
      }
    }
  }
}

/**
 * 别名导出，保持与 vscode.l10n 兼容的调用方式
 */
export const l10n = {
  t: (message: string, ...args: (string | number | boolean)[]) =>
    LocalizationService.t(message, ...args),
};
