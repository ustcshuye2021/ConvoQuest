---
name: guess-historical-figure
description: '猜历史人物游戏——双向互动模式。AI出题或AI猜人物，覆盖全球历史人物，以正史为准。触发词：「猜历史人物」「历史人物游戏」「guess historical figure」「猜人物」「猜猜是谁」'
disable: false
---

# 猜历史人物 / Guess the Historical Figure

一个双向互动的历史人物猜谜游戏。支持两种模式：AI出题让你猜，或你想好人物让AI猜。

## 触发条件

当用户说以下任一内容时激活：
- 「猜历史人物」「历史人物游戏」「猜人物」「猜猜是谁」
- 「guess historical figure」「guess who」「historical figure game」
- 「玩个历史游戏」「来猜人物」

---

## 游戏入口

激活后，展示欢迎界面并询问模式：

```
🏛️ 猜历史人物 / Guess the Historical Figure

请选择游戏模式 / Choose your game mode：

1. 🤔 AI来猜 / AI Guesses
   — 你心中想好一个历史人物，AI提问来猜
   — You think of a figure, AI asks questions to guess

2. 🎯 AI出题 / AI Hosts
   — AI选一个历史人物，给你线索让你猜
   — AI picks a figure and gives you hints

3. 🎲 随机模式 / Random
   — 随机选择一种模式
   — Randomly select a mode

输入 1/2/3：
```

---

## 模式分流逻辑

### 用户选择 1 → AI猜模式

1. 告知用户规则：
   ```
   🤔 AI猜人物模式

   规则 / Rules：
   • 你心中想好一个历史人物（真实存在、有史料记载）
   • AI会问你 yes/no 问题
   • 你可以回答：是/否/不确定/不相关
   • AI最多问20个问题，最多正式猜测3次
   • 如果AI猜不出来，会主动投降——不会硬撑浪费时间
   • 你也可以随时说「猜不出来吧」让AI投降

   准备好后说「好了」或「准备好了」
   ```

2. 用户确认后，读取 `skills/ai-guess/SKILL.md` 并执行AI猜逻辑

### 用户选择 2 → AI出题模式

1. 询问难度：
   ```
   🎯 AI出题模式

   请选择难度 / Choose difficulty：

   ⭐ 简单 / Easy    — 教科书级人物，6次猜测机会
   ⭐⭐ 中等 / Medium  — 知名人物，8次猜测机会
   ⭐⭐⭐ 困难 / Hard   — 冷门人物，10次猜测机会

   输入 1/2/3 或 简单/中等/困难：
   ```

2. 确定难度后，读取 `skills/ai-host/SKILL.md` 并执行AI出题逻辑

   **核心规则**：
   - AI对玩家的提问只能回答：是、否、是也不是、正史无记载
   - 无法用四选一回答的问题，AI要求重新提问（不计入次数）
   - 计分系统：基础100分，每问扣0.5分，第N条线索扣N分
   - 称号体系：根据最终得分授予史神/博古通今/学富五车等称号
   - 左右两栏布局：左侧线索+人物画像，右侧对话框

### 用户选择 3 → 随机模式

随机选择模式1或模式2，然后执行对应逻辑。

---

## 游戏结束处理

每局游戏结束后，询问用户：

```
🎮 本局结束

再来一局？/ Play again?
• 输入「再来」或「yes」继续
• 输入「换模式」切换到另一种模式
• 输入其他内容退出游戏
```

---

## 核心原则

### 人物范围
- **真实存在**：必须是历史上真实存在的人物
- **有史料记载**：以正史为准，不使用野史传说
- **全球范围**：不限地域、时代、领域
- **已故人物**：优先选择已故历史人物（避免争议）

### 语言风格
- 中英双语呈现关键信息
- 中文为主，英文为辅
- 非中文人物给出原名/英文通用名

### 游戏公平
- AI不使用过于生僻的人物（除非困难模式）
- 线索必须真实、有据可查
- 不编造不存在的人物或事迹

---

## 文件依赖

- `skills/shared/hint-framework.md` — 线索等级体系
- `skills/shared/figure-categories.md` — 人物分类体系
- `skills/ai-guess/SKILL.md` — AI猜模式详细逻辑
- `skills/ai-host/SKILL.md` — AI出题模式详细逻辑
