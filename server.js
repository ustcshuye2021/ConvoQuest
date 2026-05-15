const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// === Built-in Model Configs (server holds the key) ===

const BUILTIN_MODELS = {
  'glm-5.1': {
    baseUrl: 'https://aiproxy.xin/cosphere',
    apiKey: 'sk-eXmFNNHk8O8F5ThEiM8z3ZWeKnBFjKtUX3OgOu1OmtgVNA1G'
  },
  'glm-5': {
    baseUrl: 'https://aiproxy.xin/cosphere',
    apiKey: 'sk-eXmFNNHk8O8F5ThEiM8z3ZWeKnBFjKtUX3OgOu1OmtgVNA1G'
  },
  'glm-4.5-air': {
    baseUrl: 'https://aiproxy.xin/cosphere',
    apiKey: 'sk-eXmFNNHk8O8F5ThEiM8z3ZWeKnBFjKtUX3OgOu1OmtgVNA1G'
  }
};

// === Preset official models (known baseUrls, user provides key) ===

const PRESET_MODELS = {
  'deepseek-v4-flash':  { baseUrl: 'https://api.deepseek.com' },
  'deepseek-v4-pro':    { baseUrl: 'https://api.deepseek.com' },
  'gpt-4o':             { baseUrl: 'https://api.openai.com' },
  'gpt-4o-mini':        { baseUrl: 'https://api.openai.com' },
  'qwen-plus':          { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode' },
  'moonshot-v1-auto':   { baseUrl: 'https://api.moonshot.cn' }
};

// === Chat proxy ===
// Supports two modes:
//   1. useBuiltIn=true + model in BUILTIN_MODELS → use server-stored key & baseUrl
//   2. customBaseUrl + apiKey + model → user-provided OpenAI-compatible endpoint

app.post('/api/chat', async (req, res) => {
  const {
    apiKey: userApiKey = '',
    messages,
    stream = false,
    model = 'glm-5.1',
    customBaseUrl = '',
    useBuiltIn = false
  } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  let url, apiKey;

  if (useBuiltIn && BUILTIN_MODELS[model]) {
    // Built-in model: use server config
    const cfg = BUILTIN_MODELS[model];
    url = `${cfg.baseUrl}/v1/chat/completions`;
    apiKey = cfg.apiKey;
  } else if (customBaseUrl) {
    // Custom model: use user-provided baseUrl + key
    if (!userApiKey) {
      return res.status(400).json({ error: '请提供 API Key' });
    }
    const base = customBaseUrl.replace(/\/+$/, '');
    url = `${base}/v1/chat/completions`;
    apiKey = userApiKey;
  } else if (PRESET_MODELS[model] && userApiKey) {
    // Preset model: use known baseUrl + user key
    url = `${PRESET_MODELS[model].baseUrl}/v1/chat/completions`;
    apiKey = userApiKey;
  } else {
    return res.status(400).json({ error: '请选择模型并提供 API Key' });
  }

  console.log(`[${model}] ${stream ? 'stream' : 'full'} → ${url}`);

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
      console.error(`API error: ${errMsg}`);
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
      } catch (e) {
        // client disconnected
      }
      res.end();
    } else {
      const data = await fetchResp.json();
      res.json(data);
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: '代理请求失败: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
