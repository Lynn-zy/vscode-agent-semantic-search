import test from "node:test";
import assert from "node:assert/strict";
import {
  presentOutcome,
  DEGRADATION_SUGGESTION_TITLE,
} from "../out/relay/outcomePresenter.js";

/**
 * 构造默认的测试配置快照
 */
function createMockConfig(overrides = {}) {
  return {
    timeoutMs: 30000,
    statusBarEnabled: true,
    showDegradationHints: true,
    relayToolId: "copilot_searchCodebase",
    ...overrides,
  };
}

test("OutcomePresenter 1: ok 状态原样无损透传 Markdown，不实施任何截断（符合 ADR-0003）", () => {
  const mockMarkdown = "### Code Snippets\n```typescript\nconst a = 1;\n```";
  const outcome = {
    status: "ok",
    markdown: mockMarkdown,
    elapsedMs: 120,
  };

  const result = presentOutcome(outcome, createMockConfig());

  assert.equal(
    result,
    mockMarkdown,
    "ok 状态必须 100% 原样透传，不得添加任何额外修饰或进行截断",
  );
});

test("OutcomePresenter 2: empty 状态在开启建议时输出未命中原因、查询词与降级建议", () => {
  const outcome = {
    status: "empty",
    query: "authentication flow",
    dirNote: "（限定目录数超出上限，已自动截取前 8 个）",
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: true }),
  );

  assert.equal(
    result.includes("[Semantic Search: No matching code found]"),
    true,
    "必须包含统一的无匹配标题",
  );
  assert.equal(
    result.includes("authentication flow"),
    true,
    "必须包含原始查询词",
  );
  assert.equal(
    result.includes("Note: （限定目录数超出上限，已自动截取前 8 个）"),
    true,
    "必须包含目录范围说明",
  );
  assert.equal(
    result.includes(DEGRADATION_SUGGESTION_TITLE),
    true,
    "开启建议段时必须包含建议标题",
  );
  assert.equal(
    result.includes("`grep_search`") && result.includes("`file_search`"),
    true,
    "建议段必须明确引导 Agent 降级到确定性工具",
  );
  assert.equal(
    result.includes("'Semantic Search: Build Codebase Index'"),
    true,
    "建议段必须包含统一的索引构建命令",
  );
});

test("OutcomePresenter 3: empty 状态在关闭建议时不输出建议段", () => {
  const outcome = {
    status: "empty",
    query: "payment webhook",
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: false }),
  );

  assert.equal(
    result.includes("[Semantic Search: No matching code found]"),
    true,
  );
  assert.equal(result.includes("payment webhook"), true);
  assert.equal(
    result.includes(DEGRADATION_SUGGESTION_TITLE),
    false,
    "关闭建议段时不应出现建议标题",
  );
  assert.equal(
    result.includes("grep_search"),
    false,
    "关闭建议段时不应出现建议内容",
  );
});

test("OutcomePresenter 4: failed 状态（not-ready）正确展示失败原因与索引构建引导", () => {
  const outcome = {
    status: "failed",
    query: "order intake",
    failure: {
      kind: "not-ready",
      message: "底层 Copilot 报告工作区语义检索尚未就绪或当前不可用。",
      details: "索引未构建",
    },
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: true }),
  );

  assert.equal(
    result.includes(
      "[Semantic Search Notice]: 底层 Copilot 报告工作区语义检索尚未就绪或当前不可用。",
    ),
    true,
    "必须包含失败通知段",
  );
  assert.equal(result.includes("Details: 索引未构建"), true, "必须包含详情段");
  assert.equal(
    result.includes(
      "1. Codebase index is not yet built, or the semantic search service is unavailable.",
    ),
    true,
  );
  assert.equal(
    result.includes("`grep_search`") && result.includes("`file_search`"),
    true,
  );
  assert.equal(
    result.includes(
      "3. The user can build the index via Command Palette: 'Semantic Search: Build Codebase Index'.",
    ),
    true,
  );
});

test("OutcomePresenter 5: failed 状态（tool-missing）正确提示安装或启用 Copilot Chat", () => {
  const outcome = {
    status: "failed",
    query: "parse token",
    failure: {
      kind: "tool-missing",
      message: "未检测到底层 Copilot 语义检索工具。",
      details: "请确认已安装 GitHub Copilot 并开启相关功能。",
    },
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: true }),
  );

  assert.equal(
    result.includes(
      "1. Underlying Copilot search tool was not detected. Ensure GitHub Copilot Chat extension is enabled.",
    ),
    true,
  );
  assert.equal(
    result.includes("`grep_search`, `file_search`, or `read_file`"),
    true,
  );
});

test("OutcomePresenter 6: failed 状态（timeout）提示超时查询并建议缩小目录", () => {
  const outcome = {
    status: "failed",
    query: "deep dependency graph",
    failure: {
      kind: "timeout",
      message: "语义检索超时（耗时超过 30000 毫秒）。",
    },
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: true }),
  );

  assert.equal(
    result.includes("1. Search for 'deep dependency graph' timed out."),
    true,
  );
  assert.equal(result.includes("narrowing scopedDirectories"), true);
});

test("OutcomePresenter 7: failed 状态（invalid-input）提示 query 不能为空", () => {
  const outcome = {
    status: "failed",
    query: "",
    failure: {
      kind: "invalid-input",
      message: "检索查询 query 不能为空，请输入自然语言描述。",
    },
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: true }),
  );

  assert.equal(
    result.includes("1. Invalid input: query cannot be empty."),
    true,
  );
});

test("OutcomePresenter 8: failed 状态（relay-error）提示底层异常并引导降级", () => {
  const outcome = {
    status: "failed",
    query: "system init",
    failure: {
      kind: "relay-error",
      message: "底层调用发生异常: Network error",
    },
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: true }),
  );

  assert.equal(
    result.includes(
      "1. Underlying search relay encountered an unexpected error.",
    ),
    true,
  );
  assert.equal(
    result.includes(
      "2. [Action required]: Immediately fall back to `grep_search` or `file_search`.",
    ),
    true,
  );
});

test("OutcomePresenter 9: failed 状态在关闭建议时不追加建议段", () => {
  const outcome = {
    status: "failed",
    query: "system init",
    failure: {
      kind: "relay-error",
      message: "网络异常",
    },
  };

  const result = presentOutcome(
    outcome,
    createMockConfig({ showDegradationHints: false }),
  );

  assert.equal(result.includes("[Semantic Search Notice]: 网络异常"), true);
  assert.equal(result.includes(DEGRADATION_SUGGESTION_TITLE), false);
});
