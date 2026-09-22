import test from "node:test";
import assert from "node:assert/strict";
import vscode from "vscode";
import { IndexStatusBar } from "../out/statusbar/indexStatusBar.js";
import { registerBuildIndexCommand } from "../out/commands/buildIndexCommand.js";
import { LogService } from "../out/log/output.js";
import { COMMAND_BUILD_INDEX } from "../out/constants.js";

test("Bug Regression 1: 当触发构建代码库索引且底层构建未完成时，状态栏应处于 indexing 状态，不得提示'已就绪'", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  let resolveBuild;
  const buildPromise = new Promise((resolve) => {
    resolveBuild = resolve;
  });

  const commandHost = {
    async listCommands() {
      return ["github.copilot.buildRemoteWorkspaceIndex"];
    },
    async executeCommand(cmd) {
      if (cmd === "github.copilot.buildRemoteWorkspaceIndex") {
        return buildPromise;
      }
      return undefined;
    },
  };

  const commandDisposable = registerBuildIndexCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    const executePromise = vscode.commands.executeCommand(COMMAND_BUILD_INDEX);

    const item = statusBar.statusBarItem;

    // 1. 在构建未完成时，绝不能是就绪文案
    assert.equal(
      item.tooltip.includes("ready") || item.tooltip.includes("已就绪"),
      false,
      `构建中途状态栏不得提示已就绪，当前 tooltip: ${item.tooltip}`,
    );

    // 2. 状态栏必须呈现构建中状态（包含转圈图标与构建字样）
    assert.equal(
      item.text.includes("$(sync~spin)"),
      true,
      `构建中途状态栏 text 必须包含构建中标识，当前 text: ${item.text}`,
    );
    assert.equal(
      item.tooltip.includes("Building codebase index") ||
        item.tooltip.includes("正在构建工作区代码库索引"),
      true,
      `构建中途 tooltip 必须明确指示正在构建，当前 tooltip: ${item.tooltip}`,
    );

    // 完成构建
    resolveBuild();
    await executePromise;

    // 3. 构建完成后，离开 indexing 状态
    assert.equal(
      item.text.includes("$(sync~spin)"),
      false,
      `构建完成后状态栏应结束转圈，当前 text: ${item.text}`,
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("Bug Regression 2: 当底层构建索引发生异常时，状态栏应安全复位退出 indexing 状态", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  const commandHost = {
    async listCommands() {
      return ["github.copilot.buildRemoteWorkspaceIndex"];
    },
    async executeCommand(cmd) {
      if (cmd === "github.copilot.buildRemoteWorkspaceIndex") {
        throw new Error("底层构建失败网络中断");
      }
      return undefined;
    },
  };

  const commandDisposable = registerBuildIndexCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    await vscode.commands.executeCommand(COMMAND_BUILD_INDEX);

    const item = statusBar.statusBarItem;
    assert.equal(
      item.text.includes("$(sync~spin)"),
      false,
      `构建抛出异常后状态栏应退出转圈构建中状态，当前 text: ${item.text}`,
    );
    assert.equal(
      item.text.includes("Semantic Search") || item.text.includes("语义搜索"),
      true,
      `构建抛出异常后状态栏应复位为 idle 就绪态，当前 text: ${item.text}`,
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("Bug Regression 3: 构建过程中重复触发应受到防重入保护", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  let resolveBuild;
  const buildPromise = new Promise((resolve) => {
    resolveBuild = resolve;
  });

  let executeCount = 0;
  const commandHost = {
    async listCommands() {
      return ["github.copilot.buildRemoteWorkspaceIndex"];
    },
    async executeCommand(cmd) {
      if (cmd === "github.copilot.buildRemoteWorkspaceIndex") {
        executeCount++;
        return buildPromise;
      }
      return undefined;
    },
  };

  const commandDisposable = registerBuildIndexCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    const firstCall = vscode.commands.executeCommand(COMMAND_BUILD_INDEX);
    // 重复触发第二次
    const secondCall = vscode.commands.executeCommand(COMMAND_BUILD_INDEX);

    resolveBuild();
    await Promise.all([firstCall, secondCall]);

    // 并发调用应被防重入守卫拦截，底层 executeCommand 仅被调用 1 次
    assert.equal(
      executeCount,
      1,
      `并发调用应被防重入守卫拦截，当前调用次数: ${executeCount}`,
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});
