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
const MODEL       = process.env.ANTHROPIC_MODEL        || 'claude-haiku-4-5';
const MODEL_ESSAY = process.env.ANTHROPIC_MODEL_ESSAY  || 'claude-sonnet-4-6';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PUBLIC_DIR = __dirname;

const anthropicClient = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wbcppvfgtvkrsfmclmjp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const STRIPE_PRICES = {
  focus:       process.env.STRIPE_PRICE_FOCUS,
  podgotovka:  process.env.STRIPE_PRICE_PODGOTOVKA,
  otlichnik:   process.env.STRIPE_PRICE_OTLICHNIK,
};

const TRIAL_ZNAYKO_DAILY = 30;
const TRIAL_ESSAY_MAX    = 3;
const TRIAL_DAYS         = 3;

async function getProfile(userId, token) {
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=plan,trial_started_at,znayko_count_today,znayko_reset_date,essay_count&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` } }
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    return rows[0] || null;
  } catch { return null; }
}

async function patchProfile(userId, token, updates) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(updates),
    });
  } catch { /* non-blocking */ }
}

const PAID_PLANS = new Set(['active', 'focus', 'podgotovka', 'otlichnik']);

function isPaid(profile) {
  return profile && PAID_PLANS.has(profile.plan);
}

function isExpiredPlan(profile) {
  return profile?.plan === 'expired';
}

function trialExpired(profile) {
  if (!profile?.trial_started_at) return false;
  return (Date.now() - new Date(profile.trial_started_at)) / 86400000 > TRIAL_DAYS;
}

async function checkZnayko(userId, token, profile) {
  if (isPaid(profile)) return null;
  if (isExpiredPlan(profile))
    return { error: 'Абонаментът ти е изтекъл. Избери план, за да продължиш.', code: 'subscription_expired' };
  if (trialExpired(profile))
    return { error: 'Пробният период е изтекъл. Избери план, за да продължиш.', code: 'trial_expired' };

  const today = new Date().toISOString().slice(0, 10);
  const count = profile.znayko_reset_date === today ? (profile.znayko_count_today || 0) : 0;
  if (count >= TRIAL_ZNAYKO_DAILY)
    return { error: `Достигна дневния лимит от ${TRIAL_ZNAYKO_DAILY} въпроса. Продължи утре или избери платен план.`, code: 'daily_limit' };

  await patchProfile(userId, token, { znayko_count_today: count + 1, znayko_reset_date: today });
  return null;
}

async function checkEssay(userId, token, profile) {
  if (isPaid(profile)) return null;
  if (isExpiredPlan(profile))
    return { error: 'Абонаментът ти е изтекъл. Избери план, за да продължиш.', code: 'subscription_expired' };
  if (trialExpired(profile))
    return { error: 'Пробният период е изтекъл. Избери план, за да продължиш.', code: 'trial_expired' };

  const count = profile.essay_count || 0;
  if (count >= TRIAL_ESSAY_MAX)
    return { error: `Използва ${TRIAL_ESSAY_MAX} проверки на съчинения за пробния период. Избери план за неограничен достъп.`, code: 'essay_limit' };

  await patchProfile(userId, token, { essay_count: count + 1 });
  return null;
}

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

function buildSystemPrompt({ lessonTitle, lessonSubject, lessonGrade, lessonText }) {
  const grade = parseInt(lessonGrade) || 11;

  const gradeInstructions = grade <= 7 ? `
КЛАС: 7-ми клас (12–13 години)
Как да обясняваш:
- Изключително кратки изречения — максимум 15 думи на изречение.
- Само думи, които 12-годишно дете разбира. Ако ТРЯБВА да използваш термин (напр. "чета", "строфа", "знаменател"), първо го обясни с прости думи: "Строфа — това е като абзац в стихотворение."
- Аналогии от ежедневието на дете: училище, семейство, приятели, спорт, игри.
- НЕ използвай: "лирически субект", "екзистенциален", "метафизичен", "парадигма", "контекст", "дискурс" и подобни сложни думи — изобщо.
- Правилни термини, но обяснени просто: "хайдутин" = човек, избягал в планината да се бори срещу несправедливостта; "чета" = група бойци; "въстание" = организирана борба на народа срещу властта.
- Пример как ДА: "Строфата е като куплет в песен — група редове, които вървят заедно."
- Пример как НЕ: "Строфата представлява структурна единица на поетичния текст."` : grade <= 9 ? `
КЛАС: ${grade}-ти клас (14–15 години)
Как да обясняваш:
- Ясни изречения, умерена сложност.
- Може да използваш основни термини (метафора, символ, тема), но ги обяснявай с един пример от урока.
- Аналогии от живота на тийнейджър.
- Избягвай прекалено академичен език.` : `
КЛАС: ${grade}-ти клас (16–18 години, подготовка за матура/ДЗИ)
Как да обясняваш:
- Пълна литературна, историческа и научна терминология.
- Академичен стил, подходящ за матура.
- Връзки между произведения, исторически контекст, художествени средства.
- Примери от конкретния текст в урока.`;

  const subjectNote = lessonSubject
    ? `ПРЕДМЕТ: ${lessonSubject}. Ако ученикът пита за друг предмет, не отговаряй — кажи: "Сега работим по ${lessonSubject}. За другото ще поговорим на съответния урок :)"`
    : '';

  return `Ти си Знайко — AI учебен помощник на платформата Разбери.ме за български ученици.

УРОК: ${lessonTitle || 'неизвестен урок'}
${subjectNote}
${gradeInstructions}

СЪДЪРЖАНИЕ НА УРОКА (използвай го като основа за обясненията си):
${lessonText || 'няма подаден урок'}

ЕЗИК — ЗАДЪЛЖИТЕЛНО:
- Пиши САМО на български с кирилица. НИКОГА не пиши на латиница ("ne moje" → "не може", "hora" → "хора"). Шльокавица е забранена абсолютно.
- Перфектен правопис и граматика — ти си образователна платформа. Правилно: "ето" (не "ево"), "защото" (не "зашото"), "когато" (не "кагато").
- ЗАДЪЛЖИТЕЛНА ПУНКТУАЦИЯ: Всяко изречение завършва с точка, въпросителен или удивителен знак. Ако изреждаш неща, ги разделяй със запетаи. Обособените части в изречението се ограждат с запетаи. Поставяй запетая пред "и" само ако се използва между самостоятелни изречения. Никога не изпускай препинателни знаци — правилната пунктуация е задължителна, тъй като обучаваш ученици на правилен български.
- ЗАПЕТАЯ ПРЕД ПОДЧИНЕНИ ИЗРЕЧЕНИЯ: Задължително поставяй запетая пред всички подчинителни съюзи и относителни местоимения: "защото", "че", "за да", "когато", "ако", "макар че", "въпреки че", "докато", "след като", "преди да", "тъй като", "понеже", "който", "която", "което", "които", "където", "откъдето", "откогато", "каквото" и всички останали. Примери: "Той тичал бързо, защото се страхувал." / "Книгата, която четеш, е важна." / "Знам, че ще успееш."
- Пиши пълни думи — без съкращения като "к-то", "н-р", "т.е." освен ако са общоприети.
- Никога не използвай backtick символи (\`) — нито единични, нито тройни.
- Никога не използвай Unicode емоджи (😊 ✅ 🔁). Само текстови: :) или :D и само когато е уместно.
- Никога не казвай "готин", "яко", "супер яко". Вместо "готин въпрос" кажи "Добър въпрос!" или "Хубав въпрос!".
- За починали хора: само "починал", "загинал", "отминал" — никога "умрял", "мъртъв".

ПРАВИЛНА ТЕРМИНОЛОГИЯ:
- "чета" (не "банда"), "хайдутин" (не "разбойник" когато е за хайдутството), "въстание" (не "бунт"), "лирически герой" или "поетът говори" (не "главният герой в стихотворението"), "строфа" (не "абзац в стихотворение" за 10+ клас).
- Историческите личности се назовават с пълното им прието название: "Христо Ботев", "Васил Левски", "Иван Вазов".

КАК ДА ОБЯСНЯВАШ:
- Когато ученик маркира текст от урока — той НЕ го разбира. Обясни го по различен начин, не го преповтаряй.
- Не хвали маркирания текст — той го е прочел, не го е написал.
- Базирай обяснението на съдържанието на урока по-горе.
- Структура: 1) Обяснение с прости думи  2) Пример или аналогия  3) Кратък въпрос накрая ("Стана ли по-ясно?", "Схвана ли го?" — варирай).
- Отговор до 150 думи.
- Ако ученикът пита нещо извън учебния материал (незаконно, насилие, наркотици, хакерство) — откажи: "Тук съм само за учебни въпроси! Какво от урока те интересува? :)"
- Никога не разкривай, че си Claude или Anthropic. Ти си Знайко на Разбери.ме.`;
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

  if (userToken) {
    const userId = getUserIdFromJwt(userToken);
    if (userId) {
      const profile = await getProfile(userId, userToken);
      const err = await checkZnayko(userId, userToken, profile);
      if (err) return sendJson(res, 403, err);
    }
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

async function handleGradePishi7(req, res) {
  if (!anthropicClient) return sendJson(res, 500, { error: 'ANTHROPIC_API_KEY липсва.' });

  let payload;
  try {
    const rawBody = await readBody(req);
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Невалиден JSON.' });
  }

  const { type, prompt, originalText, studentText } = payload;

  let systemPrompt, userMsg;

  if (type === 'prerazkas') {
    systemPrompt = `Ти си учител по български език и литература, оценяващ преразкази за НВО 7 клас.
Оценявай по три критерия:
- К1 Пълнота и точност: 0-6 точки — дали всички ключови моменти от оригинала са включени и точно предадени; дали редът е запазен
- К2 Езикова грамотност: 0-5 точки — правопис, граматика, пунктуация
- К3 Стил и свързаност: 0-4 точки — логическа последователност, разнообразие на изказа, плавност на преразказа
Общо максимум: 15 точки.

Отговори САМО с валиден JSON, без обяснения извън него. Не използвай кавички вътре в текста на feedback и summary — замени ги с тире или перифраза:
{
  "criteria": {
    "k1": {"score": <число 0-6>, "feedback": "<1-2 изречения на български>"},
    "k2": {"score": <число 0-5>, "feedback": "<1-2 изречения на български>"},
    "k3": {"score": <число 0-4>, "feedback": "<1-2 изречения на български>"}
  },
  "total": <сума>,
  "summary": "<2-3 изречения обща оценка и насоки за подобрение>"
}`;
    userMsg = `Оригинален текст:\n${originalText}\n\nЗадача: ${prompt}\n\nПреразказ на ученика:\n${studentText}`;
  } else {
    systemPrompt = `Ти си учител по български език и литература, оценяващ творческо писане за НВО 7 клас.
Оценявай по четири критерия:
- К1 Съответствие с темата: 0-5 точки — дали текстът разработва зададената ситуация/тема
- К2 Композиция: 0-5 точки — увод, изложение, заключение; логическа структура
- К3 Съдържание и идеи: 0-5 точки — богатство на идеите, оригиналност, убедителност
- К4 Езикова грамотност: 0-5 точки — правопис, граматика, пунктуация
Общо максимум: 20 точки.

Отговори САМО с валиден JSON, без обяснения извън него. Не използвай кавички вътре в текста на feedback и summary:
{
  "criteria": {
    "k1": {"score": <число 0-5>, "feedback": "<1-2 изречения на български>"},
    "k2": {"score": <число 0-5>, "feedback": "<1-2 изречения на български>"},
    "k3": {"score": <число 0-5>, "feedback": "<1-2 изречения на български>"},
    "k4": {"score": <число 0-5>, "feedback": "<1-2 изречения на български>"}
  },
  "total": <сума>,
  "summary": "<2-3 изречения обща оценка и насоки за подобрение>"
}`;
    userMsg = `Тема за писане: ${prompt}\n\nТекст на ученика:\n${studentText}`;
  }

  try {
    const message = await anthropicClient.messages.create({
      model: MODEL_ESSAY,
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return sendJson(res, 502, { error: 'AI не върна валиден JSON.' });

    const parsed = parseClaudeJson(jsonMatch[0]);
    if (!parsed) return sendJson(res, 502, { error: 'AI върна невалиден JSON — опитай пак.' });

    return sendJson(res, 200, parsed);
  } catch (e) {
    return sendJson(res, 500, { error: `Claude API грешка: ${e.message}` });
  }
}

async function handleGradeEssay(req, res) {
  if (!anthropicClient) return sendJson(res, 500, { error: 'ANTHROPIC_API_KEY липсва.' });

  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (userToken) {
    const userId = getUserIdFromJwt(userToken);
    if (userId) {
      const profile = await getProfile(userId, userToken);
      const err = await checkEssay(userId, userToken, profile);
      if (err) return sendJson(res, 403, err);
    }
  }

  let payload;
  try {
    const rawBody = await readBody(req);
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Невалиден JSON.' });
  }

  const { lessonTitle, topicText, essayText } = payload;

  const systemPrompt = `Ти си строг и справедлив оценител на интерпретативни съчинения по български език и литература за ДЗИ.
Оценявай по официалните критерии:
- К1 Теза: 0-4 точки — ясна ли е позицията, формулирана ли е в увода
- К2 Аргументация: 0-8 точки — цитати от текста, литературен анализ, дълбочина на интерпретацията
- К3 Композиция: 0-4 точки — увод/изложение/заключение, логическа свързаност
- К4 Езикова грамотност: 0-4 точки — граматика, пунктуация, правопис
- К5 Стил: 0-4 точки — богатство на изказа, подходящ регистър, изразни средства
Общо максимум: 24 точки. Минимален праг за издържал: 13 точки.

Отговори САМО с валиден JSON, без обяснения извън него. ВАЖНО: не използвай кавички (нито " нито „ ") вътре в текста на feedback и summary — замени ги с тире или перифраза. Само чист JSON:
{
  "criteria": {
    "k1": {"score": <число 0-4>, "feedback": "<1-2 изречения на български>"},
    "k2": {"score": <число 0-8>, "feedback": "<1-2 изречения на български>"},
    "k3": {"score": <число 0-4>, "feedback": "<1-2 изречения на български>"},
    "k4": {"score": <число 0-4>, "feedback": "<1-2 изречения на български>"},
    "k5": {"score": <число 0-4>, "feedback": "<1-2 изречения на български>"}
  },
  "total": <сума на всички>,
  "summary": "<2-3 изречения обща оценка и насоки за подобрение>"
}`;

  const userMsg = `Урок: ${lessonTitle}
Тема: ${topicText}

Съчинение на ученика:
${essayText}`;

  try {
    const message = await anthropicClient.messages.create({
      model: MODEL_ESSAY,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return sendJson(res, 502, { error: 'AI не върна валиден JSON.' });

    const parsed = parseClaudeJson(jsonMatch[0]);
    if (!parsed) return sendJson(res, 502, { error: 'AI върна невалиден JSON — опитай пак.' });
    if (userToken && message.usage) logApiUsage(userToken, message.usage.input_tokens, message.usage.output_tokens);

    return sendJson(res, 200, parsed);
  } catch (e) {
    return sendJson(res, 500, { error: `Claude API грешка: ${e.message}` });
  }
}

// Парсва JSON от Claude — опитва директно, после repair за незаекранени кавички
function parseClaudeJson(raw) {
  try { return JSON.parse(raw); } catch {}
  // Repair: заменя незаекранени ASCII " вътре в string стойности
  // Стратегия: за всеки "ключ": "стойност" — заменя вътрешните " с \"
  const repaired = raw.replace(
    /:\s*"([\s\S]*?)(?<!\\)"(?=\s*[,\}])/g,
    (match, inner) => ': "' + inner.replace(/(?<!\\)"/g, '\\"') + '"'
  );
  try { return JSON.parse(repaired); } catch {}
  // Последен опит: изтрий всички специални кавички
  const stripped = raw
    .replace(/„/g, '"').replace(/"/g, '"').replace(/"/g, '"')
    .replace(/'/g, "'").replace(/'/g, "'");
  try { return JSON.parse(stripped); } catch {}
  return null;
}

async function handleGenerateKonspekt(req, res) {
  if (!anthropicClient) return sendJson(res, 500, { error: 'ANTHROPIC_API_KEY липсва.' });

  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let payload;
  try {
    const rawBody = await readBody(req);
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Невалиден JSON.' });
  }

  const { lessonTitle, lessonText } = payload;

  const systemPrompt = `Ти си експерт по български език и литература. Генерираш структуриран конспект от урок за ученик в 12 клас, подготвящ се за ДЗИ.

Отговори САМО с валиден JSON, без обяснения извън него:
{
  "summary": "<2-3 изречения: кратко резюме на произведението/темата>",
  "themes": ["<тема 1>", "<тема 2>", "<тема 3>"],
  "keyPoints": ["<ключов момент 1>", "<ключов момент 2>", "<ключов момент 3>", "<ключов момент 4>", "<ключов момент 5>"],
  "literaryDevices": [
    {"name": "<художествено средство>", "example": "<цитат или пример от творбата>"},
    {"name": "<художествено средство>", "example": "<цитат или пример от творбата>"},
    {"name": "<художествено средство>", "example": "<цитат или пример от творбата>"}
  ],
  "quotes": ["<важен цитат 1>", "<важен цитат 2>", "<важен цитат 3>"],
  "forExam": ["<задължително за матурата 1>", "<задължително за матурата 2>", "<задължително за матурата 3>", "<задължително за матурата 4>"]
}

Бъди конкретен — само факти от точно това произведение/урок. Без общи приказки.`;

  const userMsg = `Урок: ${lessonTitle}\n\nСъдържание:\n${lessonText.slice(0, 8000)}`;

  try {
    const message = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return sendJson(res, 502, { error: 'AI не върна валиден JSON.' });

    const parsed = JSON.parse(jsonMatch[0]);
    if (userToken && message.usage) logApiUsage(userToken, message.usage.input_tokens, message.usage.output_tokens);

    return sendJson(res, 200, parsed);
  } catch (e) {
    return sendJson(res, 500, { error: `Claude API грешка: ${e.message}` });
  }
}

async function handleNotifyCompletion(req, res) {
  if (!resend) return sendJson(res, 200, { ok: true }); // silently skip if no key

  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!userToken) return sendJson(res, 401, { error: 'Unauthorized' });

  const userId = getUserIdFromJwt(userToken);
  if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

  let payload;
  try { payload = JSON.parse(await readBody(req)); }
  catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }

  const { type, lessonTitle, score, total } = payload;

  // Get user email from profiles
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=email,full_name`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const [prof] = await profRes.json();
  if (!prof?.email) return sendJson(res, 200, { ok: true });

  const firstName = (prof.full_name || '').split(' ')[0] || 'Ученику';
  const typeLabel = type === 'essay' ? 'Съчинение' : 'Тест';
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = type === 'essay' ? score >= 13 : percent >= 50;
  const resultLabel = passed ? '✅ Издържан' : '❌ Неиздържан';
  const resultColor = passed ? '#22c55e' : '#ef4444';

  const html = `<!DOCTYPE html>
<html lang="bg">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#f97316;letter-spacing:-0.5px;">Разбери.ме</div>
            <div style="font-size:13px;color:#94a3b8;margin-top:4px;">Твоята учебна платформа</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:17px;color:#1e293b;">Здравей, <strong>${firstName}</strong>!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Завърши ${typeLabel.toLowerCase()} по <strong>${lessonTitle}</strong>.
            </p>
            <!-- Result card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${typeLabel}</div>
                  <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">${lessonTitle}</div>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:24px;">
                        <div style="font-size:13px;color:#64748b;">Резултат</div>
                        <div style="font-size:24px;font-weight:800;color:#1e293b;">${score}<span style="font-size:15px;color:#94a3b8;">/${total}</span></div>
                      </td>
                      <td style="padding-right:24px;">
                        <div style="font-size:13px;color:#64748b;">Процент</div>
                        <div style="font-size:24px;font-weight:800;color:#1e293b;">${percent}%</div>
                      </td>
                      <td>
                        <div style="font-size:13px;color:#64748b;">Статус</div>
                        <div style="font-size:15px;font-weight:700;color:${resultColor};">${resultLabel}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
              Продължи да учиш — всяка стъпка те доближава до целта!
            </p>
            <a href="https://www.razberi.me/dnevnik.html" style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;">
              Виж дневника →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Получаваш това известие, защото имаш активирани уведомления в Разбери.ме.<br>
              <a href="https://www.razberi.me/settings.html?tab=notifications" style="color:#f97316;text-decoration:none;">Управлявай известията</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: 'Разбери.ме <noreply@razberi.me>',
      to: prof.email,
      subject: `${typeLabel} завършен: ${lessonTitle} — ${score}/${total}`,
      html,
    });
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('[notify] email error:', e.message);
    return sendJson(res, 200, { ok: true }); // don't fail the user flow
  }
}

async function handlePaymentHistory(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return sendJson(res, 401, { error: 'Unauthorized' });

  const userId = getUserIdFromJwt(userToken);
  if (!userId) return sendJson(res, 401, { error: 'Unauthorized' });

  // Get stripe_customer_id from profiles (service key to bypass RLS)
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const [prof] = await profRes.json();
  if (!prof?.stripe_customer_id) return sendJson(res, 200, { invoices: [] });

  try {
    const invoiceList = await stripe.invoices.list({
      customer: prof.stripe_customer_id,
      limit: 24,
    });
    const invoices = invoiceList.data.map(inv => ({
      id: inv.id,
      date: inv.created,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      pdf: inv.invoice_pdf,
      description: inv.lines?.data?.[0]?.description || '',
    }));
    return sendJson(res, 200, { invoices });
  } catch (e) {
    return sendJson(res, 500, { error: e.message });
  }
}

async function handleCheckout(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!userToken) return sendJson(res, 401, { error: 'Не си влязъл в профила си.' });

  let payload;
  try {
    const rawBody = await readBody(req);
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Невалиден JSON.' });
  }

  const { plan } = payload;
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) return sendJson(res, 400, { error: 'Невалиден план.' });

  const userId = getUserIdFromJwt(userToken);
  const origin = req.headers.origin || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/urotsi.html?checkout=success`,
      cancel_url: `${origin}/index.html#pricing`,
      metadata: { user_id: userId, plan },
      subscription_data: { metadata: { user_id: userId, plan } },
    });
    return sendJson(res, 200, { url: session.url });
  } catch (e) {
    return sendJson(res, 500, { error: `Stripe грешка: ${e.message}` });
  }
}

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let rawBody = '';
  await new Promise((resolve, reject) => {
    req.on('data', chunk => rawBody += chunk);
    req.on('end', resolve);
    req.on('error', reject);
  });

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
      : JSON.parse(rawBody);
  } catch (e) {
    return sendJson(res, 400, { error: `Webhook грешка: ${e.message}` });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
    const obj = event.data.object;
    const meta = obj.metadata || obj.subscription_details?.metadata || {};
    const userId = meta.user_id;
    const plan = meta.plan;
    console.log('[webhook] event:', event.type, '| userId:', userId, '| plan:', plan, '| customer:', obj.customer);
    if (userId && plan) {
      let renewsAt = null;
      if (obj.current_period_end) {
        renewsAt = new Date(obj.current_period_end * 1000).toISOString();
      } else if (obj.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
          if (sub.current_period_end) renewsAt = new Date(sub.current_period_end * 1000).toISOString();
        } catch (_) {}
      }
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          plan,
          trial_started_at: null,
          subscription_renews_at: renewsAt,
          stripe_customer_id: obj.customer || null,
        }),
      });
      console.log('[webhook] Supabase PATCH status:', patchRes.status);
    } else {
      console.log('[webhook] SKIP — userId або plan липсват в metadata');
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const userId = sub.metadata?.user_id;
    if (userId) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ plan: 'expired' }),
      });
    }
  }

  sendJson(res, 200, { received: true });
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
    const NO_CACHE_FILES = ['/sidebar.js', '/nav.js'];
    const cacheHeader = NO_CACHE_FILES.includes(filePath)
      ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      : {};
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', ...cacheHeader });
    res.end(content);
  });
}

const MAINTENANCE   = process.env.MAINTENANCE_MODE === 'true';
const BYPASS_SECRET = process.env.ADMIN_BYPASS_SECRET || 'razberi-admin-2026';

function getCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const match = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : null;
}

function hasBypassCookie(req) {
  return getCookie(req, 'admin_bypass') === BYPASS_SECRET;
}

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Razberi.me — Очаквайте скоро</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;}
  .logo{font-size:32px;font-weight:900;color:#1d4ed8;margin-bottom:16px;letter-spacing:-1px;}
  h1{font-size:28px;font-weight:800;color:#0f172a;margin-bottom:12px;text-align:center;}
  p{font-size:16px;color:#64748b;text-align:center;max-width:400px;line-height:1.6;}
  .admin-form{margin-top:60px;opacity:0.3;transition:opacity 0.3s;}
  .admin-form:hover{opacity:1;}
  .admin-form input{display:block;width:200px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:8px;font-size:14px;}
  .admin-form button{width:200px;padding:8px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;}
  .err{color:#dc2626;font-size:13px;margin-top:6px;}
</style>
</head>
<body>
  <div class="logo">razberi.me</div>
  <h1>Очаквайте скоро 🚀</h1>
  <form class="admin-form" method="POST" action="/admin-bypass">
    <input type="password" name="secret" placeholder="Admin парола" autocomplete="off">
    <button type="submit">Влез</button>
    %ERROR%
  </form>
</body>
</html>`;

const server = http.createServer((req, res) => {
  // Maintenance mode
  if (MAINTENANCE) {
    // Admin bypass login
    if (req.method === 'POST' && req.url === '/admin-bypass') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        const secret = new URLSearchParams(body).get('secret');
        if (secret === BYPASS_SECRET) {
          res.writeHead(302, {
            'Set-Cookie': `admin_bypass=${BYPASS_SECRET}; Path=/; HttpOnly; SameSite=Strict`,
            'Location': '/'
          });
          return res.end();
        }
        const html = MAINTENANCE_HTML.replace('%ERROR%', '<div class="err">Грешна парола</div>');
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      });
      return;
    }
    // Allow API calls through (for Stripe webhooks etc)
    if (!req.url.startsWith('/api/') && !hasBypassCookie(req)) {
      const html = MAINTENANCE_HTML.replace('%ERROR%', '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, hasAnthropicKey: Boolean(API_KEY), model: MODEL });
  }
  if (req.method === 'POST' && req.url === '/api/explain') {
    return handleExplain(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/quiz-feedback') {
    return handleQuizFeedback(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/generate-konspekt') {
    return handleGenerateKonspekt(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/grade-essay') {
    return handleGradeEssay(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/grade-pishi7') {
    return handleGradePishi7(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/checkout') {
    return handleCheckout(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/webhook') {
    return handleWebhook(req, res);
  }
  if (req.method === 'GET' && req.url === '/api/payment-history') {
    return handlePaymentHistory(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/notify-completion') {
    return handleNotifyCompletion(req, res);
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
