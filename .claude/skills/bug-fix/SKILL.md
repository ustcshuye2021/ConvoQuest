---
name: bug-fix
description: Systematic approach to diagnosing and fixing bugs in ConvoQuest
---

# Bug Fix

This skill provides a systematic approach to fixing bugs in ConvoQuest.

## Bug Categories

### 1. API/Network Issues
- **Symptom**: Loading spinner stuck, "出错了" messages
- **Files**: `server.js`, `public/js/api.js`
- **Check**: Network tab, console errors, server logs

### 2. JSON Parse Errors
- **Symptom**: "无法解析" messages, fallback to raw text
- **Files**: `public/js/ai-host-mode.js`, `public/js/ai-guess-mode.js`
- **Pattern**: `raw.match(/\{[\s\S]*\}/)` fails

### 3. State Management
- **Symptom**: Wrong scores, counts, game not ending
- **Files**: `public/js/game-state.js`, mode JS files
- **Check**: Console.log GameState at key points

### 4. UI Not Updating
- **Symptom**: Stats stale, messages not appearing
- **Files**: `public/js/ui.js`, mode JS files
- **Check**: update functions called, DOM elements exist

### 5. Event Binding
- **Symptom**: Buttons not responding, double triggers
- **Files**: `public/js/app.js`
- **Check**: Event listeners attached, no duplicate bindings

## Debugging Process

### Step 1: Reproduce
- Note exact steps to trigger the bug
- Check browser console for errors
- Check network tab for failed requests

### Step 2: Locate
- Which screen/mode?
- Which function handles that action?
- Trace the code path from user action to error

### Step 3: Diagnose
- Read the relevant code section
- Identify the root cause
- Check if it's a logic error, missing case, or API issue

### Step 4: Fix
- Make minimal changes to fix the specific issue
- Don't refactor surrounding code
- Add a brief comment if the fix is non-obvious

### Step 5: Verify
- Test the exact reproduction steps
- Test related functionality
- Check for edge cases around the fix

## Common Fix Patterns

### JSON Parsing Fallback
```javascript
let parsed;
try {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('无法解析');
  parsed = JSON.parse(match[0]);
} catch (e) {
  // Show raw text or error message
  addMsg(container, raw, 'ai');
  return;
}
```

### Null Element Check
```javascript
const el = $('#some-element');
if (!el) return; // Element doesn't exist on this screen
```

### State Reset
```javascript
// In GameState.reset(), ensure ALL fields reset
field: {
  gameOver: false,
  won: false,
  score: 100,
  // ... every field
}
```

### Event Deduplication
```javascript
// Clone and replace to remove old listeners
const oldBtn = $('#btn-xxx');
const newBtn = oldBtn.cloneNode(true);
oldBtn.parentNode.replaceChild(newBtn, oldBtn);
newBtn.addEventListener('click', handler);
```

## Reporting Format

```
Bug: [short description]
Repro: [steps]
Cause: [root cause in code]
Fix: [what was changed]
Files: [modified files]
Tested: [what was verified]
```