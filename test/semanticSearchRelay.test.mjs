import test from "node:test";
import assert from "node:assert/strict";
import vscode from "vscode";
import {
  SemanticSearchRelay,
  normalizeQuery,
  normalizeScopedDirectories,
} from "../out/relay/semanticSearchRelay.js";
import { LogService } from "../out/log/output.js";

/**
 * 构造测试用配置快照
 */
function createMockConfig(overrides = {}) {
  return {
    timeoutMs: 5000,
    statusBarEnabled: true,
    showDegradationHints: true,
    relayToolId: "copilot_searchCodebase",
    ...overrides,
  };
}

/**
 * 构造轻量 Mock ToolHost
 */
function createMockToolHost({
  tools = [
    {
      name: "copilot_searchCodebase",
      toolReferenceName: "copilot_searchCodebase",
      inputSchema: {
        properties: {
          query: { type: "string" },
          scopedDirectories: { type: "array" },
        },
      },
    },
  ],
  invokeHandler,
} = {}) {
  return {
    listTools: () => tools,
    invokeTool: (name, input, token, toolInvocationToken) => {
      if (invokeHandler) {
        return invokeHandler(name, input, token, toolInvocationToken);
      }
      return Promise.resolve({
        content: ["### Search Result\nfunction example() {}"],
      });
    },
  };
}

test("SemanticSearchRelay 1: normalizeQuery 正确剥离 #codebase 前缀并去除多余空白", () => {
  assert.equal(
    normalizeQuery("   #codebase   auth flow   "),
    "auth flow",
    "必须剥离 #codebase 前缀并修剪空白",
  );
  assert.equal(
    normalizeQuery("normal query"),
    "normal query",
    "常规查询保持原样",
  );
  assert.equal(normalizeQuery(""), "", "空输入返回空字符串");
  assert.equal(normalizeQuery("   #codebase   "), "", "仅前缀返回空字符串");
});

test("SemanticSearchRelay 2: normalizeScopedDirectories 正确解析相对路径、通配符并截断上限", () => {
  const customRoots = ["/workspace/project"];

  // 1. 相对路径按工作区根解析
  const res1 = normalizeScopedDirectories(["src/utils"], customRoots);
  assert.equal(res1.directories?.length, 1);
  assert.equal(res1.directories[0].includes("src"), true);

  // 2. 通配符模式保留原样并附带提示
  const res2 = normalizeScopedDirectories(["src/**/*.ts"], customRoots);
  assert.equal(res2.directories?.[0], "src/**/*.ts");
  assert.equal(res2.note?.includes("通配符模式"), true);

  // 3. 超出 20 个上限时截断并提示
  const manyDirs = Array.from({ length: 25 }, (_, i) => `dir_${i}`);
  const res3 = normalizeScopedDirectories(manyDirs, customRoots);
  assert.equal(res3.directories?.length, 20);
  assert.equal(res3.note?.includes("超出上限"), true);
});

test("SemanticSearchRelay 3: 输入 query 为空时直接返回 invalid-input 失败", async () => {
  const relay = new SemanticSearchRelay(createMockToolHost());
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "   #codebase   " },
    createMockConfig(),
    cts.token,
  );

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.kind, "invalid-input");
  assert.equal(outcome.failure.message.includes("不能为空"), true);
});

test("SemanticSearchRelay 4: 未匹配到可用底层工具时返回 tool-missing 失败", async () => {
  const toolHost = createMockToolHost({ tools: [] });
  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "find something" },
    createMockConfig({ relayToolId: "non_existent_tool" }),
    cts.token,
  );

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.kind, "tool-missing");
  assert.equal(outcome.failure.message.includes("未检测到"), true);
});

test("SemanticSearchRelay 5: 底层调用成功且有代码时返回 ok 与规整后的 Markdown", async () => {
  let invokedPayload;
  const toolHost = createMockToolHost({
    invokeHandler: async (name, payload) => {
      invokedPayload = payload;
      return {
        content: ["export const a = 1;"],
      };
    },
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "export a", scopedDirectories: ["src"] },
    createMockConfig(),
    cts.token,
    undefined,
    ["/mock/root"],
  );

  assert.equal(outcome.status, "ok");
  assert.equal(outcome.markdown, "export const a = 1;");
  assert.deepEqual(outcome.rawContent, ["export const a = 1;"]);
  assert.equal(typeof outcome.elapsedMs, "number");
  assert.equal(invokedPayload.query, "export a");
  assert.ok(Array.isArray(invokedPayload.scopedDirectories));
});

test("SemanticSearchRelay 6: 底层返回空内容时正确返回 empty 状态与 dirNote", async () => {
  const toolHost = createMockToolHost({
    invokeHandler: async () => ({ content: [] }),
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "non existent logic" },
    createMockConfig(),
    cts.token,
  );

  assert.equal(outcome.status, "empty");
  assert.equal(outcome.query, "non existent logic");
});

test("SemanticSearchRelay 7: 底层返回未就绪简短通知文本时映射为 not-ready（ADR-0002）", async () => {
  const toolHost = createMockToolHost({
    invokeHandler: async () => ({
      content: [
        "Semantic search is not currently available in this workspace.",
      ],
    }),
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "index status" },
    createMockConfig(),
    cts.token,
  );

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.kind, "not-ready");
  assert.equal(outcome.failure.message.includes("尚未就绪或当前不可用"), true);
});

test("SemanticSearchRelay 8: 底层调用抛出未就绪异常时映射为 not-ready", async () => {
  const toolHost = createMockToolHost({
    invokeHandler: async () => {
      throw new Error("Service is not currently available");
    },
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "search test" },
    createMockConfig(),
    cts.token,
  );

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.kind, "not-ready");
});

test("SemanticSearchRelay 9: 底层抛出未知异常时映射为 relay-error", async () => {
  const toolHost = createMockToolHost({
    invokeHandler: async () => {
      throw new Error("Remote server connection reset");
    },
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "error test" },
    createMockConfig(),
    cts.token,
  );

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.kind, "relay-error");
  assert.equal(
    outcome.failure.message.includes("Remote server connection reset"),
    true,
  );
});

test("SemanticSearchRelay 10: 中继超时时安全中止并返回 timeout 失败", async () => {
  const toolHost = createMockToolHost({
    invokeHandler: async (name, payload, token) => {
      // 模拟耗时操作，响应 token 的取消信号
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({ content: ["late response"] });
        }, 300);
        token.onCancellationRequested(() => {
          clearTimeout(timer);
          reject(new Error("aborted by timeout"));
        });
      });
    },
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "slow query" },
    createMockConfig({ timeoutMs: 50 }),
    cts.token,
  );

  assert.equal(outcome.status, "failed");
  assert.equal(outcome.failure.kind, "timeout");
  assert.equal(outcome.failure.message.includes("超时"), true);
});

test("SemanticSearchRelay 11: 外层主动取消时向上抛出 CancellationError", async () => {
  const toolHost = createMockToolHost({
    invokeHandler: async (name, payload, cancelToken) => {
      return new Promise((_, reject) => {
        cancelToken.onCancellationRequested(() => {
          reject(new Error("Canceled"));
        });
      });
    },
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  // 主动触发外层取消
  cts.cancel();

  await assert.rejects(
    async () => {
      await relay.execute(
        { query: "cancelled query" },
        createMockConfig({ timeoutMs: 1000 }),
        cts.token,
      );
    },
    (err) => {
      return err.name === "CancellationError";
    },
    "外层取消必须向上抛出 CancellationError",
  );
});

test("SemanticSearchRelay 12: 目标工具不支持 scopedDirectories 时自动降级并追加备注", async () => {
  let sentPayload;
  const toolHost = createMockToolHost({
    tools: [
      {
        name: "copilot_searchCodebase",
        inputSchema: {
          properties: {
            query: { type: "string" },
            // 没有 scopedDirectories
          },
        },
      },
    ],
    invokeHandler: async (name, payload) => {
      sentPayload = payload;
      return { content: [] };
    },
  });

  const relay = new SemanticSearchRelay(toolHost);
  const cts = new vscode.CancellationTokenSource();

  const outcome = await relay.execute(
    { query: "query without dir support", scopedDirectories: ["src"] },
    createMockConfig(),
    cts.token,
  );

  assert.equal(
    sentPayload.scopedDirectories,
    undefined,
    "不支持目录时不应发送 scopedDirectories 参数",
  );
  assert.equal(outcome.status, "empty");
  assert.equal(outcome.dirNote?.includes("暂未开放目录范围参数"), true);
});
