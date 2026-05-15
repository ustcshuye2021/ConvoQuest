---
name: add-game-mode
description: Scaffold a new game mode with all required files, prompts, state, and UI
---

# Add Game Mode

This skill scaffolds a complete new game mode for ConvoQuest.

## Prerequisites

Before using this skill, you should know:
1. Game type (e.g., new puzzle genre, quiz, deduction)
2. Mode variant (AI hosts vs AI guesses)
3. Difficulty levels needed

## Steps

### 1. Design the Mode

Consult `.claude/agents/game-designer.md` for design principles.

Define:
- Game mechanics and rules
- Player actions
- AI behavior
- Scoring/title system
- Win/lose conditions

### 2. Add Game Config

In `public/js/app.js`, add to the `GAMES` object:

```javascript
const GAMES = {
  // ... existing games ...
  newgame: {
    icon: '🎲',
    name: '游戏名称',
    modes: [
      { id: 'newgame-host', icon: '🎯', name: 'AI 出题', desc: '...', needDifficulty: true },
      { id: 'newgame-guess', icon: '🤔', name: 'AI 来猜', desc: '...', needDifficulty: false }
    ],
    difficulties: [
      { id: 'easy', stars: '⭐', name: '简单', desc: '...' },
      { id: 'medium', stars: '⭐⭐', name: '中等', desc: '...' },
      { id: 'hard', stars: '⭐⭐⭐', name: '困难', desc: '...' }
    ]
  }
};
```

### 3. Add State Management

In `public/js/game-state.js`, add state fields for the new mode:

```javascript
// In the reset() method
newmode: {
  gameOver: false,
  won: false,
  // ... mode-specific state
}
```

### 4. Create Prompts

Create `public/js/newgame-prompts.js` following the pattern of `prompts.js`:

- System prompt (AI behavior)
- Turn prompts (per-turn context)
- Evaluation prompt (guess checking)
- Review prompt (post-game discussion)

### 5. Create Game Logic

Create `public/js/newgame-mode.js` with the game mode object:

```javascript
const NewGameMode = {
  async start(difficulty) { /* ... */ },
  async handleInput(text) { /* ... */ },
  endGame(won) { /* ... */ },
  async startReview(won) { /* ... */ },
  showResult() { /* ... */ },
};
```

### 6. Add HTML Screen

In `public/index.html`, add a new screen section:

```html
<div id="screen-game-newmode" class="screen">
  <!-- Sidebar with stats -->
  <!-- Chat area -->
  <!-- Input area -->
  <!-- Review area -->
</div>
```

### 7. Add CSS Styles

In `public/css/style.css`, add styles matching existing patterns.

### 8. Add UI Helpers

In `public/js/ui.js`, add update functions for the new mode's stats.

### 9. Wire Up Events

In `public/js/app.js`, add event bindings in the DOMContentLoaded handler:

```javascript
// In launchGame()
if (gameId === 'newgame') {
  if (modeId === 'newgame-host') NewGameMode.start(difficulty);
  else if (modeId === 'newgame-guess') NewGameGuessMode.start();
}
```

### 10. Add Script Tags

In `public/index.html`, add script tags for new JS files:

```html
<script src="js/newgame-prompts.js"></script>
<script src="js/newgame-mode.js"></script>
```

## Validation Checklist

- [ ] Game appears in hall with correct icon/name
- [ ] Mode selection shows both modes
- [ ] Difficulty selection works
- [ ] Game initializes with correct state
- [ ] AI responds appropriately
- [ ] Scoring works
- [ ] Win/lose triggers correctly
- [ ] Review phase works
- [ ] Result screen shows stats
- [ ] "Play Again" and "Switch Mode" work
- [ ] No console errors