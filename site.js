(function () {
  var doc = document, root = doc.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menu mobile
  var btn = doc.querySelector('.menu-btn'), nav = doc.querySelector('.nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Apparition au défilement
  var els = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Agenda : les dates passées changent de liste toutes seules
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var past = doc.getElementById('past');
  doc.querySelectorAll('#upcoming .gig[data-date]').forEach(function (g) {
    if (new Date(g.getAttribute('data-date') + 'T23:59:59') < today) {
      g.classList.add('past');
      if (past) past.insertBefore(g, past.firstChild); else g.remove();
    }
  });
  var next = doc.querySelector('[data-next]');
  if (next) {
    var n = parseInt(next.getAttribute('data-next'), 10) || 3;
    next.querySelectorAll('.gig').forEach(function (g, i) { if (i >= n) g.remove(); });
    if (!next.querySelector('.gig')) {
      var li = doc.createElement('li');
      li.className = 'muted'; li.textContent = 'Les prochaines dates arrivent bientôt.';
      next.appendChild(li);
    }
  }

  // Ciel étoilé et Voie lactée
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function gauss(r) { return (r() + r() + r() + r() - 2) / 2; }
  doc.querySelectorAll('canvas.stars').forEach(function (cv, idx) {
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var stars = [], w = 0, h = 0, raf = 0, visible = true;
    function build() {
      var box = cv.parentNode.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(box.width)); h = Math.max(1, Math.round(box.height));
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var r = rng(7 + idx * 31), count = Math.min(520, Math.round(w * h / 2600));
      stars = [];
      for (var i = 0; i < count; i++) {
        var inBand = r() < 0.6, x, y;
        if (inBand) { var t = r(); x = t * w; y = h * (0.92 - 0.95 * t) + gauss(r) * h * 0.2; }
        else { x = r() * w; y = r() * h; }
        stars.push({ x: x, y: y, s: 0.4 + r() * r() * 1.5, a: 0.25 + r() * 0.6, p: r() * 6.28, v: 0.4 + r() * 1.2, gold: r() < 0.12 });
      }
    }
    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], a = s.a * (reduce ? 1 : 0.72 + 0.28 * Math.sin(s.p + time * 0.001 * s.v));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.gold ? '#e6c98a' : '#eef4ee';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function loop(t) { draw(t); if (visible && !reduce) raf = requestAnimationFrame(loop); }
    build(); loop(0);
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); draw(0); }, 150); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting; cancelAnimationFrame(raf);
        if (visible && !reduce) raf = requestAnimationFrame(loop);
      }).observe(cv);
    }
  });

  // Schéma interactif : longueur du conduit vocal et couleur du son
  var timbre = doc.getElementById('timbre');
  if (timbre) {
    var tPath = doc.getElementById('timbre-curve'), tTube = doc.getElementById('timbre-tube'),
        tOut = doc.getElementById('timbre-out'), tLen = doc.getElementById('timbre-len'), marks = doc.getElementById('timbre-marks');
    var X0 = 30, X1 = 380, Y0 = 215, H = 120, FMAX = 5000;
    var drawTimbre = function () {
      var v = +timbre.value, L = 15 + v * 0.05, d = '', peaks = '';
      for (var f = 0; f <= FMAX; f += 40) {
        var amp = 0;
        for (var k = 1; k <= 5; k++) { var F = (2 * k - 1) * 35000 / (4 * L); amp += 1 / (1 + Math.pow((f - F) / 130, 2)); }
        amp = Math.min(1.05, amp) * (1 - f / 9000);
        d += (f ? 'L' : 'M') + (X0 + (X1 - X0) * f / FMAX).toFixed(1) + ' ' + (Y0 - amp * H).toFixed(1);
      }
      for (var j = 1; j <= 4; j++) {
        var Fj = (2 * j - 1) * 35000 / (4 * L), x = X0 + (X1 - X0) * Fj / FMAX;
        if (x < X1) peaks += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="88" y2="' + Y0 + '" class="d-gold" stroke-dasharray="2 4"/>';
      }
      tPath.setAttribute('d', d); marks.innerHTML = peaks;
      tTube.setAttribute('width', (L * 14).toFixed(0));
      tLen.textContent = 'conduit ≈ ' + L.toFixed(1).replace('.', ',') + ' cm';
      tOut.textContent = v < 35 ? 'Sourire : conduit plus court, résonances plus hautes, son plus clair.'
        : v > 65 ? 'Moue : conduit plus long, résonances plus basses, son plus sombre.'
        : 'Position neutre : ni éclairci, ni assombri.';
    };
    timbre.addEventListener('input', drawTimbre); drawTimbre();
  }

  // Bascule entre deux états d'un schéma
  doc.querySelectorAll('[data-toggle-group]').forEach(function (group) {
    var out = doc.getElementById(group.getAttribute('data-out'));
    var buttons = group.querySelectorAll('button[data-show]');
    function pick(b) {
      buttons.forEach(function (o) {
        var on = o === b; o.setAttribute('aria-pressed', on ? 'true' : 'false');
        var el = doc.getElementById(o.getAttribute('data-show')); if (el) el.style.display = on ? '' : 'none';
      });
      if (out) out.textContent = b.getAttribute('data-text') || '';
    }
    buttons.forEach(function (b) { b.addEventListener('click', function () { pick(b); }); });
    if (buttons[0]) pick(buttons[0]);
  });
})();
