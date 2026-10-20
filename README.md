# DSH Archived Conversations

一个 DeepSeek Harness（DSH）Web UI 插件：集中查看所有已归档对话，并可直接恢复、打开或删除。

## 功能

- 侧边栏新增「归档对话」入口，打开独立主面板
- 按工作区分组列出所有已归档对话
- 显示标题、归档时间、日志大小、会话 ID 前缀
- 按标题、工作区或会话 ID 搜索
- 「恢复」：把对话放回侧边栏原来的位置
- 「打开」：先恢复，再进入该对话
- 「删除」：确认后把会话日志目录移到 DSH 回收站，并从归档列表移除
- 显示归档会话的日志总大小
- 会话已失效时仍会列出，可恢复或清理
- **工作区侧边栏不再显示归档对话**；归档对话只在本插件面板中查看
- 中英文双语，跟随 DSH 当前语言

## 工作区隐藏

DSH 自带的工作区浏览器把归档可见性保存在它自己的视图 store 中，默认是「隐藏归档」，但视图菜单允许切换到「显示归档 / 仅看归档」。本插件会在加载时把该 store 的归档筛选强制保持为「隐藏」：

- 侧边栏列表、侧边栏搜索、归档提示里的「显示归档」都不会再显示归档对话
- 已归档对话只能从本插件的「归档对话」面板查看、恢复或打开
- 工作区视图菜单里的归档筛选项仍会显示；选择「显示归档 / 仅看归档」会直接打开本插件的归档面板，而不是在工作区显示归档对话
- 归档提示里的「显示归档」同样会打开本插件面板

这是对 DSH 当前视图 store 的兼容处理；如果 DSH 后续改变该 store 的结构，隐藏逻辑可能需要同步调整。

## 大小与删除

- **大小**：读取 `ctx.sessionPersistence` 中每个会话当前日志世代的 `sizeBytes`，显示压缩后的日志大小；不含附件和历史世代。
- **删除**：DSH 目前没有官方的会话删除 API。插件会把整个会话目录从 `<DSH_HOME>/sessions` 移到 `<DSH_HOME>/session-trash`，然后从归档集合中移除该 id，并刷新会话列表。
  - 删除只允许作用于「已归档且当前不活跃」的会话
  - 有子会话（subagent 后代）的会话会被拒绝，需先删除子会话，避免留下悬空的父引用
  - 移到回收站是可恢复的；清空回收站前不会释放磁盘空间
  - 恢复方式：把 `session-trash` 中对应目录移回原来的项目目录，再重启 DSH
- 大小和删除通过 Host 半注册的两个认证路由提供：
  - `GET /api/archived-conversations`
  - `POST /api/archived-conversations/delete`

> 如果部署把 `session-persistence-jsonl` 的 `root` 配置到了 `$DSH_HOME/sessions` 之外，删除会返回「session log directory not found」；需要把该 root 加进插件的路径解析后再使用。

## 安装

在 DSH 中使用插件管理器安装本目录：

```text
plugin_manager install_bundle
target: <本目录的绝对路径>
```

安装后需要**重启 DSH**，让 Host 半的路由加载；刷新页面后插件会出现在左侧栏的全局面板入口中。只刷新页面不足以加载新的 Host 路由。

## 兼容性

- 面向 DSH Web UI（`dsh.client.platform: web`）
- 复用 DSH 已有的 Workspace / Session Controller Client 服务
- Host 半通过 `connection.fetch` 注册认证路由，读取 `sessionPersistence` 的日志大小并移动日志目录
- 依赖：`@deepseek-ai/dsh-client-ui-sidebar`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-workspace`、`@deepseek-ai/dsh-client-ui-session`

## 隐私与安全

- **只与本机 DSH 通信**：大小和删除通过同源的 Host 路由 `/api/archived-conversations` 完成，不访问外网，不上传、不外发任何对话内容。
- **删除只移动本机文件**：日志目录只在本机的 `$DSH_HOME` 内移动，不经过网络。
- **无第三方运行时依赖**：Host 只使用 Node 内置模块，Client 只使用 DSH 注入的 React；没有安装脚本，没有第三方运行时依赖。
- **无注入面**：对话标题等用户内容按纯文本渲染，不使用 `innerHTML`。
- **无密钥**：仓库内不含任何 API Key 或凭据；也请在 Issue / PR 中避免粘贴密钥。

## 文件

| 文件 | 用途 |
| --- | --- |
| `package.json` | 包清单、bundle patch、client 声明 |
| `cordis.patch.yml` | 向 profile 插入插件行 |
| `index.js` | Host 半：日志大小查询与移到回收站路由 |
| `client.js` | 浏览器半：主面板、侧边栏入口、样式与文案 |
| `locale/en.json` | 英文插件元数据 |
| `locale/zh.json` | 中文插件元数据 |
| `icon.svg` | 插件图标 |
| `LICENSE` | MIT 许可证 |

## 说明

「打开」会先执行恢复，再打开对话。DSH 中已归档的对话不能直接打开，因此这是最短的安全路径。

「删除」不是永久擦除：日志目录会进入 `$DSH_HOME/session-trash`，方便手动恢复。需要永久释放空间时，请在确认不再需要后手动清空该目录。

## 许可证

MIT，见 [LICENSE](LICENSE)。

