// Shared quiz engine — reads window.QUIZ_CONFIG set by each quiz page.
// Required config keys:
//   lessonKey   — localStorage key suffix, e.g. 'bel12-debelyanov-lyubov'
//   lessonUrl   — URL of the lesson page, e.g. '/lessons/bel12-debelyanov-lyubov.html'
//   lessonName  — breadcrumb display name, e.g. 'Дебелянов — Любовта'
//   eyebrow     — top label, e.g. 'БЕЛ · 12 КЛАС · ТЕМА 1'
//   title       — quiz title, e.g. 'Куиз — Димчо Дебелянов'
//   sub         — subtitle, e.g. '10 въпроса · Избери верния отговор'
//   passScore   — minimum correct answers to pass (default 8)
//   questions   — array of { q, opts: [str×4], correct: 0-3, explanation }

(function () {
  const cfg = window.QUIZ_CONFIG;
  if (!cfg || !Array.isArray(cfg.questions)) {
    console.error('quiz.js: window.QUIZ_CONFIG е непълен или липсва.');
    return;
  }

  const PASS_SCORE   = cfg.passScore ?? 8;
  const PER_ATTEMPT  = cfg.questionsPerAttempt ?? 10;
  const LETTERS      = ['А', 'Б', 'В', 'Г'];
  const GRADE_COLORS = { 6:'#16a34a', 5:'#1e3a5f', 4:'#d97706', 3:'#f97316', 2:'#dc2626' };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickQuestions() {
    const all = shuffle(cfg.questions);
    return all.slice(0, Math.min(PER_ATTEMPT, all.length));
  }

  let questions = pickQuestions();
  let cur = 0, answered = false, attemptNum = 1;
  const userAnswers = [];

  // ── Inject dynamic text ──────────────────────────────────
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

  set('quiz-eyebrow', cfg.eyebrow || '');
  set('quiz-title',   cfg.title   || '');
  set('quiz-sub',     cfg.sub     || '');

  setHtml('quiz-breadcrumb', `
    <a href="/urotsi.html">Уроци</a>
    <span>›</span>
    <a href="${cfg.lessonUrl}">${cfg.lessonName}</a>
    <span>›</span>
    Куиз
  `);

  // ── Render question ──────────────────────────────────────
  function renderQ() {
    const area = document.getElementById('quiz-area');
    area.classList.remove('quiz-animate');
    void area.offsetWidth;
    area.classList.add('quiz-animate');

    const q = questions[cur];
    set('q-num',  `Въпрос ${cur + 1} от ${questions.length}`);
    set('q-text', q.q);
    document.getElementById('quiz-progress').style.width =
      (cur / questions.length * 100) + '%';
    document.getElementById('q-explanation').className = 'quiz-explanation';
    document.getElementById('btn-next').disabled = true;
    document.getElementById('btn-next').textContent =
      cur === questions.length - 1 ? 'Виж резултата →' : 'Следващ →';
    answered = false;

    const optsEl = document.getElementById('q-options');
    optsEl.innerHTML = '';
    q.opts.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.innerHTML = `<div class="option-letter">${LETTERS[i]}</div> ${opt}`;
      btn.addEventListener('click', () => selectAnswer(i));
      optsEl.appendChild(btn);
    });
  }

  // ── Select answer ────────────────────────────────────────
  function selectAnswer(idx) {
    if (answered) return;
    answered = true;
    userAnswers[cur] = idx;
    document.querySelectorAll('.quiz-option').forEach((btn, i) => {
      btn.disabled = true;
      if (i === idx) btn.classList.add('selected');
    });
    document.getElementById('btn-next').disabled = false;
  }

  // ── Next button ──────────────────────────────────────────
  document.getElementById('btn-next').addEventListener('click', () => {
    const area = document.getElementById('quiz-area');
    area.style.transition = 'opacity .15s, transform .15s';
    area.style.opacity    = '0';
    area.style.transform  = 'translateY(-8px)';
    setTimeout(() => {
      area.style.transition = '';
      area.style.opacity    = '';
      area.style.transform  = '';
      if (cur < questions.length - 1) { cur++; renderQ(); }
      else showResults();
    }, 160);
  });

  // ── Grade ────────────────────────────────────────────────
  function gradeFromPct(p) { return p>=85?6:p>=70?5:p>=50?4:p>=30?3:2; }

  // ── Show results ─────────────────────────────────────────
  function showResults() {
    document.getElementById('quiz-progress').style.width = '100%';

    const qs      = questions;
    const correct = userAnswers.filter((a, i) => a === qs[i].correct).length;
    const pct     = Math.round(correct / qs.length * 100);
    const grade   = gradeFromPct(pct);
    const passed  = correct >= PASS_SCORE;

    const msgs = {
      6: 'Отлично! Владееш материала.',
      5: 'Много добре!',
      4: 'Добре — има какво да затвърдиш.',
      3: 'Препоръчваме да прочетеш урока отново.',
      2: 'Трябва да повториш материала.'
    };

    const wrongItems = [], correctItems = [];
    qs.forEach((q, i) => {
      const ok      = userAnswers[i] === q.correct;
      const yourOpt = q.opts[userAnswers[i]] ?? '—';
      if (!ok) {
        wrongItems.push(`
          <div class="result-wrong">
            <div class="result-wrong-q">❌ ${q.q}</div>
            <div class="result-wrong-answers">
              <div class="result-ans-row yours">
                <span class="label">Твоят:</span><span class="val">${yourOpt}</span>
              </div>
              <div class="result-ans-row correct">
                <span class="label">Верен:</span><span class="val">${q.opts[q.correct]}</span>
              </div>
            </div>
            <div class="result-explanation">${q.explanation}</div>
          </div>`);
      } else {
        correctItems.push(`
          <div class="result-correct-row">
            <span style="color:#16a34a;font-size:16px;">✓</span>
            <span class="rc-q">${q.q}</span>
            <span class="rc-a">${q.opts[q.correct]}</span>
          </div>`);
      }
    });

    const breakdown = `
      ${wrongItems.length
        ? `<div class="results-breakdown-title">Грешки (${wrongItems.length})</div>${wrongItems.join('')}`
        : ''}
      ${correctItems.length
        ? `<div class="result-correct-section">
             <div class="results-breakdown-title" style="margin-top:${wrongItems.length ? '20px' : '0'}">
               Верни отговори (${correctItems.length})
             </div>
             ${correctItems.join('')}
           </div>`
        : ''}`;

    const nextBtn = cfg.nextQuizUrl
      ? `<a href="${cfg.nextQuizUrl}" class="btn-continue">Премини към Тест ${(cfg.quizNum||1)+1} →</a>`
      : `<a href="/urotsi.html" class="btn-continue">Към уроците →</a>`;

    let btns = '';
    if (passed) {
      btns = nextBtn;
    } else if (attemptNum === 1) {
      btns = `
        <a href="${cfg.lessonUrl}" class="btn-lesson">← Прочети урока отново</a>
        <button class="btn-retry" id="btn-retry">↩ Опитай пак (остава 1 опит)</button>
        ${cfg.nextQuizUrl ? nextBtn : ''}`;
    } else {
      btns = `
        <a href="${cfg.lessonUrl}" class="btn-lesson">← Обратно към урока</a>
        ${nextBtn}`;
    }

    const wrongTexts = qs
      .map((q, i) => userAnswers[i] !== q.correct ? q.q : null)
      .filter(Boolean);

    localStorage.setItem('quiz_' + cfg.lessonKey, JSON.stringify({
      correct, total: qs.length, pct, grade, passed, attempt: attemptNum,
      wrong: wrongTexts
    }));

    // Запиши в Supabase за trial потребители
    if (window.__isTrial && window.__trialUserId && window.__trialToken) {
      var newCount = (window.__trialQuizCount || 0) + 1;
      window.__trialQuizCount = newCount;
      fetch('https://wbcppvfgtvkrsfmclmjp.supabase.co/rest/v1/profiles?id=eq.' + window.__trialUserId, {
        method: 'PATCH',
        headers: {
          'apikey': 'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l',
          'Authorization': 'Bearer ' + window.__trialToken,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ trial_quiz_count: newCount })
      });
    }

    document.getElementById('quiz-area').style.display = 'none';
    const res = document.getElementById('quiz-results');
    res.style.display = 'block';
    res.innerHTML = `
      <div class="results-score-ring" style="background:${GRADE_COLORS[grade]}">${correct}/${qs.length}</div>
      <div class="results-title">${msgs[grade]}</div>
      <div class="results-sub">${pct}% верни отговори · ${passed ? 'Минал' : 'Непреминат'}</div>
      <div class="results-grade">Оценка: <span>${grade}</span> от 6</div>
      <div class="results-breakdown">${breakdown}</div>
      <div id="znayko-feedback" style="margin-top:20px;padding:16px 20px;background:#f0f4ff;border-radius:14px;border:1.5px solid #c7d7f8;display:none;">
        <div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">💡 Знайко анализира</div>
        <div id="znayko-feedback-text" style="font-size:14px;line-height:1.65;color:var(--text);"></div>
      </div>
      <div class="results-btn-row" style="margin-top:20px;">${btns}</div>`;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      attemptNum = 2;
      cur = 0;
      userAnswers.length = 0;
      questions = pickQuestions();
      document.getElementById('quiz-area').style.display = 'block';
      res.style.display = 'none';
      renderQ();
    });

    requestZnaykoFeedback(correct, qs.length, wrongTexts, passed);
  }

  async function requestZnaykoFeedback(correct, total, wrongTexts, passed) {
    const feedbackEl = document.getElementById('znayko-feedback');
    const textEl = document.getElementById('znayko-feedback-text');
    if (!feedbackEl || !textEl) return;

    feedbackEl.style.display = 'block';
    textEl.textContent = 'Знайко чете резултатите ти...';

    const baseKey = cfg.lessonKey.replace(/-q[123]$/, '');
    const isLastTest = cfg.quizNum === 3 || !cfg.nextQuizUrl;

    let body;
    if (isLastTest && cfg.quizNum >= 2) {
      const allTests = [1, 2, 3].map(n => {
        const raw = localStorage.getItem('quiz_' + baseKey + '-q' + n);
        return raw ? JSON.parse(raw) : null;
      }).filter(Boolean);

      body = {
        topic: cfg.lessonName,
        quizNum: cfg.quizNum,
        wrong: wrongTexts,
        total,
        allTests: allTests.map(t => ({ correct: t.correct, total: t.total, wrong: t.wrong || [] }))
      };
    } else {
      body = { topic: cfg.lessonName, quizNum: cfg.quizNum || 1, wrong: wrongTexts, total };
    }

    try {
      const session = (await (await fetch('https://wbcppvfgtvkrsfmclmjp.supabase.co/auth/v1/session', {
        headers: { apikey: 'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l', 'Content-Type': 'application/json' }
      }).catch(() => ({ ok: false }))));
      const token = session?.ok
        ? (await session.json().catch(() => null))?.access_token
        : null;

      const r = await fetch('/api/quiz-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify(body)
      });

      if (!r.ok) throw new Error('server error');
      const data = await r.json();
      textEl.textContent = data.feedback || 'Няма отговор от Знайко.';
    } catch {
      feedbackEl.style.display = 'none';
    }
  }

  // ── Selection tooltip (results screen) ──────────────────
  const selTooltip = document.createElement('div');
  selTooltip.id = 'quiz-sel-tooltip';
  selTooltip.style.cssText = 'position:fixed;z-index:9999;display:none;transform:translateX(-50%);pointer-events:none;';
  selTooltip.innerHTML = `
    <button id="quiz-explain-btn" style="display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:99px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 4px 14px rgba(30,58,95,0.28);pointer-events:auto;">
      💡 Обясни
    </button>
    <div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--accent);"></div>`;
  document.body.appendChild(selTooltip);

  // ── Знайко popup (chat-style) ────────────────────────────
  const explainPopup = document.createElement('div');
  explainPopup.id = 'quiz-explain-popup';
  explainPopup.style.cssText = 'display:none;position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:min(100vw,640px);background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -4px 32px rgba(0,0,0,0.15);z-index:9998;border-top:1.5px solid var(--line);flex-direction:column;max-height:70vh;';
  explainPopup.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px 10px;border-bottom:1px solid var(--line);flex-shrink:0;">
      <span style="font-size:14px;font-weight:800;color:var(--text);">💡 Знайко</span>
      <button id="quiz-popup-close" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);line-height:1;">✕</button>
    </div>
    <div id="quiz-explain-messages" style="flex:1;overflow-y:auto;padding:14px 20px;display:flex;flex-direction:column;gap:10px;"></div>
    <div id="quiz-explain-feedback" style="display:none;padding:10px 20px;gap:8px;flex-shrink:0;flex-wrap:wrap;">
      <button id="quiz-understood" style="padding:9px 20px;background:var(--accent);color:#fff;border:none;border-radius:99px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Разбрах ✓</button>
      <button id="quiz-confused" style="padding:9px 20px;background:var(--soft);color:var(--text);border:1.5px solid var(--line);border-radius:99px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">Обясни пак</button>
    </div>
    <form id="quiz-explain-form" style="display:none;padding:10px 20px 16px;gap:8px;flex-shrink:0;">
      <input id="quiz-explain-input" type="text" placeholder="Задай въпрос..." autocomplete="off"
        style="flex:1;padding:10px 16px;border:1.5px solid var(--line);border-radius:99px;font-family:inherit;font-size:14px;outline:none;width:100%;box-sizing:border-box;" />
      <button type="submit" style="margin-top:6px;padding:10px 22px;background:var(--accent);color:#fff;border:none;border-radius:99px;font-family:inherit;font-weight:700;cursor:pointer;font-size:13px;">Изпрати →</button>
    </form>`;
  document.body.appendChild(explainPopup);

  let selCapture = '';
  let znaykoHistory = [];
  let lastSelForQuiz = '';

  function stripMd(t) {
    return t.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').replace(/^#{1,3}\s+/gm,'').replace(/^[-*]\s+/gm,'• ');
  }

  function addBubble(text, isUser, onDone) {
    const msgs = document.getElementById('quiz-explain-messages');
    const clean = isUser ? text : stripMd(text);
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;justify-content:${isUser ? 'flex-end' : 'flex-start'};`;
    const bubble = document.createElement('span');
    bubble.style.cssText = isUser
      ? 'background:var(--accent);color:#fff;padding:8px 14px;border-radius:16px 16px 4px 16px;font-size:14px;max-width:80%;'
      : 'background:var(--soft);color:var(--text);padding:8px 14px;border-radius:16px 16px 16px 4px;font-size:14px;max-width:85%;line-height:1.6;';
    wrap.appendChild(bubble);
    msgs.appendChild(wrap);
    if (!isUser) {
      let i = 0;
      const chars = Array.from(clean);
      function tick() {
        if (i < chars.length) { bubble.textContent += chars[i++]; msgs.scrollTop = msgs.scrollHeight; setTimeout(tick, 7); }
        else onDone?.();
      }
      tick();
    } else {
      bubble.textContent = clean;
      msgs.scrollTop = msgs.scrollHeight;
      onDone?.();
    }
  }

  function setFeedback(state) {
    const fb = document.getElementById('quiz-explain-feedback');
    const fm = document.getElementById('quiz-explain-form');
    if (state === 'active') {
      fb.style.display = 'flex';
      fm.style.display = 'flex';
      fb.querySelectorAll('button').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
      document.getElementById('quiz-explain-input').disabled = false;
    } else {
      fb.style.display = 'flex';
      fm.style.display = 'flex';
      fb.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.4'; });
      document.getElementById('quiz-explain-input').disabled = true;
    }
  }

  function addThinking() {
    const msgs = document.getElementById('quiz-explain-messages');
    const d = document.createElement('div');
    d.id = 'quiz-thinking';
    d.style.cssText = 'font-size:22px;opacity:.55;';
    d.textContent = '💡';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeThinking() { document.getElementById('quiz-thinking')?.remove(); }

  async function askZnayko(text, mode = 'normal') {
    addThinking();
    setFeedback('disabled');
    try {
      const r = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: text,
          lessonTitle: cfg.lessonName,
          mode,
          chatHistory: znaykoHistory.slice(-8),
        })
      });
      const data = await r.json();
      removeThinking();
      const answer = data.explanation?.trim() || 'Няма отговор.';
      znaykoHistory.push({ role: 'assistant', content: answer });
      addBubble(answer, false, () => setFeedback('active'));
    } catch {
      removeThinking();
      addBubble('Грешка при свързването.', false, () => setFeedback('active'));
    }
  }

  document.getElementById('quiz-popup-close').addEventListener('click', () => {
    explainPopup.style.display = 'none';
  });

  document.getElementById('quiz-understood').addEventListener('click', () => {
    explainPopup.style.display = 'none';
  });

  document.getElementById('quiz-confused').addEventListener('click', () => {
    setFeedback('disabled');
    addBubble('Обясни пак', true);
    znaykoHistory.push({ role: 'user', content: 'Не разбрах. Обясни по различен начин.' });
    setTimeout(() => askZnayko(`Ученикът не разбра. Обясни "${lastSelForQuiz}" по напълно различен начин — друга аналогия, друг пример.`, 'chat'), 300);
  });

  document.getElementById('quiz-explain-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('quiz-explain-input');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    setFeedback('disabled');
    addBubble(q, true);
    znaykoHistory.push({ role: 'user', content: q });
    askZnayko(q, 'chat');
  });

  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 5) { selTooltip.style.display = 'none'; return; }
    const anchor = sel.anchorNode?.parentElement;
    const allowed = anchor?.closest('.result-wrong, .result-explanation, .result-correct-row, #znayko-feedback');
    if (!allowed) { selTooltip.style.display = 'none'; return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    selCapture = text;
    selTooltip.style.left  = (r.left + r.width / 2) + 'px';
    selTooltip.style.top   = (r.top - 48) + 'px';
    selTooltip.style.display = 'block';
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#quiz-sel-tooltip') && !e.target.closest('#quiz-explain-popup')) {
      selTooltip.style.display = 'none';
    }
  });

  document.getElementById('quiz-explain-btn').addEventListener('click', () => {
    if (!selCapture) return;
    selTooltip.style.display = 'none';
    lastSelForQuiz = selCapture;
    znaykoHistory = [{ role: 'user', content: selCapture }];
    document.getElementById('quiz-explain-messages').innerHTML = '';
    document.getElementById('quiz-explain-feedback').style.display = 'none';
    document.getElementById('quiz-explain-form').style.display = 'none';
    explainPopup.style.display = 'flex';
    addBubble(selCapture, true);
    askZnayko(selCapture);
  });

  showIntro();

  function showIntro() {
    const quizNum = cfg.quizNum || 1;
    const prev = localStorage.getItem('quiz_' + cfg.lessonKey);
    const prevData = prev ? JSON.parse(prev) : null;

    let prevHtml = '';
    if (prevData) {
      const color = prevData.passed ? '#16a34a' : '#d97706';
      const icon = prevData.passed ? '✓' : '✗';
      const attempts = prevData.attempt || 1;
      const attemptsLabel = attempts >= 2 ? ` · ${attempts} опита` : ` · 1 опит`;
      prevHtml = `<div style="display:inline-block;margin-bottom:24px;padding:8px 18px;background:${prevData.passed ? '#f0fdf4' : '#fffbeb'};border:1.5px solid ${color};border-radius:10px;font-size:13px;font-weight:600;color:${color};">
        ${icon} Предишен резултат: ${prevData.correct}/${prevData.total} · Оценка ${prevData.grade}/6${attemptsLabel}
      </div>`;
    }

    const area = document.getElementById('quiz-area');
    area.style.display = 'none';
    const res = document.getElementById('quiz-results');
    res.style.display = 'block';
    res.innerHTML = `
      <div style="text-align:center;padding:12px 0 24px;">
        <div style="font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">${cfg.eyebrow || ''}</div>
        <div style="font-size:28px;font-weight:800;color:var(--text);margin-bottom:8px;">Тест ${quizNum}</div>
        <div style="font-size:15px;color:var(--muted);margin-bottom:20px;">${cfg.lessonName} · 10 въпроса</div>
        ${prevHtml}
        <div><button id="btn-start-quiz" style="padding:14px 40px;background:var(--accent);color:#fff;border:none;border-radius:14px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;">${prevData ? 'Опитай отново →' : 'Започни Тест ' + quizNum + ' →'}</button></div>
      </div>`;
    document.getElementById('btn-start-quiz').addEventListener('click', () => {
      res.style.display = 'none';
      area.style.display = 'block';
      renderQ();
    });
  }
})();
