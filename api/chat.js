const PRESET_MODELS = {
  'deepseek-v4-flash':  { baseUrl: 'https://api.deepseek.com' },
  'deepseek-v4-pro':    { baseUrl: 'https://api.deepseek.com' },
  'gpt-4o':             { baseUrl: 'https://api.openai.com' },
  'gpt-4o-mini':        { baseUrl: 'https://api.openai.com' },
  'qwen-plus':          { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode' },
  'moonshot-v1-auto':   { baseUrl: 'https://api.moonshot.cn' }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    apiKey: userApiKey = '',
    messages,
    stream = false,
    model = '',
    customBaseUrl = ''
  } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  let url, apiKey;

  if (customBaseUrl) {
    if (!userApiKey) {
      return res.status(400).json({ error: '请提供 API Key' });
    }
    const base = customBaseUrl.replace(/\/+$/, '');
    url = `${base}/v1/chat/completions`;
    apiKey = userApiKey;
  } else if (PRESET_MODELS[model] && userApiKey) {
    url = `${PRESET_MODELS[model].baseUrl}/v1/chat/completions`;
    apiKey = userApiKey;
  } else {
    return res.status(400).json({ error: '请选择模型并提供 API Key' });
  }

  try {
    const fetchResp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, stream })
    });

    if (!fetchResp.ok) {
      const errBody = await fetchResp.text();
      let errMsg = `API错误 (${fetchResp.status})`;
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.error?.message || errJson.message || errMsg;
      } catch {}
      return res.status(fetchResp.status).json({ error: errMsg });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = fetchResp.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch {
        // client disconnected
      }
      res.end();
    } else {
      const data = await fetchResp.json();
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: '代理请求失败: ' + err.message });
  }
}

export const config = {
  maxDuration: 60,
  supportsResponseStreaming: true
};
