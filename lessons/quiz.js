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

    let btns = '';
    if (passed) {
      const nextBtn = cfg.nextQuizUrl
        ? `<a href="${cfg.nextQuizUrl}" class="btn-continue">Тест ${(cfg.quizNum||1)+1} →</a>`
        : `<a href="/urotsi.html" class="btn-continue">Към уроците →</a>`;
      btns = nextBtn;
    } else if (attemptNum === 1) {
      btns = `
        <a href="${cfg.lessonUrl}" class="btn-lesson">← Прочети урока отново</a>
        <button class="btn-retry" id="btn-retry">↩ Опитай пак (2-ри опит)</button>`;
    } else {
      btns = `
        <a href="${cfg.lessonUrl}" class="btn-lesson">← Обратно към урока</a>
        <a href="/urotsi.html" class="btn-continue">Към уроците →</a>`;
    }

    const wrongTexts = qs
      .map((q, i) => userAnswers[i] !== q.correct ? q.q : null)
      .filter(Boolean);

    localStorage.setItem('quiz_' + cfg.lessonKey, JSON.stringify({
      correct, total: qs.length, pct, grade, passed, attempt: attemptNum,
      wrong: wrongTexts
    }));

    document.getElementById('quiz-area').style.display = 'none';
    const res = document.getElementById('quiz-results');
    res.style.display = 'block';
    res.innerHTML = `
      <div class="results-score-ring" style="background:${GRADE_COLORS[grade]}">${correct}/${qs.length}</div>
      <div class="results-title">${msgs[grade]}</div>
      <div class="results-sub">${pct}% верни отговори · ${passed ? 'Минал' : 'Непреминат'}</div>
      <div class="results-grade">Оценка: <span>${grade}</span> от 6</div>
      <div class="results-breakdown">${breakdown}</div>
      <div class="results-btn-row">${btns}</div>
      <div id="znayko-feedback" style="margin-top:20px;padding:16px 20px;background:#f0f4ff;border-radius:14px;border:1.5px solid #c7d7f8;display:none;">
        <div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Знайко анализира</div>
        <div id="znayko-feedback-text" style="font-size:14px;line-height:1.65;color:var(--text);"></div>
      </div>`;

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

  showIntro();

  function showIntro() {
    const quizNum = cfg.quizNum || 1;
    const area = document.getElementById('quiz-area');
    area.style.display = 'none';
    const res = document.getElementById('quiz-results');
    res.style.display = 'block';
    res.innerHTML = `
      <div style="text-align:center;padding:12px 0 24px;">
        <div style="font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">${cfg.eyebrow || ''}</div>
        <div style="font-size:28px;font-weight:800;color:var(--text);margin-bottom:8px;">Тест ${quizNum}</div>
        <div style="font-size:15px;color:var(--muted);margin-bottom:32px;">${cfg.lessonName} · 10 въпроса</div>
        <button id="btn-start-quiz" style="padding:14px 40px;background:var(--accent);color:#fff;border:none;border-radius:14px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;">Започни Тест ${quizNum} →</button>
      </div>`;
    document.getElementById('btn-start-quiz').addEventListener('click', () => {
      res.style.display = 'none';
      area.style.display = 'block';
      renderQ();
    });
  }
})();
