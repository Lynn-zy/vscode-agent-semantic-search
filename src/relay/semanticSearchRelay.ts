/**
 * @file semanticSearchRelay.ts
 * @description 核心语义检索中继调度器：负责参数规整、目标解析、带超时转发与多态结果适配
 */

/// <reference types="node" />
/// <reference types="vscode" />

import * as path from "path";
import * as vscode from "vscode";
import { ExtensionConfig, SearchOutcome, SemanticSearchInput } from "../types";
import {
  DEFAULT_RELAY_TOOL_CANDIDATES,
  MAX_SCOPED_DIRECTORIES_LIMIT,
} from "../constants";
import { ToolHost } from "./ports";
import { ToolResolver } from "./toolResolver";
import { adaptContentToMarkdown } from "./resultAdapter";
import { createRelayFailure } from "./relayFailure";
import { LogService } from "../log/output";

/**
 * 底层语义检索不可用时返回的提示句
 * 注：中继端口只暴露 content 部件，没有结构化状态字段，未就绪只能按返回文本判定
 */
const NOT_READY_NOTICE = "not currently available";

/**
 * 单句通知的体量上界（字符数）
 * 注：用于把「不可用通知」与「真实检索结果」区分开，真实检索结果必然远超此体量；
 * 否则在本仓库内检索该提示句自身时，会把一次正常命中误判为未就绪
 */
const NOT_READY_NOTICE_MAX_LENGTH = 200;

/**
 * 判定返回内容整体是否为「语义检索不可用」通知
 * @param content 规整后的返回文本
 * @returns true 表示该内容是不可用通知而非检索结果
 */
function isNotReadyNotice(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.includes(NOT_READY_NOTICE) &&
    trimmed.length <= NOT_READY_NOTICE_MAX_LENGTH
  );
}

/**
 * 语义检索中继编排服务
 */
export class SemanticSearchRelay {
  private readonly resolver: ToolResolver;

  /**
   * 构造函数：注入工具宿主与可选日志服务
   * @param toolHost 抽象工具宿主
   * @param logger 日志服务（可选）
   */
  constructor(
    private readonly toolHost: ToolHost,
    private readonly logger?: LogService,
  ) {
    this.resolver = new ToolResolver(toolHost);
  }

  /**
   * 规整检索文本：剥离可能混入的 #codebase 前缀和两端多余空白
   * @param rawQuery 原始查询字串
   * @returns 规整后的纯净查询语句
   */
  private normalizeQuery(rawQuery: string): string {
    return (rawQuery ?? "").replace(/^\s*#codebase\s+/, "").trim();
  }

  /**
   * 规整限定目录列表：相对工作区根路径转换为绝对路径，剔除重复并截断上限
   * @param rawDirs 原始目录参数数组
   * @returns 规整后的目录数组及可能存在的备注说明
   */
  private normalizeScopedDirectories(rawDirs?: readonly string[]): {
    directories?: string[];
    note?: string;
  } {
    if (!rawDirs || !rawDirs.length) {
      return {};
    }

    const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(
      (folder) => folder.uri.fsPath,
    );
    const resolvedSet = new Set<string>();
    let hasGlobPattern = false;

    for (const dir of rawDirs) {
      if (!dir || typeof dir !== "string") {
        continue;
      }
      const trimmed = dir.trim();
      if (!trimmed) {
        continue;
      }

      // 如果包含通配符，保留原样透传
      if (/[*?{}[\]]/.test(trimmed)) {
        hasGlobPattern = true;
        resolvedSet.add(trimmed);
        continue;
      }

      // 绝对路径保留，相对路径按首个工作区根目录解析
      const absolutePath = path.isAbsolute(trimmed)
        ? path.normalize(trimmed)
        : path.resolve(workspaceRoots[0] ?? "", trimmed);

      resolvedSet.add(absolutePath);
    }

    const directories = Array.from(resolvedSet).slice(
      0,
      MAX_SCOPED_DIRECTORIES_LIMIT,
    );
    const noteParts: string[] = [];
    if (hasGlobPattern) {
      noteParts.push("（部分目录包含通配符模式，已原样透传底层）");
    }
    if (resolvedSet.size > MAX_SCOPED_DIRECTORIES_LIMIT) {
      noteParts.push(
        `（限定目录数超出上限，已自动截取前 ${MAX_SCOPED_DIRECTORIES_LIMIT} 个）`,
      );
    }
    const note = noteParts.length > 0 ? noteParts.join(" ") : undefined;

    return { directories, note };
  }

  /**
   * 执行完整的语义检索中继流水线
   * @param input Agent 传入的参数
   * @param config 插件当前配置快照
   * @param token 外层取消 Token
   * @param toolInvocationToken 会话级上下文关联 Token
   * @returns 结构化输出结果
   */
  public async execute(
    input: SemanticSearchInput,
    config: ExtensionConfig,
    token: vscode.CancellationToken,
    toolInvocationToken?: vscode.ChatParticipantToolToken,
  ): Promise<SearchOutcome> {
    const startTime = Date.now();

    // 步骤一：输入校验与规整
    const query = this.normalizeQuery(input.query);
    if (!query) {
      return {
        status: "failed",
        query: "",
        failure: createRelayFailure(
          "invalid-input",
          "检索查询 query 不能为空，请输入自然语言描述。",
        ),
      };
    }

    // 步骤二：目标工具解析
    const candidateList = [
      config.relayToolId,
      ...DEFAULT_RELAY_TOOL_CANDIDATES,
    ];
    const targetTool = this.resolver.resolveTargetTool(candidateList);

    if (!targetTool) {
      this.logger?.warn(
        `未找到可用底层中继工具，候选列表: ${candidateList.join(", ")}`,
      );
      return {
        status: "failed",
        query,
        failure: createRelayFailure(
          "tool-missing",
          `未检测到底层 Copilot 语义检索工具（候选：${candidateList.join(", ")}）。`,
          "请确认已安装 GitHub Copilot 并开启相关功能。",
        ),
      };
    }

    // 步骤三：入参能力适配（目录范围探测）
    const relayPayload: Record<string, unknown> = { query };
    const { directories, note: dirNote } = this.normalizeScopedDirectories(
      input.scopedDirectories,
    );

    let unsupportedDirNote: string | undefined;
    if (directories && directories.length > 0) {
      if (this.resolver.supportsScopedDirectories(targetTool)) {
        relayPayload.scopedDirectories = directories;
      } else {
        unsupportedDirNote =
          "（底层检索工具暂未开放目录范围参数，已自动检索整个工作区）";
      }
    }
    const combinedDirNote =
      [dirNote, unsupportedDirNote].filter(Boolean).join(" ") || undefined;

    this.logger?.info(
      `开始执行语义检索中继: 目标工具=${targetTool.name}, 查询长度=${query.length}, 超时限制=${config.timeoutMs}ms`,
    );

    // 步骤四：带超时的中继调用
    const cancelTokenSource = new vscode.CancellationTokenSource();
    const cancellationListener = token.onCancellationRequested(() =>
      cancelTokenSource.cancel(),
    );

    let isTimedOut = false;
    const timeoutHandle = setTimeout(() => {
      isTimedOut = true;
      cancelTokenSource.cancel();
    }, config.timeoutMs);

    let rawResult: { content: readonly unknown[] };

    try {
      rawResult = await this.toolHost.invokeTool(
        targetTool.name,
        relayPayload,
        cancelTokenSource.token,
        toolInvocationToken,
      );
    } catch (error) {
      // 优先判定是否由于中继超时引发的取消
      if (isTimedOut) {
        this.logger?.warn(`语义检索中继超时（耗时超过 ${config.timeoutMs}ms）`);
        return {
          status: "failed",
          query,
          failure: createRelayFailure(
            "timeout",
            `语义检索超时（耗时超过 ${config.timeoutMs} 毫秒）。`,
            combinedDirNote,
          ),
        };
      }

      // 用户或外层主动发起的取消请求
      if (token.isCancellationRequested) {
        this.logger?.info("外层或用户主动取消了语义检索请求。");
        throw new vscode.CancellationError();
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger?.error(`中继底层调用异常: ${errorMessage}`, error);

      // 若底层明确提示未就绪/不可用，映射为 not-ready 失败类型
      if (errorMessage.includes(NOT_READY_NOTICE)) {
        return {
          status: "failed",
          query,
          failure: createRelayFailure(
            "not-ready",
            `底层 Copilot 语义检索服务尚未就绪或不可用: ${errorMessage}`,
            combinedDirNote,
          ),
        };
      }

      return {
        status: "failed",
        query,
        failure: createRelayFailure(
          "relay-error",
          `底层调用发生异常: ${errorMessage}`,
          combinedDirNote,
        ),
      };
    } finally {
      clearTimeout(timeoutHandle);
      cancellationListener.dispose();
      cancelTokenSource.dispose();
    }

    // 步骤五：多态结果规整抽取为 Markdown
    const markdownContent = adaptContentToMarkdown(rawResult.content);
    this.logger?.info(
      `多态结果抽取完成: 收到原始部件数=${rawResult.content?.length ?? 0}, 抽取 Markdown 长度=${markdownContent.length}`,
    );

    // 步骤六：空结果或未就绪判定
    if (isNotReadyNotice(markdownContent)) {
      this.logger?.warn("底层 Copilot 返回语义检索当前不可用信息。");
      return {
        status: "failed",
        query,
        failure: createRelayFailure(
          "not-ready",
          "底层 Copilot 报告工作区语义检索尚未就绪或当前不可用。",
          combinedDirNote,
        ),
      };
    }

    const elapsedMs = Date.now() - startTime;

    if (!markdownContent) {
      this.logger?.info(
        `语义检索完成（耗时 ${elapsedMs}ms），未匹配到相关代码。`,
      );
      return {
        status: "empty",
        query,
        notes: [
          "检索未返回任何有效代码片段。可能工作区尚未构建代码库索引，或未匹配到足够相似度的代码。",
          combinedDirNote ?? "",
        ].filter(Boolean),
      };
    }

    this.logger?.info(
      `语义检索成功完成: 耗时=${elapsedMs}ms, 结果字符数=${markdownContent.length}`,
    );
    return {
      status: "ok",
      markdown: markdownContent,
      elapsedMs,
    };
  }
}
