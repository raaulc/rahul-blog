(function () {
  // scroll progress
  var bar = document.getElementById('progress');
  function prog() {
    if (!bar) return;
    var h = document.documentElement;
    var m = h.scrollHeight - h.clientHeight;
    bar.style.width = (m > 0 ? (h.scrollTop / m) * 100 : 0) + '%';
  }
  addEventListener('scroll', prog, { passive: true });
  prog();

  // theme toggle (default dark; choice persists in localStorage)
  var tt = document.getElementById('themeToggle');
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('deck-theme', t); } catch (e) {}
    if (tt) {
      tt.textContent = t === 'light' ? '☀ Light' : '☾ Dark';
      tt.setAttribute('aria-pressed', String(t === 'dark'));
    }
  }
  if (tt) {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    tt.addEventListener('click', function () {
      setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });
  }

  // reveal on scroll
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // article tabs
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabbar button'));
  if (!tabs.length) return;
  var panels = {};
  document.querySelectorAll('.panel').forEach(function (p) { panels[p.dataset.panel] = p; });

  function show(name) {
    if (!panels[name]) name = tabs[0].dataset.tab;
    tabs.forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    Object.keys(panels).forEach(function (k) { panels[k].classList.toggle('on', k === name); });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
    scrollTo(0, 0);
    requestAnimationFrame(function () {
      panels[name].querySelectorAll('.reveal').forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight * 0.95) el.classList.add('in');
      });
      prog();
    });
  }

  tabs.forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.tab); });
  });
  show((location.hash || '').replace('#', '') || tabs[0].dataset.tab);
})();
