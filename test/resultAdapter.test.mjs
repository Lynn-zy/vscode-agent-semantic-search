import test from "node:test";
import assert from "node:assert/strict";
import { adaptContentToMarkdown } from "../out/relay/resultAdapter.js";

test("Regression 1: 正确递归抽取 PromptTsx AST 树（含 node、children 与 text 属性）", () => {
  const mockPromptTsxPart = {
    value: {
      node: {
        type: 1,
        ctor: 2,
        children: [
          {
            type: 2,
            text: "export class SemanticSearchRelay { ... }",
            priority: 100,
          },
          {
            type: 2,
            text: "export class IndexStatusBar { ... }",
            priority: 90,
          },
        ],
      },
    },
  };

  const markdown = adaptContentToMarkdown([mockPromptTsxPart]);

  assert.equal(
    markdown.includes("export class SemanticSearchRelay"),
    true,
    "抽取的 Markdown 必须包含第一个代码块",
  );
  assert.equal(
    markdown.includes("export class IndexStatusBar"),
    true,
    "抽取的 Markdown 必须包含第二个代码块",
  );
});

test("Regression 2: 正确支持传统 LanguageModelTextPart 与纯字符串部件", () => {
  const textPart = { text: "const foo = 'bar';" };
  const rawString = "### Code Snippets";

  const markdown = adaptContentToMarkdown([rawString, textPart]);

  assert.equal(
    markdown.includes("### Code Snippets"),
    true,
    "必须保留纯字符串部件",
  );
  assert.equal(
    markdown.includes("const foo = 'bar';"),
    true,
    "必须保留 textPart.text 部件",
  );
});

test("Regression 3: 超出字符上限时实施防御性截断", () => {
  const hugeText = "A".repeat(70000);
  const part = { text: hugeText };

  const markdown = adaptContentToMarkdown([part]);

  assert.equal(markdown.includes("【内容超出上限已截断】"), true);
  assert.equal(markdown.length < 65000, true);
});

test("Regression 4: 空输入或空部件安全返回空字符串", () => {
  assert.equal(adaptContentToMarkdown([]), "");
  assert.equal(adaptContentToMarkdown([null, undefined, {}]), "");
});

test("Regression 5: 正确抽取多层嵌套组件树（深度 > 12 层，真实 Copilot AST 结构）", () => {
  // 真实 Copilot prompt-tsx 嵌套深度达到 13+ 层（i5t -> NEt -> DXe -> h$ -> DZ -> s$e -> ixe）
  const realWorldDeepAst = {
    $mid: 23,
    value: {
      node: {
        type: 1,
        ctor: 2,
        ctorName: "i5t",
        children: [
          {
            type: 1,
            ctor: 2,
            ctorName: "NEt",
            children: [
              {
                type: 1,
                ctor: 2,
                ctorName: "DXe",
                children: [
                  {
                    type: 1,
                    ctor: 2,
                    ctorName: "h$",
                    children: [
                      {
                        type: 1,
                        ctor: 2,
                        ctorName: "DZ",
                        children: [
                          {
                            type: 1,
                            ctor: 2,
                            ctorName: "s$e",
                            children: [
                              {
                                type: 2,
                                priority: 100,
                                text: "export class SemanticSearchRelay {\n  public async execute() {}\n}",
                                references: [],
                                lineBreakBefore: true,
                              },
                            ],
                            props: { priority: 100 },
                            references: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };

  const markdown = adaptContentToMarkdown([realWorldDeepAst]);
  assert.equal(
    markdown.includes("export class SemanticSearchRelay"),
    true,
    "必须能穿透 12 层以上的嵌套组件树成功抽取出深层代码",
  );
});
