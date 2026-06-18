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

      sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle().then(function (r) {
        var fullName = (r.data && r.data.full_name) || '';
        var initials = getInitials(fullName, email);
        localStorage.setItem('userInitials', initials);
        var av = document.getElementById('user-avatar');
        if (av) av.textContent = initials;
        var fn = document.getElementById('user-fullname-label');
        if (fn) fn.textContent = fullName || email.split('@')[0];
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
