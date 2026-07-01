// Shared nav: dropdown toggle, auth state, admin link, page transitions
(function () {
  const SUPABASE_URL = 'https://wbcppvfgtvkrsfmclmjp.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l';
  const ADMIN_EMAILS = ['kirilmodev@gmail.com'];

  // ── Dropdown toggle (synchronous, always works) ──────────
  var chip = document.getElementById('user-chip');
  var menu = document.getElementById('user-menu');
  if (chip && menu) {
    chip.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle('open');
      chip.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function () {
      menu.classList.remove('open');
      chip.setAttribute('aria-expanded', false);
    });
  }

  // ── Page transitions ─────────────────────────────────────
  document.body.style.transition = 'opacity 0.22s ease';
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || a.target === '_blank') return;
    e.preventDefault();
    document.body.style.opacity = '0';
    setTimeout(function () { window.location.href = href; }, 300);
  }, true);

  // ── Auth state ───────────────────────────────────────────
  function getInitials(name, email) {
    if (name && name.trim()) {
      var p = name.trim().split(' ');
      return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  }

  // Pre-fill initials from localStorage immediately (no flash)
  var savedInitials = localStorage.getItem('userInitials');
  if (savedInitials) {
    var avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.textContent = savedInitials;
  }

  import('https://esm.sh/@supabase/supabase-js@2').then(function (mod) {
    var sb = mod.createClient(SUPABASE_URL, SUPABASE_KEY);

    sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return;

      var user  = session.user;
      var email = user.email;
      window.__supabaseToken = session.access_token;

      // При смяна на акаунт — изчисти trial данните на предишния потребител
      var storedUserId = localStorage.getItem('current_user_id');
      if (storedUserId && storedUserId !== user.id) {
        Object.keys(localStorage).filter(function(k) {
          return k.startsWith('quiz_') || k === 'trial_lessons';
        }).forEach(function(k) { localStorage.removeItem(k); });
      }
      localStorage.setItem('current_user_id', user.id);

      // Show/hide elements for logged-in vs guest state
      ['btn-login', 'btn-try'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      var menu = document.getElementById('user-menu');
      if (menu) menu.style.display = 'block';
      var btnDnevnik = document.getElementById('btn-dnevnik');
      if (btnDnevnik) btnDnevnik.style.display = '';

      // Admin link
      if (ADMIN_EMAILS.includes(email)) {
        var btnAdmin = document.getElementById('btn-admin');
        if (btnAdmin) btnAdmin.style.display = '';
      }

      // User info
      document.getElementById('user-email-label') &&
        (document.getElementById('user-email-label').textContent = email);

      sb.from('profiles').select('full_name, plan, trial_started_at, trial_quiz_count, trial_lessons_opened').eq('id', user.id).maybeSingle().then(function (r) {
        var fullName = (r.data && r.data.full_name) || '';
        var initials = getInitials(fullName, email);
        localStorage.setItem('userInitials', initials);
        var av = document.getElementById('user-avatar');
        if (av) av.textContent = initials;
        var fn = document.getElementById('user-fullname-label');
        if (fn) fn.textContent = fullName || email.split('@')[0];

        // Trial state
        var plan = r.data && r.data.plan;
        var trialStarted = r.data && r.data.trial_started_at;
        var isTrial = !plan || plan === 'trial' || plan === 'free';
        var expired = isTrial && trialStarted && (Date.now() - new Date(trialStarted)) / 86400000 > 3;
        var trialLessonsOpened = (r.data && r.data.trial_lessons_opened) || [];
        var trialQuizzesDone  = (r.data && r.data.trial_quizzes_done)  || [];

        // Expose за quiz.js
        window.__trialUserId       = user.id;
        window.__trialToken        = session.access_token;
        window.__isTrial           = isTrial && !expired;
        window.__trialQuizzesDone  = trialQuizzesDone;
        window.__sbClient          = sb;

        // Trial gating за lesson и quiz страници
        if (isTrial && !expired) {
          var path = window.location.pathname;
          var isLesson = path.startsWith('/lessons/') && path.indexOf('-quiz') === -1;
          var isQuiz   = path.startsWith('/lessons/') && path.indexOf('-quiz') !== -1;

          if (isLesson) {
            var slug = path.replace('/lessons/', '').replace('.html', '');
            if (trialLessonsOpened.indexOf(slug) === -1) {
              if (trialLessonsOpened.length >= 3) {
                window.location.href = '/urotsi.html?trial_limit=lesson';
                return;
              }
              var newLessons = trialLessonsOpened.concat([slug]);
              sb.from('profiles').update({ trial_lessons_opened: newLessons }).eq('id', user.id).then(function(){});
            }

            // Ако quiz-ът за този урок е вече направен — заключи бутоните с tooltip
            if (trialQuizzesDone.indexOf(slug) !== -1) {
              document.addEventListener('DOMContentLoaded', function() { lockQuizButtons(); });
              if (document.readyState !== 'loading') lockQuizButtons();
              function lockQuizButtons() {
                document.querySelectorAll('a[href*="-quiz"]').forEach(function(btn, i) {
                  btn.removeAttribute('href');
                  btn.style.opacity = '0.45';
                  btn.style.cursor = 'default';
                  btn.style.position = 'relative';
                  btn.addEventListener('mouseenter', function() {
                    var tip = document.createElement('div');
                    tip.className = '__trial-tip';
                    tip.style.cssText = 'position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;font-size:12px;font-weight:500;padding:7px 12px;border-radius:8px;white-space:nowrap;z-index:999;pointer-events:none;';
                    tip.innerHTML = 'Вече направи тест за този урок.<br><a href="/index.html#pricing" style="color:#93c5fd;text-decoration:underline;">Избери план за повече →</a>';
                    tip.style.pointerEvents = 'auto';
                    btn.appendChild(tip);
                  });
                  btn.addEventListener('mouseleave', function() {
                    var tip = btn.querySelector('.__trial-tip');
                    if (tip) tip.remove();
                  });
                });
              }
            }
          }

          if (isQuiz) {
            // Извади lesson slug от quiz URL: bel12-debelyanov-lyubov-quiz-2 → bel12-debelyanov-lyubov
            var quizLessonSlug = path.replace('/lessons/', '').replace('.html', '').replace(/-quiz.*$/, '');
            if (trialQuizzesDone.indexOf(quizLessonSlug) !== -1) {
              window.location.href = '/urotsi.html?trial_limit=quiz';
              return;
            }
          }
        }

        // Trial popup — веднъж на сесия след логин
        if (isTrial && !expired && trialStarted && !sessionStorage.getItem('trial_popup_shown')) {
          sessionStorage.setItem('trial_popup_shown', '1');
          var daysLeft = Math.max(0, 3 - Math.floor((Date.now() - new Date(trialStarted)) / 86400000));
          var dayWord = daysLeft === 1 ? 'ден' : 'дни';
          var modal = document.createElement('div');
          modal.id = 'nav-trial-modal';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;';
          modal.innerHTML = '<div style="background:#fff;border-radius:20px;padding:40px 36px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25);">' +
            '<div style="font-size:40px;margin-bottom:12px;">⏳</div>' +
            '<h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 10px;">Безплатен пробен период</h2>' +
            '<p style="font-size:15px;color:#475569;margin:0 0 24px;line-height:1.6;">Имаш още <strong>' + daysLeft + ' ' + dayWord + '</strong> безплатен достъп. След това ще трябва да избереш план, за да продължиш.</p>' +
            '<div style="background:#f0f7ff;border-radius:12px;padding:14px 18px;margin-bottom:24px;text-align:left;">' +
              '<div style="font-size:13px;color:#1e40af;font-weight:600;margin-bottom:6px;">Сега имаш достъп само до:</div>' +
              '<div style="font-size:13px;color:#334155;line-height:1.8;">✅ 3 БЕЛ урока по избор<br>✅ 3 теста<br>✅ 3 съчинения<br>✅ 30 въпроса към Знайко на ден<br>🔒 Математика, Биология, Химия — заключени</div>' +
            '</div>' +
            '<a href="/index.html#pricing" style="display:block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:12px;margin-bottom:12px;">Виж плановете →</a>' +
            '<button style="background:none;border:none;color:#94a3b8;font-size:14px;cursor:pointer;padding:4px;">Продължи с безплатната версия</button>' +
          '</div>';
          modal.querySelector('button').onclick = function () { modal.remove(); };
          document.body.appendChild(modal);
        }
      });

      // Logout
      var logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.onclick = function () {
          sb.auth.signOut().then(function () {
            localStorage.removeItem('userInitials');
            window.location.href = '/';
          });
        };
      }
    });
  });
})();
