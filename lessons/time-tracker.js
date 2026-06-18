// Active time tracker — reads window.LESSON_SUBJECT
// Three signals combined:
//   1. Interaction (mousemove, click, keydown, touchstart) — resets 3-min idle timer
//   2. Scroll progress — checked every 20s; if position changed, counts as reading
//   3. Tab visibility — pauses immediately when tab is hidden
// Saves per-subject seconds to localStorage key 'razberi_time_v1'

(function () {
  const subject = window.LESSON_SUBJECT;
  if (!subject) return;

  const STORE_KEY      = 'razberi_time_v1';
  const IDLE_MS        = 3 * 60_000;  // 3 min without any signal → idle
  const SCROLL_CHECK   = 20_000;      // check scroll progress every 20s
  const today          = new Date().toISOString().slice(0, 10);

  let trackStart = Date.now();
  let pending    = 0;
  let isActive   = true;
  let idleTimer  = null;
  let lastScrollY = window.scrollY;

  // ── Storage ──────────────────────────────────────────────
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  }

  function flush() {
    if (isActive) {
      pending   += Math.round((Date.now() - trackStart) / 1000);
      trackStart = Date.now();
    }
    if (pending === 0) return;

    const store = load();
    if (!store[subject]) store[subject] = { total: 0, today: 0, lastDate: '' };
    if (store[subject].lastDate !== today) {
      store[subject].today    = 0;
      store[subject].lastDate = today;
    }
    store[subject].total += pending;
    store[subject].today += pending;
    pending = 0;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  // ── Mark active ───────────────────────────────────────────
  function markActive() {
    if (!isActive) {
      isActive   = true;
      trackStart = Date.now();
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(goIdle, IDLE_MS);
  }

  function goIdle() {
    flush();
    isActive = false;
  }

  // Signal 1: user interaction
  ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, markActive, { passive: true })
  );

  // Signal 2: scroll progress — if scrollY changed since last check → reading
  setInterval(() => {
    if (document.hidden) return;
    const currentY = window.scrollY;
    if (Math.abs(currentY - lastScrollY) > 10) {
      lastScrollY = currentY;
      markActive();
    }
  }, SCROLL_CHECK);

  // Signal 3: tab visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flush();
      isActive = false;
      clearTimeout(idleTimer);
    } else {
      trackStart = Date.now();
      markActive();
    }
  });

  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);

  markActive(); // start
})();
