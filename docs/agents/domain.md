# 领域文档（Domain Docs）

各工程技能在浏览本仓库代码时，应如何消费本仓库的领域文档。

## 探索前先读这些

- 仓库根目录的 **`CONTEXT.md`**；或
- 若存在仓库根目录的 **`CONTEXT-MAP.md`**：它指向每个上下文的 `CONTEXT.md`，按主题读取相关的那几个。
- **`docs/adr/`**：读取与你即将改动的区域相关的 ADR。多上下文仓库中还需查看 `src/<context>/docs/adr/` 中的上下文级决策。

若这些文件不存在，**静默继续**：不要指出其缺失，也不要主动建议创建。`/domain-modeling` 技能（可经 `/grill-with-docs`、`/improve-codebase-architecture` 触达）会在术语或决策真正被确定时按需创建它们。

## 文件结构

单上下文仓库（绝大多数仓库）：

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md`）：

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文级决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用术语表中的词汇

当你的产出提到某个领域概念（issue 标题、重构提案、假设、测试名）时，使用 `CONTEXT.md` 中定义的术语，不要漂移到术语表明确回避的同义词。

若你需要的概念尚未进入术语表，这是一个信号：要么你在发明项目并不使用的语言（重新考虑），要么这是一个真实缺口（记下来交给 `/domain-modeling`）。

## 标记 ADR 冲突

若你的产出与既有 ADR 相矛盾，请显式提出，而不是悄悄覆盖：

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
