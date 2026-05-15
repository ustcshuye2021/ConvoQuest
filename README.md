# ConvoQuest - AI 谜题游戏厅

一个基于 AI 的互动推理游戏平台。和 AI 一起玩「猜历史人物」和「海龟汤」两种经典推理游戏。

## 游戏模式

### 🏛️ 猜历史人物

- **AI 出题**：AI 选定一个历史人物，通过线索提示引导你猜测。你可以提问（AI 只回答是/否）、请求线索、或直接盲猜。
- **AI 来猜**：你心中想好一位历史人物，AI 会不断提问来推理。你用「是/否/是也不是/正史无记载」回答，看 AI 能否猜中。

### 🍲 海龟汤

- **AI 出题**：AI 给出一段看似不合理的「汤面」，你通过提出是/否问题来推理出隐藏的真相（汤底）。
- **AI 来猜**：你编写汤面，AI 作为推理者通过提问来尝试还原汤底。

## 支持的 AI 模型

玩家需要使用自己的 API Key，支持以下模型：

| 提供商 | 模型 |
|--------|------|
| DeepSeek | V4 Flash、V4 Pro |
| OpenAI | GPT-4o、GPT-4o Mini |
| 阿里云 | 通义千问 Plus |
| 月之暗面 | Kimi |
| 自定义 | 任何 OpenAI 兼容 API |

## 本地运行

```bash
git clone https://github.com/ustcshuye2021/ConvoQuest.git
cd ConvoQuest
npm install
npm start
```

打开浏览器访问 http://localhost:3000

## 在线部署

本项目支持 Vercel 一键部署：

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 中导入该仓库
3. 点击 Deploy，完成后即可获得在线访问地址

每次 `git push` 后 Vercel 会自动重新部署。

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript，无框架依赖
- **后端**：Express.js（本地开发）/ Vercel Serverless Functions（在线部署）
- **AI 通信**：OpenAI 兼容 API，支持 SSE 流式响应

## 项目结构

```
ConvoQuest/
├── server.js              # Express 后端（本地开发用）
├── api/chat.js            # Vercel Serverless Function（在线部署用）
├── vercel.json            # Vercel 部署配置
├── public/
│   ├── index.html         # 多屏幕 UI
│   ├── css/style.css      # 样式
│   └── js/
│       ├── app.js         # 入口，事件绑定与路由
│       ├── game-state.js  # 全局状态管理
│       ├── prompts.js     # 猜历史人物 Prompt
│       ├── turtle-prompts.js # 海龟汤 Prompt
│       ├── ai-host-mode.js   # AI 出题模式
│       ├── ai-guess-mode.js  # AI 来猜模式
│       ├── turtle-soup.js    # 海龟汤模式
│       ├── api.js         # API 通信层
│       └── ui.js          # UI 工具函数
└── .claude/               # Claude Code 开发配置
```

## License

MIT
