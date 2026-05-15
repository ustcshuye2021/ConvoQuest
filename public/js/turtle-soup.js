/* Turtle Soup (海龟汤) Game Logic */

const DIFFICULTY_CONFIG = {
  easy:   { name: '简单', maxQuestions: 20, maxGuesses: 3 },
  normal: { name: '一般', maxQuestions: 40, maxGuesses: 4 },
  hard:   { name: '困难', maxQuestions: 60, maxGuesses: 5 },
  hell:   { name: '地狱', maxQuestions: 80, maxGuesses: 6 }
};

/* === AI Hosts Mode (AI出题 我来猜) === */

const TurtleHostMode = {
  _lastInput: null,
  _stateSnapshot: null,

  async start(difficulty) {
    GameState.reset();
    GameState.mode = 'turtle-host';
    GameState.difficulty = difficulty;

    const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
    $('#turtle-host-badge').textContent = diffLabels[difficulty];
    $('#turtle-host-badge').className = `badge badge-${difficulty}`;

    // Clear UI
    $('#turtle-host-surface').textContent = '';
    $('#turtle-host-surface-box').classList.add('hidden');
    $('#turtle-host-chat').innerHTML = '';
    $('#turtle-host-input-area').classList.add('hidden');
    $('#turtle-host-guess-area').classList.add('hidden');
    $('#turtle-host-known').innerHTML = '';
    $('#turtle-host-known-empty').style.display = '';
    $('#turtle-host-hints-revealed').classList.add('hidden');
    $('#turtle-host-hints-list').innerHTML = '';
    updateTurtleHostStats();
    showScreen('screen-turtle-host');

    // Generate puzzle
    showLoading('turtle-host-loading');
    addMsg($('#turtle-host-chat'), '正在生成海龟汤题目...', 'system');

    try {
      const raw = await chatFull(
        [{ role: 'user', content: TURTLE_PROMPTS.hostGenerate(difficulty) }],
        GameState.apiKey
      );

      let puzzle;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('无法解析');
        puzzle = JSON.parse(jsonMatch[0]);
      } catch {
        addMsg($('#turtle-host-chat'), '生成题目失败，请重试。', 'system');
        hideLoading('turtle-host-loading');
        return;
      }

      GameState.turtle.puzzle = puzzle;
      GameState.messages = [
        { role: 'system', content: TURTLE_PROMPTS.hostSystem + '\n\n汤面：' + puzzle.surface + '\n汤底：' + puzzle.truth + '\n类型：' + puzzle.genre }
      ];

      // Show surface
      hideLoading('turtle-host-loading');
      $('#turtle-host-chat').innerHTML = '';
      $('#turtle-host-surface').textContent = puzzle.surface;
      $('#turtle-host-surface-box').classList.remove('hidden');
      $('#turtle-host-input-area').classList.remove('hidden');
      addMsg($('#turtle-host-chat'), '请通过问"是/否"问题来推理真相。你也可以输入「提示」获取线索，或输入「放弃」揭晓答案。', 'system');
    } catch (err) {
      hideLoading('turtle-host-loading');
      addMsg($('#turtle-host-chat'), '出错了: ' + err.message, 'system');
    }
  },

  async handleInput(text, isRetry = false) {
    const t = GameState.turtle;
    if (t.gameOver) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    if (!isRetry) {
      $('#turtle-host-input').value = '';
      addMsg($('#turtle-host-chat'), trimmed, 'user');
    }
    this._lastInput = trimmed;

    // Hint request
    if (trimmed === '提示' || trimmed === 'hint') {
      this.giveHint();
      return;
    }

    // Give up
    if (trimmed === '放弃' || trimmed === 'give up') {
      this.revealTruth();
      return;
    }

    if (!isRetry) {
      t.questionsAsked++;
      updateTurtleHostStats();
      t.lastQuestion = trimmed;
    }

    // Send to AI
    this._stateSnapshot = {
      knownInfo: JSON.parse(JSON.stringify(t.knownInfo)),
      confirmedFacts: [...t.confirmedFacts],
    };

    showLoading('turtle-host-loading');
    const turnMsg = TURTLE_PROMPTS.hostTurn(
      t.puzzle.surface, t.puzzle.truth,
      t.hintsRevealed, t.questionsAsked, 30
    );
    GameState.messages.push({ role: 'user', content: turnMsg + '\n\n玩家提问：' + trimmed });

    try {
      const div = streamMsg($('#turtle-host-chat'), 'ai');
      let jsonDone = false;
      let jsonBuffer = '';

      await chatStream(
        GameState.messages, GameState.apiKey,
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
          const display = stripJsonMetadata(text);
          div.dataset.raw = display;
          div.innerHTML = renderMarkdown(display);
          this.parseAnswer(text, trimmed);
        }
      );
      hideLoading('turtle-host-loading');
      $('#turtle-host-chat').scrollTop = $('#turtle-host-chat').scrollHeight;
    } catch (err) {
      hideLoading('turtle-host-loading');
      const errDiv = addMsg($('#turtle-host-chat'), '出错了: ' + err.message, 'system');
      errDiv.classList.add('msg-error');
      addRetryButton(errDiv, () => TurtleHostMode.retry());
    }
  },

  retry() {
    if (!this._lastInput) return;
    cleanupFailedAIResponse($('#turtle-host-chat'));
    if (GameState.messages.length > 0 && GameState.messages[GameState.messages.length - 1].role === 'assistant') {
      GameState.messages.pop();
    }
    if (GameState.messages.length > 0 && GameState.messages[GameState.messages.length - 1].role === 'user') {
      GameState.messages.pop();
    }
    if (this._stateSnapshot) {
      const s = this._stateSnapshot;
      const t = GameState.turtle;
      t.knownInfo = s.knownInfo;
      t.confirmedFacts = s.confirmedFacts;
      updateTurtleHostStats();
      TurtleHostMode.updateKnownInfoPanel();
    }
    this.handleInput(this._lastInput, true);
  },

  async handleGuess(text) {
    const t = GameState.turtle;
    if (t.gameOver) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    $('#turtle-host-guess-input').value = '';
    addMsg($('#turtle-host-chat'), '🔮 我的猜测：' + trimmed, 'user');
    t.guessesUsed++;
    updateTurtleHostStats();

    // Evaluate guess
    showLoading('turtle-host-loading');
    try {
      const evalMsgs = [
        { role: 'system', content: '你是一个判断助手。只回复CORRECT、CLOSE、PARTIAL或WRONG这四个英文词之一，不要回复任何其他内容。' },
        { role: 'user', content: TURTLE_PROMPTS.evaluateGuess(t.puzzle.truth, trimmed) }
      ];
      const result = (await chatFull(evalMsgs, GameState.apiKey)).trim().toUpperCase();
      hideLoading('turtle-host-loading');

      if (result.includes('CORRECT')) {
        addMsg($('#turtle-host-chat'), '🎉 完全正确！', 'ai');
        this.revealTruth(true);
      } else if (result.includes('CLOSE')) {
        addMsg($('#turtle-host-chat'), '🔶 很接近了！方向对了但还差一些关键细节。继续提问吧。', 'system');
      } else if (result.includes('PARTIAL')) {
        addMsg($('#turtle-host-chat'), '🟡 有一部分是对的，但整体还差很远。', 'system');
      } else {
        addMsg($('#turtle-host-chat'), '❌ 不对，真相不是这样的。', 'system');
      }
      $('#turtle-host-chat').scrollTop = $('#turtle-host-chat').scrollHeight;
    } catch (err) {
      hideLoading('turtle-host-loading');
      addMsg($('#turtle-host-chat'), '判断出错: ' + err.message, 'system');
    }
  },

  giveHint() {
    const t = GameState.turtle;
    if (t.hintsRevealed >= 4) {
      addMsg($('#turtle-host-chat'), '所有提示已用完！', 'system');
      return;
    }

    t.hintsRevealed++;
    const hint = t.puzzle.hints?.[`H${t.hintsRevealed}`];
    if (hint) {
      addMsg($('#turtle-host-chat'), `💡 提示${t.hintsRevealed}：${hint}`, 'system');
      // Add hint to sidebar
      this.addHintToList(t.hintsRevealed, hint);
    }
    updateTurtleHostStats();
    $('#turtle-host-chat').scrollTop = $('#turtle-host-chat').scrollHeight;
  },

  parseAnswer(text, question) {
    const t = GameState.turtle;
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.startsWith('{')) {
      try {
        const json = JSON.parse(firstLine);
        const answer = json.answer;
        if (answer && ['是', '否', '是也不是', '无关'].includes(answer)) {
          t.knownInfo.push({ question, answer });
        }
        if (json.confirmed_facts) {
          t.confirmedFacts = json.confirmed_facts;
        }
      } catch {}
    }
    this.updateKnownInfoPanel();
  },

  updateKnownInfoPanel() {
    const t = GameState.turtle;
    const ul = $('#turtle-host-known');
    const empty = $('#turtle-host-known-empty');

    if (t.confirmedFacts.length > 0) {
      ul.innerHTML = t.confirmedFacts.map(fact => `<li>${fact}</li>`).join('');
      empty.style.display = 'none';
    } else {
      ul.innerHTML = '';
      empty.style.display = '';
    }
  },

  addHintToList(num, hint) {
    const section = $('#turtle-host-hints-revealed');
    const list = $('#turtle-host-hints-list');
    section.classList.remove('hidden');
    list.innerHTML += `<li><span class="known-cat">💡 H${num}</span>${hint}</li>`;
  },

  revealTruth(won = false) {
    const t = GameState.turtle;
    t.gameOver = true;
    t.won = won;
    const puzzle = t.puzzle;

    addMsg($('#turtle-host-chat'), `━━━ 真相揭晓 ━━━\n${puzzle.truth}`, 'system');
    $('#turtle-host-chat').scrollTop = $('#turtle-host-chat').scrollHeight;

    this.startReview(won);
  },

  // --- Review ---

  async startReview(won) {
    const t = GameState.turtle;
    const puzzle = t.puzzle;

    addMsg($('#turtle-host-chat'), '━━━ 复盘阶段 ━━━', 'system');

    // Hide game input, show review area
    $('#turtle-host-input-area').classList.add('hidden');
    $('#turtle-host-guess-area').classList.add('hidden');
    $('#turtle-host-review-area').classList.remove('hidden');
    $('#turtle-host-chat').scrollTop = $('#turtle-host-chat').scrollHeight;

    const reviewPrompt = TURTLE_PROMPTS.hostReview(
      won, puzzle, t.questionsAsked, t.hintsRevealed
    );

    showLoading('turtle-host-loading');
    try {
      const div = streamMsg($('#turtle-host-chat'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: reviewPrompt }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('turtle-host-loading');
    } catch (err) {
      hideLoading('turtle-host-loading');
      addMsg($('#turtle-host-chat'), '复盘出错: ' + err.message, 'system');
    }
  },

  async handleReviewInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    $('#turtle-host-review-input').value = '';
    addMsg($('#turtle-host-chat'), trimmed, 'user');

    showLoading('turtle-host-loading');
    try {
      const div = streamMsg($('#turtle-host-chat'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: trimmed }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('turtle-host-loading');
    } catch (err) {
      hideLoading('turtle-host-loading');
      addMsg($('#turtle-host-chat'), '回复出错: ' + err.message, 'system');
    }
  },

  showResult() {
    const t = GameState.turtle;
    const won = t.won;
    const puzzle = t.puzzle;

    if (won) {
      $('#result-title').textContent = '🎉 推理成功！';
    } else {
      $('#result-title').textContent = '😅 游戏结束';
    }

    $('#result-name').textContent = puzzle.genre + ' · 海龟汤';
    $('#result-details').innerHTML = `
      <p><strong>汤面：</strong>${puzzle.surface}</p>
      <p style="margin-top:8px"><strong>汤底：</strong>${puzzle.truth}</p>
    `;

    let rating = '';
    if (won) {
      if (t.questionsAsked <= 5) rating = '🏆 逻辑天才！';
      else if (t.questionsAsked <= 10) rating = '⭐ 推理高手';
      else if (t.questionsAsked <= 20) rating = '👍 思维敏捷';
      else rating = '😅 曲折过关';
    } else {
      rating = '🤔 下次再挑战';
    }

    $('#result-stats').innerHTML = `
      <p>❓ 提问次数：${t.questionsAsked}</p>
      <p>💡 使用提示：${t.hintsRevealed}/4</p>
      <p>🔮 猜测次数：${t.guessesUsed}</p>
    `;
    $('#result-rating').textContent = rating;
    $('#result-fun-fact').classList.add('hidden');
    showScreen('screen-result');
  }
};

/* === Player Hosts Mode (我出题 AI来猜) === */

const TurtleGuessMode = {
  _lastPrompt: null,
  _stateSnapshot: null,

  async start(difficulty) {
    GameState.reset();
    GameState.mode = 'turtle-guess';

    const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
    const t = GameState.turtle;
    t.difficulty = difficulty;
    t.maxQuestions = config.maxQuestions;
    t.maxGuesses = config.maxGuesses;

    const diffLabels = { easy: '简单', normal: '一般', hard: '困难', hell: '地狱' };
    const badge = $('#turtle-guess-badge');
    if (badge) {
      badge.textContent = diffLabels[difficulty] || '一般';
      badge.className = `badge badge-${difficulty}`;
    }

    // Clear UI
    $('#turtle-guess-surface-display').textContent = '';
    $('#turtle-guess-surface-box').classList.add('hidden');
    $('#turtle-guess-chat').innerHTML = '';
    $('#turtle-guess-input-area').classList.add('hidden');
    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-confirm-area').classList.add('hidden');
    $('#turtle-guess-reroll-area').classList.add('hidden');
    $('#turtle-guess-hint-prompt-area').classList.add('hidden');
    $('#turtle-guess-setup').classList.remove('hidden');
    $('#turtle-guess-surface-input').value = '';
    updateTurtleGuessStats();

    showScreen('screen-turtle-guess');
  },

  async onSubmitSurface() {
    const text = $('#turtle-guess-surface-input').value.trim();
    if (!text) return;

    GameState.turtle.surface = text;
    $('#turtle-guess-setup').classList.add('hidden');
    $('#turtle-guess-surface-display').textContent = text;
    $('#turtle-guess-surface-box').classList.remove('hidden');

    GameState.messages = [
      { role: 'system', content: TURTLE_PROMPTS.guessSystem(GameState.turtle.maxQuestions, GameState.turtle.maxGuesses) }
    ];

    // First: analyze the surface and show reasoning
    await this.analyzeSurface(text);

    // Then: ask first question
    addMsg($('#turtle-guess-chat'), '分析完毕，开始提问。', 'system');
    await this.askNext(TURTLE_PROMPTS.guessFirstTurn(text));
  },

  async analyzeSurface(surface) {
    showLoading('turtle-guess-loading');
    addMsg($('#turtle-guess-chat'), '正在分析汤面...', 'system');

    try {
      const raw = await chatFull(
        [...GameState.messages, { role: 'user', content: TURTLE_PROMPTS.guessAnalyzeSurface(surface) }],
        GameState.apiKey
      );

      // Parse JSON from first line
      const lines = raw.split('\n');
      const firstLine = lines[0].trim();
      if (firstLine.startsWith('{')) {
        try {
          const json = JSON.parse(firstLine);
          if (json.surface_analysis) {
            GameState.turtle.keyInsights = json.surface_analysis;
          }
        } catch {}
      }

      // Show analysis text in chat (skip JSON line)
      const displayText = firstLine.startsWith('{')
        ? lines.slice(1).join('\n').trim()
        : raw.trim();

      if (displayText) {
        const div = addMsg($('#turtle-guess-chat'), '', 'ai');
        div.innerHTML = renderMarkdown('**🔍 汤面分析**\n\n' + displayText);
      }

      updateTurtleGuessStats();
      GameState.messages.push({ role: 'assistant', content: raw });
      hideLoading('turtle-guess-loading');
    } catch (err) {
      hideLoading('turtle-guess-loading');
      addMsg($('#turtle-guess-chat'), '分析出错: ' + err.message, 'system');
    }
  },

  async onAnswer(answer) {
    const t = GameState.turtle;
    if (t.gameOver) return;

    if (t.lastQuestion) {
      t.qaHistory.push({ question: t.lastQuestion, answer: answer });
    }

    addMsg($('#turtle-guess-chat'), answer, 'user');
    t.questionsAsked++;

    // Check question limit - force final guess
    if (t.questionsAsked >= t.maxQuestions) {
      updateTurtleGuessStats();
      const prompt = TURTLE_PROMPTS.guessForceGuess(
        t.confirmedFacts, t.keyInsights,
        t.questionsAsked, t.guessesUsed, t.maxGuesses
      );
      $('#turtle-guess-response-area').classList.add('hidden');
      $('#turtle-guess-input-area').classList.add('hidden');
      await this.askNext(prompt);
      return;
    }

    // Check hint prompt (every 15 questions)
    if (t.questionsAsked > 0 && t.questionsAsked % 15 === 0) {
      updateTurtleGuessStats();
      t._lastAnswer = answer;
      this.showHintPrompt();
      return;
    }

    const prompt = TURTLE_PROMPTS.guessTurn(
      answer,
      t.confirmedFacts,
      t.keyInsights,
      t.questionsAsked,
      t.guessesUsed,
      t.confidence,
      t.maxQuestions,
      t.maxGuesses
    );

    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-input-area').classList.add('hidden');
    await this.askNext(prompt);
  },

  showHintPrompt() {
    const t = GameState.turtle;
    addMsg($('#turtle-guess-chat'), `💭 已进行 ${t.questionsAsked}/${t.maxQuestions} 个问题。你可以给AI一个提示帮助它推理，也可以跳过。`, 'system');
    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-input-area').classList.add('hidden');
    $('#turtle-guess-hint-prompt-area').classList.remove('hidden');
    $('#turtle-guess-hint-input').value = '';
    $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;
  },

  submitHintAndContinue(hintText) {
    const t = GameState.turtle;
    $('#turtle-guess-hint-prompt-area').classList.add('hidden');

    const trimmed = hintText.trim();
    if (trimmed) {
      t.playerHints.push(trimmed);
      addMsg($('#turtle-guess-chat'), `💡 提示：${trimmed}`, 'user');
    }

    let prompt = TURTLE_PROMPTS.guessTurn(
      t._lastAnswer || '',
      t.confirmedFacts,
      t.keyInsights,
      t.questionsAsked,
      t.guessesUsed,
      t.confidence,
      t.maxQuestions,
      t.maxGuesses
    );

    if (trimmed) {
      prompt += `\n\n[玩家主动提示] 玩家给你一个额外提示：「${trimmed}」。请结合这个提示继续推理。`;
    }

    this.askNext(prompt);
  },

  async onFreeInput(text) {
    const t = GameState.turtle;
    if (t.gameOver) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    $('#turtle-guess-input').value = '';
    addMsg($('#turtle-guess-chat'), trimmed, 'user');

    const prompt = `[自由对话] 用户说：\n"${trimmed}"\n\n请理解用户意图，将其视为对你上一个问题的回答（如果适用），然后继续提问。`;
    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-input-area').classList.add('hidden');
    await this.askNext(prompt);
  },

  async askNext(userContent) {
    this._lastPrompt = userContent;

    const t = GameState.turtle;
    this._stateSnapshot = {
      confirmedFacts: [...t.confirmedFacts],
      keyInsights: [...t.keyInsights],
      confidence: t.confidence,
      lastQuestion: t.lastQuestion,
      qaHistory: JSON.parse(JSON.stringify(t.qaHistory)),
    };

    showLoading('turtle-guess-loading');

    try {
      const div = streamMsg($('#turtle-guess-chat'), 'ai');
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
          const display = stripJsonMetadata(text);
          div.dataset.raw = display;
          div.innerHTML = renderMarkdown(display);
          GameState.turtle.lastQuestion = display;
        }
      );
      hideLoading('turtle-guess-loading');

      const displayText = stripJsonMetadata(fullText);
      if (displayText.includes('正式猜测') || displayText.includes('🎯')) {
        this.showGuessConfirmation(displayText);
      } else {
        $('#turtle-guess-response-area').classList.remove('hidden');
        $('#turtle-guess-input-area').classList.remove('hidden');
      }
      $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;
    } catch (err) {
      hideLoading('turtle-guess-loading');
      const errDiv = addMsg($('#turtle-guess-chat'), '出错了: ' + err.message, 'system');
      errDiv.classList.add('msg-error');
      addRetryButton(errDiv, () => TurtleGuessMode.retry());
    }
  },

  parseResponse(text) {
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.startsWith('{')) {
      try {
        const json = JSON.parse(firstLine);
        if (json.confidence !== undefined) GameState.turtle.confidence = json.confidence;
        if (json.confirmed_facts) GameState.turtle.confirmedFacts = json.confirmed_facts;
        if (json.key_insights) GameState.turtle.keyInsights = json.key_insights;
      } catch {}
    }
    updateTurtleGuessStats();
  },

  showGuessConfirmation(guessText) {
    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-input-area').classList.add('hidden');
    $('#turtle-guess-confirm-area').classList.remove('hidden');
    $('#turtle-guess-confirm-text').textContent = guessText.replace(/\{.*?\}/, '').trim();
    $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;
  },

  async onGuessCorrect() {
    const t = GameState.turtle;
    t.gameOver = true;
    t.won = true;
    $('#turtle-guess-confirm-area').classList.add('hidden');
    addMsg($('#turtle-guess-chat'), '猜对了！', 'user');

    await this.startReview(true);
  },

  async onGuessClose() {
    const t = GameState.turtle;
    t.guessesUsed++;
    updateTurtleGuessStats();

    $('#turtle-guess-confirm-area').classList.add('hidden');
    addMsg($('#turtle-guess-chat'), '🔶 很接近了，但还差一些。', 'user');

    if (t.guessesUsed >= t.maxGuesses) {
      t.gameOver = true;
      addMsg($('#turtle-guess-chat'), 'AI 用完了所有猜测次数，进入复盘阶段...', 'system');
      await this.startReview(false);
      return;
    }

    // Show free input to let player provide feedback
    $('#turtle-guess-input-area').classList.remove('hidden');
    addMsg($('#turtle-guess-chat'), '你可以告诉 AI 还需要猜哪些信息，或者当前猜测有哪些地方不对。', 'system');
    $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;
  },

  async onGuessFar() {
    const t = GameState.turtle;
    t.guessesUsed++;
    updateTurtleGuessStats();

    $('#turtle-guess-confirm-area').classList.add('hidden');
    addMsg($('#turtle-guess-chat'), '🔴 还差很多。', 'user');

    if (t.guessesUsed >= t.maxGuesses) {
      t.gameOver = true;
      addMsg($('#turtle-guess-chat'), 'AI 用完了所有猜测次数，进入复盘阶段...', 'system');
      await this.startReview(false);
      return;
    }

    // Show free input to let player provide feedback
    $('#turtle-guess-input-area').classList.remove('hidden');
    addMsg($('#turtle-guess-chat'), '你可以告诉 AI 还需要猜哪些信息，或者当前猜测有哪些地方不对。', 'system');
    $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;
  },

  showRerollPrompt() {
    const t = GameState.turtle;
    if (t.qaHistory.length === 0) {
      addMsg($('#turtle-guess-chat'), '还没有已回答的问题可以纠错。', 'system');
      return;
    }

    const select = $('#turtle-guess-reroll-select');
    select.innerHTML = t.qaHistory.map((qa, i) => {
      const qShort = qa.question.length > 25 ? qa.question.slice(0, 25) + '...' : qa.question;
      return `<option value="${i}">第${i + 1}问：${qShort}（原答：${qa.answer}）</option>`;
    }).join('');

    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-input-area').classList.add('hidden');
    $('#turtle-guess-reroll-area').classList.remove('hidden');
    $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;
  },

  async onRerollAnswer() {
    const t = GameState.turtle;
    const idx = parseInt($('#turtle-guess-reroll-select').value);
    const newAnswer = $('#turtle-guess-reroll-new-answer').value;

    if (isNaN(idx) || !newAnswer) return;

    const oldQa = t.qaHistory[idx];
    if (!oldQa) return;

    $('#turtle-guess-reroll-area').classList.add('hidden');

    const qNum = idx + 1;
    addMsg($('#turtle-guess-chat'), `纠错：第${qNum}问的回答从「${oldQa.answer}」改为「${newAnswer}」`, 'system');

    t.qaHistory[idx].answer = newAnswer;

    const correctionPrompt = `[纠错] 用户修正了第${qNum}个问题的回答：
原问题：${oldQa.question}
原回答：${oldQa.answer}
新回答：${newAnswer}

请根据修正后的回答重新推理：
1. 更新 confirmed_facts（已确认事实）
2. 更新 key_insights（关键推理）
3. 继续提问`;

    await this.askNext(correctionPrompt);
  },

  onRerollCancel() {
    $('#turtle-guess-reroll-area').classList.add('hidden');
    $('#turtle-guess-response-area').classList.remove('hidden');
    $('#turtle-guess-input-area').classList.remove('hidden');
  },

  retry() {
    if (!this._lastPrompt) return;
    cleanupFailedAIResponse($('#turtle-guess-chat'));
    if (GameState.messages.length > 0 && GameState.messages[GameState.messages.length - 1].role === 'assistant') {
      GameState.messages.pop();
    }
    if (this._stateSnapshot) {
      const s = this._stateSnapshot;
      const t = GameState.turtle;
      t.confirmedFacts = s.confirmedFacts;
      t.keyInsights = s.keyInsights;
      t.confidence = s.confidence;
      t.lastQuestion = s.lastQuestion;
      t.qaHistory = s.qaHistory;
      updateTurtleGuessStats();
    }
    this.askNext(this._lastPrompt);
  },

  async onGuessWrong() {
    const t = GameState.turtle;
    t.guessesUsed++;
    t.gameOver = true;
    updateTurtleGuessStats();

    $('#turtle-guess-confirm-area').classList.add('hidden');
    addMsg($('#turtle-guess-chat'), '❌ 完全不对！AI 被判负。', 'user');

    await this.startReview(false);
  },

  // --- Review ---

  async startReview(won) {
    const t = GameState.turtle;

    addMsg($('#turtle-guess-chat'), '━━━ 复盘阶段 ━━━', 'system');

    // Hide other areas, show review area
    $('#turtle-guess-response-area').classList.add('hidden');
    $('#turtle-guess-input-area').classList.add('hidden');
    $('#turtle-guess-confirm-area').classList.add('hidden');
    $('#turtle-guess-review-area').classList.remove('hidden');
    $('#turtle-guess-chat').scrollTop = $('#turtle-guess-chat').scrollHeight;

    const reviewPrompt = TURTLE_PROMPTS.guessReview(
      won, t.surface, t.confirmedFacts,
      t.keyInsights, t.questionsAsked, t.guessesUsed
    );

    showLoading('turtle-guess-loading');
    try {
      const div = streamMsg($('#turtle-guess-chat'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: reviewPrompt }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('turtle-guess-loading');
    } catch (err) {
      hideLoading('turtle-guess-loading');
      addMsg($('#turtle-guess-chat'), '复盘出错: ' + err.message, 'system');
    }
  },

  async handleReviewInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    $('#turtle-guess-review-input').value = '';
    addMsg($('#turtle-guess-chat'), trimmed, 'user');

    showLoading('turtle-guess-loading');
    try {
      const div = streamMsg($('#turtle-guess-chat'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: trimmed }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('turtle-guess-loading');
    } catch (err) {
      hideLoading('turtle-guess-loading');
      addMsg($('#turtle-guess-chat'), '回复出错: ' + err.message, 'system');
    }
  },

  showResult() {
    const t = GameState.turtle;
    const won = t.won;
    const config = DIFFICULTY_CONFIG[t.difficulty] || DIFFICULTY_CONFIG.normal;

    if (won) {
      $('#result-title').textContent = '🤖 AI 猜对了！';
    } else {
      $('#result-title').textContent = '🧠 你赢了！AI 没猜出来';
    }
    const diffLabels = { easy: '简单', normal: '一般', hard: '困难', hell: '地狱' };
    $('#result-name').textContent = `海龟汤 · ${diffLabels[t.difficulty] || '一般'}`;
    $('#result-details').innerHTML = `
      <p><strong>汤面：</strong>${t.surface}</p>
      <p>📊 总提问：${t.questionsAsked}/${t.maxQuestions}</p>
      <p>🎯 正式猜测：${t.guessesUsed}/${t.maxGuesses}</p>
      <p>💡 玩家提示：${t.playerHints.length}次</p>
    `;

    let rating = '';
    if (won) {
      if (t.questionsAsked <= t.maxQuestions * 0.25) rating = '🤖 AI 太强了！';
      else if (t.questionsAsked <= t.maxQuestions * 0.5) rating = '🤖 AI 表现不错';
      else rating = '🤖 AI 费了点力气';
    } else {
      rating = '🧠 你的题目太难了！';
    }

    $('#result-rating').textContent = rating;
    $('#result-stats').innerHTML = '';
    $('#result-fun-fact').classList.add('hidden');
    showScreen('screen-result');
  }
};
