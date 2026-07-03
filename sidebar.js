(function () {
  'use strict';

  var W = 240;
  var path = window.location.pathname;

  function svg(d) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }

  var ITEMS = [
    {
      label: 'Дашборд',
      href: '/dnevnik.html',
      match: ['/dnevnik.html'],
      icon: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>')
    },
    {
      label: 'Оценки',
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
      label: 'Конспекти',
      href: '/lessons/materiali.html',
      match: ['/lessons/materiali.html'],
      icon: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>')
    },
    {
      label: 'Материали',
      href: '/lessons/materiali.html',
      match: [],
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
    '.sb-plan-card{background:#fffbf0;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;}',
    '.sb-plan-top{display:flex;align-items:center;gap:7px;margin-bottom:2px;}',
    '.sb-plan-name{font-size:13px;font-weight:800;color:#1a2f5a;}',
    '.sb-plan-until{font-size:11px;color:#94a3b8;margin-bottom:5px;}',
    '.sb-plan-link{font-size:12px;font-weight:700;color:#E8A020;text-decoration:none;}',
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
    + '<a href="/settings.html" class="sb-item' + (path === '/settings.html' ? ' sb-active' : '') + '" style="margin-bottom:4px;">'
    + '<span class="sb-ico">' + settingsIcon + '</span>'
    + '<span class="sb-lbl">Настройки</span>'
    + '</a>'
    + '<div class="sb-user" id="sb-user" style="display:none;">'
    + '<div class="sb-avatar" id="sb-avatar">?</div>'
    + '<div class="sb-user-name" id="sb-user-name"></div>'
    + '<button class="sb-logout" id="sb-logout" title="Изход">' + logoutSvg + '</button>'
    + '</div>'
    + '<div class="sb-plan-card" id="sb-plan-card" style="display:none;">'
    + '<div class="sb-plan-top"><span>👑</span><span class="sb-plan-name" id="sb-plan-name">Активен план</span></div>'
    + '<div class="sb-plan-until" id="sb-plan-until"></div>'
    + '<a href="/settings.html" class="sb-plan-link">Управление на плана</a>'
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

      var profileRes = await sb.from('profiles')
        .select('full_name,plan,plan_expires_at')
        .eq('id', session.user.id)
        .single();
      var profile = profileRes.data || {};

      // User row
      var initials = (function () {
        var n = profile.full_name || session.user.user_metadata?.full_name || '';
        if (n.trim()) {
          var parts = n.trim().split(' ');
          return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
        }
        return session.user.email.slice(0, 2).toUpperCase();
      })();

      var displayName = (function () {
        var n = (profile.full_name || session.user.user_metadata?.full_name || '').trim();
        if (n) {
          var parts = n.split(' ').filter(Boolean);
          return parts.length >= 2 ? parts[0] + ' ' + parts[1][0] + '.' : parts[0];
        }
        return session.user.email.split('@')[0];
      })();

      document.getElementById('sb-avatar').textContent = initials;
      document.getElementById('sb-user-name').textContent = displayName;
      document.getElementById('sb-user').style.display = 'flex';

      // Logout
      document.getElementById('sb-logout').addEventListener('click', async function () {
        await sb.auth.signOut();
        window.location.href = '/';
      });

      // Plan card
      var plan = profile.plan;
      if (plan && plan !== 'free' && plan !== 'trial') {
        var names = { focus: 'Фокус план', podgotovka: 'Подготовка', otlichnik: 'Отличник' };
        document.getElementById('sb-plan-name').textContent = names[plan] || 'Активен план';
        if (profile.plan_expires_at) {
          var d = new Date(profile.plan_expires_at);
          document.getElementById('sb-plan-until').textContent =
            'Активен до ' + d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        document.getElementById('sb-plan-card').style.display = 'block';
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
