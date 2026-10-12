import test from "node:test";
import assert from "node:assert/strict";
import vscode from "vscode";
import { LocalizationService, formatPattern } from "../out/l10n/l10nService.js";
import { IndexStatusBar } from "../out/statusbar/indexStatusBar.js";

test("L10nService 1: formatPattern 能正确替换单参数与多参数占位符", () => {
  assert.equal(formatPattern("Hello {0}!", ["World"]), "Hello World!");
  assert.equal(
    formatPattern("Error {0}: {1}", [404, "Not Found"]),
    "Error 404: Not Found",
  );
  assert.equal(formatPattern("No args pattern", []), "No args pattern");
  assert.equal(
    formatPattern("Index out of bound {2}", ["a", "b"]),
    "Index out of bound {2}",
  );
});

test("L10nService 2: zh-cn 模式下正确返回简体中文翻译并格式化参数", () => {
  const result = LocalizationService.translateWithLanguage(
    "zh-cn",
    "Searching workspace: `{0}`",
    "auth",
  );
  assert.equal(result, "正在语义检索工作区：`auth`");

  const buildTitle = LocalizationService.translateWithLanguage(
    "zh-cn",
    "Build Codebase Index",
  );
  assert.equal(buildTitle, "构建工作区代码库索引");
});

test("L10nService 3: en 模式下强制返回英文原文并正确填充参数", () => {
  const result = LocalizationService.translateWithLanguage(
    "en",
    "Searching workspace: `{0}`",
    "auth",
  );
  assert.equal(result, "Searching workspace: `auth`");

  const buildTitle = LocalizationService.translateWithLanguage(
    "en",
    "Build Codebase Index",
  );
  assert.equal(buildTitle, "Build Codebase Index");
});

test("L10nService 4: 未知翻译键在 zh-cn 模式下安全回退到 message 原文", () => {
  const customMsg = LocalizationService.translateWithLanguage(
    "zh-cn",
    "Custom unknown message: {0}",
    "test",
  );
  assert.equal(customMsg, "Custom unknown message: test");
});

test("L10nService 5: 状态栏根据设置项动态切换中英文文案与 Tooltip", () => {
  vscode.commands._clear();
  vscode.workspace._clearMockConfig();

  // 1. 模拟 zh-cn 配置
  vscode.workspace._setMockConfig("displayLanguage", "zh-cn");
  vscode.workspace._setMockConfig("statusBar.enabled", true);

  const statusBar = new IndexStatusBar();

  try {
    assert.equal(
      statusBar.statusBarItem.text.includes("语义搜索"),
      true,
      `zh-cn 模式下状态栏 text 必须为中文，当前: ${statusBar.statusBarItem.text}`,
    );

    // 2. 模拟切换至 en 配置
    vscode.workspace._setMockConfig("displayLanguage", "en");

    statusBar.updateState();

    assert.equal(
      statusBar.statusBarItem.text.includes("Semantic Search"),
      true,
      `en 模式下状态栏 text 必须为英文，当前: ${statusBar.statusBarItem.text}`,
    );
    assert.equal(
      statusBar.statusBarItem.tooltip.includes("Click to open management menu"),
      true,
      `en 模式下 tooltip 必须为英文，当前: ${statusBar.statusBarItem.tooltip}`,
    );
  } finally {
    vscode.workspace._clearMockConfig();
    statusBar.dispose();
  }
});
