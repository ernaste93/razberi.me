const lessons = {
  physics: {
    title: 'Физика: Закон на Ом',
    confidence: '72%',
    blocks: [
      {
        h: 'Основна идея',
        p: 'Законът на Ом описва връзката между електричния ток, напрежението и съпротивлението. Ако съпротивлението е постоянно, токът е право пропорционален на напрежението.'
      },
      {
        h: 'Формула',
        p: 'Формулата е <span class="formula">I = U / R</span>, където I е ток, U е напрежение, а R е съпротивление.'
      },
      {
        h: 'Пример',
        p: 'Ако напрежението е 12 V, а съпротивлението е 6 Ω, тогава токът е 2 A. Това означава, че през проводника преминава по-голям ток, когато напрежението е по-високо или съпротивлението е по-ниско.'
      }
    ]
  },
  chemistry: {
    title: 'Химия: Йонна връзка',
    confidence: '64%',
    blocks: [
      {
        h: 'Основна идея',
        p: 'Йонната връзка се образува чрез електростатично привличане между противоположно заредени йони.'
      },
      {
        h: 'Как се получава',
        p: 'Един атом отдава електрон и става положителен йон, а друг атом приема електрон и става отрицателен йон. След това двата йона се привличат.'
      },
      {
        h: 'Пример',
        p: 'При натриев хлорид натрият отдава един електрон, а хлорът го приема. Така се образуват Na⁺ и Cl⁻, които се привличат.'
      }
    ]
  },
  biology: {
    title: 'Биология: Митоза и мейоза',
    confidence: '58%',
    blocks: [
      {
        h: 'Митоза',
        p: 'Митозата е клетъчно делене, при което от една клетка се получават две генетично еднакви клетки.'
      },
      {
        h: 'Мейоза',
        p: 'Мейозата е делене, при което се образуват полови клетки с половин брой хромозоми.'
      },
      {
        h: 'Защо е важно',
        p: 'Митозата помага за растеж и възстановяване на тъкани, а мейозата е важна за размножаването и генетичното разнообразие.'
      }
    ]
  }
};

let currentLesson = 'physics';
let confusedCount = 3;
let tasksCount = 12;
let lastSelectedText = '';
let aiPanelHistory = [];

const lessonSelect = document.getElementById('lesson-select');
const lessonTitle = document.getElementById('lesson-title');
const lessonContent = document.getElementById('lesson-content');
const aiOutput = document.getElementById('ai-output');
const confusedCountEl = { textContent: '' };
const tasksCountEl = { textContent: '' };
const confidenceEl = { textContent: '' };
const aiModeLabel = document.getElementById('ai-mode-label');
const aiPanel = document.getElementById('ai-panel');

function showAiPanel() {
  if (!aiPanel) return;
  aiPanel.classList.add('visible');
  updatePanelCounter();
  // Заключи височината на помощника = височината на урока
  const lessonPanel = document.querySelector('.lesson-panel');
  if (lessonPanel) {
    const h = lessonPanel.offsetHeight;
    aiPanel.style.height = h + 'px';
  }
}

document.getElementById('ai-panel-close')?.addEventListener('click', () => {
  aiPanel?.classList.remove('visible');
});

const helpChat = document.getElementById('help-chat');
const helpChatToggle = document.getElementById('help-chat-toggle');
const helpChatClose = document.getElementById('help-chat-close');
const helpChatMessages = document.getElementById('help-chat-messages');
const helpChatForm = document.getElementById('help-chat-form');
const helpChatInput = document.getElementById('help-chat-input');
const helpChatUseSelection = document.getElementById('help-chat-use-selection');
let chatHistory = [];

function renderLesson(key) {
  const lesson = lessons[key];
  lessonTitle.textContent = lesson.title;
  confidenceEl.textContent = lesson.confidence;
  lessonContent.innerHTML = lesson.blocks.map((block, index) => `
    <section class="lesson-block" data-block="${index}">
      <h3>${block.h}</h3>
      <p>${block.p}</p>
    </section>
  `).join('');
}

function getSelectedText() {
  return window.getSelection().toString().trim();
}

function getLessonPlainText() {
  const lesson = lessons[currentLesson];
  return lesson.blocks.map(block => `${block.h}: ${stripHtml(block.p)}`).join('\n');
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

const loadingMessages = [
  'Ей, сега ще ти кажа!',
  'Чакай, мисля...',
  'Момент, зареждам мозъка...',
  'Хмм, нека се замисля...',
  'На секундата!',
  'Зареждам отговора...',
];

function randomLoading() {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
}

function setLoading(message = randomLoading()) {
  aiOutput.innerHTML = `<p class="loading">${escapeHtml(message)}</p>`;
}

function scrollAiToBottom() {
  aiOutput.scrollTop = aiOutput.scrollHeight;
}

let thinkingEl = null;
function showThinking() {
  thinkingEl = document.createElement('div');
  thinkingEl.className = 'thinking-bubble';
  thinkingEl.innerHTML = '<span>💡</span>';
  aiOutput.appendChild(thinkingEl);
  scrollAiToBottom();
}
function removeThinking() {
  thinkingEl?.remove();
  thinkingEl = null;
}

function appendUserBubble(text) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;justify-content:flex-end;margin:8px 0';
  const bubble = document.createElement('span');
  bubble.style.cssText = 'background:var(--accent);color:white;padding:8px 14px;border-radius:16px 16px 4px 16px;font-size:14px;max-width:80%;';
  bubble.textContent = text;
  div.appendChild(bubble);
  aiOutput.appendChild(div);
  scrollAiToBottom();
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ');
}

function appendBotBubble(text, speed = 8, onDone = null) {
  const clean = stripMarkdown(text);
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;justify-content:flex-start;margin:8px 0';
  const bubble = document.createElement('span');
  bubble.style.cssText = 'background:var(--soft);color:var(--text);padding:8px 14px;border-radius:16px 16px 16px 4px;font-size:14px;max-width:80%;line-height:1.5;';
  div.appendChild(bubble);
  aiOutput.appendChild(div);
  scrollAiToBottom();
  let i = 0;
  function tick() {
    if (i < clean.length) {
      bubble.textContent += clean[i++];
      scrollAiToBottom();
      setTimeout(tick, speed);
    } else if (onDone) {
      onDone();
    }
  }
  tick();
}

function typewriterAppend(text, speed = 8, onDone = null) {
  const clean = stripMarkdown(text);
  const p = document.createElement('p');
  aiOutput.appendChild(p);
  scrollAiToBottom();
  let i = 0;
  function tick() {
    if (i < clean.length) {
      p.textContent += clean[i++];
      scrollAiToBottom();
      setTimeout(tick, speed);
    } else if (onDone) {
      onDone();
    }
  }
  tick();
}

function setFeedbackDisabled(disabled) {
  const row = document.querySelector('.feedback-row');
  if (row) row.classList.toggle('disabled', disabled);
}

function showInputHint() {
  const hint = document.createElement('p');
  hint.style.cssText = 'text-align:center;font-size:13px;color:var(--muted);margin:8px 0 4px;opacity:0;transition:opacity 0.4s ease;';
  hint.textContent = '✏️ Напиши отговора си в полето по-долу';
  aiOutput.appendChild(hint);
  scrollAiToBottom();
  requestAnimationFrame(() => { hint.style.opacity = '1'; });
  setFeedbackDisabled(true);
}

function formatAiText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/#{1,3} (.*?)(\n|$)/g, '<strong>$1</strong>$2')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

async function requestAiExplanation({ selectedText, mode = 'normal', chatHistory = [], studentAnswer = '' }) {
  const lesson = lessons[currentLesson];
  const response = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonTitle: lesson.title,
      lessonText: getLessonPlainText(),
      selectedText,
      mode,
      chatHistory,
      studentAnswer,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'AI endpoint error');
  }
  return data;
}

const CHAT_FREE_LIMIT = 3;
let userIsLoggedIn = false;

const MARK_FREE_LIMIT = 3;
const PANEL_FREE_LIMIT = 10;

function getChatUsageCount() {
  return parseInt(localStorage.getItem('chat_usage') || '0', 10);
}
function incrementChatUsage() {
  localStorage.setItem('chat_usage', getChatUsageCount() + 1);
}

function getMarkUsageCount() {
  return parseInt(localStorage.getItem('mark_usage') || '0', 10);
}
function incrementMarkUsage() {
  localStorage.setItem('mark_usage', getMarkUsageCount() + 1);
}

function getPanelUsageCount() {
  return parseInt(localStorage.getItem('panel_usage') || '0', 10);
}
function incrementPanelUsage() {
  localStorage.setItem('panel_usage', getPanelUsageCount() + 1);
}

function updatePanelCounter() {
  const counter = document.getElementById('ai-usage-counter');
  if (!counter) return;
  if (userIsLoggedIn) { counter.textContent = ''; return; }
  const remaining = Math.max(0, PANEL_FREE_LIMIT - getPanelUsageCount());
  counter.textContent = `Оставащ брой безплатни опити: ${remaining}`;
}

function isPanelLimitReached() {
  return !userIsLoggedIn && getPanelUsageCount() >= PANEL_FREE_LIMIT;
}

function lockPanelInput() {
  const input = document.getElementById('ai-free-input');
  const submitBtn = document.querySelector('#ai-free-form button[type="submit"]');
  if (input) { input.disabled = true; input.placeholder = 'Регистрирай се за неограничен достъп'; }
  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.4'; }
  // Lock feedback buttons
  document.getElementById('understood').disabled = true;
  document.getElementById('still-confused').disabled = true;
  setFeedbackDisabled(true);
  // Lock explain button
  lockMarkButton();
}

function showLimitCard() {
  lockPanelInput();

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--card);border:1.5px solid var(--gold);border-radius:16px;padding:16px 14px 12px;margin:12px 0;';

  const title = document.createElement('p');
  title.style.cssText = 'font-weight:700;font-size:14px;color:var(--text);margin:0 0 14px;text-align:center;';
  title.textContent = 'Внимание – Вашите кредити се изчерпаха';
  card.appendChild(title);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';

  const thankBubble = document.createElement('span');
  thankBubble.style.cssText = 'background:var(--soft);color:var(--text);padding:8px 14px;border-radius:20px;font-size:14px;cursor:pointer;font-weight:600;';
  thankBubble.textContent = 'Благодаря';
  thankBubble.addEventListener('click', () => aiPanel?.classList.remove('visible'));

  const regBubble = document.createElement('a');
  regBubble.href = '/auth.html';
  regBubble.style.cssText = 'background:var(--accent);color:white;padding:8px 14px;border-radius:20px;font-size:14px;text-decoration:none;font-weight:600;';
  regBubble.textContent = 'Регистрирай се →';

  btnRow.appendChild(thankBubble);
  btnRow.appendChild(regBubble);
  card.appendChild(btnRow);

  aiOutput.appendChild(card);
  scrollAiToBottom();
}

function lockMarkButton() {
  const explainBtn = document.getElementById('explain-selection');
  const tooltip = document.getElementById('explain-tooltip');
  if (explainBtn) {
    explainBtn.disabled = true;
    explainBtn.style.opacity = '0.45';
    explainBtn.style.cursor = 'not-allowed';
  }
  if (tooltip) tooltip.classList.remove('tooltip-hidden');
}

function updateMarkButtonState() {
  if (!userIsLoggedIn && getMarkUsageCount() >= MARK_FREE_LIMIT) {
    lockMarkButton();
  }
}

function applyAuthState(loggedIn) {
  userIsLoggedIn = loggedIn;
  const explainBtn = document.getElementById('explain-selection');
  const lessonContentEl = document.getElementById('lesson-content');
  const useSelectionBtn = document.getElementById('help-chat-use-selection');

  const tooltip = document.getElementById('explain-tooltip');
  if (!loggedIn) {
    if (lessonContentEl) lessonContentEl.style.userSelect = '';
    // Грей аут на "Маркирано" бутона в чата
    if (useSelectionBtn) {
      useSelectionBtn.disabled = true;
      useSelectionBtn.style.opacity = '0.45';
      useSelectionBtn.style.cursor = 'not-allowed';
    }
    const useSelTooltip = document.getElementById('use-selection-tooltip');
    if (useSelTooltip) useSelTooltip.classList.remove('tooltip-hidden');
  } else {
    if (explainBtn) {
      explainBtn.disabled = false;
      explainBtn.style.opacity = '';
      explainBtn.style.cursor = '';
    }
    if (tooltip) tooltip.classList.add('tooltip-hidden');
    if (lessonContentEl) lessonContentEl.style.userSelect = '';
    if (useSelectionBtn) {
      useSelectionBtn.disabled = false;
      useSelectionBtn.style.opacity = '';
      useSelectionBtn.style.cursor = '';
    }
    const useSelTooltip = document.getElementById('use-selection-tooltip');
    if (useSelTooltip) useSelTooltip.classList.add('tooltip-hidden');
  }
}

// Инициализирай auth при зареждане
(async () => {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const sb = createClient('https://wbcppvfgtvkrsfmclmjp.supabase.co', 'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l');
    const { data: { session } } = await sb.auth.getSession();
    applyAuthState(!!session);
  } catch { applyAuthState(false); }
  updateMarkButtonState();
  updatePanelCounter();
  if (isPanelLimitReached()) lockPanelInput();
})();

async function explainText(text, mode = 'normal') {
  const selectedText = text.trim();

  if (!selectedText && mode !== 'simpler') {
    aiOutput.innerHTML = '<p>Първо маркирай дума или изречение от урока. Например: “право пропорционален”, “електростатично привличане” или “половин брой хромозоми”.</p>';
    return;
  }

  showAiPanel();
  aiPanelHistory = [];
  lastSelectedText = selectedText || 'целия урок';
  confusedCount += 1;
  confusedCountEl.textContent = confusedCount;
  aiOutput.innerHTML = `<p><span class="selected">Маркирано:</span> ${escapeHtml(selectedText || 'целия урок')}</p>`;
  showThinking();

  try {
    const data = await requestAiExplanation({
      selectedText: selectedText || 'Обясни целия урок по-просто.',
      mode,
    });

    if (aiModeLabel) aiModeLabel.textContent = `реален AI: ${data.model || 'model'}`;
    const marker = '[ОТГОВОРИ]';
    const hasQuestion = data.explanation.includes(marker);
    const cleanExplanation = data.explanation.replace(marker, '').trim();
    const limitReached = isPanelLimitReached();
    removeThinking();
    aiPanelHistory.push({ role: 'assistant', content: cleanExplanation });
    const afterDone = () => {
      if (hasQuestion) showInputHint();
      if (limitReached) setTimeout(showLimitCard, 400);
    };
    typewriterAppend(cleanExplanation, 8, afterDone);
  } catch (error) {
    if (aiModeLabel) aiModeLabel.textContent = 'demo fallback, без API';
    const fallback = mockExplainText(selectedText || 'целия урок', mode);
    aiOutput.innerHTML = '';
    typewriterAppend(fallback.replace(/<[^>]*>/g, ''));
  }
}

function mockExplainText(text, mode = 'normal') {
  const lower = text.toLowerCase();
  let explanation = '';
  let question = '';

  if (lower.includes('право пропорцион') || lower.includes('напрежението')) {
    explanation = 'Това значи: ако напрежението се увеличи, токът също се увеличава, стига съпротивлението да остане същото. Представи си вода в тръба – по-голямо “бутане” води до по-силен поток.';
    question = 'Ако напрежението се увеличи 2 пъти, а съпротивлението е същото, какво ще стане с тока?';
  } else if (lower.includes('i = u') || lower.includes('формул')) {
    explanation = 'Формулата I = U / R казва, че токът се намира, като разделиш напрежението на съпротивлението. Ако U = 12 V и R = 6 Ω, тогава I = 2 A.';
    question = 'Ако U = 10 V и R = 5 Ω, колко е I?';
  } else if (lower.includes('електростатично') || lower.includes('йони')) {
    explanation = 'Електростатично привличане означава, че положителни и отрицателни заряди се привличат. При йонна връзка единият атом става положителен, другият отрицателен, и те се “залепват” заради различните заряди.';
    question = 'Ако една частица е положителна, а друга отрицателна, те ще се привличат или отблъскват?';
  } else if (lower.includes('отдава електрон') || lower.includes('приема електрон')) {
    explanation = 'Когато атом отдаде електрон, той губи отрицателен заряд и става по-положителен. Когато атом приеме електрон, получава допълнителен отрицателен заряд.';
    question = 'Атом, който отдава електрон, става положителен или отрицателен йон?';
  } else if (lower.includes('митоза')) {
    explanation = 'Митозата е като копиране: една клетка се дели на две почти еднакви клетки. Тя е важна за растежа и възстановяването на тялото.';
    question = 'При митоза получените клетки еднакви ли са с началната клетка?';
  } else if (lower.includes('мейоза') || lower.includes('половин брой')) {
    explanation = 'Мейозата прави полови клетки. Те имат половин брой хромозоми, за да може при оплождане броят да стане нормален отново.';
    question = 'Защо половите клетки имат половин брой хромозоми?';
  } else {
    explanation = `Нека го кажем по-просто: “${text}” е ключова част от урока. Представи си, че първо търсим смисъла, после пример, после проверяваме дали можеш да го използваш в задача.`;
    question = 'Можеш ли да го обясниш със свои думи в едно изречение?';
  }

  if (mode === 'simpler') {
    explanation = 'Още по-просто: ' + explanation.replace('Това значи:', '');
  }

  return `
    <p>${escapeHtml(explanation)}</p>
    <div class="question"><strong>Проверка:</strong><br>${escapeHtml(question)}</div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

if (lessonSelect) lessonSelect.addEventListener('change', (e) => {
  currentLesson = e.target.value;
  renderLesson(currentLesson);
  aiOutput.innerHTML = '<p>Избери част от новия урок, която не разбираш, и ще я обясня по друг начин.</p>';
});

function hasSeenMarkConfirm() {
  return localStorage.getItem('mark_confirmed') === '1';
}

function showMarkConfirm(onYes) {
  const overlay = document.getElementById('mark-confirm-overlay');
  overlay.style.display = 'flex';

  document.getElementById('mark-confirm-yes').onclick = () => {
    overlay.style.display = 'none';
    localStorage.setItem('mark_confirmed', '1');
    onYes();
  };
  document.getElementById('mark-confirm-no').onclick = () => {
    overlay.style.display = 'none';
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  };
}

document.getElementById('explain-selection').addEventListener('click', () => {
  const capturedText = getSelectedText();

  if (!userIsLoggedIn) {
    if (isPanelLimitReached()) {
      showAiPanel();
      showLimitCard();
      return;
    }

    const doExplain = () => {
      incrementMarkUsage();
      incrementPanelUsage();
      if (getMarkUsageCount() >= MARK_FREE_LIMIT) lockMarkButton();
      updatePanelCounter();
      explainText(capturedText);
    };

    if (!hasSeenMarkConfirm()) {
      showMarkConfirm(doExplain);
    } else {
      doExplain();
    }
  } else {
    explainText(capturedText);
  }
});

document.getElementById('simpler').addEventListener('click', () => {
  explainText('', 'simpler');
});

document.getElementById('quiz-me').addEventListener('click', () => {
  tasksCount += 1;
  tasksCountEl.textContent = tasksCount;
  const quiz = {
    physics: 'Мини въпрос: Ако U = 12 V и R = 3 Ω, колко е токът I?',
    chemistry: 'Мини въпрос: Когато атом приеме електрон, какъв йон става?',
    biology: 'Мини въпрос: Кой процес образува полови клетки – митоза или мейоза?'
  };
  aiOutput.innerHTML = `<div class="question"><strong>${quiz[currentLesson]}</strong><br><br>Помисли първо сам. После можеш да маркираш част от урока за помощ.</div>`;
});

document.getElementById('understood').addEventListener('click', () => {
  if (isPanelLimitReached()) { showLimitCard(); return; }
  if (confusedCount > 0) confusedCount -= 1;
  confusedCountEl.textContent = confusedCount;
  appendUserBubble('Разбрах');
  setTimeout(() => appendBotBubble('Супер! Записвам, че тази част вече е по-ясна. След малко ще ти я върна като кратко упражнение.'), 300);
});

document.getElementById('still-confused').addEventListener('click', () => {
  if (isPanelLimitReached()) { showLimitCard(); return; }
  const selected = getSelectedText() || lastSelectedText || 'тази част';
  appendUserBubble('Още не разбирам');
  setTimeout(() => appendBotBubble(`Няма проблем. Ще сменя подхода: представи си „${selected}" чрез пример от ежедневието, после ще го проверим с един лесен въпрос.`), 300);
});

document.getElementById('ai-free-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('ai-free-input');
  const question = input.value.trim();
  if (!question) return;
  if (isPanelLimitReached()) return;
  input.value = '';
  incrementPanelUsage();
  updatePanelCounter();
  setFeedbackDisabled(false);
  showAiPanel();
  appendUserBubble(question);
  aiPanelHistory.push({ role: 'user', content: question });
  showThinking();
  setTimeout(async () => {
    try {
      const data = await requestAiExplanation({
        selectedText: question,
        mode: 'chat',
        chatHistory: aiPanelHistory,
      });
      removeThinking();
      const marker = '[ОТГОВОРИ]';
      const hasQuestion = data.explanation.includes(marker);
      const cleanExplanation = data.explanation.replace(marker, '').trim();
      aiPanelHistory.push({ role: 'assistant', content: cleanExplanation });
      const limitReached = isPanelLimitReached();
      const afterDone = () => {
        if (hasQuestion) showInputHint();
        if (limitReached) setTimeout(showLimitCard, 400);
      };
      appendBotBubble(cleanExplanation, 8, afterDone);
    } catch (err) {
      removeThinking();
      appendBotBubble(`Грешка: ${err.message}`);
    }
  }, 300);
});

renderLesson(currentLesson);

// Cookie banner
(function() {
  const banner = document.getElementById('cookie-banner');
  const modal = document.getElementById('cookie-modal');
  if (!banner) return;

  if (!localStorage.getItem('cookie_consent')) {
    banner.style.display = 'block';
  }

  function dismissBanner() { banner.style.display = 'none'; }
  function dismissModal() { modal.style.display = 'none'; }

  function saveConsent(analytics, marketing) {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true,
      analytics,
      marketing,
      date: new Date().toISOString()
    }));
  }

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    saveConsent(true, true);
    dismissBanner();
  });

  document.getElementById('cookie-decline')?.addEventListener('click', () => {
    saveConsent(false, false);
    dismissBanner();
  });

  document.getElementById('cookie-customize')?.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  document.getElementById('cookie-save')?.addEventListener('click', () => {
    const analytics = document.getElementById('toggle-analytics')?.checked ?? false;
    const marketing = document.getElementById('toggle-marketing')?.checked ?? false;
    saveConsent(analytics, marketing);
    dismissModal();
    dismissBanner();
  });

  document.getElementById('cookie-modal-close')?.addEventListener('click', dismissModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) dismissModal(); });
})();

function addChatMessage(role, text, className = '') {
  if (!helpChatMessages) return null;
  const message = document.createElement('div');
  message.className = `chat-message ${role} ${className}`.trim();
  message.innerHTML = `<p>${formatAiText(text)}</p>`;
  helpChatMessages.appendChild(message);
  helpChatMessages.scrollTop = helpChatMessages.scrollHeight;
  return message;
}

function openHelpChat(prefill = '') {
  if (!helpChat) return;
  helpChat.classList.add('open');
  if (prefill && helpChatInput) helpChatInput.value = prefill;
  setTimeout(() => helpChatInput?.focus(), 80);
}

function closeHelpChat() {
  helpChat?.classList.remove('open');
}

function getChatFallback(question) {
  const lesson = lessons[currentLesson];
  const selected = getSelectedText();
  const topic = selected || question;
  const lower = topic.toLowerCase();

  if (lower.includes('пример')) {
    return `Нека го видим с пример от текущия урок: ${stripHtml(lesson.blocks[0].p)}\n\nСега пробвай да кажеш със свои думи коя е основната идея.`;
  }
  if (lower.includes('по-просто') || lower.includes('не разбирам')) {
    return `Окей, по-просто: темата „${lesson.title}“ има една основна идея. Не се опитвай да запомниш всичко наведнъж – първо разбери връзката между понятията, после реши един лесен пример.\n\nКоя дума точно те спира?`;
  }
  if (lower.includes('тест') || lower.includes('провери')) {
    return `Мини проверка: прочети първия абзац от урока и отговори с едно изречение: кое е най-важното правило в него?`;
  }
  return `Разбирам въпроса ти. В demo режим мога да дам базова помощ: свържи въпроса с текущия урок „${lesson.title}“.\n\n1) Какво знаем от урока?\n2) Коя дума/стъпка не е ясна?\n3) Нека я обясним с пример.\n\nМаркирай конкретния текст или задай по-точен въпрос и ще опитам пак.`;
}

async function sendHelpChatQuestion(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;

  // Лимит за нелогнати
  if (!userIsLoggedIn) {
    const usage = getChatUsageCount();
    if (usage >= CHAT_FREE_LIMIT) {
      addChatMessage('bot', `Достигна безплатния лимит от ${CHAT_FREE_LIMIT} въпроса. [Влез или се регистрирай](/auth.html) за неограничен достъп.`);
      return;
    }
    incrementChatUsage();
  }

  addChatMessage('user', cleanQuestion);
  chatHistory.push({ role: 'user', content: cleanQuestion });
  helpChatInput.value = '';

  const loadingMessage = addChatMessage('bot', 'Мисля по въпроса...', 'loading');

  try {
    const selectedText = getSelectedText();
    const data = await requestAiExplanation({
      selectedText: selectedText
        ? `Ученикът маркира: ${selectedText}\nВъпрос: ${cleanQuestion}`
        : cleanQuestion,
      mode: 'chat',
      chatHistory: chatHistory.slice(-8),
    });

    loadingMessage?.remove();
    addChatMessage('bot', data.explanation);
    chatHistory.push({ role: 'assistant', content: data.explanation });
    if (aiModeLabel) aiModeLabel.textContent = `реален AI: ${data.model || 'model'}`;
  } catch (error) {
    loadingMessage?.remove();
    if (aiModeLabel) aiModeLabel.textContent = 'demo fallback, без API';
    const fallback = getChatFallback(cleanQuestion);
    addChatMessage('bot', `Demo fallback: ${fallback}`, 'error');
    chatHistory.push({ role: 'assistant', content: fallback });
  }
}

helpChatToggle?.addEventListener('click', () => openHelpChat());
helpChatClose?.addEventListener('click', closeHelpChat);

helpChatUseSelection?.addEventListener('click', () => {
  const selected = getSelectedText();
  openHelpChat(selected ? `Обясни ми това по-просто: ${selected}` : 'Обясни ми този урок по-просто.');
});

helpChatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  sendHelpChatQuestion(helpChatInput.value);
});
