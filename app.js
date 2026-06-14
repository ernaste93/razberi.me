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

const lessonSelect = document.getElementById('lesson-select');
const lessonTitle = document.getElementById('lesson-title');
const lessonContent = document.getElementById('lesson-content');
const aiOutput = document.getElementById('ai-output');
const confusedCountEl = document.getElementById('confused-count');
const tasksCountEl = document.getElementById('tasks-count');
const confidenceEl = document.getElementById('confidence');
const aiModeLabel = document.getElementById('ai-mode-label');
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

function setLoading(message = 'AI мисли...') {
  aiOutput.innerHTML = `<p class="loading">${escapeHtml(message)}</p>`;
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

async function explainText(text, mode = 'normal') {
  const selectedText = text.trim();

  if (!selectedText && mode !== 'simpler') {
    aiOutput.innerHTML = '<p>Първо маркирай дума или изречение от урока. Например: “право пропорционален”, “електростатично привличане” или “половин брой хромозоми”.</p>';
    return;
  }

  lastSelectedText = selectedText || 'целия урок';
  confusedCount += 1;
  confusedCountEl.textContent = confusedCount;
  setLoading('Мисля по въпроса...');

  try {
    const data = await requestAiExplanation({
      selectedText: selectedText || 'Обясни целия урок по-просто.',
      mode,
    });

    if (aiModeLabel) aiModeLabel.textContent = `реален AI: ${data.model || 'model'}`;
    aiOutput.innerHTML = `
      <p><span class="selected">Маркирано:</span> ${escapeHtml(selectedText || 'целия урок')}</p>
      <p>${formatAiText(data.explanation)}</p>
    `;
  } catch (error) {
    if (aiModeLabel) aiModeLabel.textContent = 'demo fallback, без API';
    const fallback = mockExplainText(selectedText || 'целия урок', mode);
    aiOutput.innerHTML = `
      <p class="warning"><strong>Backend/API не отговори:</strong> ${escapeHtml(error.message)}</p>
      <p><span class="selected">Demo fallback:</span> ${escapeHtml(selectedText || 'целия урок')}</p>
      ${fallback}
    `;
  }
}

function mockExplainText(text, mode = 'normal') {
  const lower = text.toLowerCase();
  let explanation = '';
  let question = '';

  if (lower.includes('право пропорцион') || lower.includes('напрежението')) {
    explanation = 'Това значи: ако напрежението се увеличи, токът също се увеличава, стига съпротивлението да остане същото. Представи си вода в тръба — по-голямо “бутане” води до по-силен поток.';
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

lessonSelect.addEventListener('change', (e) => {
  currentLesson = e.target.value;
  renderLesson(currentLesson);
  aiOutput.innerHTML = '<p>Избери част от новия урок, която не разбираш, и ще я обясня по друг начин.</p>';
});

document.getElementById('explain-selection').addEventListener('click', () => {
  explainText(getSelectedText());
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
    biology: 'Мини въпрос: Кой процес образува полови клетки — митоза или мейоза?'
  };
  aiOutput.innerHTML = `<div class="question"><strong>${quiz[currentLesson]}</strong><br><br>Помисли първо сам. После можеш да маркираш част от урока за помощ.</div>`;
});

document.getElementById('understood').addEventListener('click', () => {
  if (confusedCount > 0) confusedCount -= 1;
  confusedCountEl.textContent = confusedCount;
  aiOutput.innerHTML += '<p><strong>Супер.</strong> Записвам, че тази част вече е по-ясна. След малко ще ти я върна като кратко упражнение.</p>';
});

document.getElementById('still-confused').addEventListener('click', () => {
  const selected = getSelectedText() || lastSelectedText || 'тази част';
  aiOutput.innerHTML += `<p><strong>Няма проблем.</strong> Ще сменя подхода: представи си ${escapeHtml(selected)} чрез пример от ежедневието, после ще го проверим с един лесен въпрос.</p>`;
});

renderLesson(currentLesson);


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
    return `Окей, по-просто: темата „${lesson.title}“ има една основна идея. Не се опитвай да запомниш всичко наведнъж — първо разбери връзката между понятията, после реши един лесен пример.\n\nКоя дума точно те спира?`;
  }
  if (lower.includes('тест') || lower.includes('провери')) {
    return `Мини проверка: прочети първия абзац от урока и отговори с едно изречение: кое е най-важното правило в него?`;
  }
  return `Разбирам въпроса ти. В demo режим мога да дам базова помощ: свържи въпроса с текущия урок „${lesson.title}“.\n\n1) Какво знаем от урока?\n2) Коя дума/стъпка не е ясна?\n3) Нека я обясним с пример.\n\nМаркирай конкретния текст или задай по-точен въпрос и ще опитам пак.`;
}

async function sendHelpChatQuestion(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;

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
