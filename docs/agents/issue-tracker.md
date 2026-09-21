# Issue tracker：GitHub

本仓库的 issue 与 spec 存放在 GitHub issues 中。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，并同时获取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需搭配 `--label` 与 `--state` 过滤。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库由 `git remote -v` 推断；在克隆目录内运行时 `gh` 会自动完成。

## PR 作为请求入口

**PRs as a request surface: no.**（若本仓库把外部 PR 视为功能请求，改为 `yes`；`/triage` 会读取该标记。）

当该标记为 `yes` 时，PR 与 issue 走同一套标签与状态机，使用对应的 `gh pr` 命令：

- **读取 PR**：`gh pr view <number> --comments`；diff 用 `gh pr diff <number>`。
- **列出待 triage 的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR`、`NONE` 的条目（剔除 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 与 PR 共用同一编号空间，裸写 `#42` 可能指二者之一：先用 `gh pr view 42` 解析，失败则回退 `gh issue view 42`。

## 当技能说「publish to the issue tracker」

创建一个 GitHub issue。

## 当技能说「fetch the relevant ticket」

运行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 是一个 issue，**child** 是作为 ticket 的子 issue。

- **Map**：单个带 `wayfinder:map` 标签的 issue，承载 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`。
- **Child ticket**：作为 GitHub sub-issue 链接到 map 的 issue（在 sub-issues 端点调用 `gh api`）。未启用 sub-issues 时，把 child 加入 map 正文的任务列表，并在 child 正文顶部写 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。被认领后，ticket 指派给负责推进的开发者。
- **Blocking**：使用 GitHub 的**原生 issue 依赖**，这是规范且 UI 可见的表达。用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加依赖边，其中 `<blocker-db-id>` 是阻塞项的数值**数据库 id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，**不是** `#number` 或 `node_id`）。GitHub 以 `issue_dependencies_summary.blocked_by` 报告（仅未关闭的阻塞项，即实时闸门）。依赖功能不可用时，回退为 child 正文顶部的 `Blocked by: #<n>, #<n>` 行。所有阻塞项关闭后，该 ticket 即解除阻塞。
- **Frontier 查询**：列出 map 的未关闭 child（`gh issue list --state open`，范围限定为该 map 的 sub-issues / 任务列表），剔除存在未关闭阻塞项（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中仍有未关闭 issue）或已有 assignee 的条目；按 map 顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是本会话的第一次写入。
- **解决**：`gh issue comment <n> --body "<answer>"`，随后 `gh issue close <n>`，再把上下文指针（要点 + 链接）追加到 map 的 Decisions-so-far。
