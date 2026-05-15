/* API Client - Multi-provider support via backend proxy */

const API_BASE = '/api/chat';

function _buildBody() {
  return {
    apiKey: GameState.apiKey,
    model: GameState.model,
    customBaseUrl: GameState.customBaseUrl || '',
    useBuiltIn: GameState.useBuiltIn
  };
}

async function chatStream(messages, _apiKey, onChunk, onDone, onError) {
  try {
    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ..._buildBody(), messages, stream: true })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      throw new Error(err.error || `请求失败 (${resp.status})`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            if (onChunk) onChunk(content, fullText);
          }
        } catch {}
      }
    }

    if (onDone) onDone(fullText);
    return fullText;
  } catch (err) {
    if (onError) onError(err);
    throw err;
  }
}

async function chatFull(messages, _apiKey) {
  const resp = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ..._buildBody(), messages, stream: true })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `请求失败 (${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let rawText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    rawText += chunk;
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content || '';
        if (content) fullText += content;
      } catch {}
    }
  }

  // Fallback: API may not support streaming, response is plain JSON
  if (!fullText && rawText) {
    try {
      const data = JSON.parse(rawText);
      fullText = data.choices?.[0]?.message?.content || '';
    } catch {
      fullText = rawText;
    }
  }

  return fullText;
}

async function validateApiKey(apiKey) {
  const messages = [{ role: 'user', content: '请回复"OK"' }];
  const text = await chatFull(messages, apiKey);
  return text.length > 0;
}
