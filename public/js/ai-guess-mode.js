/* AI Guess Mode Logic */

const AIGuessMode = {
  _thinking: false,
  _lastPrompt: null,

  // --- UI Helpers ---

  _setThinking(on) {
    this._thinking = on;
    const input = $('#guess-input');
    const btnSend = $('#btn-guess-send');
    const btnReroll = $('#btn-guess-reroll');
    if (input) input.disabled = on;
    if (btnSend) btnSend.disabled = on;
    if (btnReroll) btnReroll.disabled = on;
    if (on) {
      $('#guess-response-area').classList.add('hidden');
      $('#guess-confirm-area').classList.add('hidden');
    }
  },

  _showWaitingForAnswer() {
    $('#guess-response-area').classList.remove('hidden');
    $('#guess-confirm-area').classList.add('hidden');
    $('#guess-reroll-area').classList.add('hidden');
    // Show hint prompt if applicable (doesn't block answer buttons)
    const g = GameState.guess;
    if (g.questionsAsked >= 15 && !g.playerHintUsed) {
      $('#guess-hint-area').classList.remove('hidden');
    } else {
      $('#guess-hint-area').classList.add('hidden');
    }
    this._setThinking(false);
    $('#guess-chat-area').scrollTop = $('#guess-chat-area').scrollHeight;
  },

  _showConfirmGuess() {
    $('#guess-response-area').classList.add('hidden');
    $('#guess-confirm-area').classList.remove('hidden');
    $('#guess-hint-area').classList.add('hidden');
    $('#guess-reroll-area').classList.add('hidden');
    this._setThinking(false);
    $('#guess-chat-area').scrollTop = $('#guess-chat-area').scrollHeight;
  },

  _showHintPrompt() {
    $('#guess-response-area').classList.add('hidden');
    $('#guess-confirm-area').classList.add('hidden');
    $('#guess-hint-area').classList.remove('hidden');
    this._setThinking(false);
    $('#guess-chat-area').scrollTop = $('#guess-chat-area').scrollHeight;
  },

  // --- Game Flow ---

  async start(categoryId) {
    const cat = CATEGORIES[categoryId || 'history'];
    GameState.mode = 'ai-guess';
    GameState.reset();
    GameState.mode = 'ai-guess';
    GameState.category = categoryId;

    // Update sidebar title
    $('.guess-sidebar .sidebar-title').innerHTML = `🤔 AI 来猜 · ${cat.name} <button class="btn-settings btn-open-settings" title="设置">⚙️</button>`;

    // Update answer buttons for category-specific unknown answer
    const responseArea = $('#guess-response-area');
    responseArea.innerHTML = `
      <button class="btn-answer" data-answer="是">✅ 是</button>
      <button class="btn-answer" data-answer="否">❌ 否</button>
      <button class="btn-answer" data-answer="是也不是">↔️ 是也不是</button>
      <button class="btn-answer" data-answer="${cat.unknownAnswer}">❓ ${cat.unknownAnswer}</button>
      <button class="btn-answer" data-answer="我不知道">🤷 我不知道</button>
    `;
    // Re-bind answer buttons
    $$('.btn-answer').forEach(btn => {
      btn.addEventListener('click', () => AIGuessMode.onAnswer(btn.dataset.answer));
    });

    // Update reroll answer options
    const rerollSelect = $('#guess-reroll-new-answer');
    rerollSelect.innerHTML = `
      <option value="是">✅ 是</option>
      <option value="否">❌ 否</option>
      <option value="是也不是">↔️ 是也不是</option>
      <option value="${cat.unknownAnswer}">❓ ${cat.unknownAnswer}</option>
    `;

    $('#guess-chat-area').innerHTML = `<div class="msg-system">请心中想好一个${cat.desc}，然后点击下方"准备好了"。</div>`;
    updateGuessStats();
    updatePanel();
    $('#guess-response-area').classList.add('hidden');
    $('#guess-confirm-area').classList.add('hidden');
    $('#guess-review-area').classList.add('hidden');
    $('#guess-hint-area').classList.add('hidden');
    $('#guess-reroll-area').classList.add('hidden');
    $('#guess-answer-area').classList.remove('hidden');
    $('#guess-input-area').classList.add('hidden');
    $('#guess-portrait-label').textContent = `📋 ${cat.targetName}画像`;
    this._thinking = false;

    showScreen('screen-game-guess');
  },

  async onReady() {
    const categoryId = GameState.category;
    const cat = CATEGORIES[categoryId || 'history'];

    $('#guess-answer-area').classList.add('hidden');
    $('#guess-input-area').classList.remove('hidden');
    addMsg($('#guess-chat-area'), '准备好了！请开始提问。', 'user');

    GameState.messages = [
      { role: 'system', content: PROMPTS.aiGuessSystem(categoryId) }
    ];

    await this.askNext(`用户已准备好，心中想好了一个${cat.targetName}（${cat.desc}）。请开始第一个问题（编号1）。随机选择提问顺序和问法，问题前加序号「1. 」。`);
  },

  async onAnswer(answer) {
    const g = GameState.guess;
    if (g.gameOver) return;

    const isUnknown = (answer === '我不知道');
    if (!isUnknown) {
      g.questionsAsked++;
    }

    addMsg($('#guess-chat-area'), answer, 'user');

    const lastQ = g.questionsHistory[g.questionsHistory.length - 1];
    if (lastQ) {
      g.qaHistory.push({ question: lastQ, answer });
    }

    g.lastActionWasGuess = false;
    updateGuessStats();

    if (g.questionsAsked >= 15 && !g.playerHintUsed) {
      addMsg($('#guess-chat-area'), '💡 已到第15问，你可以给 AI 一条提示帮助它推理。', 'system');
    }

    await this._continueAfterAnswer(answer);
  },

  async _continueAfterAnswer(answer) {
    const g = GameState.guess;
    const categoryId = GameState.category;
    const prompt = PROMPTS.aiGuessTurn(
      answer, g.confirmedFacts,
      g.questionsAsked, g.questionsHistory,
      g.guessesUsed, g.confidence,
      g.lastActionWasGuess, null, categoryId
    );
    await this.askNext(prompt);
  },

  // --- Free Input (always available) ---

  async onFreeInput(text) {
    if (GameState.guess.gameOver || this._thinking) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const categoryId = GameState.category;
    $('#guess-input').value = '';
    addMsg($('#guess-chat-area'), trimmed, 'user');

    const g = GameState.guess;
    const prompt = PROMPTS.aiGuessTurn(
      `[自由对话] 用户说了一段话：\n"${trimmed}"\n\n请理解其意图，将其视为对你上一个问题的回答（如果适用），更新推理状态和画像，然后继续提问。`,
      g.confirmedFacts,
      g.questionsAsked, g.questionsHistory,
      g.guessesUsed, g.confidence,
      g.lastActionWasGuess, null, categoryId
    );

    await this.askNext(prompt);
  },

  // --- Player Hint ---

  async onPlayerHint(text) {
    const g = GameState.guess;
    const categoryId = GameState.category;
    const hint = text.trim();
    if (!hint) return;

    $('#guess-hint-input').value = '';
    g.playerHintUsed = true;
    $('#guess-hint-area').classList.add('hidden');

    addMsg($('#guess-chat-area'), '💡 提示：' + hint, 'user');

    const prompt = PROMPTS.aiGuessTurn(
      `[玩家给了你一条提示]：${hint}\n请根据提示调整推理并继续提问。`,
      g.confirmedFacts,
      g.questionsAsked, g.questionsHistory,
      g.guessesUsed, g.confidence,
      g.lastActionWasGuess, hint, categoryId
    );

    await this.askNext(prompt);
  },

  async onPlayerHintRefuse() {
    const g = GameState.guess;
    g.playerHintUsed = true;
    $('#guess-hint-area').classList.add('hidden');

    addMsg($('#guess-chat-area'), '拒绝了给提示。', 'system');
    const lastQa = g.qaHistory[g.qaHistory.length - 1];
    await this._continueAfterAnswer(lastQa ? lastQa.answer : '继续提问');
  },

  // --- Reroll Answer ---

  showRerollPrompt() {
    const g = GameState.guess;
    if (g.qaHistory.length === 0) {
      addMsg($('#guess-chat-area'), '还没有已回答的问题可以纠错。', 'system');
      return;
    }

    const select = $('#guess-reroll-select');
    select.innerHTML = g.qaHistory.map((qa, i) => {
      const qShort = qa.question.length > 25 ? qa.question.slice(0, 25) + '...' : qa.question;
      return `<option value="${i}">第${i + 1}问：${qShort}（原答：${qa.answer}）</option>`;
    }).join('');

    $('#guess-response-area').classList.add('hidden');
    $('#guess-reroll-area').classList.remove('hidden');
    this._setThinking(false);
    $('#guess-chat-area').scrollTop = $('#guess-chat-area').scrollHeight;
  },

  async onRerollAnswer() {
    const g = GameState.guess;
    const categoryId = GameState.category;
    const idx = parseInt($('#guess-reroll-select').value);
    const newAnswer = $('#guess-reroll-new-answer').value;

    if (isNaN(idx) || !newAnswer) return;

    const oldQa = g.qaHistory[idx];
    if (!oldQa) return;

    $('#guess-reroll-area').classList.add('hidden');

    const qNum = idx + 1;
    addMsg($('#guess-chat-area'), `纠错：第${qNum}问的回答从「${oldQa.answer}」改为「${newAnswer}」`, 'system');

    g.qaHistory[idx].answer = newAnswer;

    const correctionPrompt = `[纠错] 用户修正了第${qNum}问的回答：
原问题：${oldQa.question}
原回答：${oldQa.answer}
新回答：${newAnswer}

请根据修正后的回答重新推理：
1. 更新 confirmed_facts 最小并集（根据修正后的信息重新整理）
2. 重新整理 portrait 画像
3. 更新 candidates 候选方向
4. 继续提问`;

    const prompt = PROMPTS.aiGuessTurn(
      correctionPrompt, g.confirmedFacts,
      g.questionsAsked, g.questionsHistory,
      g.guessesUsed, g.confidence,
      g.lastActionWasGuess, null, categoryId
    );

    await this.askNext(prompt);
  },

  onRerollCancel() {
    $('#guess-reroll-area').classList.add('hidden');
    if (this._thinking) return;
    this._showWaitingForAnswer();
  },

  // --- Core Ask ---

  async askNext(userContent) {
    this._lastPrompt = userContent;
    this._setThinking(true);
    showLoading('guess-loading');

    function stripJsonLine(text) {
      const nlIdx = text.indexOf('\n');
      if (nlIdx === -1) return text.trimStart().startsWith('{') ? '' : text;
      return text.substring(nlIdx + 1).replace(/^\s+/, '');
    }

    try {
      const div = streamMsg($('#guess-chat-area'), 'ai');
      let jsonDone = false;
      let jsonBuffer = '';
      const fullText = await chatStream(
        [...GameState.messages, { role: 'user', content: userContent }],
        GameState.apiKey,
        (chunk) => {
          if (!jsonDone) {
            jsonBuffer += chunk;
            const nlIdx = jsonBuffer.indexOf('\n');
            if (nlIdx !== -1) {
              jsonDone = true;
              const afterJson = jsonBuffer.substring(nlIdx + 1).replace(/^\s+/, '');
              if (afterJson) appendToMsg(div, afterJson);
            } else if (!jsonBuffer.trimStart().startsWith('{')) {
              jsonDone = true;
              appendToMsg(div, jsonBuffer);
            }
          } else {
            appendToMsg(div, chunk);
          }
        },
        (text) => {
          GameState.messages.push({ role: 'assistant', content: text });
          this.parseResponse(text);
          const display = stripJsonLine(text);
          div.dataset.raw = display;
          div.innerHTML = renderMarkdown(display);
        }
      );
      hideLoading('guess-loading');

      const displayText = stripJsonLine(fullText);
      const isGuess = displayText.includes('正式猜测') || displayText.includes('🎯');

      if (isGuess) {
        GameState.guess.lastActionWasGuess = true;
        this._showConfirmGuess();
      } else {
        GameState.guess.lastActionWasGuess = false;
        this._showWaitingForAnswer();
      }
    } catch (err) {
      hideLoading('guess-loading');
      const errDiv = addMsg($('#guess-chat-area'), '出错了: ' + err.message, 'system');
      errDiv.classList.add('msg-error');
      addRetryButton(errDiv, () => AIGuessMode.retry());
      this._showWaitingForAnswer();
    }
  },

  retry() {
    if (!this._lastPrompt) return;
    cleanupFailedAIResponse($('#guess-chat-area'));
    if (GameState.messages.length > 0 && GameState.messages[GameState.messages.length - 1].role === 'assistant') {
      GameState.messages.pop();
    }
    this.askNext(this._lastPrompt);
  },

  parseResponse(text) {
    const firstLine = text.split('\n')[0].trim();

    if (firstLine.startsWith('{')) {
      try {
        const json = JSON.parse(firstLine);
        if (json.confidence !== undefined) GameState.guess.confidence = json.confidence;
        if (json.confirmed_facts) GameState.guess.confirmedFacts = json.confirmed_facts;
        if (json.candidates) GameState.guess.topCandidates = json.candidates;
        if (json.portrait && typeof json.portrait === 'object') GameState.guess.portrait = json.portrait;
      } catch {}
    }

    const displayText = text.substring(text.indexOf('\n') + 1).trim();
    if (displayText && !displayText.includes('正式猜测') && !displayText.includes('🎯')) {
      GameState.guess.questionsHistory.push(displayText);
    }

    updateGuessStats();
    updatePanel();
  },

  // --- Guess Results ---

  async onGuessCorrect() {
    GameState.guess.gameOver = true;
    GameState.guess.won = true;

    $('#guess-confirm-area').classList.add('hidden');
    addMsg($('#guess-chat-area'), '猜对了！', 'user');

    await this.startReview(true);
  },

  async onGuessWrong() {
    const g = GameState.guess;
    const categoryId = GameState.category;
    g.guessesUsed++;
    g.lastActionWasGuess = true;
    updateGuessStats();

    $('#guess-confirm-area').classList.add('hidden');
    addMsg($('#guess-chat-area'), '猜错了！', 'user');

    if (g.guessesUsed >= 3) {
      g.gameOver = true;
      addMsg($('#guess-chat-area'), 'AI 用完了所有猜测次数，进入复盘阶段...', 'system');
      await this.startReview(false);
      return;
    }

    const prompt = PROMPTS.aiGuessTurn(
      '猜错了。你必须先提问，不能连续猜测。',
      g.confirmedFacts,
      g.questionsAsked, g.questionsHistory,
      g.guessesUsed, g.confidence,
      true, null, categoryId
    );
    await this.askNext(prompt);
  },

  // --- Review ---

  async startReview(won) {
    const categoryId = GameState.category;
    addMsg($('#guess-chat-area'), '━━━ 复盘阶段 ━━━', 'system');

    this._setThinking(true);
    $('#guess-response-area').classList.add('hidden');
    $('#guess-confirm-area').classList.add('hidden');
    $('#guess-hint-area').classList.add('hidden');
    $('#guess-reroll-area').classList.add('hidden');
    $('#guess-input-area').classList.add('hidden');
    $('#guess-review-area').classList.remove('hidden');
    this._setThinking(false);
    $('#guess-chat-area').scrollTop = $('#guess-chat-area').scrollHeight;

    const reviewPrompt = PROMPTS.aiGuessReview(
      won,
      GameState.guess.confirmedFacts,
      GameState.guess.questionsAsked,
      GameState.guess.guessesUsed,
      categoryId
    );

    showLoading('guess-loading');
    try {
      const div = streamMsg($('#guess-chat-area'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: reviewPrompt }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('guess-loading');
    } catch (err) {
      hideLoading('guess-loading');
      addMsg($('#guess-chat-area'), '复盘出错: ' + err.message, 'system');
    }
  },

  async handleReviewInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    $('#guess-review-input').value = '';
    addMsg($('#guess-chat-area'), trimmed, 'user');

    showLoading('guess-loading');
    try {
      const div = streamMsg($('#guess-chat-area'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: trimmed }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('guess-loading');
    } catch (err) {
      hideLoading('guess-loading');
      addMsg($('#guess-chat-area'), '回复出错: ' + err.message, 'system');
    }
  },

  showResult() {
    const g = GameState.guess;
    const won = g.won;
    const cat = CATEGORIES[GameState.category || 'history'];

    $('#result-title').textContent = won ? '🤖 AI 猜对了！' : '😅 AI 认输了！';
    $('#result-name').textContent = `你心中想的${cat.targetName}`;
    $('#result-details').innerHTML = `
      <p>📊 总提问：${g.questionsAsked} 个</p>
      <p>🎯 正式猜测：${g.guessesUsed} 次</p>
    `;

    let rating;
    if (won) {
      if (g.questionsAsked <= 5) rating = '🤖 AI 太强了！';
      else if (g.questionsAsked <= 10) rating = '🤖 AI 表现不错';
      else rating = '🤖 AI 费了点力气';
    } else {
      rating = '🤔 你赢了！';
    }

    $('#result-rating').textContent = rating;
    $('#result-stats').innerHTML = '';
    $('#result-fun-fact').classList.add('hidden');
    showScreen('screen-result');
  }
};
