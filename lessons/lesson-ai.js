// Маркира урока като посетен — отключва Тест/Съчинение в urotsi.html
(function () {
  const key = location.pathname.split('/').pop().replace('.html', '');
  if (key) localStorage.setItem('lesson_visited_' + key, '1');
})();

// Знайко AI assistant — shared across all lesson pages
// Requires on the page:
//   window.LESSON_TITLE = '...'
//   #lesson-content, #ai-panel, #ai-output, #ai-panel-close,
//   #feedback-row, #understood, #still-confused,
//   #ai-free-form, #ai-free-input,
//   #selection-tooltip, #explain-selection

(function () {
  const aiPanel    = document.getElementById('ai-panel');
  const aiOutput   = document.getElementById('ai-output');
  const feedbackRow = document.getElementById('feedback-row');
  const freeForm   = document.getElementById('ai-free-form');
  const tooltip    = document.getElementById('selection-tooltip');
  const lessonEl   = document.getElementById('lesson-content');

  let aiHistory  = [];
  let lastSelected = '';
  let controlsEverShown = false;

  // ── Helpers ──────────────────────────────────────────────
  function getLessonText() {
    return lessonEl ? lessonEl.innerText : '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, t =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[t])
    );
  }

  function stripMarkdown(t) {
    return t
      .replace(/```[\s\S]*?```/g, match => match.replace(/```/g, '').trim())
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/^[-*]\s+/gm, '• ');
  }

  // ── Panel open/close ─────────────────────────────────────
  function showPanel() {
    aiPanel.style.cssText = '';
    aiPanel.classList.add('visible');
  }

  function hidePanel() {
    aiPanel.style.animation = 'none';
    void aiPanel.offsetWidth;
    aiPanel.style.transition = 'opacity 0.26s ease, transform 0.26s cubic-bezier(0.4,0,1,1), width 0.32s ease 0.1s, padding 0.32s ease 0.1s';
    aiPanel.style.opacity = '0';
    aiPanel.style.transform = 'translateX(56px)';
    aiPanel.style.width = '0';
    aiPanel.style.padding = '0';
    aiPanel.style.pointerEvents = 'none';
    setTimeout(() => {
      aiPanel.style.cssText = '';
      aiPanel.classList.remove('visible');
      controlsEverShown = false;
    }, 360);
  }

  // ── Controls state ────────────────────────────────────────
  function setAiControls(state) {
    // state: 'hidden' | 'disabled' | 'active'
    if (state === 'active') controlsEverShown = true;
    const show = state === 'active' || (state === 'disabled' && controlsEverShown);
    feedbackRow.style.display = show ? 'flex' : 'none';
    freeForm.style.display    = show ? 'flex' : 'none';
    const disable = state !== 'active';
    feedbackRow.querySelectorAll('button').forEach(b => b.disabled = disable);
    document.getElementById('ai-free-input').disabled = disable;
    freeForm.querySelector('button[type=submit]').disabled = disable;
    feedbackRow.style.opacity = disable ? '0.4' : '1';
    freeForm.style.opacity    = disable ? '0.4' : '1';
  }

  // ── Thinking indicator ────────────────────────────────────
  let thinkEl = null;
  function showThinking() {
    thinkEl = document.createElement('div');
    thinkEl.className = 'thinking-bubble';
    thinkEl.innerHTML = '<span>💡</span>';
    aiOutput.appendChild(thinkEl);
    aiOutput.scrollTop = aiOutput.scrollHeight;
  }
  function removeThinking() { thinkEl?.remove(); thinkEl = null; }

  // ── Typewriter bubble ─────────────────────────────────────
  function addBubble(text, isUser, onDone) {
    const clean = isUser ? text : stripMarkdown(text);
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;justify-content:${isUser ? 'flex-end' : 'flex-start'};margin:8px 0`;
    const bubble = document.createElement('span');
    bubble.style.cssText = isUser
      ? 'background:var(--accent);color:white;padding:8px 14px;border-radius:16px 16px 4px 16px;font-size:14px;max-width:80%;'
      : 'background:var(--soft);color:var(--text);padding:8px 14px;border-radius:16px 16px 16px 4px;font-size:14px;max-width:85%;line-height:1.6;';

    if (!isUser) {
      wrap.appendChild(bubble);
      aiOutput.appendChild(wrap);
      aiOutput.scrollTop = aiOutput.scrollHeight;
      let i = 0;
      const chars = Array.from(clean);
      function tick() {
        if (i < chars.length) {
          bubble.textContent += chars[i++];
          aiOutput.scrollTop = aiOutput.scrollHeight;
          setTimeout(tick, 7);
        } else {
          onDone?.();
        }
      }
      tick();
    } else {
      bubble.textContent = clean;
      wrap.appendChild(bubble);
      aiOutput.appendChild(wrap);
      aiOutput.scrollTop = aiOutput.scrollHeight;
      onDone?.();
    }
  }

  // ── AI request ────────────────────────────────────────────
  async function askAI({ text, mode = 'normal' }) {
    showPanel();
    setAiControls('disabled');
    showThinking();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.__supabaseToken) headers['Authorization'] = 'Bearer ' + window.__supabaseToken;
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lessonTitle:   window.LESSON_TITLE   || '',
          lessonSubject: window.LESSON_SUBJECT || '',
          lessonText:    getLessonText(),
          selectedText:  text,
          mode,
          chatHistory:   aiHistory.slice(-8),
        }),
      });
      const data = await res.json();
      removeThinking();
      if (!res.ok) throw new Error(data.error || 'AI error');
      const answer = data.explanation.trim();
      aiHistory.push({ role: 'assistant', content: answer });
      addBubble(answer, false, () => setAiControls('active'));
    } catch (e) {
      removeThinking();
      addBubble('Грешка при свързването с помощника. Провери дали сървърът работи.', false, () => setAiControls('active'));
    }
  }

  // ── Floating selection tooltip ────────────────────────────
  function hideTooltip() { tooltip?.classList.remove('show'); }

  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || !lessonEl?.contains(sel.anchorNode)) { hideTooltip(); return; }
      const range = sel.getRangeAt(0);
      const rect  = range.getBoundingClientRect();
      if (tooltip) {
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top  = (rect.top - 48) + 'px';
        tooltip.classList.add('show');
      }
    }, 10);
  });

  document.addEventListener('mousedown', e => {
    if (tooltip && !tooltip.contains(e.target)) hideTooltip();
  });

  document.getElementById('explain-selection')?.addEventListener('click', () => {
    const sel = window.getSelection().toString().trim();
    hideTooltip();
    if (!sel) return;
    lastSelected = sel;
    aiOutput.innerHTML = `<p><span style="color:var(--accent);font-weight:700;">Маркирано:</span> ${escapeHtml(sel)}</p>`;
    aiHistory = [];
    aiHistory.push({ role: 'user', content: sel });
    askAI({ text: sel });
  });

  // ── Panel controls ────────────────────────────────────────
  document.getElementById('ai-panel-close')?.addEventListener('click', hidePanel);

  document.getElementById('btn-ask-znaiko')?.addEventListener('click', () => {
    aiOutput.innerHTML = '<p>Здравей! Имаш въпрос по урока? Питай смело — тук съм.</p>';
    aiHistory = [];
    showPanel();
    // само свободен текст — бутоните нямат смисъл без предшестващо обяснение
    feedbackRow.style.display = 'none';
    freeForm.style.display = 'flex';
    freeForm.style.opacity = '1';
    document.getElementById('ai-free-input').disabled = false;
    freeForm.querySelector('button[type=submit]').disabled = false;
    controlsEverShown = false; // reset — бутоните ще се появят след първи AI отговор
  });

  document.getElementById('understood')?.addEventListener('click', () => {
    // TODO: record "understood" in Supabase
    hidePanel();
  });

  document.getElementById('still-confused')?.addEventListener('click', () => {
    // TODO: record "not understood" in Supabase
    setAiControls('disabled');
    addBubble('Обясни пак', true);
    aiHistory.push({ role: 'user', content: 'Не разбрах. Обясни по различен начин.' });
    setTimeout(() => askAI({ text: `Ученикът не разбра. Обясни "${lastSelected || 'темата'}" по напълно различен начин — друга аналогия, друг пример.`, mode: 'chat' }), 300);
  });

  document.getElementById('ai-free-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('ai-free-input');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    setAiControls('disabled');
    addBubble(q, true);
    aiHistory.push({ role: 'user', content: q });
    askAI({ text: q, mode: 'chat' });
  });

})();

// ── Бутон за писане (БЕЛ 7 литературни уроци) ──
(function () {
  const pishi7Lessons = new Set([
    'bel7-narodno-tvorchestvo', 'bel7-vazov-opalchentsite', 'bel7-vazov-pod-igoto',
    'bel7-botev-maytse-si', 'bel7-botev-hadzhi-dimityr',
    'bel7-aleko-bay-ganyo', 'bel7-yovkov-indzhe', 'bel7-elin-pelin-zadusha',
  ]);
  const key = location.pathname.split('/').pop().replace('.html', '');
  if (!pishi7Lessons.has(key)) return;

  const panels = document.querySelectorAll('.lesson-panel');
  panels.forEach(panel => {
    if (!panel.querySelector(':scope > div > a[href*="-quiz"]')) return;
    const div = document.createElement('div');
    div.style.cssText = 'margin-top:18px;padding-top:18px;border-top:1px solid var(--line);';
    div.innerHTML = `
      <div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:4px;">Практика на писане — НВО</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:14px;">Преразказ · Творческо писане · AI оценяване по НВО критерии</div>
      <a href="/lessons/pishi7.html?key=${key}" style="display:block;text-align:center;padding:12px 16px;background:var(--accent);color:#fff;border-radius:12px;font-family:inherit;font-size:14px;font-weight:700;text-decoration:none;transition:background .15s;"
        onmouseover="this.style.background='#2d5a9e'" onmouseout="this.style.background='var(--accent)'">
        Практикувай писане за НВО →
      </a>`;
    panel.appendChild(div);
  });
})();

// ── Бутон за съчинение (само БЕЛ 12 уроци) ──
(function () {
  const essayLessons = new Set([
    'bel12-debelyanov-lyubov', 'bel12-fotev-lyubov', 'bel12-dubarova-posveshenie',
    'bel12-vaptsarov-vyara', 'bel12-dalchev-molitva', 'bel12-elin-pelin-spasova-mogila',
    'bel12-elin-pelin-vetrena-melnitsa', 'bel12-yovkov-pesenta-na-koleletata', 'bel12-paskov-balada',
    'bel12-yavorov-dve-dushi', 'bel12-bagryana-potomka', 'bel12-hristov-chesten-krast',
  ]);
  const key = location.pathname.split('/').pop().replace('.html', '');
  if (!essayLessons.has(key)) return;

  // Find quiz CTA panel and append essay section
  const panels = document.querySelectorAll('.lesson-panel');
  panels.forEach(panel => {
    if (!panel.querySelector(':scope > div > a[href*="-quiz"]')) return;
    const div = document.createElement('div');
    div.style.cssText = 'margin-top:18px;padding-top:18px;border-top:1px solid var(--line);';
    div.innerHTML = `
      <div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:4px;">Интерпретативно съчинение</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:14px;">5 теми · неограничени опити · оценяване по ДЗИ критерии</div>
      <a href="/lessons/sachine.html?key=${key}" style="display:block;text-align:center;padding:12px 16px;background:var(--accent);color:#fff;border-radius:12px;font-family:inherit;font-size:14px;font-weight:700;text-decoration:none;transition:background .15s;"
        onmouseover="this.style.background='#2d5a9e'" onmouseout="this.style.background='var(--accent)'">
        Напиши интерпретативно съчинение →
      </a>`;
    panel.appendChild(div);
  });
})();
