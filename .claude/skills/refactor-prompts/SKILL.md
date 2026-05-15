---
name: refactor-prompts
description: Analyze and optimize AI prompts for better game behavior and output consistency
---

# Refactor Prompts

This skill helps optimize AI prompts for better game behavior.

## When to Use

- AI is not following game rules
- JSON output parsing fails
- AI gives too much/totoo little information
- Game feels unbalanced or unfair
- Adding new prompt-driven features

## Process

### 1. Identify the Problem

Read the relevant prompt in `public/js/prompts.js` or `public/js/turtle-prompts.js`.

Common issues:
- **Rule violations**: AI breaks game rules (giving hints unprompted, answering open-ended)
- **Format errors**: JSON not parseable, extra text around JSON
- **Inconsistency**: Same prompt, different behavior across models
- **Tone issues**: Too formal, too casual, language mixing

### 2. Read the Prompt Context

Understand:
- Which game mode uses this prompt
- How the response is parsed (JSON regex, text match, etc.)
- What state is available at call time
- What the user sees vs what's system-only

### 3. Apply Optimization

Techniques by issue type:

#### Rule Violations
```
Before: "回答是或否"
After:  "你只能回复以下四个选项之一：'是'、'否'、'是也不是'、'正史无记载'。不要回复任何其他内容。违反此规则会破坏游戏体验。"
```

#### JSON Format
```
Before: "请按JSON格式回复"
After:  "请严格按以下JSON格式回复，不要输出任何其他内容（包括markdown标记）：
{\"answer\":\"...\",\"reason\":\"...\"}"
```

#### Add Examples
Include 2-3 input/output examples in the prompt.

#### Chain of Thought
For complex decisions:
```
先判断问题类型，再选择答案：
1. 问题是否可以用是/否回答？
2. 如果是，根据秘密人物信息判断
3. 如果不是，回复"请重新提问"
```

### 4. Test the Change

After editing prompts:
1. Start the game with the modified prompt
2. Test normal flow (questions, guesses, hints)
3. Test edge cases (ambiguous input, repeated questions)
4. Verify JSON parsing works
5. Check across different AI models if possible

### 5. Document Changes

Note what was changed and why, for future reference.

## Prompt Structure Template

```javascript
PROMPTS.promptName = (param1, param2) => {
  return `你是[角色定义]。

## 核心规则
- [规则1]
- [规则2]
- [禁止行为]

## 输出格式
严格按JSON格式：
{json schema}

## 示例
用户输入：X → 回复：Y
用户输入：A → 回复：B

当前上下文：
${context}`;
};
```