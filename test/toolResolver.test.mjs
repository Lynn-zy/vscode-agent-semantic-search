import test from "node:test";
import assert from "node:assert/strict";
import { ToolResolver } from "../out/relay/toolResolver.js";
import { TOOL_NAME } from "../out/constants.js";

test("ToolResolver 1: 能正确通过 toolReferenceName 解析底层候选并排除自引用", () => {
  const mockToolHost = {
    listTools() {
      return [
        {
          name: "self_tool_id",
          toolReferenceName: TOOL_NAME, // 与自身注册引用别名重名
        },
        {
          name: "actual_copilot_tool_id",
          toolReferenceName: "copilot_searchCodebase",
        },
      ];
    },
    async invokeTool() {
      return { content: [] };
    },
  };

  const resolver = new ToolResolver(mockToolHost);

  // 1. 通过别名成功解析
  const resolved = resolver.resolveTargetTool(["copilot_searchCodebase"]);
  assert.ok(resolved, "应成功按 toolReferenceName 匹配到目标工具");
  assert.equal(resolved.name, "actual_copilot_tool_id");
  assert.equal(resolved.toolReferenceName, "copilot_searchCodebase");

  // 2. 自引用守卫彻底排除自身
  const selfResolved = resolver.resolveTargetTool([TOOL_NAME]);
  assert.equal(selfResolved, undefined, "自引用工具必须被排除，不可返回自身");
});

test("ToolResolver 2: 正确探测 Schema 是否支持 scopedDirectories 参数", () => {
  const resolver = new ToolResolver({
    listTools: () => [],
    invokeTool: async () => ({ content: [] }),
  });

  assert.equal(
    resolver.supportsScopedDirectories({
      name: "toolA",
      inputSchema: {
        properties: {
          query: { type: "string" },
          scopedDirectories: { type: "array" },
        },
      },
    }),
    true,
    "含 scopedDirectories 属性时应返回 true",
  );

  assert.equal(
    resolver.supportsScopedDirectories({
      name: "toolB",
      inputSchema: {
        properties: {
          query: { type: "string" },
        },
      },
    }),
    false,
    "不含 scopedDirectories 属性时应返回 false",
  );
});
