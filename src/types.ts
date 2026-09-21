/**
 * @file types.ts
 * @description 语义检索领域类型、状态契约与失败分类定义
 */

/**
 * Agent 传入语义检索工具的入参对象结构
 */
export interface SemanticSearchInput {
  /**
   * 语义检索查询语句（自然语言或概念描述）
   */
  readonly query: string;

  /**
   * 可选的目录检索范围限定列表
   */
  readonly scopedDirectories?: readonly string[];
}

/**
 * 语义检索中继调用的失败分类枚举
 */
export type RelayFailureKind =
  | "tool-missing" // 未找到底层中继工具
  | "not-ready" // 工作区索引未构建或底层未就绪
  | "timeout" // 中继检索耗时超限
  | "invalid-input" // 入参不合规（如空查询）
  | "relay-error"; // 底层执行抛出异常

/**
 * 失败详情数据结构
 */
export interface RelayFailure {
  /**
   * 错误类别标识
   */
  readonly kind: RelayFailureKind;

  /**
   * 主要错误摘要描述
   */
  readonly message: string;

  /**
   * 附加的上下文详情（可选）
   */
  readonly details?: string;
}

/**
 * 语义检索单次调用的结构化结果联合类型
 */
export type SearchOutcome =
  | {
      readonly status: "ok";
      readonly markdown: string;
      readonly elapsedMs: number;
    }
  | {
      readonly status: "empty";
      readonly query: string;
      readonly notes: readonly string[];
    }
  | {
      readonly status: "failed";
      readonly failure: RelayFailure;
      readonly query: string;
    };

/**
 * 插件用户配置数据快照接口
 */
export interface ExtensionConfig {
  /**
   * 单次检索的超时阈值（毫秒）
   */
  readonly timeoutMs: number;

  /**
   * 是否启用右下角状态栏快捷入口
   */
  readonly statusBarEnabled: boolean;

  /**
   * 结果为空或检索失败时，是否向模型附带降级提示的建议段
   */
  readonly showDegradationHints: boolean;

  /**
   * 底层中继的工具注册 ID
   */
  readonly relayToolId: string;
}
