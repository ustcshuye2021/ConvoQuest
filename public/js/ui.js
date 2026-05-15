/* UI Helper Functions */

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function renderMarkdown(text) {
  if (!text) return '';
  try {
    return marked.parse(text, { breaks: true });
  } catch {
    return text.replace(/\n/g, '<br>');
  }
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  GameState.screen = id;
  window.scrollTo(0, 0);
}

function addMsg(container, text, type) {
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  if (type === 'ai') {
    div.innerHTML = renderMarkdown(text);
  } else {
    div.textContent = text;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function addMsgHTML(container, html, type) {
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  div.innerHTML = html;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function streamMsg(container, type) {
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  div.textContent = '';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendToMsg(div, text) {
  if (div.classList.contains('msg-ai')) {
    const current = div.dataset.raw || '';
    const updated = current + text;
    div.dataset.raw = updated;
    div.innerHTML = renderMarkdown(updated);
  } else {
    div.textContent += text;
  }
  const container = div.parentElement;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function addHintCard(container, level, text, category) {
  const div = document.createElement('div');
  div.className = 'hint-card';
  const label = category || 'L' + level;
  div.innerHTML = `<span class="hint-level l${level}">${label}</span><div class="hint-text">${text}</div>`;
  // Hide empty hint
  const emptyHint = container.querySelector('.panel-empty');
  if (emptyHint) emptyHint.style.display = 'none';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateHostStats() {
  const host = GameState.host;
  const maxHints = GameState.getMaxHints();
  $('#host-hints-count').textContent = `${host.hintsRevealed}/${maxHints}`;
  $('#host-questions-count').textContent = `${host.questionsAsked}`;
  $('#host-blind-left').textContent = `${host.blindGuessesLeft}`;
}

// Score is tracked internally but not displayed to player
function updateHostScore() {
  // no-op: score hidden from UI
}

function updateHostPortrait(categoryId) {
  const portraitUl = $('#host-portrait');
  const emptyHint = $('#host-portrait-empty');
  const portrait = GameState.host.portrait;
  const entries = Object.entries(portrait);

  if (entries.length > 0) {
    portraitUl.innerHTML = entries.map(([cat, val]) =>
      `<li><span class="known-cat">${PORTRAIT_ICONS[cat] || '📌'} ${cat}</span>${val}</li>`
    ).join('');
    if (emptyHint) emptyHint.style.display = 'none';
  } else {
    portraitUl.innerHTML = '';
    if (emptyHint) emptyHint.style.display = '';
  }
}

function addAnswerBadge(container, answer, categoryId) {
  const cat = CATEGORIES[categoryId || 'history'];
  const unknownText = cat.unknownAnswer;
  const badge = document.createElement('div');
  const answerMap = {
    '是': { cls: 'yes', icon: '✅', text: '是' },
    '否': { cls: 'no', icon: '❌', text: '否' },
    '是也不是': { cls: 'partial', icon: '↔️', text: '是也不是' },
    [unknownText]: { cls: 'unknown', icon: '❓', text: unknownText },
    '请重新提问': { cls: 'rephrase', icon: '🔄', text: '请重新提问' }
  };
  const info = answerMap[answer] || { cls: 'unknown', icon: '❓', text: answer };
  badge.className = `answer-badge ${info.cls}`;
  badge.textContent = `${info.icon} ${info.text}`;
  container.appendChild(badge);
  container.scrollTop = container.scrollHeight;
  return badge;
}

function updateGuessStats() {
  const g = GameState.guess;
  $('#guess-questions-count').textContent = `${g.questionsAsked}`;
  $('#guess-guesses-left').textContent = `${3 - g.guessesUsed}`;
  $('#guess-confidence').textContent = `${g.confidence}`;
  const fill = document.getElementById('confidence-fill');
  if (fill) fill.style.width = `${g.confidence}%`;
  // Show reroll button only when there are answered questions
  const rerollBtn = document.getElementById('btn-guess-reroll');
  if (rerollBtn) {
    rerollBtn.style.display = g.qaHistory.length > 0 ? '' : 'none';
  }
}

const PORTRAIT_ICONS = {
  // History
  时代: '🕐', 地域: '🌍', 性别: '👤', 领域: '📖', 身份: '🏷️', 事迹: '⚔️', 生平: '📜', 其他: '📌',
  // Nature
  类别: '🏷️', 栖息地: '🌍', 体型: '📏', 食性: '🍽️', 特征: '✨', 分布: '🗺️',
  // Object
  材质: '🧱', 用途: '🔧', 发明者: '👤', 产地: '📍',
  // Event
  类型: '🏷️', 参与方: '👥', 结果: '🏁', 影响: '💫',
  // Character
  作品: '🎬', 性格: '💭', 关系: '🔗',
  // Place
  位置: '📍', 名气: '⭐', 功能: '🔧'
};

function updatePanel() {
  const knownUl = $('#panel-known');
  const emptyHint = $('#panel-known-empty');
  const portrait = GameState.guess.portrait;
  const entries = Object.entries(portrait);

  if (entries.length > 0) {
    knownUl.innerHTML = entries.map(([cat, val]) =>
      `<li><span class="known-cat">${PORTRAIT_ICONS[cat] || '📌'} ${cat}</span>${val}</li>`
    ).join('');
    if (emptyHint) emptyHint.style.display = 'none';
  } else {
    knownUl.innerHTML = '';
    if (emptyHint) emptyHint.style.display = '';
  }

  const candDiv = $('#panel-candidates');
  const candidates = GameState.guess.topCandidates;
  if (candidates && candidates.length > 0) {
    candDiv.innerHTML = candidates.map(c =>
      `<div class="candidate-item">${c}</div>`
    ).join('');
  } else {
    candDiv.innerHTML = '<div class="panel-empty">尚无方向</div>';
  }
}

function showLoading(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideLoading(id) { document.getElementById(id)?.classList.add('hidden'); }

function shake(el) {
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

/* === Turtle Soup UI Helpers === */

function updateTurtleHostStats() {
  const t = GameState.turtle;
  $('#turtle-host-questions').textContent = t.questionsAsked;
  $('#turtle-host-hints').textContent = t.hintsRevealed;
  $('#turtle-host-guesses').textContent = t.guessesUsed;
}

function updateTurtleGuessStats() {
  const t = GameState.turtle;
  $('#turtle-guess-questions').textContent = t.questionsAsked;
  $('#turtle-guess-guesses-left').textContent = `${3 - t.guessesUsed}`;
  $('#turtle-guess-confidence').textContent = `${t.confidence}`;
  const fill = document.getElementById('turtle-confidence-fill');
  if (fill) fill.style.width = `${t.confidence}%`;

  // Update sidebar panels
  const confirmedUl = $('#turtle-guess-confirmed');
  const confirmedEmpty = $('#turtle-guess-confirmed-empty');
  if (t.confirmed.length > 0) {
    confirmedUl.innerHTML = t.confirmed.map(c => `<li>${c}</li>`).join('');
    if (confirmedEmpty) confirmedEmpty.style.display = 'none';
  } else {
    confirmedUl.innerHTML = '';
    if (confirmedEmpty) confirmedEmpty.style.display = '';
  }

  const ruledOutUl = $('#turtle-guess-ruledout');
  const ruledOutEmpty = $('#turtle-guess-ruledout-empty');
  if (t.ruledOut.length > 0) {
    ruledOutUl.innerHTML = t.ruledOut.map(c => `<li>${c}</li>`).join('');
    if (ruledOutEmpty) ruledOutEmpty.style.display = 'none';
  } else {
    ruledOutUl.innerHTML = '';
    if (ruledOutEmpty) ruledOutEmpty.style.display = '';
  }

  const insightsUl = $('#turtle-guess-insights');
  const insightsEmpty = $('#turtle-guess-insights-empty');
  if (t.keyInsights.length > 0) {
    insightsUl.innerHTML = t.keyInsights.map(c => `<li>${c}</li>`).join('');
    if (insightsEmpty) insightsEmpty.style.display = 'none';
  } else {
    insightsUl.innerHTML = '';
    if (insightsEmpty) insightsEmpty.style.display = '';
  }
}

function resetModeSelection() {
  $('#difficulty-section').classList.add('hidden');
  $('#turtle-difficulty-section').classList.add('hidden');
  $$('.mode-card').forEach(c => {
    c.style.opacity = '1';
    c.style.pointerEvents = 'auto';
  });
}
