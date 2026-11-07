# dsh-task-readme

为 DeepSeek Harness（DSH Desktop / Web GUI）提供的**任务 Readme 插件**。

- 每完成一个任务（一个 Turn）后，自动把最新的 Markdown Readme 写到当前工作区；
- 在「对话 / 轨迹」旁边新增一个 **Readme** 会话视图标签（`conversation.view`，order 20）；
- History 是**折叠按钮列表**：收起时只显示「日期 + 一句话提炼」，点开才出现详细内容；
- 展开后底部的箭头可以**跳回那一轮对话**，也可「在 Readme 中定位」到对应条目；
- 内容按「说明书」组织：交接摘要（可整段粘贴到新会话）+ 产出清单（文件用途）+ 任务手账；
- 始终只保留**最新一版** Readme（后面对前面内容的修改会整体覆盖旧版本）。

## 安装

本机开发目录安装（目录直链，改文件后重新加载即可生效）：

```
plugin_manager install_bundle  D:\AI Agent\DeepseekHarness\dsh-task-readme
```

安装后 Host 行插入配置树，浏览器半通过 `package.json` 的 `dsh.client` 加载；**改动 `client.js` 后需要刷新页面**（浏览器 bundle 不随刷新热替换）。

### 装到另一台电脑

这个包**没有构建步骤、没有 npm 依赖**，整个目录复制过去就能用。三种方式：

**A. 从 GitHub 安装（推荐，便于升级）**

```
plugin_manager install_bundle  github:<你的用户名>/dsh-task-readme
```

等价写法：`plugin_manager install_bundle  https://github.com/<你的用户名>/dsh-task-readme.git`

pnpm 会克隆仓库并按 `files` 字段取包；升级时重装一次即可。

**B. 直接拷目录**

1. 把整个 `dsh-task-readme/` 目录拷到目标机器，例如 `D:\plugins\dsh-task-readme`；
2. 在目标机器的 DSH 里执行（路径换成实际位置）：

   ```
   plugin_manager install_bundle  D:\plugins\dsh-task-readme
   ```

3. 装完刷新一次页面，会话区顶部会出现第三个标签 **Readme**。

**C. 用 tarball**

1. 在源机器打包：

   ```
   pnpm pack --pack-destination .
   ```

2. 把 `.tgz` 拷到目标机器，用 file 规格安装：

   ```
   plugin_manager install_bundle  file:D:\plugins\dsh-task-readme-1.0.0.tgz
   ```

**目标机器需要满足**

- DSH 版本包含 `conversation.view`、`sessionProjections`、`systemPrompt` 三项能力（0.2.1 系列均满足）；
- 插件只读写**当前会话的工作区目录**（`<cwd>/README.dsh.md`），不需要额外权限；
- Windows / macOS / Linux 均可，代码里没有平台相关分支。


## 产物

| 位置 | 说明 |
| --- | --- |
| `<工作区>/README.dsh.md` | 最新 Readme，每次 `turn/end` 整体重写 |

结构：

```markdown
# 任务 Readme
## 这份文档怎么用
## 交接摘要（整段复制到新会话，即可让我快速接手）
## 产出清单（这些文件是做什么的）
## 任务手账
### 2026-11-07
#### 08:58:12 · 任务 1 · 制作 插件 · 完成
- **当时要做什么**：…
- **做成了什么**：…
- **改动的文件**：`…`
- **用到的工具**：read ×3、write ×2
```

- **交接摘要**：工作区、会话、进度、最近改动、最近做的事、未收尾任务 —— 复制到新会话，等于把上下文交接过去；
- **产出清单**：按扩展名给出确定性用途提示（文档 / 配置 / 脚本 / 代码 / 图像），回答「这个文件是干什么的、怎么用」；
- **任务手账**：每轮的问题、结果、改动文件、工具与失败次数；未完成的任务会附「接着做」提示。

## 界面

| 区域 | 行为 |
| --- | --- |
| 顶部 | 标题、文件名 + 更新时间、「复制交接摘要」、「复制全文」 |
| 左栏 History | 按 `YYYY-MM-DD` 分组；每条是折叠按钮：`MM-DD HH:mm · 状态 · 关键词 · N 改动`；支持展开全部 / 收起全部 |
| 展开详情 | 问题、结果、改动（或读到的）文件、工具计数；底部一行：`复制` / `在 Readme 中定位` / **↗ 在对话中查看** |
| 右栏 Readme | 当前 Readme 全文（轻量 Markdown：标题、引用、列表、表格、行内代码/加粗）；定位时对应 `####` 条目高亮 |
| 中线 | 可左右拖动调整两栏占比（双击区域用 ← → 微调，窄屏自动单栏） |

「标签」优先由**模型自己概括**：Host 通过 `ctx.systemPrompt.section()` 注入一小段
「收尾时输出一行 `[//]: # (动词+宾语)`」的指令，模型在一轮结束时按整轮理解写出
4–8 个汉字（如 `创建插件`、`修复登录页`），投影从 final assistant message 里解析并
从正文中剔除。模型没给标签时（例如旧会话、被中断的轮次）才回退到确定性的词法抽取
（动作词 + 宾语）。该标签同时写进 Readme 的 `####` 标题。

载体选用 **CommonMark 链接引用定义**而不是 HTML 注释：本 UI 会把 `<!-- … -->`
当作正文渲染出来，而链接引用定义在解析阶段就被消费，不产生任何输出。
旧的 `<!-- task: … -->` 形式仍会被解析（兼容历史轮次）。

关闭模型标签：`config.modelLabels: false`。

「在对话中查看」调用 owner prop `openView('chat', String(turn))`，按 Turn 编号切换视图。

> **已知限制**：本版 DSH 的 Chat 视图不消费 `viewRequest`（只有 Trajectory 的
> `TrajectoryView` 接收并消费），所以插件只能切到「对话」标签，无法让它滚动到某一轮。
> 精确落点目前只能自己用 Chat 右侧的 Turn 导轨点选。


数据全部来自 Host 投影 `useProjection('taskReadme')`，随任务实时刷新，不轮询、不在前端折叠事件。

## 配置

`cordis.patch.yml` 的 `config`：

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `readmeFile` | `README.dsh.md` | 相对工作区的输出文件名 |
| `maxTurns` | `80` | 投影保留的最近任务数 |
| `handoffTasks` | `4` | 交接摘要里重复的最近任务条数 |
| `writeFile` | `true` | 是否写盘（关掉只保留界面视图） |
| `modelLabels` | `true` | 是否注入「任务标签」提示段，让模型自报标签（关掉则只用词法回退） |

## 设计约束

- 数据源只有 Session 日志：投影 unit 是纯同步折叠，`apply` 对无关事件返回同一引用；
- 子代理（`header.origin === 'subagent'`）会话与父会话共享目录，因此**不写盘**，避免覆盖父会话的 Readme；
- 同一工作区多个并发会话写同一个文件，语义是「最新完成任务者获胜」；
- 状态结构变化时提升 `stateVersion`（当前 4）。

## 验证

- `node .plugin-checks/verify-task-readme.mjs`：离线验证折叠、模型标签解析与剥离、wire view、说明书 Markdown、真实写盘、子会话过滤；
- `plugin_manager list_plugins` 应显示 `fiberPhase: active`；
- `Slots.listSubTree` 的 `conversation.view` 占用者应包含 `task-readme`；
- 模型侧：新会话的系统提示里应出现「## 任务标签」段。
