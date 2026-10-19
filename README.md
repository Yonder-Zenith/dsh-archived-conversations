# DSH Archived Conversations

一个 DeepSeek Harness（DSH）Web UI 插件：集中查看所有已归档对话，并可直接恢复或打开。

## 功能

- 侧边栏新增「归档对话」入口，打开独立主面板
- 按工作区分组列出所有已归档对话
- 显示标题、归档时间、会话 ID 前缀
- 按标题、工作区或会话 ID 搜索
- 「恢复」：把对话放回侧边栏原来的位置
- 「打开」：先恢复，再进入该对话
- 会话已失效时仍会列出，可恢复清理
- 中英文双语，跟随 DSH 当前语言

## 安装

在 DSH 中使用插件管理器安装本目录：

```text
plugin_manager install_bundle
target: <本目录的绝对路径>
```

安装后重启或刷新 DSH Web 页面。插件会出现在左侧栏的全局面板入口中。

## 兼容性

- 面向 DSH Web UI（`dsh.client.platform: web`）
- 复用 DSH 已有的 Workspace / Session Controller Client 服务，不需要额外的 Host 服务
- 依赖：`@deepseek-ai/dsh-client-ui-sidebar`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-workspace`、`@deepseek-ai/dsh-client-ui-session`

## 文件

| 文件 | 用途 |
| --- | --- |
| `package.json` | 包清单、bundle patch、client 声明 |
| `cordis.patch.yml` | 向 profile 插入插件行 |
| `index.js` | Host 半（纯 UI 插件，无 Host 行为） |
| `client.js` | 浏览器半：主面板、侧边栏入口、样式与文案 |
| `locale/en.json` | 英文插件元数据 |
| `locale/zh.json` | 中文插件元数据 |
| `icon.svg` | 插件图标 |

## 说明

「打开」会先执行恢复，再打开对话。DSH 中已归档的对话不能直接打开，因此这是最短的安全路径。
