import 'dotenv/config';

async function testProvider(name, url, apiKey, body, headersExtra = {}) {
  if (!apiKey) {
    return { ok: false, provider: name, error: `Missing ${name} API key` };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...headersExtra,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  if (!res.ok) return { ok: false, provider: name, status: res.status, body: text.slice(0, 500) };

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, provider: name, status: res.status, body: text.slice(0, 500) };
  }

  const content = json.choices?.[0]?.message?.content;
  return { ok: true, provider: name, status: res.status, sample: (content || '').slice(0, 200) };
}

async function main() {
  const openrouterKey = process.env.OPENROUTER_API_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';
  const openrouterModel = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct';
  const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const prompt =
    'Reponds uniquement: {"ok":true}. Ne mets pas de markdown.';

  const openrouter = await testProvider(
    'OPENROUTER_API_KEY',
    'https://openrouter.ai/api/v1/chat/completions',
    openrouterKey,
    {
      model: openrouterModel,
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      'HTTP-Referer': 'https://serverroom-app.local',
      'X-Title': 'ServerRoom Risk Analysis',
    }
  );

  const groq = await testProvider(
    'GROQ_API_KEY',
    'https://api.groq.com/openai/v1/chat/completions',
    groqKey,
    {
      model: groqModel,
      max_tokens: 50,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }
  );

  const result = { openrouter, groq };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));

  const ok = (openrouter.ok || groq.ok);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Test failed:', e?.message || e);
  process.exit(1);
});

