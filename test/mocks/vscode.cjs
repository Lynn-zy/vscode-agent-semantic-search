/**
 * 测试环境下的轻量 VS Code 运行时 mock
 */

class MockStatusBarItem {
  constructor(alignment, priority) {
    this.alignment = alignment;
    this.priority = priority;
    this.text = "";
    this.tooltip = "";
    this.command = undefined;
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  dispose() {
    this.visible = false;
  }
}

class MockDisposable {
  constructor(callOnDispose) {
    this.callOnDispose = callOnDispose;
  }
  dispose() {
    if (this.callOnDispose) {
      this.callOnDispose();
    }
  }
}

class MockMarkdownString {
  constructor(value) {
    this.value = value;
  }
}

const registeredCommands = new Map();

const commands = {
  registerCommand(id, handler) {
    registeredCommands.set(id, handler);
    return new MockDisposable(() => registeredCommands.delete(id));
  },
  executeCommand(id, ...args) {
    const handler = registeredCommands.get(id);
    if (handler) {
      return Promise.resolve(handler(...args));
    }
    return Promise.resolve(undefined);
  },
  _getRegisteredCommands: () => registeredCommands,
  _clear: () => registeredCommands.clear(),
};

const window = {
  createStatusBarItem(alignment, priority) {
    return new MockStatusBarItem(alignment, priority);
  },
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showQuickPick: async () => undefined,
  createOutputChannel: () => ({
    appendLine: () => {},
    show: () => {},
    dispose: () => {},
  }),
};

const workspace = {
  workspaceFolders: [],
  getConfiguration: () => ({
    get: (key, defaultValue) => defaultValue,
  }),
  onDidChangeConfiguration: () => new MockDisposable(),
};

const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

module.exports = {
  commands,
  window,
  workspace,
  StatusBarAlignment,
  Disposable: MockDisposable,
  MarkdownString: MockMarkdownString,
};
