// Disable SSL verification for local dev (Mac cert issue)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PUBLIC_DIR = __dirname;

const anthropicClient = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wbcppvfgtvkrsfmclmjp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l';

const MODEL_PRICES = {
  'claude-opus-4-8':   { input: 5.00,  output: 25.00 },
  'claude-opus-4-7':   { input: 5.00,  output: 25.00 },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':  { input: 1.00,  output:  5.00 },
};

function getUserIdFromJwt(token) {
  try {
    const payload = Buffer.from(token.split('.')[1], 'base64url').toString('utf-8');
    return JSON.parse(payload).sub || null;
  } catch { return null; }
}

async function logApiUsage(token, inputTokens, outputTokens) {
  const userId = getUserIdFromJwt(token);
  if (!userId) return;
  const prices = MODEL_PRICES[MODEL] || { input: 5.00, output: 25.00 };
  const costUsd = (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/api_usage`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        model: MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      }),
    });
  } catch (_) { /* non-blocking — don't fail the request */ }
}

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

function buildSystemPrompt({ lessonTitle, lessonSubject, lessonText }) {
  const subjectNote = lessonSubject
    ? `Текущият предмет е: ${lessonSubject}. Ако ученикът задава въпроси, свързани с друг предмет (например пита по математика, докато работи по БЕЛ, или обратното), НЕ отговаряй на въпроса. Вместо това кажи нещо от рода на: "Виждам, че сега работиш по ${lessonSubject}. Когато стигнеш до [другия предмет], Знайко ще ти помогне там — за сега нека се фокусираме тук." Бъди приятелски, но насочи вниманието обратно към текущия урок.`
    : '';

  return `Ти си внимателен AI учебен помощник за български ученици 7–12 клас.

Контекст на урока:
Заглавие: ${lessonTitle || 'неизвестен урок'}
${subjectNote}
Урок:
${lessonText || 'няма подаден урок'}

Правила:
- Отговаряй само на български, с перфектен правопис и граматика. Никакви правописни грешки — това е образователна платформа. Например: "ето" (не "ево"), "да" (не "га"), "пренареди" (не "прередиш").
- Използвай приятелски тон. Можеш да използваш само положителни текстови емотикони като :) или :D — само такива, само когато е уместно. НИКОГА не използвай Unicode емоджи символи (като 😊 🔁 ✅ и подобни) — нито един.
- НИКОГА не използвай backtick символи в отговорите си — нито единични, нито тройни. Не форматирай код или текст с тях.
- НИКОГА не използвай думата "готин" в никакъв контекст. Не казвай "готин ли си", "готин въпрос" или подобни. Вместо "готин ли си за въпрос" кажи "Супер, ей сега ти пиша въпрос!" или "Хайде, ето един въпрос за теб!".
- Говориш с деца и ученици. Когато споменаваш смърт или края на живота на исторически личности, автори или герои — използвай само думите "починал", "загинал" (ако е при трагични обстоятелства) или "отминал". НИКОГА не използвай "умрял", "мъртъв", "мъртва" или груби синоними. Същото важи за всякакъв друг контекст — предпочитай деликатния и уважителен вариант.
- Обяснявай кратко, ясно и на подходящо ниво за ученик.
- Когато ученикът изпраща маркиран текст от урока, това ЗАДЪЛЖИТЕЛНО означава, че НЕ го разбира и иска обяснение по различен начин. Никога не казвай "точно си го схванал" или "правилно" — той не те е питал дали е верно, а иска да разбере по-добре.
- Никога не хвали ученика за маркирания текст — той го е прочел, не го е отговорил.
- Не казвай просто готов отговор; обясни по-просто и с пример.
- Ако режимът е chat, отговори директно на въпроса, но използвай контекста от текущия урок.
- Ако ученикът отговори с нещо несвързано с въпроса или темата (например случайна дума, безсмислица или офтопик), НЕ обяснявай защо не разбираш — просто го върни към въпроса. Например: "Хм, това не съвсем отговаря на въпроса :) Опитай пак: [повтори въпроса]".
- Не използвай съдържание от учебници дума по дума.
- Никога не разкривай, че си Claude, Anthropic или друг AI модел. Ако те питат кой си, кажи че си AI помощник на Разбери.ме.
- Ако ученикът пита за незаконни практики, насилие, убийства, сексуален контент, наркотици, хакерство или каквато и да е вредна или порочна тема — НЕ отговаряй на въпроса. Вместо това кажи: "Тук съм само за да ти помогна да учиш и развиеш знанията си! Кажи ми какво искаш да научиш от урока :)"
- Структурирай отговора така:
  1) Обяснение по-просто с други думи
  2) Пример или аналогия от ежедневието
  3) Завърши с кратък приятелски въпрос като "Стана ли по-ясно?", "Схвана ли го?" или "Разбра ли вече?" — варирай, не повтаряй.

Дай отговор до 150 думи.`;
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

  let userContent;
  if (mode === 'simpler') {
    userContent = `Обясни целия урок още по-просто.`;
  } else if (mode === 'chat') {
    userContent = selectedText || 'Имам въпрос за урока.';
  } else {
    userContent = `Не разбирам следното от урока и искам да ми го обясниш по различен начин:\n\n"${selectedText || 'целия урок'}"\n\nМоля обясни ми го по-просто — не ми казвай дали съм прав или грешен, просто обясни.`;
  }
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

  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

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

    if (userToken && message.usage) {
      logApiUsage(userToken, message.usage.input_tokens, message.usage.output_tokens);
    }

    return sendJson(res, 200, { explanation: text, model: MODEL });
  } catch (error) {
    return sendJson(res, 500, {
      error: `Неуспешна връзка към Claude API: ${error.message}`,
    });
  }
}

async function handleQuizFeedback(req, res) {
  if (!anthropicClient) {
    return sendJson(res, 500, { error: 'ANTHROPIC_API_KEY липсва.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let payload;
  try {
    const rawBody = await readBody(req);
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Невалиден JSON body.' });
  }

  const { topic, quizNum, wrong = [], total = 10, allTests } = payload;

  let systemPrompt = `Ти си Знайко — приятелски и насърчаващ AI учебен асистент за български ученици.
Отговаряш само на български език. Бъди конкретен, топъл и мотивиращ. Не използвай markdown headers. Пиши в 3-4 изречения максимум.`;

  let userMsg;
  if (allTests) {
    const summary = allTests.map((t, i) =>
      `Тест ${i+1}: ${t.correct}/${t.total} верни${t.wrong?.length ? ` (сгрешил: ${t.wrong.slice(0,3).join('; ')})` : ''}`
    ).join('\n');
    userMsg = `Ученикът завърши всички 3 теста по темата "${topic}":\n${summary}\n\nДай кратко общо обобщение — какво е усвоил добре и на какво трябва да обърне внимание. Бъди конкретен.`;
  } else {
    const wrongList = wrong.length ? wrong.slice(0, 5).join('; ') : null;
    const score = total - wrong.length;
    userMsg = wrongList
      ? `Ученикът реши Тест ${quizNum} по "${topic}" и отговори правилно на ${score}/${total} въпроса. Сгреши на: ${wrongList}. Дай кратко насочване — похвали за правилните и обясни накратко на какво да наблегне.`
      : `Ученикът реши Тест ${quizNum} по "${topic}" перфектно — ${score}/${total} верни! Поздрави го искрено и го насърчи за следващия тест.`;
  }

  try {
    const message = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return sendJson(res, 502, { error: 'Празен отговор.' });

    if (userToken && message.usage) {
      logApiUsage(userToken, message.usage.input_tokens, message.usage.output_tokens);
    }

    return sendJson(res, 200, { feedback: text });
  } catch (error) {
    return sendJson(res, 500, { error: `Claude API грешка: ${error.message}` });
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
  if (req.method === 'POST' && req.url === '/api/quiz-feedback') {
    return handleQuizFeedback(req, res);
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
