/* AI Host Mode Logic — Two-column layout with scoring & blind guesses */

const AIHostMode = {
  BASE_SCORE: 100,
  QUESTION_COST: 0.5,

  // Title tiers — category-specific
  getTitle(score, difficulty, categoryId) {
    const cat = CATEGORIES[categoryId || 'history'];
    const thresholds = {
      easy:   [100, 92, 82, 70, 58, 42, 0],
      medium: [100, 88, 76, 62, 48, 32, 0],
      hard:   [100, 84, 68, 52, 38, 22, 0]
    };
    const wonTitles = cat.titles.won || ['🏆 大师', '⭐ 达人', '👍 爱好者', '🌱 入门'];
    const lostTitle = cat.titles.lost?.[0] || '🤔 下次再挑战';

    // Pad titles to match thresholds length
    while (wonTitles.length < 7) wonTitles.push(wonTitles[wonTitles.length - 1]);

    const t = thresholds[difficulty] || thresholds.easy;
    for (let i = 0; i < wonTitles.length; i++) {
      if (score >= t[i]) return wonTitles[i];
    }
    return lostTitle;
  },

  async start(difficulty, categoryId) {
    const cat = CATEGORIES[categoryId || 'history'];
    GameState.reset();
    GameState.mode = 'ai-host';
    GameState.difficulty = difficulty;
    GameState.category = categoryId;

    // Init blind guesses
    const blindTotal = GameState.getBlindGuesses();
    GameState.host.blindGuessesTotal = blindTotal;
    GameState.host.blindGuessesLeft = blindTotal;

    // Set difficulty badge
    const badge = $('#host-difficulty-badge');
    const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
    badge.textContent = `${diffLabels[difficulty]}`;
    badge.className = `badge badge-${difficulty}`;

    // Update sidebar title
    $('.host-sidebar .sidebar-title').innerHTML = `🎯 AI 出题 · ${cat.name} <span id="host-difficulty-badge" class="badge badge-${difficulty}">${diffLabels[difficulty]}</span> <button class="btn-settings btn-open-settings" title="设置">⚙️</button>`;

    // Clear UI
    $('#host-hints-area').innerHTML = '<div id="host-hints-empty" class="panel-empty">暂无线索</div>';
    $('#host-chat-area').innerHTML = '';
    $('#host-input').value = '';
    updateHostStats();
    updateHostPortrait(categoryId);
    $('#host-portrait-heading').textContent = `📋 ${cat.targetName}画像`;
    showScreen('screen-game-host');

    // Update chat header rule
    $('.host-chat-header').innerHTML = `<span class="host-chat-rule">AI 只能回答：<strong>是 / 否 / 是也不是 / ${cat.unknownAnswer}</strong></span>`;

    // Select figure
    showLoading('host-loading');
    addMsg($('#host-chat-area'), `正在选择${cat.targetName}...`, 'system');

    try {
      const selMsg = [{ role: 'user', content: PROMPTS.figureSelection(difficulty, categoryId) }];
      const raw = await chatFull(selMsg, GameState.apiKey);

      let figure;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('无法解析');
        figure = JSON.parse(jsonMatch[0]);
      } catch (e) {
        addMsg($('#host-chat-area'), `选择失败，请重试。\n\n（原始响应：${raw.substring(0, 200)}${raw.length > 200 ? '...' : ''}）`, 'system');
        hideLoading('host-loading');
        setTimeout(() => showScreen('screen-mode'), 2000);
        return;
      }

      GameState.host.secretFigure = figure;

      // Build figure info for system prompt
      const figureInfo = Object.entries(figure)
        .filter(([k]) => !['name_cn', 'name_en', 'bio', 'fun_fact'].includes(k))
        .map(([k, v]) => `${k}：${v}`)
        .join('\n');

      GameState.messages = [
        { role: 'system', content: PROMPTS.aiHostSystem(categoryId) + '\n\n你选择的' + cat.targetName + '是：' + figure.name_cn + (figure.name_en ? ' / ' + figure.name_en : '') + '\n' + figureInfo },
        { role: 'assistant', content: `好，我已经选好了一个${cat.targetName}。让我们开始吧！` }
      ];

      hideLoading('host-loading');
      $('#host-chat-area').innerHTML = '';
      addMsg($('#host-chat-area'),
        `好，我已经选好了一个${cat.targetName}。\n\n` +
        `你可以：\n` +
        `• 提问（我只会回答「是/否/是也不是/${cat.unknownAnswer}」）\n` +
        `• 直接说出名称来猜测\n` +
        `• 🎲 盲猜（你有 ${blindTotal} 次盲猜机会，猜错不扣分）\n` +
        `• 📜 提示（点击提示按钮获取线索，每条线索扣分）`,
        'ai');

    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '出错了: ' + err.message, 'system');
    }
  },

  async revealHint() {
    const host = GameState.host;
    const categoryId = GameState.category;
    const maxHints = GameState.getMaxHints();
    if (host.hintsRevealed >= maxHints) {
      addMsg($('#host-chat-area'), '所有线索已用完！', 'system');
      return false;
    }

    showLoading('host-loading');
    try {
      const hintPrompt = PROMPTS.generateHint(
        host.secretFigure, host.portrait, host.qaHistory,
        host.hintsRevealed, maxHints, categoryId, host.revealedHints
      );
      const raw = await chatFull(
        [{ role: 'user', content: hintPrompt }],
        GameState.apiKey
      );

      let hint;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('无法解析');
        hint = JSON.parse(jsonMatch[0]);
      } catch (e) {
        hideLoading('host-loading');
        addMsg($('#host-chat-area'), '生成线索失败，请重试。', 'system');
        return false;
      }

      host.revealedHints.push(`${hint.category}：${hint.content}`);

      const oldScore = host.score;
      host.hintsRevealed++;
      const level = host.hintsRevealed;
      host.score = Math.max(0, host.score - level);

      addHintCard($('#host-hints-area'), level, hint.content, hint.category);
      updateHostStats();
      updateHostScore(oldScore);
      hideLoading('host-loading');
      return true;
    } catch (err) {
      hideLoading('host-loading');
      addMsg($('#host-chat-area'), '生成线索出错: ' + err.message, 'system');
      return false;
    }
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
    const categoryId = GameState.category;
    const cat = CATEGORIES[categoryId || 'history'];
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
        { role: 'user', content: PROMPTS.evaluateGuess(host.secretFigure, trimmed, categoryId) }
      ];
      const evalResult = (await chatFull(evalMsgs, GameState.apiKey)).trim().toUpperCase();
      hideLoading('host-loading');

      if (evalResult.includes('CORRECT')) {
        addMsg($('#host-chat-area'), '🎉 盲猜命中！厉害！', 'ai');
        host.won = true;
        this.endGame(true);
        return;
      } else if (evalResult.includes('CLOSE')) {
        addMsg($('#host-chat-area'), `🔶 很接近！但不是这个${cat.targetName}。（盲猜不扣分）`, 'close');
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
      const btn = $('#btn-host-blind');
      if (btn) btn.disabled = true;
    }
  },

  // --- Normal Input ---

  async handleInput(userText) {
    const host = GameState.host;
    const categoryId = GameState.category;
    if (host.gameOver || !host.secretFigure) return;

    const trimmed = userText.trim();
    if (!trimmed) return;

    $('#host-input').value = '';
    addMsg($('#host-chat-area'), trimmed, 'user');

    if (trimmed === '提示') {
      const revealed = await this.revealHint();
      if (revealed) {
        addMsg($('#host-chat-area'), `📜 已揭示第 ${host.hintsRevealed} 条线索（扣除 ${host.hintsRevealed} 分）`, 'system');
      }
      return;
    }

    if (trimmed === '放弃' || trimmed === 'give up') {
      this.endGame(false);
      return;
    }

    showLoading('host-loading');
    try {
      const answerPrompt = PROMPTS.aiHostAnswer(
        host.secretFigure, trimmed, host.portrait, host.questionsAsked, categoryId
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
          const maxHints = GameState.getMaxHints();
          if (host.hintsRevealed < maxHints) {
            await this.revealHint();
            const msgDiv = addMsg($('#host-chat-area'), '🔶 很接近了！方向对了，已揭示新线索。', 'close');
            shake(msgDiv);
          } else {
            const msgDiv = addMsg($('#host-chat-area'), '🔶 很接近了！', 'close');
            shake(msgDiv);
          }
          return;
        } else {
          const maxHints = GameState.getMaxHints();
          if (host.hintsRevealed < maxHints) {
            await this.revealHint();
            const msgDiv = addMsg($('#host-chat-area'), '❌ 不对，已揭示新线索。', 'wrong');
            shake(msgDiv);
          } else {
            const msgDiv = addMsg($('#host-chat-area'), '❌ 不对。', 'wrong');
            shake(msgDiv);
          }
          host.guessedFigures.push(trimmed);
          return;
        }
      }

      // type === 'question'
      const answer = response.answer || '请重新提问';
      if (answer === '请重新提问') {
        addAnswerBadge($('#host-chat-area'), answer, categoryId);
        addMsg($('#host-chat-area'), '（不计入提问次数，请换一种方式提问）', 'system');
      } else {
        host.questionsAsked++;
        const oldScore = host.score;
        host.score = Math.max(0, host.score - this.QUESTION_COST);
        updateHostStats();
        updateHostScore(oldScore);

        addAnswerBadge($('#host-chat-area'), answer, categoryId);

        if (response.portrait && Object.keys(response.portrait).length > 0) {
          Object.assign(host.portrait, response.portrait);
          updateHostPortrait(categoryId);
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
    const categoryId = GameState.category;
    const maxHints = GameState.getMaxHints();
    const finalScore = host.score;
    const title = this.getTitle(finalScore, GameState.difficulty, categoryId);

    addMsg($('#host-chat-area'), '━━━ 游戏结束 ━━━', 'system');
    addMsg($('#host-chat-area'), `💰 最终得分：${finalScore} 分\n🏆 称号：${title}`, 'system');

    $('#host-input-area').classList.add('hidden');
    $('#host-blind-area').classList.add('hidden');
    $('#host-review-area').classList.remove('hidden');
    $('#host-chat-area').scrollTop = $('#host-chat-area').scrollHeight;

    const reviewPrompt = PROMPTS.aiHostReview(
      won, fig, host.hintsRevealed, maxHints,
      host.guessesUsed, host.guessedFigures,
      finalScore, title, categoryId
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
    const categoryId = GameState.category;
    const cat = CATEGORIES[categoryId || 'history'];
    const finalScore = host.score;
    const title = this.getTitle(finalScore, GameState.difficulty, categoryId);

    if (won) {
      $('#result-title').textContent = '🎉 恭喜猜对了！';
    } else {
      $('#result-title').textContent = '😔 游戏结束';
    }

    $('#result-name').textContent = fig.name_cn + (fig.name_en ? ` / ${fig.name_en}` : '');

    // Build result details from figure object (category-specific)
    let detailsHtml = '';
    const skipKeys = ['name_cn', 'name_en', 'bio', 'fun_fact'];
    for (const [key, val] of Object.entries(fig)) {
      if (skipKeys.includes(key)) continue;
      detailsHtml += `<p>${key}：${val}</p>`;
    }
    if (fig.bio) detailsHtml += `<p>📖 简介：${fig.bio}</p>`;
    $('#result-details').innerHTML = detailsHtml;

    const maxHints = GameState.getMaxHints();
    const hintsUsed = host.hintsRevealed;
    let totalHintCost = 0;
    for (let i = 1; i <= hintsUsed; i++) totalHintCost += i;
    const questionCost = host.questionsAsked * this.QUESTION_COST;
    const blindUsed = host.blindGuessesTotal - host.blindGuessesLeft;

    $('#result-stats').innerHTML = `
      <p>📜 使用线索：${hintsUsed}/${maxHints}（扣除 ${totalHintCost} 分）</p>
      <p>❓ 提问次数：${host.questionsAsked}（扣除 ${questionCost.toFixed(1)} 分）</p>
      <p>🎲 盲猜使用：${blindUsed}/${host.blindGuessesTotal}（不扣分）</p>
      <p>💰 最终得分：<strong>${finalScore}</strong> / 100</p>
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