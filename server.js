const http = require('http');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PUBLIC_DIR = __dirname;

const anthropicClient = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function buildSystemPrompt({ lessonTitle, lessonText }) {
  return `Ти си внимателен AI учебен помощник за български ученици 7–12 клас.

Контекст на урока:
Заглавие: ${lessonTitle || 'неизвестен урок'}
Урок:
${lessonText || 'няма подаден урок'}

Правила:
- Отговаряй само на български.
- Обяснявай кратко, ясно и на подходящо ниво за ученик.
- Не давай фалшива увереност. Ако нещо не следва от урока, кажи, че трябва да се провери.
- Не казвай просто готов отговор; води ученика с обяснение и въпрос.
- Ако режимът е chat, отговори директно на въпроса, но използвай контекста от текущия урок.
- Не използвай съдържание от учебници дума по дума.
- Никога не разкривай, че си Claude, Anthropic или друг AI модел. Ако те питат кой си, кажи че си AI помощник на Разбери.ме.
- Структурирай отговора така:
  1) Обяснение по-просто
  2) Пример или аналогия
  3) Мини въпрос за проверка

Дай отговор до 180 думи.`;
}

function buildMessages({ selectedText, mode, studentAnswer, chatHistory }) {
  const messages = [];

  if (Array.isArray(chatHistory) && chatHistory.length > 0) {
    const history = chatHistory.slice(-8);
    for (const item of history.slice(0, -1)) {
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      if (item.content) messages.push({ role, content: String(item.content) });
    }
  }

  let userContent = selectedText || 'Обясни целия урок по-просто.';
  if (mode === 'simpler') userContent = 'Обясни още по-просто: ' + userContent;
  if (studentAnswer) userContent += `\n\nОтговор на ученика: ${studentAnswer}`;

  messages.push({ role: 'user', content: userContent });

  return messages;
}

async function handleExplain(req, res) {
  if (!anthropicClient) {
    return sendJson(res, 500, {
      error: 'ANTHROPIC_API_KEY липсва. Създай .env или стартирай с ANTHROPIC_API_KEY=... node server.js',
    });
  }

  let payload;
  try {
    const rawBody = await readBody(req);
    payload = JSON.parse(rawBody || '{}');
  } catch (error) {
    return sendJson(res, 400, { error: 'Невалиден JSON body.' });
  }

  try {
    const message = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 550,
      system: buildSystemPrompt(payload),
      messages: buildMessages(payload),
    });

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    if (!text) {
      return sendJson(res, 502, { error: 'AI върна празен отговор.' });
    }

    return sendJson(res, 200, { explanation: text, model: MODEL });
  } catch (error) {
    return sendJson(res, 500, {
      error: `Неуспешна връзка към Claude API: ${error.message}`,
    });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/') filePath = '/index.html';

  const safePath = path.normalize(filePath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.join(PUBLIC_DIR, safePath);

  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(absolutePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(absolutePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, hasAnthropicKey: Boolean(API_KEY), model: MODEL });
  }
  if (req.method === 'POST' && req.url === '/api/explain') {
    return handleExplain(req, res);
  }
  if (req.method === 'GET') {
    return serveStatic(req, res);
  }
  res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

server.listen(PORT, () => {
  console.log(`Разбери.ме prototype: http://localhost:${PORT}`);
  console.log(API_KEY ? `Claude model: ${MODEL}` : 'ANTHROPIC_API_KEY не е зададен — AI endpoint няма да работи.');
});
