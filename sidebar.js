(function () {
  'use strict';

  var W = 240;
  var path = window.location.pathname;

  // Ако сме в урок, материалите отварят директно за него
  var lessonKey = '';
  if (path.startsWith('/lessons/') && path.endsWith('.html')) {
    var slug = path.split('/').pop().replace('.html', '');
    if (slug && slug !== 'materiali' && !slug.includes('quiz') && slug !== 'pishi7' && slug !== 'sachine' && slug !== 'lesson-ai') {
      lessonKey = slug;
    }
  }
  var materialiHref = lessonKey ? ('/lessons/materiali.html?key=' + lessonKey) : '/lessons/materiali.html';

  function svg(d) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }

  var ITEMS = [
    {
      label: 'Дневник',
      href: '/dnevnik.html',
      match: ['/dnevnik.html'],
      icon: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>')
    },
    {
      label: 'Бележник',
      href: '/dnevnik-book.html',
      match: ['/dnevnik-book.html'],
      icon: svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>')
    },
    {
      label: 'Уроци',
      href: '/urotsi.html',
      match: ['/urotsi.html'],
      icon: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')
    },
    {
      label: 'Тестове',
      href: '/testove.html',
      match: ['/testove.html'],
      icon: svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>')
    },
    {
      label: 'Помагала',
      href: materialiHref,
      match: ['/lessons/materiali.html'],
      icon: svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>')
    },
  ];

  var BOTTOM = [];

  var settingsIcon = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>');

  function isActive(item) {
    if (item.match.indexOf(path) !== -1) return true;
    return item.match.some(function (m) { return m !== '/' && path.startsWith(m); });
  }

  function renderItem(item) {
    return '<a href="' + item.href + '" class="sb-item' + (isActive(item) ? ' sb-active' : '') + '">'
      + '<span class="sb-ico">' + item.icon + '</span>'
      + '<span class="sb-lbl">' + item.label + '</span>'
      + '</a>';
  }

  var css = [
    '#app-sidebar{position:fixed;top:0;left:0;bottom:0;width:' + W + 'px;background:#fff;border-right:1px solid #e8edf5;display:flex;flex-direction:column;z-index:400;box-shadow:2px 0 16px rgba(26,47,90,.05);}',
    '.sb-logo{padding:16px 18px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;}',
    '.sb-logo img{height:74px;width:auto;}',
    '.sb-nav{flex:1;padding:10px 10px 0;overflow-y:auto;}',
    '.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;text-decoration:none;color:#64748b;font-size:14px;font-weight:600;font-family:inherit;margin-bottom:2px;transition:background .12s,color .12s;}',
    '.sb-item:hover{background:#f1f5f9;color:#1a2f5a;}',
    '.sb-active{background:#eef2f9!important;color:#1a2f5a!important;font-weight:700;}',
    '.sb-ico{display:flex;align-items:center;flex-shrink:0;}',
    '.sb-divider{height:1px;background:#f1f5f9;margin:8px 10px;}',
    '.sb-bottom{padding:10px 12px 14px;display:flex;flex-direction:column;gap:10px;}',
    /* User row */
    '.sb-user{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;border:1px solid #f1f5f9;background:#f8fafc;}',
    '.sb-avatar{width:30px;height:30px;border-radius:50%;background:#1a2f5a;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.sb-user-name{font-size:12px;font-weight:700;color:#1a2f5a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}',
    '.sb-logout{background:none;border:none;cursor:pointer;color:#94a3b8;padding:2px;display:flex;align-items:center;flex-shrink:0;transition:color .15s;}',
    '.sb-logout:hover{color:#e53e3e;}',
    /* Plan card */
    '.sb-plan-card{border-radius:12px;padding:12px 14px;}',
    '.sb-plan-card.plan-active{background:#f0fdf4;border:1px solid #86efac;}',
    '.sb-plan-card.plan-trial{background:#fffbf0;border:1px solid #fde68a;}',
    '.sb-plan-card.plan-expired{background:#fff1f2;border:1px solid #fca5a5;}',
    '.sb-plan-top{display:flex;align-items:center;gap:7px;margin-bottom:2px;}',
    '.sb-plan-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}',
    '.sb-plan-dot.dot-active{background:#22c55e;}',
    '.sb-plan-dot.dot-trial{background:#f59e0b;}',
    '.sb-plan-dot.dot-expired{background:#ef4444;}',
    '.sb-plan-name{font-size:13px;font-weight:800;color:#1a2f5a;}',
    '.sb-plan-status{font-size:11px;margin-bottom:5px;font-weight:600;}',
    '.sb-plan-status.st-active{color:#16a34a;}',
    '.sb-plan-status.st-trial{color:#d97706;}',
    '.sb-plan-status.st-expired{color:#dc2626;}',
    '.sb-plan-until{font-size:11px;color:#94a3b8;margin-bottom:5px;}',
    '.sb-plan-link{font-size:12px;font-weight:700;text-decoration:none;}',
    '.sb-plan-link.lnk-active{color:#16a34a;}',
    '.sb-plan-link.lnk-trial{color:#E8A020;}',
    '.sb-plan-link.lnk-expired{color:#dc2626;}',
    '.sb-plan-link:hover{text-decoration:underline;}',
    /* Body offset + hide existing topbar */
    'body.has-sidebar .topbar{display:none!important;}',
    'body.has-sidebar{padding-left:' + W + 'px!important;padding-top:0!important;margin-top:0!important;}',
    '@media(max-width:768px){#app-sidebar{display:none;}body.has-sidebar{padding-left:0!important;}body.has-sidebar .topbar{display:block!important;}}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var logoutSvg = svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>');

  var sidebar = document.createElement('aside');
  sidebar.id = 'app-sidebar';
  sidebar.innerHTML =
    '<div class="sb-logo"><a href="/"><img src="/logos/transparent_logo.png" alt="Разбери.Ме"/></a></div>'
    + '<div class="sb-nav">'
    + ITEMS.map(renderItem).join('')
    + '</div>'
    + '<div class="sb-bottom">'
    + '<div class="sb-divider" style="margin:0 0 6px;"></div>'
    + '<div class="sb-plan-card" id="sb-plan-card" style="display:none;">'
    + '<div class="sb-plan-top"><div class="sb-plan-dot" id="sb-plan-dot"></div><span class="sb-plan-name" id="sb-plan-name"></span></div>'
    + '<div class="sb-plan-status" id="sb-plan-status"></div>'
    + '<div class="sb-plan-until" id="sb-plan-until"></div>'
    + '<a href="/settings.html?tab=subscription" class="sb-plan-link" id="sb-plan-link"></a>'
    + '</div>'
    + '<a href="/admin.html" class="sb-item" id="sb-admin-link" style="display:none;margin-bottom:2px;">'
    + '<span class="sb-ico">' + svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>') + '</span>'
    + '<span class="sb-lbl">Админ панел</span>'
    + '</a>'
    + '<a href="/settings.html" class="sb-item' + (path === '/settings.html' ? ' sb-active' : '') + '" style="margin-bottom:4px;">'
    + '<span class="sb-ico">' + settingsIcon + '</span>'
    + '<span class="sb-lbl">Настройки</span>'
    + '</a>'
    + '<div class="sb-user" id="sb-user" style="display:none;">'
    + '<div class="sb-avatar" id="sb-avatar">?</div>'
    + '<div class="sb-user-name" id="sb-user-name"></div>'
    + '<button class="sb-logout" id="sb-logout" title="Изход">' + logoutSvg + '</button>'
    + '</div>'
    + '</div>';

  document.body.prepend(sidebar);
  document.body.classList.add('has-sidebar');

  async function init() {
    try {
      var mod = await import('https://esm.sh/@supabase/supabase-js@2');
      var sb = mod.createClient(
        'https://wbcppvfgtvkrsfmclmjp.supabase.co',
        'sb_publishable_7Z_7D7Zpl42erySzKs9FmQ_cB8vt-5l'
      );

      var sessionRes = await sb.auth.getSession();
      var session = sessionRes.data.session;
      if (!session) return;

      var userRes = await sb.auth.getUser();
      var user = userRes.data?.user || session.user;

      var profileRes = await sb.from('profiles')
        .select('full_name,plan,trial_started_at')
        .eq('id', user.id)
        .single();
      var profile = profileRes.data || {};

      // ── Access gate ──
      var PAID_PLANS_SB = ['active', 'focus', 'podgotovka', 'otlichnik'];
      var OPEN_PATHS = ['/settings.html', '/auth.html', '/', '/index.html', '/terms.html', '/privacy.html', '/dnevnik.html', '/istoriya.html', '/dnevnik-book.html'];
      var currentPath = window.location.pathname;
      var isOpenPath = OPEN_PATHS.indexOf(currentPath) !== -1 || currentPath === '/admin.html' || currentPath.startsWith('/admin/');

      if (!isOpenPath) {
        var plan = profile.plan;
        var isPaidNow = PAID_PLANS_SB.indexOf(plan) !== -1;
        var isExpiredPlan = plan === 'expired';
        var trialMs = profile.trial_started_at ? (Date.now() - new Date(profile.trial_started_at)) / 86400000 : 0;
        var isTrialExpired = !isPaidNow && !isExpiredPlan && profile.trial_started_at && trialMs > 3;

        if (isExpiredPlan || isTrialExpired) {
          // Greyout page content
          var style = document.createElement('style');
          style.textContent = 'body.access-locked main, body.access-locked .lesson-page, body.access-locked .ur-wrap { filter: blur(3px) grayscale(0.4); pointer-events: none; user-select: none; }';
          document.head.appendChild(style);
          document.body.classList.add('access-locked');

          // Overlay
          var msg = isExpiredPlan
            ? 'Абонаментът ти е изтекъл.'
            : 'Пробният ти период е изтекъл.';
          var overlay = document.createElement('div');
          overlay.style.cssText = [
            'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;',
            'background:rgba(15,23,42,0.55);backdrop-filter:blur(2px);'
          ].join('');
          overlay.innerHTML = [
            '<div style="background:#fff;border-radius:24px;padding:44px 48px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,0.22);">',
            '<div style="margin-bottom:20px;color:#0f172a;">' + svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>').replace('width="20" height="20"', 'width="52" height="52"').replace('stroke-width="1.6"', 'stroke-width="1.4"') + '</div>',
            '<div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px;">' + msg + '</div>',
            '<div style="font-size:14px;color:#64748b;margin-bottom:28px;line-height:1.6;">За да продължиш да учиш, поднови абонамента си.</div>',
            '<a href="/settings.html?tab=subscription" style="display:inline-block;background:#E8A020;color:#fff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Поднови плана →</a>',
            '<div style="margin-top:16px;"><a href="/dnevnik.html" style="font-size:13px;color:#64748b;text-decoration:none;">Обратно към дневника</a></div>',
            '</div>'
          ].join('');
          document.body.appendChild(overlay);
          return;
        }
      }

      // User row
      var initials = (function () {
        var n = profile.full_name || user.user_metadata?.full_name || '';
        if (n.trim()) {
          var parts = n.trim().split(' ');
          return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
        }
        return user.email.slice(0, 2).toUpperCase();
      })();

      var displayName = (function () {
        var n = (profile.full_name || user.user_metadata?.full_name || '').trim();
        if (n) {
          var parts = n.split(' ').filter(Boolean);
          return parts.length >= 2 ? parts[0] + ' ' + parts[1][0] + '.' : parts[0];
        }
        return user.email.split('@')[0];
      })();

      var savedAvatar = localStorage.getItem('userAvatar');
      var avatarEl = document.getElementById('sb-avatar');
      if (savedAvatar) {
        avatarEl.textContent = savedAvatar;
        avatarEl.style.fontSize = '18px';
      } else {
        avatarEl.textContent = initials;
        avatarEl.style.fontSize = '';
      }
      document.getElementById('sb-user-name').textContent = displayName;
      document.getElementById('sb-user').style.display = 'flex';

      // Admin link
      var ADMIN_EMAILS = ['kirilmodev@gmail.com', 'help.razberi.me@gmail.com'];
      if (ADMIN_EMAILS.indexOf(user.email) !== -1) {
        document.getElementById('sb-admin-link').style.display = 'flex';
      }

      // Logout
      document.getElementById('sb-logout').addEventListener('click', async function () {
        await sb.auth.signOut();
        window.location.href = '/';
      });

      // Plan card
      var plan = profile.plan;
      if (plan && plan !== 'free') {
        var card = document.getElementById('sb-plan-card');
        var dot = document.getElementById('sb-plan-dot');
        var nameEl = document.getElementById('sb-plan-name');
        var statusEl = document.getElementById('sb-plan-status');
        var untilEl = document.getElementById('sb-plan-until');
        var linkEl = document.getElementById('sb-plan-link');
        var PLAN_NAMES = { focus: 'Фокус план', podgotovka: 'Подготовка', otlichnik: 'Отличник', active: 'Активен план', trial: 'Пробен период', expired: 'Абонамент' };

        if (plan === 'expired') {
          card.className = 'sb-plan-card plan-expired';
          dot.className = 'sb-plan-dot dot-expired';
          nameEl.textContent = 'Абонаментът е изтекъл';
          statusEl.className = 'sb-plan-status st-expired';
          statusEl.textContent = 'Неактивен';
          untilEl.textContent = '';
          linkEl.className = 'sb-plan-link lnk-expired';
          linkEl.textContent = 'Поднови плана →';
        } else if (plan === 'trial') {
          var trialDays = profile.trial_started_at ? (Date.now() - new Date(profile.trial_started_at)) / 86400000 : 0;
          var TRIAL_DAYS_SB = 3;
          var daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS_SB - trialDays));
          card.className = 'sb-plan-card plan-trial';
          dot.className = 'sb-plan-dot dot-trial';
          nameEl.textContent = 'Пробен период';
          statusEl.className = 'sb-plan-status st-trial';
          statusEl.textContent = daysLeft > 0 ? ('Остават ' + daysLeft + (daysLeft === 1 ? ' ден' : ' дни')) : 'Изтекъл';
          untilEl.textContent = '';
          linkEl.className = 'sb-plan-link lnk-trial';
          linkEl.textContent = 'Виж плановете →';
        } else {
          card.className = 'sb-plan-card plan-active';
          dot.className = 'sb-plan-dot dot-active';
          nameEl.textContent = PLAN_NAMES[plan] || 'Активен план';
          statusEl.className = 'sb-plan-status st-active';
          statusEl.textContent = 'Активен';
          var renewsAt = profile.subscription_renews_at;
          if (renewsAt) {
            var d = new Date(renewsAt);
            untilEl.textContent = 'Подновяване: ' + d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
          } else {
            untilEl.textContent = '';
          }
          linkEl.className = 'sb-plan-link lnk-active';
          linkEl.textContent = 'Управление на плана';
        }
        card.style.display = 'block';
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
