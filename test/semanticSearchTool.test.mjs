import test from "node:test";
import assert from "node:assert/strict";
import vscode from "vscode";
import { SemanticSearchTool } from "../out/tools/semanticSearchTool.js";

test("SemanticSearchTool 1: 默认开启 appendCodeUsagesHint 时，检索成功直接透传原生部件并追加符号引用指引", async () => {
  const mockPromptTsxNode = {
    type: 1,
    ctor: 2,
    children: [{ type: 2, text: "export const answer = 42;" }],
  };
  const mockPromptTsxPart = new vscode.LanguageModelPromptTsxPart(
    mockPromptTsxNode,
  );

  const mockRelay = {
    execute: async () => ({
      status: "ok",
      markdown: "export const answer = 42;",
      elapsedMs: 120,
      rawContent: [mockPromptTsxPart],
    }),
  };

  const tool = new SemanticSearchTool(mockRelay);
  const cts = new vscode.CancellationTokenSource();

  const result = await tool.invoke(
    { input: { query: "answer logic" } },
    cts.token,
  );

  assert.ok(result instanceof vscode.LanguageModelToolResult);
  assert.equal(
    result.content.length,
    2,
    "默认配置下包含原生切片部件与符号引用指引部件",
  );
  assert.ok(
    result.content[0] instanceof vscode.LanguageModelPromptTsxPart,
    "必须保留 LanguageModelPromptTsxPart，不得降级为 LanguageModelTextPart 导致 Copilot 8KB 临时文件落盘",
  );
  assert.equal(result.content[0].value, mockPromptTsxNode);
  assert.ok(
    result.content[1] instanceof vscode.LanguageModelTextPart,
    "末尾必须追加 LanguageModelTextPart 符号引用指引",
  );
  assert.ok(result.content[1].value.includes("vscode_listCodeUsages"));
});

test("SemanticSearchTool 2: 当显式关闭 appendCodeUsagesHint 时，仅保留原生切片部件，不追加提示", async () => {
  vscode.workspace._clearMockConfig();
  vscode.workspace._setMockConfig("appendCodeUsagesHint", false);

  const mockPromptTsxNode = {
    type: 1,
    ctor: 2,
    children: [{ type: 2, text: "export const answer = 42;" }],
  };
  const mockPromptTsxPart = new vscode.LanguageModelPromptTsxPart(
    mockPromptTsxNode,
  );

  const mockRelay = {
    execute: async () => ({
      status: "ok",
      markdown: "export const answer = 42;",
      elapsedMs: 120,
      rawContent: [mockPromptTsxPart],
    }),
  };

  const tool = new SemanticSearchTool(mockRelay);
  const cts = new vscode.CancellationTokenSource();

  try {
    const result = await tool.invoke(
      { input: { query: "answer logic" } },
      cts.token,
    );

    assert.ok(result instanceof vscode.LanguageModelToolResult);
    assert.equal(result.content.length, 1, "关闭配置时仅包含 1 个切片部件");
    assert.ok(result.content[0] instanceof vscode.LanguageModelPromptTsxPart);
    assert.equal(result.content[0].value, mockPromptTsxNode);
  } finally {
    vscode.workspace._clearMockConfig();
  }
});

test("SemanticSearchTool 3: 当检索无匹配或失败时，输出短文本 LanguageModelTextPart 降级提示", async () => {
  const mockRelay = {
    execute: async () => ({
      status: "empty",
      query: "non-existent",
    }),
  };

  const tool = new SemanticSearchTool(mockRelay);
  const cts = new vscode.CancellationTokenSource();

  const result = await tool.invoke(
    { input: { query: "non-existent" } },
    cts.token,
  );

  assert.ok(result instanceof vscode.LanguageModelToolResult);
  assert.equal(result.content.length, 1);
  assert.ok(
    result.content[0] instanceof vscode.LanguageModelTextPart,
    "空结果或失败时应返回 LanguageModelTextPart 呈现提示",
  );
  assert.ok(
    result.content[0].value.includes(
      "[Semantic Search: No matching code found]",
    ),
  );
});

test("SemanticSearchTool 4: 空结果时即使开启 appendCodeUsagesHint 也不得追加符号引用提示", async () => {
  vscode.workspace._clearMockConfig();
  vscode.workspace._setMockConfig("appendCodeUsagesHint", true);

  const mockRelay = {
    execute: async () => ({
      status: "empty",
      query: "missing",
    }),
  };

  const tool = new SemanticSearchTool(mockRelay);
  const cts = new vscode.CancellationTokenSource();

  try {
    const result = await tool.invoke(
      { input: { query: "missing" } },
      cts.token,
    );

    assert.ok(result instanceof vscode.LanguageModelToolResult);
    assert.equal(result.content.length, 1, "空结果不得包含第二个部件");
    assert.equal(
      result.content[0].value.includes("vscode_listCodeUsages"),
      false,
      "空结果不得包含符号引用指引",
    );
  } finally {
    vscode.workspace._clearMockConfig();
  }
});
