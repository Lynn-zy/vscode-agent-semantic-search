import test from "node:test";
import assert from "node:assert/strict";
import vscode from "vscode";
import { SemanticSearchTool } from "../out/tools/semanticSearchTool.js";

test("SemanticSearchTool 1: 当检索成功且底层返回 PromptTsx 原生部件时，必须直接透传原生部件", async () => {
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
  assert.equal(result.content.length, 1);
  assert.ok(
    result.content[0] instanceof vscode.LanguageModelPromptTsxPart,
    "必须保留 LanguageModelPromptTsxPart，不得降级为 LanguageModelTextPart 导致 Copilot 8KB 临时文件落盘",
  );
  assert.equal(result.content[0].value, mockPromptTsxNode);
});

test("SemanticSearchTool 2: 当检索无匹配或失败时，输出短文本 LanguageModelTextPart 降级提示", async () => {
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
