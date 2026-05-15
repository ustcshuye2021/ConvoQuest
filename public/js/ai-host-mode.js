/* AI Host Mode Logic — Two-column layout with scoring & blind guesses */

const AIHostMode = {
  BASE_SCORE: 100,
  QUESTION_COST: 0.5,

  // Title tiers — thresholds vary by difficulty
  getTitle(score, difficulty) {
    // harder difficulty → lower threshold for same title
    const thresholds = {
      easy:   [100, 92, 82, 70, 58, 42, 0],
      medium: [100, 88, 76, 62, 48, 32, 0],
      hard:   [100, 84, 68, 52, 38, 22, 0]
    };
    const titles = [
      '🏛️ 史神 — 满分通关，历史在你面前没有秘密',
      '🎓 博古通今 — 学识渊博，令人叹服',
      '📖 学富五车 — 功底扎实，游刃有余',
      '⭐ 历史达人 — 知识面广，值得称赞',
      '👍 历史爱好者 — 有一定基础，继续努力',
      '🌱 历史入门 — 知识尚浅，有待提升',
      '🐣 历史小白 — 万丈高楼平地起，加油学习吧'
    ];
    const t = thresholds[difficulty] || thresholds.easy;
    for (let i = 0; i < titles.length; i++) {
      if (score >= t[i]) return titles[i];
    }
    return titles[titles.length - 1];
  },

  async start(difficulty) {
    GameState.reset();
    GameState.mode = 'ai-host';
    GameState.difficulty = difficulty;

    // Init blind guesses
    const blindTotal = GameState.getBlindGuesses();
    GameState.host.blindGuessesTotal = blindTotal;
    GameState.host.blindGuessesLeft = blindTotal;

    // Set difficulty badge
    const badge = $('#host-difficulty-badge');
    const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
    badge.textContent = `${diffLabels[difficulty]}`;
    badge.className = `badge badge-${difficulty}`;

    // Clear UI
    $('#host-hints-area').innerHTML = '<div id="host-hints-empty" class="panel-empty">暂无线索</div>';
    $('#host-chat-area').innerHTML = '';
    $('#host-input').value = '';
    updateHostStats();
    updateHostPortrait();
    showScreen('screen-game-host');

    // Select figure
    showLoading('host-loading');
    addMsg($('#host-chat-area'), '正在选择历史人物...', 'system');

    try {
      const selMsg = [{ role: 'user', content: PROMPTS.figureSelection(difficulty) }];
      const raw = await chatFull(selMsg, GameState.apiKey);

      let figure;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('无法解析');
        figure = JSON.parse(jsonMatch[0]);
      } catch (e) {
        addMsg($('#host-chat-area'), '选择人物失败，请重试。', 'system');
        hideLoading('host-loading');
        return;
      }

      GameState.host.secretFigure = figure;
      GameState.messages = [
        { role: 'system', content: PROMPTS.aiHostSystem + '\n\n你选择的人物是：' + figure.name_cn + ' / ' + figure.name_en + '\n时代：' + figure.era + '\n地域：' + figure.region + '\n身份：' + figure.identity + '\n成就：' + figure.achievement },
        { role: 'assistant', content: '好，我已经选好了一个历史人物。让我们开始吧！' }
      ];

      hideLoading('host-loading');
      $('#host-chat-area').innerHTML = '';
      addMsg($('#host-chat-area'),
        `好，我已经选好了一个历史人物。\n\n` +
        `你可以：\n` +
        `• 提问（我只会回答「是/否/是也不是/正史无记载」）\n` +
        `• 直接说出人名来猜测（如「达芬奇」「是牛顿吗」）\n` +
        `• 🎲 盲猜（你有 ${blindTotal} 次盲猜机会，猜错不扣分）`,
        'ai');

      // Reveal first hint
      this.revealHint();

    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '出错了: ' + err.message, 'system');
    }
  },

  revealHint() {
    const host = GameState.host;
    const maxHints = GameState.getMaxHints();
    if (host.hintsRevealed >= maxHints) {
      addMsg($('#host-chat-area'), '所有线索已用完！', 'system');
      return;
    }

    const oldScore = host.score;
    host.hintsRevealed++;
    const level = host.hintsRevealed;

    // Deduct score: clue N costs N points
    host.score = Math.max(0, host.score - level);

    const hints = host.secretFigure.hints;
    if (hints) {
      const h = Array.isArray(hints) ? hints[level - 1] : { content: hints[`L${level}`] };
      if (h) {
        addHintCard($('#host-hints-area'), level, h.content || h, h.category);
      }
    }
    updateHostStats();
    updateHostScore(oldScore);
  },

  // --- Blind Guess ---

  showBlindGuessUI() {
    const host = GameState.host;
    if (host.blindGuessesLeft <= 0 || host.gameOver) return;
    $('#host-input-area').classList.add('hidden');
    $('#host-blind-area').classList.remove('hidden');
    $('#host-blind-input').value = '';
    $('#host-blind-input').focus();
  },

  cancelBlindGuess() {
    $('#host-blind-area').classList.add('hidden');
    $('#host-input-area').classList.remove('hidden');
  },

  async submitBlindGuess(text) {
    const host = GameState.host;
    const trimmed = text.trim();
    if (!trimmed) return;

    $('#host-blind-input').value = '';
    $('#host-blind-area').classList.add('hidden');
    $('#host-input-area').classList.remove('hidden');

    host.blindGuessesLeft--;
    addMsg($('#host-chat-area'), `🎲 盲猜 (${host.blindGuessesLeft} 次剩余)：${trimmed}`, 'blind');
    updateHostStats();

    // Evaluate
    showLoading('host-loading');
    try {
      const evalMsgs = [
        { role: 'system', content: '你是一个判断助手。只回复CORRECT、CLOSE或WRONG这三个英文词之一，不要回复任何其他内容。' },
        { role: 'user', content: PROMPTS.evaluateGuess(host.secretFigure, trimmed) }
      ];
      const evalResult = (await chatFull(evalMsgs, GameState.apiKey)).trim().toUpperCase();
      hideLoading('host-loading');

      if (evalResult.includes('CORRECT')) {
        addMsg($('#host-chat-area'), '🎉 盲猜命中！厉害！', 'ai');
        host.won = true;
        this.endGame(true);
        return;
      } else if (evalResult.includes('CLOSE')) {
        addMsg($('#host-chat-area'), '🔶 很接近！但不是这个人。（盲猜不扣分）', 'close');
        this._checkBlindExhausted();
        return;
      } else {
        addMsg($('#host-chat-area'), '❌ 没猜中。（盲猜不扣分）', 'wrong');
        this._checkBlindExhausted();
        return;
      }
    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '判断出错: ' + err.message, 'system');
    }
  },

  _checkBlindExhausted() {
    const host = GameState.host;
    if (host.blindGuessesLeft <= 0) {
      addMsg($('#host-chat-area'), '🎲 盲猜机会已用完。继续通过提问缩小范围，或直接输入猜测。', 'system');
      // Disable blind guess button
      const btn = $('#btn-host-blind');
      if (btn) btn.disabled = true;
    }
  },

  // --- Normal Input ---

  async handleInput(userText) {
    const host = GameState.host;
    if (host.gameOver) return;

    const trimmed = userText.trim();
    if (!trimmed) return;

    $('#host-input').value = '';
    addMsg($('#host-chat-area'), trimmed, 'user');

    if (trimmed === '提示' || trimmed.toLowerCase() === 'hint') {
      const maxHints = GameState.getMaxHints();
      if (host.hintsRevealed >= maxHints) {
        addMsg($('#host-chat-area'), '所有线索已用完！', 'system');
        return;
      }
      this.revealHint();
      addMsg($('#host-chat-area'), `📜 已揭示第 ${host.hintsRevealed} 条线索（扣除 ${host.hintsRevealed} 分）`, 'system');
      return;
    }

    if (trimmed === '放弃' || trimmed === 'give up') {
      this.endGame(false);
      return;
    }

    showLoading('host-loading');
    try {
      const answerPrompt = PROMPTS.aiHostAnswer(
        host.secretFigure, trimmed, host.portrait, host.questionsAsked
      );
      const answerMsgs = [
        { role: 'system', content: answerPrompt },
        { role: 'user', content: trimmed }
      ];
      const raw = await chatFull(answerMsgs, GameState.apiKey);
      hideLoading('host-loading');

      let response;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('无法解析');
        response = JSON.parse(jsonMatch[0]);
      } catch (e) {
        addMsg($('#host-chat-area'), raw, 'ai');
        return;
      }

      if (response.type === 'guess') {
        host.guessesUsed++;
        updateHostStats();

        if (response.result === 'CORRECT') {
          addMsg($('#host-chat-area'), '🎉 猜对了！', 'ai');
          host.won = true;
          this.endGame(true);
          return;
        } else if (response.result === 'CLOSE') {
          const msgDiv = addMsg($('#host-chat-area'), '', 'close');
          const maxHints = GameState.getMaxHints();
          if (host.hintsRevealed < maxHints) {
            this.revealHint();
            msgDiv.textContent = '🔶 很接近了！方向对了，但不是这个人。已揭示新线索。';
          } else {
            msgDiv.textContent = '🔶 很接近了！但不是这个人。';
          }
          shake(msgDiv);
          return;
        } else {
          const msgDiv = addMsg($('#host-chat-area'), '', 'wrong');
          const maxHints = GameState.getMaxHints();
          if (host.hintsRevealed < maxHints) {
            this.revealHint();
            msgDiv.textContent = '❌ 不对。已揭示新线索。';
          } else {
            msgDiv.textContent = '❌ 不对。';
          }
          host.guessedFigures.push(trimmed);
          shake(msgDiv);
          return;
        }
      }

      // type === 'question'
      const answer = response.answer || '请重新提问';
      if (answer === '请重新提问') {
        addAnswerBadge($('#host-chat-area'), answer);
        if (response.reason) {
          addMsg($('#host-chat-area'), response.reason, 'system');
        }
        addMsg($('#host-chat-area'), '（不计入提问次数，请换一种方式提问）', 'system');
      } else {
        host.questionsAsked++;
        const oldScore = host.score;
        host.score = Math.max(0, host.score - this.QUESTION_COST);
        updateHostStats();
        updateHostScore(oldScore);

        addAnswerBadge($('#host-chat-area'), answer);
        if (response.reason) {
          addMsg($('#host-chat-area'), response.reason, 'ai');
        }

        if (response.portrait && Object.keys(response.portrait).length > 0) {
          Object.assign(host.portrait, response.portrait);
          updateHostPortrait();
        }

        host.qaHistory.push({ question: trimmed, answer });
      }
    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '出错了: ' + err.message, 'system');
    }
  },

  endGame(won) {
    const host = GameState.host;
    host.gameOver = true;
    host.won = won;
    this.startReview(won);
  },

  // --- Review ---

  async startReview(won) {
    const host = GameState.host;
    const fig = host.secretFigure;
    const maxHints = GameState.getMaxHints();
    const finalScore = host.score;
    const title = this.getTitle(finalScore, GameState.difficulty);

    addMsg($('#host-chat-area'), '━━━ 游戏结束 ━━━', 'system');
    addMsg($('#host-chat-area'), `💰 最终得分：${finalScore} 分\n🏆 称号：${title}`, 'system');

    $('#host-input-area').classList.add('hidden');
    $('#host-blind-area').classList.add('hidden');
    $('#host-review-area').classList.remove('hidden');
    $('#host-chat-area').scrollTop = $('#host-chat-area').scrollHeight;

    const reviewPrompt = PROMPTS.aiHostReview(
      won, fig, host.hintsRevealed, maxHints,
      host.guessesUsed, host.guessedFigures,
      finalScore, title
    );

    showLoading('host-loading');
    try {
      const div = streamMsg($('#host-chat-area'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: reviewPrompt }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('host-loading');
    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '复盘出错: ' + err.message, 'system');
    }
  },

  async handleReviewInput(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    $('#host-review-input').value = '';
    addMsg($('#host-chat-area'), trimmed, 'user');

    showLoading('host-loading');
    try {
      const div = streamMsg($('#host-chat-area'), 'ai');
      await chatStream(
        [...GameState.messages, { role: 'user', content: trimmed }],
        GameState.apiKey,
        (chunk) => appendToMsg(div, chunk),
        (text) => { GameState.messages.push({ role: 'assistant', content: text }); }
      );
      hideLoading('host-loading');
    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '回复出错: ' + err.message, 'system');
    }
  },

  showResult() {
    const host = GameState.host;
    const won = host.won;
    const fig = host.secretFigure;
    const finalScore = host.score;
    const title = this.getTitle(finalScore, GameState.difficulty);

    if (won) {
      $('#result-title').textContent = '🎉 恭喜猜对了！/ Congratulations!';
    } else {
      $('#result-title').textContent = '😔 游戏结束 / Game Over';
    }

    $('#result-name').textContent = `${fig.name_cn} / ${fig.name_en}`;
    $('#result-details').innerHTML = `
      <p>📅 时代 / Era: ${fig.era}</p>
      <p>📍 地域 / Region: ${fig.region}</p>
      <p>🏛️ 身份 / Identity: ${fig.identity}</p>
      <p>⭐ 成就 / Achievement: ${fig.achievement}</p>
      <p>📖 简介 / Bio: ${fig.bio}</p>
    `;

    const maxHints = GameState.getMaxHints();
    const hintsUsed = host.hintsRevealed;
    let totalHintCost = 0;
    for (let i = 1; i <= hintsUsed; i++) totalHintCost += i;
    const questionCost = host.questionsAsked * this.QUESTION_COST;
    const blindUsed = host.blindGuessesTotal - host.blindGuessesLeft;

    $('#result-stats').innerHTML = `
      <p>📜 使用线索 / Hints: ${hintsUsed}/${maxHints}（扣除 ${totalHintCost} 分）</p>
      <p>❓ 提问次数 / Questions: ${host.questionsAsked}（扣除 ${questionCost.toFixed(1)} 分）</p>
      <p>🎲 盲猜使用 / Blind guesses: ${blindUsed}/${host.blindGuessesTotal}（不扣分）</p>
      <p>💰 最终得分 / Score: <strong>${finalScore}</strong> / 100</p>
    `;
    $('#result-rating').innerHTML = `🏆 称号：${title}`;

    if (fig.fun_fact) {
      $('#result-fun-fact').classList.remove('hidden');
      $('#result-fun-fact').innerHTML = `<strong>💡 小知识：</strong>${fig.fun_fact}`;
    } else {
      $('#result-fun-fact').classList.add('hidden');
    }

    showScreen('screen-result');
  }
};
