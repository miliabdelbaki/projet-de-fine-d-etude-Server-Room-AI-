import '../src/routes/ai.js';

const openrouter = process.env.OPENROUTER_API_KEY || '';
const groq = process.env.GROQ_API_KEY || '';

// eslint-disable-next-line no-console
console.log(JSON.stringify({
  OPENROUTER_API_KEY_set: openrouter.length > 0,
  GROQ_API_KEY_set: groq.length > 0,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || null,
  GROQ_MODEL: process.env.GROQ_MODEL || null,
}, null, 2));

