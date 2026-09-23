# 条件性追加符号引用指引，辅助 Agent 协同追踪调用链

Agent 在通过语义检索（`semanticSearch`）定位到代码切片后，通常面临两类后续任务：一是聚焦局部修改（直接使用 `read_file` 查看周边并编辑），二是横向评估影响面（使用 `vscode_listCodeUsages` 追踪调用链与实现类）。若中继层完全不提供指引，部分模型可能忽视环境中的高精度符号分析工具；但若无条件强力引导，又会诱导模型在常规单点编辑任务中发起机械化的全库符号扫描，产生额外的调用轮次与 token 浪费。

我们决定采取双层结合且约束为“条件性操作”的方案：

1. **元数据常驻引导**：在工具模型描述（`modelDescription`）中声明协同能力，告知模型在获取切片后若需评估影响面可配合 `vscode_listCodeUsages` 使用；
2. **多部件安全追加**：提供配置项 `semanticSearch.appendCodeUsagesHint`（默认开启）。在检索成功（`ok`）时，将一条约 180 字节的英文指引以独立的 `LanguageModelTextPart` 挂载在原生代码切片部件（`LanguageModelPromptTsxPart`）之后。该机制既避免了超长纯文本落盘风险，又达成了精准提示；
3. **空结果与失败隔离**：当检索无匹配或失败时，严格不追加该指引，优先确保确定性降级建议（转用 `grep_search` / `file_search`）不被稀释。
