/* App Entry Point - Event Binding & Screen Routing */

// === Settings Module ===
const Settings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 'medium',

  init() {
    // Load saved settings
    try {
      this.theme = localStorage.getItem('settings_theme') || 'light';
      this.fontFamily = localStorage.getItem('settings_font') || 'serif';
      this.fontSize = localStorage.getItem('settings_size') || 'medium';
    } catch { }

    this.applyTheme(this.theme);
    this.applyFont(this.fontFamily);
    this.applySize(this.fontSize);
    this.updateApiStatus();

    // Listen to system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (this.theme === 'system') {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  open() {
    $('#settings-overlay').classList.add('open');
    this.syncUI();
  },

  close() {
    $('#settings-overlay').classList.remove('open');
  },

  syncUI() {
    // Theme buttons
    $$('.settings-theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.theme);
    });
    // Font select
    $('#settings-font-family').value = this.fontFamily;
    // Size buttons
    $$('.settings-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === this.fontSize);
    });
    // Sync API forms from GameState
    if (GameState.customBaseUrl) {
      $$('.settings-api-tab').forEach(t => t.classList.toggle('active', t.dataset.sapiTab === 'custom'));
      $('#settings-preset-form').classList.add('hidden');
      $('#settings-custom-form').classList.remove('hidden');
      $('#settings-custom-base-url').value = GameState.customBaseUrl;
      $('#settings-custom-model').value = GameState.model;
      $('#settings-custom-key').value = GameState.apiKey;
    } else {
      $$('.settings-api-tab').forEach(t => t.classList.toggle('active', t.dataset.sapiTab === 'preset'));
      $('#settings-preset-form').classList.remove('hidden');
      $('#settings-custom-form').classList.add('hidden');
      $('#settings-preset-provider').value = GameState.model;
      $('#settings-preset-key').value = GameState.apiKey;
    }
    this.updateApiStatus();
  },

  applyTheme(theme) {
    this.theme = theme;
    try { localStorage.setItem('settings_theme', theme); } catch {}

    if (theme === 'system') {
      const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  applyFont(font) {
    this.fontFamily = font;
    try { localStorage.setItem('settings_font', font); } catch {}

    const root = document.documentElement;
    if (font === 'serif') {
      root.style.setProperty('--font-serif', '"Noto Serif SC", "Songti SC", Georgia, "Times New Roman", serif');
      root.style.setProperty('--font-sans', '"Noto Serif SC", "Songti SC", Georgia, "Times New Roman", serif');
    } else if (font === 'sans') {
      root.style.setProperty('--font-serif', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      root.style.setProperty('--font-sans', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    } else {
      root.style.setProperty('--font-serif', 'system-ui, -apple-system, sans-serif');
      root.style.setProperty('--font-sans', 'system-ui, -apple-system, sans-serif');
    }
  },

  applySize(size) {
    this.fontSize = size;
    try { localStorage.setItem('settings_size', size); } catch {}

    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[size] || '16px';
  },

  updateApiStatus() {
    const status = $('#settings-api-status');
    if (GameState.apiKey && GameState.model) {
      const modelName = GameState.customBaseUrl
        ? `${GameState.model}（自定义）`
        : GameState.model;
      status.textContent = `当前：${modelName}`;
      status.classList.add('connected');
    } else {
      status.textContent = '当前未配置模型';
      status.classList.remove('connected');
    }
  },

  usePresetModel() {
    const model = $('#settings-preset-provider').value;
    const key = $('#settings-preset-key').value.trim();
    if (!model) { alert('请先选择模型'); return; }
    if (!key) { alert('请输入 API Key'); return; }

    GameState.model = model;
    GameState.apiKey = key;
    GameState.customBaseUrl = '';
    GameState.useBuiltIn = false;

    try {
      localStorage.setItem('preset_model', model);
      localStorage.setItem('preset_key', key);
    } catch {}

    this.updateApiStatus();
    const btn = $('#btn-settings-use-preset');
    const orig = btn.textContent;
    btn.textContent = '✓ 已选择';
    setTimeout(() => btn.textContent = orig, 1500);

    // Also sync welcome screen inputs
    try {
      $('#preset-provider').value = model;
      $('#preset-api-key').value = key;
    } catch {}
  },

  useCustomModel() {
    const baseUrl = $('#settings-custom-base-url').value.trim();
    const modelName = $('#settings-custom-model').value.trim();
    const key = $('#settings-custom-key').value.trim();

    if (!baseUrl) { alert('请输入 Base URL'); return; }
    if (!modelName) { alert('请输入模型名'); return; }
    if (!key) { alert('请输入 API Key'); return; }

    GameState.model = modelName;
    GameState.apiKey = key;
    GameState.customBaseUrl = baseUrl;
    GameState.useBuiltIn = false;

    try {
      localStorage.setItem('custom_base_url', baseUrl);
      localStorage.setItem('custom_model', modelName);
      localStorage.setItem('custom_key', key);
    } catch {}

    this.updateApiStatus();
    const btn = $('#btn-settings-use-custom');
    const orig = btn.textContent;
    btn.textContent = '✓ 已选择';
    setTimeout(() => btn.textContent = orig, 1500);

    // Also sync welcome screen inputs
    try {
      $('#custom-base-url').value = baseUrl;
      $('#custom-model-name').value = modelName;
      $('#custom-api-key').value = key;
    } catch {}
  }
};

// Game definitions - add new games here
const GAMES = {
  twentyq: {
    icon: '❓',
    name: '20个问题',
    desc: '通过是/否问题推理，猜出目标或让 AI 猜你的目标',
    tag: '经典推理',
    modes: [
      { id: 'ai-host', icon: '🎯', name: 'AI 出题', desc: 'AI 选一个目标，给你线索让你猜', needDifficulty: true },
      { id: 'ai-guess', icon: '🤔', name: 'AI 来猜', desc: '你心中想好目标，AI 提问来猜', needDifficulty: true }
    ]
  },
  turtle: {
    icon: '🍲',
    name: '海龟汤',
    modes: [
      { id: 'turtle-host', icon: '🍲', name: 'AI 出题', desc: 'AI 出一道海龟汤，你来提问推理真相', needDifficulty: true },
      { id: 'turtle-guess', icon: '🤔', name: 'AI 来猜', desc: '你出汤面，AI 提问来推理汤底', needDifficulty: true,
        difficulties: [
          { id: 'easy', stars: '⭐', name: '简单', desc: '20问/3次猜测' },
          { id: 'normal', stars: '⭐⭐', name: '一般', desc: '40问/4次猜测' },
          { id: 'hard', stars: '⭐⭐⭐', name: '困难', desc: '60问/5次猜测' },
          { id: 'hell', stars: '⭐⭐⭐⭐', name: '地狱', desc: '80问/6次猜测' }
        ]
      }
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

  // For twentyq: show category selection first
  if (gameId === 'twentyq') {
    const categoryCardsHtml = Object.values(CATEGORIES).map(cat => `
      <div class="mode-card" data-category-id="${cat.id}">
        <div class="mode-icon">${cat.icon}</div>
        <h3>${cat.name}</h3>
        <p>${cat.desc}</p>
      </div>
    `).join('');
    $('#hall-mode-cards').innerHTML = categoryCardsHtml;
    $('#hall-difficulty').classList.add('hidden');

    // Bind category card clicks
    $$('#hall-mode-cards .mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const categoryId = card.dataset.categoryId;
        GameState._pendingCategory = categoryId;
        // After category selected, show mode selection
        showTwentyQModes(categoryId);
      });
    });
    return;
  }

  // For turtle: show mode selection directly
  const cardsHtml = game.modes.map(m => `
    <div class="mode-card" data-mode-id="${m.id}">
      <div class="mode-icon">${m.icon}</div>
      <h3>${m.name}</h3>
      <p>${m.desc}</p>
    </div>
  `).join('');
  $('#hall-mode-cards').innerHTML = cardsHtml;

  // Build difficulty buttons (hidden by default)
  buildDifficultyButtons(game.difficulties, gameId);
  $('#hall-difficulty').classList.add('hidden');

  // Bind mode card clicks
  $$('#hall-mode-cards .mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const modeId = card.dataset.modeId;
      const modeDef = game.modes.find(m => m.id === modeId);
      if (modeDef.needDifficulty) {
        const diffs = modeDef.difficulties || game.difficulties;
        buildDifficultyButtons(diffs, gameId);

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
}

function showTwentyQModes(categoryId) {
  const category = CATEGORIES[categoryId];
  const game = GAMES.twentyq;

  // Update header
  $('#hall-mode-header').innerHTML = `
    <span class="mode-game-icon">${category.icon}</span>
    <h2>${category.name}</h2>
  `;

  // Show mode cards
  const cardsHtml = game.modes.map(m => `
    <div class="mode-card" data-mode-id="${m.id}">
      <div class="mode-icon">${m.icon}</div>
      <h3>${m.name}</h3>
      <p>${m.desc.replace('目标', category.targetName)}</p>
    </div>
  `).join('');
  $('#hall-mode-cards').innerHTML = cardsHtml;
  $('#hall-difficulty').classList.add('hidden');

  // Reset opacity
  $$('#hall-mode-cards .mode-card').forEach(c => {
    c.style.opacity = '1';
    c.style.pointerEvents = 'auto';
  });

  // Build difficulty buttons for this category
  const diffs = category.difficulties;
  const diffHtml = Object.entries(diffs).map(([id, d]) => `
    <button class="btn-difficulty" data-diff-id="${id}" data-category="${categoryId}">
      <span class="stars">${id === 'easy' ? '⭐' : id === 'medium' ? '⭐⭐' : '⭐⭐⭐'}</span>
      <span class="diff-name">${d.name}</span>
      <span class="diff-desc">${d.desc}</span>
    </button>
  `).join('');
  $('#hall-difficulty-buttons').innerHTML = diffHtml;

  // Bind mode card clicks
  $$('#hall-mode-cards .mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const modeId = card.dataset.modeId;
      GameState._pendingMode = modeId;
      // Show difficulty, dim unselected cards
      $('#hall-difficulty').classList.remove('hidden');
      $$('#hall-mode-cards .mode-card').forEach(c => {
        c.style.opacity = c === card ? '1' : '0.4';
        c.style.pointerEvents = 'none';
      });
    });
  });

  // Bind difficulty clicks
  $$('#hall-difficulty-buttons .btn-difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.diffId;
      const categoryId = btn.dataset.category;
      launchTwentyQ(categoryId, GameState._pendingMode, diff);
    });
  });
}

function buildDifficultyButtons(difficulties, gameId) {
  if (!difficulties) {
    $('#hall-difficulty-buttons').innerHTML = '';
    return;
  }
  const html = difficulties.map(d => `
    <button class="btn-difficulty" data-diff-id="${d.id}" data-game="${gameId}">
      <span class="stars">${d.stars}</span>
      <span class="diff-name">${d.name}</span>
      <span class="diff-desc">${d.desc}</span>
    </button>
  `).join('');
  $('#hall-difficulty-buttons').innerHTML = html;
  $$('#hall-difficulty-buttons .btn-difficulty').forEach(btn => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.diffId;
      launchGame(gameId, GameState._pendingMode, diff);
    });
  });
}

function launchGame(gameId, modeId, difficulty) {
  if (gameId === 'turtle') {
    if (modeId === 'turtle-host') TurtleHostMode.start(difficulty);
    else if (modeId === 'turtle-guess') TurtleGuessMode.start(difficulty);
  }
}

function launchTwentyQ(categoryId, modeId, difficulty) {
  GameState.category = categoryId;
  if (modeId === 'ai-host') AIHostMode.start(difficulty, categoryId);
  else if (modeId === 'ai-guess') AIGuessMode.start(categoryId);
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

  // Initialize settings (theme, font, etc.)
  Settings.init();

  // === Settings Panel Events ===
  $('#btn-hall-settings').addEventListener('click', () => Settings.open());
  $$('.btn-open-settings').forEach(btn => {
    btn.addEventListener('click', () => Settings.open());
  });
  $('#settings-backdrop').addEventListener('click', () => Settings.close());
  $('#settings-close-btn').addEventListener('click', () => Settings.close());

  // Theme buttons
  $$('.settings-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Settings.applyTheme(btn.dataset.theme);
      btn.classList.add('active');
      $$('.settings-theme-btn').forEach(b => { if (b !== btn) b.classList.remove('active'); });
    });
  });

  // Font family
  $('#settings-font-family').addEventListener('change', () => {
    Settings.applyFont($('#settings-font-family').value);
  });

  // Font size buttons
  $$('.settings-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Settings.applySize(btn.dataset.size);
      btn.classList.add('active');
      $$('.settings-size-btn').forEach(b => { if (b !== btn) b.classList.remove('active'); });
    });
  });

  // API tabs in settings
  $$('.settings-api-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.settings-api-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.sapiTab;
      $('#settings-preset-form').classList.toggle('hidden', target !== 'preset');
      $('#settings-custom-form').classList.toggle('hidden', target !== 'custom');
    });
  });

  // Toggle key visibility in settings
  $('#btn-toggle-settings-preset-key').addEventListener('click', () => {
    const inp = $('#settings-preset-key');
    const btn = $('#btn-toggle-settings-preset-key');
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
  });
  $('#btn-toggle-settings-custom-key').addEventListener('click', () => {
    const inp = $('#settings-custom-key');
    const btn = $('#btn-toggle-settings-custom-key');
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
  });

  // Use preset model in settings
  $('#btn-settings-use-preset').addEventListener('click', () => Settings.usePresetModel());

  // Use custom model in settings
  $('#btn-settings-use-custom').addEventListener('click', () => Settings.useCustomModel());

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

  $('#btn-host-hint').addEventListener('click', async () => {
    if (!GameState.host.gameOver) {
      const revealed = await AIHostMode.revealHint();
      if (revealed) {
        addMsg($('#host-chat-area'), `📜 已揭示第 ${GameState.host.hintsRevealed} 条线索（扣除 ${GameState.host.hintsRevealed} 分）`, 'system');
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
  $('#btn-turtle-guess-close').addEventListener('click', () => TurtleGuessMode.onGuessClose());
  $('#btn-turtle-guess-far').addEventListener('click', () => TurtleGuessMode.onGuessFar());
  $('#btn-turtle-guess-wrong').addEventListener('click', () => TurtleGuessMode.onGuessWrong());

  // Turtle Guess reroll
  $('#btn-turtle-guess-reroll').addEventListener('click', () => {
    TurtleGuessMode.showRerollPrompt();
  });
  $('#btn-turtle-guess-reroll-confirm').addEventListener('click', () => {
    TurtleGuessMode.onRerollAnswer();
  });
  $('#btn-turtle-guess-reroll-cancel').addEventListener('click', () => {
    TurtleGuessMode.onRerollCancel();
  });

  // Turtle Guess player hint
  const turtleGuessHintInput = $('#turtle-guess-hint-input');
  $('#btn-turtle-guess-hint-send').addEventListener('click', () => {
    TurtleGuessMode.submitHintAndContinue(turtleGuessHintInput.value);
  });
  turtleGuessHintInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) $('#btn-turtle-guess-hint-send').click();
  });
  $('#btn-turtle-guess-hint-skip').addEventListener('click', () => {
    TurtleGuessMode.submitHintAndContinue('');
  });

  // Retry buttons
  $('#btn-host-retry').addEventListener('click', () => AIHostMode.retry());
  $('#btn-guess-retry').addEventListener('click', () => AIGuessMode.retry());
  $('#btn-turtle-host-retry').addEventListener('click', () => TurtleHostMode.retry());
  $('#btn-turtle-guess-retry').addEventListener('click', () => TurtleGuessMode.retry());

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
    const prevCategory = GameState.category;
    const prevDifficulty = GameState.turtle.difficulty;
    GameState.reset();
    if (prevMode === 'ai-guess' && prevCategory) {
      AIGuessMode.start(prevCategory);
    } else if (prevMode === 'turtle-guess') {
      TurtleGuessMode.start(prevDifficulty || 'normal');
    } else {
      resetToGameHall();
    }
  });

  $('#btn-switch-mode').addEventListener('click', resetToGameHall);
});
