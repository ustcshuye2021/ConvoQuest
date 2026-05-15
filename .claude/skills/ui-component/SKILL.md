---
name: ui-component
description: Add or modify UI components following existing ConvoQuest patterns
---

# UI Component

This skill guides creation and modification of UI components in ConvoQuest.

## Existing Component Patterns

### Screen Sections
```html
<div id="screen-xxx" class="screen">
  <div class="game-layout">
    <aside class="sidebar">
      <!-- Stats, hints, portrait -->
    </aside>
    <main class="game-main">
      <!-- Chat area, input -->
    </main>
  </div>
</div>
```

### Chat Messages
```javascript
addMsg(container, text, type)     // Plain text message
addMsgHTML(container, html, type) // HTML message
streamMsg(container, type)        // Streaming placeholder
appendToMsg(div, chunk)           // Append streaming chunk
```
Types: `user`, `ai`, `system`, `close`, `wrong`, `blind`

### Answer Badges
```javascript
addAnswerBadge(container, answer)
```
Answers: `是`, `否`, `是也不是`, `正史无记载`, `请重新提问`

### Hint Cards
```javascript
addHintCard(container, level, text)
```
Levels: L1-L8 with auto-labeling

### Stats Update
```javascript
updateHostStats()      // Host mode stats
updateGuessStats()     // Guess mode stats
updateTurtleHostStats() // Turtle host stats
```

## Adding a New Component

### 1. Message Type
```css
/* In style.css */
.msg-newtype {
  /* styling */
}
```
```javascript
addMsg(container, text, 'newtype');
```

### 2. Stats Panel
```html
<!-- In sidebar -->
<div class="panel">
  <h3>面板标题</h3>
  <div id="newstat-value">0</div>
</div>
```
```javascript
function updateNewStats() {
  $('#newstat-value').textContent = GameState.mode.field;
}
```

### 3. Input Area
```html
<div id="new-input-area" class="input-area">
  <input type="text" id="new-input" placeholder="...">
  <button id="btn-new-send">发送</button>
</div>
```
```javascript
// In app.js DOMContentLoaded
const newInput = $('#new-input');
$('#btn-new-send').addEventListener('click', () => {
  GameMode.handleInput(newInput.value);
});
newInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) $('#btn-new-send').click();
});
```

### 4. Full Screen
Add to `index.html`, add CSS for layout, add `showScreen('screen-xxx')` calls.

## Responsive Guidelines

```css
/* Base: mobile-first */
.component { /* mobile styles */ }

/* Tablet */
@media (min-width: 768px) {
  .component { /* wider layout */ }
}

/* Desktop */
@media (min-width: 1024px) {
  .component { /* full layout */ }
}
```

## Animation Pattern

```css
.animate-class {
  animation: animName 0.3s ease;
}
@keyframes animName {
  from { /* start */ }
  to { /* end */ }
}
```
Apply: `el.classList.add('animate-class')`
Remove: `setTimeout(() => el.classList.remove('animate-class'), 300)`