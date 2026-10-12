import test from "node:test";
import assert from "node:assert/strict";
import vscode from "vscode";
import { IndexStatusBar } from "../out/statusbar/indexStatusBar.js";
import { registerResetIndexCacheCommand } from "../out/commands/resetIndexCacheCommand.js";
import { LogService } from "../out/log/output.js";
import {
  COMMAND_RESET_INDEX_CACHE,
  DELETE_INDEX_CACHE_COMMAND_CANDIDATES,
} from "../out/constants.js";

test("ResetIndexCache 1: 成功匹配底层命令并转发执行，执行前后状态栏保持 idle", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  let executedCmd = null;
  const commandHost = {
    async listCommands() {
      return [...DELETE_INDEX_CACHE_COMMAND_CANDIDATES];
    },
    async executeCommand(cmd) {
      executedCmd = cmd;
    },
  };

  const commandDisposable = registerResetIndexCacheCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    await vscode.commands.executeCommand(COMMAND_RESET_INDEX_CACHE);

    assert.equal(
      executedCmd,
      "github.copilot.deleteExternalIngestWorkspaceIndex",
      "必须成功转发到底层 Copilot 的删除索引命令",
    );
    assert.equal(
      statusBar.state,
      "idle",
      "重置索引缓存操作完成后，状态栏应保持在 idle 状态",
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("ResetIndexCache 2: 底层命令缺失时安全提示告警，且不调用 executeCommand", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  let executeCalled = false;
  const commandHost = {
    async listCommands() {
      return ["some.other.command"];
    },
    async executeCommand() {
      executeCalled = true;
    },
  };

  const commandDisposable = registerResetIndexCacheCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    await vscode.commands.executeCommand(COMMAND_RESET_INDEX_CACHE);

    assert.equal(
      executeCalled,
      false,
      "底层候选命令不存在时不得调用 executeCommand",
    );
    assert.equal(statusBar.state, "idle", "命令缺失时状态栏保持 idle 状态");
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("ResetIndexCache 3: 执行中的任务受防重入保护，阻止并发重复调用", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  let resolveReset;
  const resetPromise = new Promise((resolve) => {
    resolveReset = resolve;
  });

  let callCount = 0;
  const commandHost = {
    async listCommands() {
      return [...DELETE_INDEX_CACHE_COMMAND_CANDIDATES];
    },
    async executeCommand() {
      callCount++;
      return resetPromise;
    },
  };

  const commandDisposable = registerResetIndexCacheCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    const firstCall = vscode.commands.executeCommand(COMMAND_RESET_INDEX_CACHE);
    // 重复触发第二次调用
    const secondCall = vscode.commands.executeCommand(
      COMMAND_RESET_INDEX_CACHE,
    );

    resolveReset();
    await Promise.all([firstCall, secondCall]);

    assert.equal(
      callCount,
      1,
      "连续重复调用应被防重入锁拦截，底层只应被调用 1 次",
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("ResetIndexCache 4: 当状态栏处于 indexing 构建中状态时，互斥拦截重置缓存操作", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  // 模拟构建中状态
  statusBar.updateState("indexing");

  const logger = new LogService("Test");

  let callCount = 0;
  const commandHost = {
    async listCommands() {
      return [...DELETE_INDEX_CACHE_COMMAND_CANDIDATES];
    },
    async executeCommand() {
      callCount++;
    },
  };

  const commandDisposable = registerResetIndexCacheCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    await vscode.commands.executeCommand(COMMAND_RESET_INDEX_CACHE);

    assert.equal(
      callCount,
      0,
      "在 indexing 状态下触发重置缓存应被直接拦截，不得调用底层命令",
    );
    assert.equal(statusBar.state, "indexing", "被拦截后原有构建状态保持不变");
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("ResetIndexCache 5: 底层抛出异常时安全捕获并保持状态栏状态，不导致崩溃", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  const commandHost = {
    async listCommands() {
      return [...DELETE_INDEX_CACHE_COMMAND_CANDIDATES];
    },
    async executeCommand() {
      throw new Error("远程服务连接中断");
    },
  };

  const commandDisposable = registerResetIndexCacheCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    // 验证不会将未捕获异常抛出导致扩展宿主崩溃
    await vscode.commands.executeCommand(COMMAND_RESET_INDEX_CACHE);

    assert.equal(
      statusBar.state,
      "idle",
      "底层异常发生后状态栏必须安全保持为 idle",
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});

test("ResetIndexCache 6: 完成重置索引缓存操作时应完全静默，严禁调用 statusBar.updateState 触发状态栏刷新与就绪气泡", async () => {
  vscode.commands._clear();

  const statusBar = new IndexStatusBar();
  const logger = new LogService("Test");

  let updateStateCalled = false;
  const originalUpdateState = statusBar.updateState.bind(statusBar);
  statusBar.updateState = (...args) => {
    updateStateCalled = true;
    return originalUpdateState(...args);
  };

  const commandHost = {
    async listCommands() {
      return [...DELETE_INDEX_CACHE_COMMAND_CANDIDATES];
    },
    async executeCommand() {},
  };

  const commandDisposable = registerResetIndexCacheCommand(
    commandHost,
    logger,
    statusBar,
  );

  try {
    await vscode.commands.executeCommand(COMMAND_RESET_INDEX_CACHE);

    assert.equal(
      updateStateCalled,
      false,
      "完成重置索引缓存操作后严禁调用 statusBar.updateState，避免触发就绪气泡提示",
    );
    assert.equal(
      statusBar.statusBarItem.tooltip,
      undefined,
      "重置操作开始后应清空 Tooltip，防止菜单关闭焦点复位时自动弹窗",
    );
  } finally {
    commandDisposable.dispose();
    statusBar.dispose();
  }
});
