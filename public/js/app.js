/* App Entry Point - Event Binding & Screen Routing */

// Game definitions - add new games here
const GAMES = {
  history: {
    icon: '🏛️',
    name: '猜历史人物',
    modes: [
      { id: 'ai-host', icon: '🎯', name: 'AI 出题', desc: 'AI 选一个历史人物，给你线索让你猜', needDifficulty: true },
      { id: 'ai-guess', icon: '🤔', name: 'AI 来猜', desc: '你心中想好人物，AI 提问来猜', needDifficulty: false }
    ],
    difficulties: [
      { id: 'easy', stars: '⭐', name: '简单', desc: '教科书级人物，6次猜测' },
      { id: 'medium', stars: '⭐⭐', name: '中等', desc: '知名人物，8次猜测' },
      { id: 'hard', stars: '⭐⭐⭐', name: '困难', desc: '冷门人物，10次猜测' }
    ]
  },
  turtle: {
    icon: '🍲',
    name: '海龟汤',
    modes: [
      { id: 'turtle-host', icon: '🍲', name: 'AI 出题', desc: 'AI 出一道海龟汤，你来提问推理真相', needDifficulty: true },
      { id: 'turtle-guess', icon: '🤔', name: 'AI 来猜', desc: '你出汤面，AI 提问来推理汤底', needDifficulty: false }
    ],
    difficulties: [
      { id: 'easy', stars: '⭐', name: '简单', desc: '逻辑链短，1-2步推理' },
      { id: 'medium', stars: '⭐⭐', name: '中等', desc: '需要多角度思考' },
      { id: 'hard', stars: '⭐⭐⭐', name: '困难', desc: '出人意料，打破思维定式' }
    ]
  }
};

function showGameModes(gameId) {
  const game = GAMES[gameId];
  if (!game) return;

  // Hide game grid, show mode selection
  $('#hall-game-select').classList.add('hidden');
  $('#hall-mode-select').classList.remove('hidden');

  // Build header
  $('#hall-mode-header').innerHTML = `
    <span class="mode-game-icon">${game.icon}</span>
    <h2>${game.name}</h2>
  `;

  // Build mode cards
  const cardsHtml = game.modes.map(m => `
    <div class="mode-card" data-mode-id="${m.id}">
      <div class="mode-icon">${m.icon}</div>
      <h3>${m.name}</h3>
      <p>${m.desc}</p>
    </div>
  `).join('');
  $('#hall-mode-cards').innerHTML = cardsHtml;

  // Build difficulty buttons (hidden by default)
  let diffHtml = '';
  if (game.difficulties) {
    diffHtml = game.difficulties.map(d => `
      <button class="btn-difficulty" data-diff-id="${d.id}" data-game="${gameId}">
        <span class="stars">${d.stars}</span>
        <span class="diff-name">${d.name}</span>
        <span class="diff-desc">${d.desc}</span>
      </button>
    `).join('');
  }
  $('#hall-difficulty-buttons').innerHTML = diffHtml;
  $('#hall-difficulty').classList.add('hidden');

  // Bind mode card clicks
  $$('#hall-mode-cards .mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const modeId = card.dataset.modeId;
      const modeDef = game.modes.find(m => m.id === modeId);
      if (modeDef.needDifficulty) {
        // Show difficulty, dim unselected cards
        $('#hall-difficulty').classList.remove('hidden');
        $$('#hall-mode-cards .mode-card').forEach(c => {
          c.style.opacity = c === card ? '1' : '0.4';
          c.style.pointerEvents = 'none';
        });
        GameState._pendingMode = modeId;
      } else {
        launchGame(gameId, modeId);
      }
    });
  });

  // Bind difficulty clicks
  $$('#hall-difficulty-buttons .btn-difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.diffId;
      const gameId = btn.dataset.game;
      launchGame(gameId, GameState._pendingMode, diff);
    });
  });
}

function launchGame(gameId, modeId, difficulty) {
  if (gameId === 'history') {
    if (modeId === 'ai-host') AIHostMode.start(difficulty);
    else if (modeId === 'ai-guess') AIGuessMode.start();
  } else if (gameId === 'turtle') {
    if (modeId === 'turtle-host') TurtleHostMode.start(difficulty);
    else if (modeId === 'turtle-guess') TurtleGuessMode.start();
  }
}

function backToGameList() {
  $('#hall-game-select').classList.remove('hidden');
  $('#hall-mode-select').classList.add('hidden');
}

function resetToGameHall() {
  GameState.reset();
  showScreen('screen-mode');
  backToGameList();
}

document.addEventListener('DOMContentLoaded', () => {
  // === Welcome Screen ===
  const btnConfirm = $('#btn-confirm-key');
  const keyError = $('#key-error');

  // Tab switching (preset / custom)
  const tabs = $$('.custom-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $('#preset-form').classList.toggle('hidden', target !== 'preset');
      $('#custom-form').classList.toggle('hidden', target !== 'custom');
    });
  });

  // Toggle key visibility (both forms)
  $('#btn-toggle-preset-key').addEventListener('click', () => {
    const inp = $('#preset-api-key');
    const btn = $('#btn-toggle-preset-key');
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
  });
  $('#btn-toggle-custom-key').addEventListener('click', () => {
    const inp = $('#custom-api-key');
    const btn = $('#btn-toggle-custom-key');
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
  });

  // Use preset model (official providers)
  $('#btn-use-preset').addEventListener('click', () => {
    const select = $('#preset-provider');
    const model = select.value;
    const key = $('#preset-api-key').value.trim();
    if (!model) {
      keyError.textContent = '请先选择模型';
      keyError.classList.remove('hidden');
      return;
    }
    if (!key) {
      keyError.textContent = '请输入 API Key';
      keyError.classList.remove('hidden');
      return;
    }
    GameState.model = model;
    GameState.apiKey = key;
    GameState.customBaseUrl = '';
    GameState.useBuiltIn = false;
    keyError.classList.add('hidden');
    try { localStorage.setItem('preset_model', model); localStorage.setItem('preset_key', key); } catch {}
    const origText = $('#btn-use-preset').textContent;
    $('#btn-use-preset').textContent = '✓ 已选择';
    setTimeout(() => $('#btn-use-preset').textContent = origText, 1500);
  });

  // Use custom model (user-provided baseUrl)
  $('#btn-use-custom').addEventListener('click', () => {
    const baseUrl = $('#custom-base-url').value.trim();
    const modelName = $('#custom-model-name').value.trim();
    const key = $('#custom-api-key').value.trim();
    if (!baseUrl) {
      keyError.textContent = '请输入 Base URL';
      keyError.classList.remove('hidden');
      return;
    }
    if (!modelName) {
      keyError.textContent = '请输入模型名';
      keyError.classList.remove('hidden');
      return;
    }
    if (!key) {
      keyError.textContent = '请输入 API Key';
      keyError.classList.remove('hidden');
      return;
    }
    GameState.model = modelName;
    GameState.apiKey = key;
    GameState.customBaseUrl = baseUrl;
    GameState.useBuiltIn = false;
    keyError.classList.add('hidden');
    try {
      localStorage.setItem('custom_base_url', baseUrl);
      localStorage.setItem('custom_model', modelName);
      localStorage.setItem('custom_key', key);
    } catch {}
    const origText = $('#btn-use-custom').textContent;
    $('#btn-use-custom').textContent = '✓ 已选择';
    setTimeout(() => $('#btn-use-custom').textContent = origText, 1500);
  });

  // Enter game hall
  btnConfirm.addEventListener('click', async () => {
    btnConfirm.disabled = true;
    btnConfirm.textContent = '验证中...';
    keyError.classList.add('hidden');

    try {
      if (!GameState.apiKey) {
        keyError.textContent = '请选择模型并输入 API Key';
        keyError.classList.remove('hidden');
        btnConfirm.disabled = false;
        btnConfirm.textContent = '进入游戏厅';
        return;
      }
      await validateApiKey(GameState.apiKey);
      try {
        localStorage.setItem('selected_model', GameState.model);
      } catch {}
      showScreen('screen-mode');
    } catch (err) {
      keyError.textContent = '验证失败: ' + err.message;
      keyError.classList.remove('hidden');
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.textContent = '进入游戏厅';
    }
  });

  // Restore saved preferences
  try {
    const savedPresetModel = localStorage.getItem('preset_model');
    const savedPresetKey = localStorage.getItem('preset_key');
    if (savedPresetModel) $('#preset-provider').value = savedPresetModel;
    if (savedPresetKey) $('#preset-api-key').value = savedPresetKey;

    const savedBaseUrl = localStorage.getItem('custom_base_url');
    const savedCustomModel = localStorage.getItem('custom_model');
    const savedCustomKey = localStorage.getItem('custom_key');
    if (savedBaseUrl) $('#custom-base-url').value = savedBaseUrl;
    if (savedCustomModel) $('#custom-model-name').value = savedCustomModel;
    if (savedCustomKey) $('#custom-api-key').value = savedCustomKey;
  } catch {}

  // === Game Hall ===
  $$('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      showGameModes(card.dataset.game);
    });
  });

  $('#btn-back-to-games').addEventListener('click', backToGameList);

  $('#btn-back-welcome').addEventListener('click', () => {
    showScreen('screen-welcome');
    backToGameList();
  });

  // === AI Host Game (History) ===
  const hostInput = $('#host-input');
  $('#btn-host-send').addEventListener('click', () => {
    if (!GameState.host.gameOver) AIHostMode.handleInput(hostInput.value);
  });
  hostInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-host-send').click();
  });

  // Blind guess button
  $('#btn-host-blind').addEventListener('click', () => {
    if (!GameState.host.gameOver && GameState.host.blindGuessesLeft > 0) {
      AIHostMode.showBlindGuessUI();
    }
  });

  const hostBlindInput = $('#host-blind-input');
  $('#btn-host-blind-submit').addEventListener('click', () => {
    AIHostMode.submitBlindGuess(hostBlindInput.value);
  });
  hostBlindInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-host-blind-submit').click();
  });
  $('#btn-host-blind-cancel').addEventListener('click', () => {
    AIHostMode.cancelBlindGuess();
  });

  $('#btn-host-hint').addEventListener('click', () => {
    if (!GameState.host.gameOver) {
      const maxHints = GameState.getMaxHints();
      if (GameState.host.hintsRevealed < maxHints) {
        const nextLevel = GameState.host.hintsRevealed + 1;
        AIHostMode.revealHint();
        addMsg($('#host-chat-area'), `📜 已揭示第 ${GameState.host.hintsRevealed} 条线索（扣除 ${nextLevel} 分）`, 'system');
      } else {
        addMsg($('#host-chat-area'), '所有线索已用完！', 'system');
      }
    }
  });

  $('#btn-host-giveup').addEventListener('click', () => {
    if (!GameState.host.gameOver && confirm('确定放弃吗？')) AIHostMode.endGame(false);
  });

  $('#btn-host-restart').addEventListener('click', () => {
    if (confirm('确定重新开始吗？当前进度将丢失。')) resetToGameHall();
  });

  // AI Host review
  const hostReviewInput = $('#host-review-input');
  $('#btn-host-review-send').addEventListener('click', () => {
    AIHostMode.handleReviewInput(hostReviewInput.value);
  });
  hostReviewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-host-review-send').click();
  });
  $('#btn-host-end-review').addEventListener('click', () => AIHostMode.showResult());

  // === AI Guess Game (History) ===
  $('#btn-ready').addEventListener('click', () => AIGuessMode.onReady());

  $$('.btn-answer').forEach(btn => {
    btn.addEventListener('click', () => AIGuessMode.onAnswer(btn.dataset.answer));
  });

  const guessInput = $('#guess-input');
  $('#btn-guess-send').addEventListener('click', () => {
    if (!GameState.guess.gameOver) AIGuessMode.onFreeInput(guessInput.value);
  });
  guessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-guess-send').click();
  });

  $('#btn-guess-restart').addEventListener('click', () => {
    if (confirm('确定重新开始吗？当前进度将丢失。')) resetToGameHall();
  });

  $('#btn-guess-correct').addEventListener('click', () => AIGuessMode.onGuessCorrect());
  $('#btn-guess-wrong').addEventListener('click', () => AIGuessMode.onGuessWrong());

  // Player hint for AI guess
  $('#btn-guess-hint-send').addEventListener('click', () => {
    AIGuessMode.onPlayerHint($('#guess-hint-input').value);
  });
  $('#guess-hint-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-guess-hint-send').click();
  });
  $('#btn-guess-hint-refuse').addEventListener('click', () => {
    AIGuessMode.onPlayerHintRefuse();
  });

  // Reroll answer
  $('#btn-guess-reroll').addEventListener('click', () => {
    AIGuessMode.showRerollPrompt();
  });
  $('#btn-guess-reroll-confirm').addEventListener('click', () => {
    AIGuessMode.onRerollAnswer();
  });
  $('#btn-guess-reroll-cancel').addEventListener('click', () => {
    AIGuessMode.onRerollCancel();
  });

  const reviewInput = $('#guess-review-input');
  $('#btn-guess-review-send').addEventListener('click', () => {
    AIGuessMode.handleReviewInput(reviewInput.value);
  });
  reviewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-guess-review-send').click();
  });
  $('#btn-end-review').addEventListener('click', () => AIGuessMode.showResult());

  // === Turtle Soup - AI Hosts ===
  const turtleHostInput = $('#turtle-host-input');
  $('#btn-turtle-host-send').addEventListener('click', () => {
    if (!GameState.turtle.gameOver) TurtleHostMode.handleInput(turtleHostInput.value);
  });
  turtleHostInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-host-send').click();
  });

  $('#btn-turtle-host-hint').addEventListener('click', () => {
    if (!GameState.turtle.gameOver) TurtleHostMode.giveHint();
  });

  $('#btn-turtle-host-giveup').addEventListener('click', () => {
    if (!GameState.turtle.gameOver && confirm('确定放弃吗？将揭晓真相。')) {
      TurtleHostMode.revealTruth();
    }
  });

  $('#btn-turtle-host-guess').addEventListener('click', () => {
    $('#turtle-host-input-area').classList.add('hidden');
    $('#turtle-host-guess-area').classList.remove('hidden');
  });

  $('#btn-turtle-host-cancel-guess').addEventListener('click', () => {
    $('#turtle-host-guess-area').classList.add('hidden');
    $('#turtle-host-input-area').classList.remove('hidden');
  });

  $('#btn-turtle-host-submit-guess').addEventListener('click', () => {
    const guessText = $('#turtle-host-guess-input').value.trim();
    if (guessText) {
      $('#turtle-host-guess-area').classList.add('hidden');
      $('#turtle-host-input-area').classList.remove('hidden');
      TurtleHostMode.handleGuess(guessText);
    }
  });

  $('#turtle-host-guess-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-host-submit-guess').click();
  });

  $('#btn-turtle-host-restart').addEventListener('click', () => {
    if (confirm('确定重新开始吗？当前进度将丢失。')) resetToGameHall();
  });

  // Turtle Host review
  const turtleHostReviewInput = $('#turtle-host-review-input');
  $('#btn-turtle-host-review-send').addEventListener('click', () => {
    TurtleHostMode.handleReviewInput(turtleHostReviewInput.value);
  });
  turtleHostReviewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-host-review-send').click();
  });
  $('#btn-turtle-host-end-review').addEventListener('click', () => TurtleHostMode.showResult());

  // === Turtle Soup - AI Guesses ===
  $('#btn-turtle-guess-submit-surface').addEventListener('click', () => {
    TurtleGuessMode.onSubmitSurface();
  });

  $('#turtle-guess-surface-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-guess-submit-surface').click();
  });

  $$('.btn-turtle-answer').forEach(btn => {
    btn.addEventListener('click', () => TurtleGuessMode.onAnswer(btn.dataset.tanswer));
  });

  const turtleGuessInput = $('#turtle-guess-input');
  $('#btn-turtle-guess-send').addEventListener('click', () => {
    if (!GameState.turtle.gameOver) TurtleGuessMode.onFreeInput(turtleGuessInput.value);
  });
  turtleGuessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-guess-send').click();
  });

  $('#btn-turtle-guess-restart').addEventListener('click', () => {
    if (confirm('确定重新开始吗？当前进度将丢失。')) resetToGameHall();
  });

  $('#btn-turtle-guess-correct').addEventListener('click', () => TurtleGuessMode.onGuessCorrect());
  $('#btn-turtle-guess-wrong').addEventListener('click', () => TurtleGuessMode.onGuessWrong());

  // Turtle Guess review
  const turtleGuessReviewInput = $('#turtle-guess-review-input');
  $('#btn-turtle-guess-review-send').addEventListener('click', () => {
    TurtleGuessMode.handleReviewInput(turtleGuessReviewInput.value);
  });
  turtleGuessReviewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-guess-review-send').click();
  });
  $('#btn-turtle-guess-end-review').addEventListener('click', () => TurtleGuessMode.showResult());

  // === Result Screen ===
  $('#btn-play-again').addEventListener('click', () => {
    const prevMode = GameState.mode;
    GameState.reset();
    if (prevMode === 'ai-guess') {
      AIGuessMode.start();
    } else if (prevMode === 'turtle-guess') {
      TurtleGuessMode.start();
    } else {
      resetToGameHall();
    }
  });

  $('#btn-switch-mode').addEventListener('click', resetToGameHall);
});
