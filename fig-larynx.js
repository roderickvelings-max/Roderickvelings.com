/* Schémas interactifs de l'article « Le larynx, la pièce qu'on oublie » */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(root, sel) { return root.querySelector(sel); }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function rot(p, c, deg) {
    var a = deg * Math.PI / 180, x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
  }
  function pts(arr) { return arr.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join(' L'); }
  function tween(dur, step) {
    if (reduce) { step(1); return; }
    var t0 = null;
    function f(t) { if (t0 === null) t0 = t; var k = Math.min(1, (t - t0) / dur); step(k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); if (k < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  function btn(label, attrs) { return '<button type="button"' + (attrs || '') + '>' + label + '</button>'; }

  /* ---------- 1. Le larynx pièce par pièce (coupe de face) ---------- */
  function partsFig(box) {
    var cx = 130;
    function X(s, dx) { return r1(cx + s * dx); }
    function both(f) { return f(-1) + f(1); }
    var P = {
      trachee: { name: 'Trachée', ly: 270, lp: [cx + 44, 270],
        txt: "La trachée amène l'air des poumons. Ses anneaux de cartilage la gardent toujours ouverte.",
        svg: both(function (s) { var x = s < 0 ? cx - 44 : cx + 36, o = ''; for (var i = 0; i < 4; i++) o += '<rect class="sh" x="' + x + '" y="' + (252 + i * 12) + '" width="8" height="7" rx="3"/>'; return o; }) },
      cricoide: { name: 'Cartilage cricoïde', ly: 222, lp: [cx + 58, 222],
        txt: "Le cricoïde est un anneau complet, en forme de chevalière : étroit devant, haut derrière. C'est la base du larynx : le thyroïde et les aryténoïdes s'articulent dessus.",
        svg: both(function (s) { return '<path class="sh" d="M' + X(s, 54) + ' 200 L' + X(s, 62) + ' 200 Q' + X(s, 60) + ' 226 ' + X(s, 44) + ' 246 L' + X(s, 36) + ' 246 Q' + X(s, 52) + ' 226 ' + X(s, 54) + ' 200 Z"/>'; }) },
      thyroide: { name: 'Cartilage thyroïde', ly: 102, lp: [cx + 64, 102],
        txt: "Le thyroïde est le plus grand cartilage, un bouclier ouvert vers l'arrière ; sa pointe, c'est la pomme d'Adam. En basculant sur le cricoïde, il étire les cordes vocales.",
        svg: both(function (s) { return '<path class="sh" d="M' + X(s, 52) + ' 88 L' + X(s, 60) + ' 88 Q' + X(s, 67) + ' 142 ' + X(s, 62) + ' 198 L' + X(s, 54) + ' 198 Q' + X(s, 59) + ' 142 ' + X(s, 52) + ' 88 Z"/>'; }) },
      cordes: { name: 'Cordes vocales', ly: 174, lp: [cx + 36, 174],
        txt: "Les cordes vocales sont deux replis de muscle et de muqueuse, tendus de l'avant du thyroïde jusqu'aux aryténoïdes. Elles se rapprochent, l'air les fait vibrer : c'est le son.",
        svg: both(function (s) { return '<path class="sh soft" d="M' + X(s, 56) + ' 155 Q' + X(s, 16) + ' 159 ' + X(s, 3) + ' 170 Q' + X(s, 12) + ' 182 ' + X(s, 55) + ' 192 Z"/><path class="ln" d="M' + X(s, 12) + ' 181 Q' + X(s, 30) + ' 196 ' + X(s, 46) + ' 204"/>'; }) },
      fausses: { name: 'Fausses cordes', ly: 136, lp: [cx + 40, 136],
        txt: "Les fausses cordes (bandes ventriculaires) sont juste au-dessus. Elles ne chantent pas, sauf pour certains effets comme la distorsion : elles se ferment pour bloquer l'air, à l'effort ou quand on tousse. Ce sont elles qu'on sent quand « ça serre ».",
        svg: both(function (s) { return '<path class="sh soft" d="M' + X(s, 55) + ' 118 Q' + X(s, 22) + ' 122 ' + X(s, 13) + ' 131 Q' + X(s, 22) + ' 140 ' + X(s, 56) + ' 146 Z"/>'; }) },
      epiglotte: { name: 'Épiglotte', ly: 32, lp: [cx + 17, 36],
        txt: "L'épiglotte est un clapet souple. Il se rabat quand on avale, pour que la nourriture parte vers l'œsophage et pas dans la trachée.",
        svg: '<path class="sh" d="M' + cx + ' 84 C' + (cx - 22) + ' 70 ' + (cx - 24) + ' 32 ' + cx + ' 14 C' + (cx + 24) + ' 32 ' + (cx + 22) + ' 70 ' + cx + ' 84 Z"/>' },
      hyoide: { name: 'Os hyoïde', ly: 64, lp: [cx + 76, 62],
        txt: "L'os hyoïde, en fer à cheval, flotte sous la langue sans toucher aucun autre os. Le larynx y est suspendu : quand la langue bouge, le larynx suit.",
        svg: both(function (s) { return '<ellipse class="sh bone" cx="' + X(s, 63) + '" cy="62" rx="13" ry="7"/>'; }) }
    };
    var order = ['trachee', 'cricoide', 'thyroide', 'cordes', 'fausses', 'epiglotte', 'hyoide'];
    var draw = ['epiglotte', 'hyoide', 'thyroide', 'cricoide', 'trachee', 'fausses', 'cordes'];
    var svg = '<svg viewBox="0 0 400 300" role="img" aria-label="Coupe du larynx vu de face : os hyoïde, épiglotte, cartilage thyroïde, fausses cordes, cordes vocales, cartilage cricoïde et trachée">';
    svg += '<text x="392" y="296" text-anchor="end" class="m d-muted">vu de face, en coupe</text>';
    svg += '<path d="M' + cx + ' 296 V256" class="d-axis" stroke-width="1.2" stroke-dasharray="2 4"/><text x="' + cx + '" y="292" text-anchor="middle" class="m d-muted" dx="18">air</text>';
    draw.forEach(function (k) { svg += '<g class="lx-part" data-p="' + k + '" tabindex="-1">' + P[k].svg + '</g>'; });
    order.forEach(function (k) {
      var p = P[k];
      svg += '<g class="lx-lab" data-p="' + k + '"><path class="ld" d="M' + r1(p.lp[0]) + ' ' + p.lp[1] + ' L250 ' + p.ly + '"/><text x="256" y="' + (p.ly + 4) + '" class="m">' + p.name + '</text></g>';
    });
    svg += '</svg>';
    box.innerHTML = svg +
      '<div class="ctrl lx-names" role="group" aria-label="Choisir une pièce">' + order.map(function (k) { return btn((function (n) { n = n.replace('Cartilage ', ''); return n.charAt(0).toUpperCase() + n.slice(1); })(P[k].name), ' data-p="' + k + '" aria-pressed="false"'); }).join('') + '</div>' +
      '<div class="ctrl lx-build">' + btn('Construire pas à pas', ' data-act="build"') + btn('Pièce suivante', ' data-act="next" hidden') + btn('Tout voir', ' data-act="all"') + '</div>' +
      '<p class="out" aria-live="polite">Clique sur un nom ou sur une pièce du schéma.</p>';
    var s = $(box, 'svg'), out = $(box, '.out'), nextB = $(box, '[data-act="next"]'), built = -1;
    function select(k) {
      s.classList.toggle('sel', !!k);
      $$(box, '[data-p]').forEach(function (n) {
        var on = n.getAttribute('data-p') === k;
        n.classList.toggle('on', on);
        if (n.tagName === 'BUTTON') n.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (k) out.textContent = P[k].txt;
    }
    function showBuilt() {
      order.forEach(function (k, i) { $$(s, '[data-p="' + k + '"]').forEach(function (n) { n.classList.toggle('hid', built >= 0 && i > built); }); });
    }
    $$(box, '.lx-names button').forEach(function (b) { b.addEventListener('click', function () { select(b.getAttribute('data-p')); }); });
    $$(s, '.lx-part, .lx-lab').forEach(function (g) { g.addEventListener('click', function () { select(g.getAttribute('data-p')); }); });
    $(box, '[data-act="build"]').addEventListener('click', function () { built = 0; showBuilt(); select(order[0]); nextB.hidden = false; });
    nextB.addEventListener('click', function () {
      if (built < order.length - 1) { built++; showBuilt(); select(order[built]); }
      if (built >= order.length - 1) { nextB.hidden = true; }
    });
    $(box, '[data-act="all"]').addEventListener('click', function () { built = -1; showBuilt(); select(null); nextB.hidden = true; out.textContent = 'Clique sur un nom ou sur une pièce du schéma.'; });
  }

  /* ---------- 2. De M1 à M2, en passant par le mix ---------- */
  function mecaFig(box) {
    var PIV = [232, 170];
    var THY = [[128, 64], [134, 140], [180, 150], [222, 152], [232, 170], [240, 152], [238, 52], [226, 60], [180, 55]];
    var F0 = [142, 122], V = [238, 121];
    var svg = '<svg viewBox="0 0 400 450" role="img" aria-label="Le larynx de profil, vu de dessus et en coupe, du mécanisme 1 au mécanisme 2">' +
      '<text x="14" y="18" class="m d-muted">de profil</text><text x="118" y="236" class="m d-muted">avant</text><text x="262" y="236" class="m d-muted" text-anchor="end">arrière</text>' +
      '<path class="lx-ct" d=""/>' +
      '<path class="lx-cart" d="M148 188 L152 204 Q200 214 252 206 L262 198 L262 118 Q256 110 246 112 L240 160 Q200 176 150 188 Z"/>' +
      '<path class="lx-cart thy" d=""/>' +
      '<path class="lx-cart" d="M236 122 L262 118 L254 88 Z"/>' +
      '<line class="lx-fold" x1="0" y1="0" x2="0" y2="0"/>' +
      '<circle cx="' + PIV[0] + '" cy="' + PIV[1] + '" r="3" class="f-gold"/>' +
      '<text x="150" y="44" class="m d-ink">thyroïde</text><text x="176" y="226" class="m d-ink">cricoïde</text><text x="266" y="92" class="m d-ink">aryténoïde</text>' +
      '<text class="m lx-tl" x="0" y="0">corde vocale (TA)</text><text class="m lx-ctl" x="96" y="194">crico-</text><text class="m lx-ctl" x="96" y="207">thyroïdien (CT)</text>' +
      '<g class="lx-meter"><text x="290" y="140" class="m d-muted">muscle TA</text><rect x="290" y="146" width="96" height="8" rx="4" class="f-surface lx-track"/><rect class="lx-ta" x="290" y="146" width="0" height="8" rx="4"/>' +
      '<text x="290" y="174" class="m d-muted">muscle CT</text><rect x="290" y="180" width="96" height="8" rx="4" class="f-surface lx-track"/><rect class="lx-ctb" x="290" y="180" width="0" height="8" rx="4"/>' +
      '<text x="290" y="210" class="m f-gold lx-len"></text></g>' +
      '<line x1="10" y1="246" x2="390" y2="246" class="d-axis" stroke-width=".6" opacity=".5"/>' +
      '<text x="14" y="264" class="m d-muted">vu de dessus</text><text x="100" y="278" class="m d-muted" text-anchor="middle">avant</text>' +
      '<path class="lx-top l"/><path class="lx-top r"/><path class="lx-ary l"/><path class="lx-ary r"/>' +
      '<line x1="200" y1="256" x2="200" y2="440" class="d-axis" stroke-width=".6" opacity=".5"/>' +
      '<text x="214" y="264" class="m d-muted">en coupe, de face</text>' +
      '<path class="lx-cor l"/><path class="lx-cor r"/><path class="lx-ta-in l"/><path class="lx-ta-in r"/><line class="lx-contact" x1="300" x2="300" y1="0" y2="0"/>' +
      '<text x="300" y="430" class="m f-gold" text-anchor="middle">surface de contact</text>' +
      '</svg>';
    box.innerHTML = svg +
      '<div class="ctrl lx-zones" role="group" aria-label="Choisir un réglage">' + btn('M1, poitrine', ' data-v="8"') + btn('Mix', ' data-v="52"') + btn('M2, tête', ' data-v="94"') + '</div>' +
      '<div class="ctrl"><span>M1</span><input type="range" min="0" max="100" value="8" aria-label="Du mécanisme 1 au mécanisme 2"><span>M2</span></div>' +
      '<p class="out" aria-live="polite"></p>';
    var s = $(box, 'svg'), range = $(box, 'input'), out = $(box, '.out'), v = 0.08, phase = 0, last = null, zone = '';
    var q = function (c) { return $(s, c); };
    function geom() {
      var a = -16 * v, thy = THY.map(function (p) { return rot(p, PIV, a); }), F = rot(F0, PIV, a);
      q('.thy').setAttribute('d', 'M' + pts(thy) + ' Z');
      var t1 = rot([150, 143], PIV, a), t2 = rot([200, 151], PIV, a);
      q('.lx-ct').setAttribute('d', 'M' + pts([t1, t2, [206, 203], [160, 196]]) + ' Z');
      q('.lx-ct').style.opacity = (0.25 + 0.7 * (0.15 + 0.85 * v)).toFixed(2);
      var f = q('.lx-fold'), w = 13 - 9 * v;
      f.setAttribute('x1', r1(F[0])); f.setAttribute('y1', r1(F[1])); f.setAttribute('x2', V[0]); f.setAttribute('y2', V[1]); f.setAttribute('stroke-width', r1(w));
      var tl = q('.lx-tl'); tl.setAttribute('x', r1(F[0] + 4)); tl.setAttribute('y', r1(F[1] - 10 - w / 2));
      var len = Math.hypot(V[0] - F[0], V[1] - F[1]), len0 = Math.hypot(V[0] - F0[0], V[1] - F0[1]);
      q('.lx-len').textContent = 'longueur : +' + Math.round((len / len0 - 1) * 100) + ' %';
      var ta = 1 - 0.82 * v, ct = 0.15 + 0.85 * v;
      q('.lx-ta').setAttribute('width', r1(96 * ta)); q('.lx-ctb').setAttribute('width', r1(96 * ct));
    }
    function vib() {
      var gmax = 5.5 - 2.5 * v, open = Math.max(0, Math.sin(phase)), g = 0.5 + 0.8 * v + gmax * Math.pow(open, 1.4);
      if (reduce) g = 1.2 + 1.5 * v;
      var L = 130 + 24 * v, yb = 286 + L, w = 24 - 14 * v;
      ['l', 'r'].forEach(function (side) {
        var sg = side === 'l' ? -1 : 1, x = function (d) { return r1(100 + sg * d); };
        q('.lx-top.' + side).setAttribute('d', 'M100 286 Q' + x(g * 1.3 + 1) + ' ' + r1(286 + L * 0.55) + ' ' + x(g) + ' ' + r1(yb) + ' L' + x(g + w) + ' ' + r1(yb) + ' Q' + x(g + w * 1.25 + 4) + ' ' + r1(286 + L * 0.45) + ' ' + x(3) + ' 286 Z');
        q('.lx-ary.' + side).setAttribute('d', 'M' + x(g + 1) + ' ' + r1(yb - 2) + ' Q' + x(g + w + 12) + ' ' + r1(yb - 4) + ' ' + x(g + w * 0.6 + 6) + ' ' + r1(yb + 14) + ' Q' + x(g + 2) + ' ' + r1(yb + 12) + ' ' + x(g + 1) + ' ' + r1(yb - 2) + ' Z');
        var T = 46 - 36 * v, cy = 350, tip = 300 + sg * (2 + g * 0.8), rr = Math.min(6, T / 2), xb = 300 + sg * 86;
        q('.lx-cor.' + side).setAttribute('d', 'M' + r1(xb) + ' ' + r1(cy - T / 2 - 16) + ' L' + r1(tip + sg * (rr + 18 * v)) + ' ' + r1(cy - T / 2) + ' Q' + r1(tip) + ' ' + r1(cy - T / 2) + ' ' + r1(tip) + ' ' + r1(cy - T / 2 + rr) + ' L' + r1(tip) + ' ' + r1(cy + T / 2 - rr) + ' Q' + r1(tip) + ' ' + r1(cy + T / 2) + ' ' + r1(tip + sg * (rr + 4)) + ' ' + r1(cy + T / 2 + 2) + ' L' + r1(xb) + ' ' + r1(cy + T / 2 + 30) + ' Z');
        var ti = 300 + sg * (16 + 30 * v);
        q('.lx-ta-in.' + side).setAttribute('d', 'M' + r1(xb - sg * 6) + ' ' + r1(cy - T * 0.32 - 8) + ' L' + r1(ti) + ' ' + r1(cy - T * 0.3) + ' L' + r1(ti) + ' ' + r1(cy + T * 0.3) + ' L' + r1(xb - sg * 6) + ' ' + r1(cy + T * 0.32 + 18) + ' Z');
        q('.lx-ta-in.' + side).style.opacity = (0.25 + 0.6 * (1 - 0.82 * v)).toFixed(2);
        var c = q('.lx-contact'); c.setAttribute('y1', r1(cy - T * 0.42)); c.setAttribute('y2', r1(cy + T * 0.42));
      });
    }
    function text() {
      var z = v < 0.32 ? 'm1' : v < 0.72 ? 'mix' : 'm2';
      if (z === zone) return; zone = z;
      out.textContent = {
        m1: "M1, la voix de poitrine. Le muscle de la corde (thyro-aryténoïdien, TA) domine : les cordes sont courtes et épaisses, elles se touchent sur toute leur hauteur. Son plein, riche en harmoniques.",
        mix: "Le mix. Le crico-thyroïdien (CT) prend le relais : le thyroïde bascule vers l'avant, les cordes s'allongent et s'affinent, la surface de contact diminue. Le TA reste actif, assez pour garder du corps au son. Ce n'est pas un troisième mécanisme : un réglage entre les deux.",
        m2: "M2, la voix de tête. Le CT domine et le TA se relâche presque : cordes longues et fines, seul leur bord vibre. Son léger, flûté. On peut le renforcer, mais il reste plus fin."
      }[z];
      $$(box, '.lx-zones button').forEach(function (b) { var bv = +b.getAttribute('data-v') / 100, bz = bv < 0.32 ? 'm1' : bv < 0.72 ? 'mix' : 'm2'; b.setAttribute('aria-pressed', bz === z ? 'true' : 'false'); });
    }
    function set(nv) { v = nv; geom(); vib(); text(); }
    range.addEventListener('input', function () { set(+range.value / 100); });
    $$(box, '.lx-zones button').forEach(function (b) {
      b.addEventListener('click', function () {
        var from = v, to = +b.getAttribute('data-v') / 100;
        tween(600, function (k) { var nv = lerp(from, to, k); range.value = Math.round(nv * 100); set(nv); });
      });
    });
    set(v);
    if (!reduce) {
      var visible = true;
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(s);
      (function loop(t) {
        if (last !== null && visible) { phase += (t - last) / 1000 * 2 * Math.PI * (0.7 + 2.3 * v); vib(); }
        last = t; requestAnimationFrame(loop);
      })(performance.now());
    }
  }

  /* ---------- 3. La langue, les voyelles et le larynx ---------- */
  function tongueFig(box) {
    var V = {
      i: { jaw: -1, dy: -6, round: 0, t: [[107, 124], [120, 106], [148, 96], [176, 100], [198, 120], [212, 152], [222, 200], [186, 196], [122, 156]],
        txt: "[i] : la langue monte et avance vers le palais, la bouche reste peu ouverte. Le larynx a tendance à monter un peu. Voyelle fermée et brillante." },
      e: { jaw: -3, dy: -3, round: 0, t: [[107, 130], [122, 114], [152, 106], [184, 110], [208, 128], [222, 158], [228, 200], [188, 198], [122, 160]],
        txt: "[e] (é) : la langue est un peu moins haute que pour [i], toujours vers l'avant." },
      a: { jaw: -8, dy: 0, round: 0, t: [[110, 154], [128, 152], [162, 154], [198, 150], [234, 152], [252, 176], [244, 204], [194, 206], [128, 182]],
        txt: "[a] : la mâchoire s'ouvre, la langue s'abaisse et recule un peu. C'est la voyelle la plus ouverte." },
      o: { jaw: -5, dy: 4, round: 1, t: [[110, 148], [128, 148], [160, 140], [192, 120], [222, 112], [244, 140], [242, 202], [192, 204], [126, 176]],
        txt: "[o] (ô) : la langue recule et monte à l'arrière, les lèvres s'arrondissent. Le conduit s'allonge, le larynx descend un peu." },
      u: { jaw: -3, dy: 8, round: 1.6, t: [[110, 150], [130, 152], [162, 140], [194, 116], [222, 106], [244, 128], [242, 201], [192, 202], [126, 176]],
        txt: "[u] (ou) : la langue est haute à l'arrière, les lèvres très arrondies et avancées. Le conduit est au plus long : le larynx descend souvent." }
    };
    var names = { i: 'i', e: 'é', a: 'a', o: 'ô', u: 'ou' };
    var PIVJ = [232, 92];
    function smooth(p) {
      var n = p.length, d = 'M' + r1(p[0][0]) + ' ' + r1(p[0][1]);
      for (var i = 0; i < n; i++) {
        var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
        d += ' C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
      }
      return d + ' Z';
    }
    var svg = '<svg viewBox="0 0 400 330" role="img" aria-label="Coupe de profil de la bouche et de la gorge : la langue, le palais, le larynx">' +
      '<text x="290" y="18" class="m d-muted">de profil</text>' +
      '<path class="lx-skin" d="M74 0 C72 30 64 54 48 74 L40 85 Q44 92 56 93 Q61 98 60 104"/>' +
      '<path class="lx-skin" d="M204 330 Q200 268 190 222 Q182 206 164 199"/>' +
      '<path class="lx-wall" d="M262 52 Q274 120 272 200 Q270 262 264 330"/>' +
      '<path class="lx-palate" d="M98 106 Q150 80 212 92"/>' +
      '<path class="lx-soft lx-velum" d="M210 90 Q242 94 248 122 Q247 131 240 128 Q230 110 210 101 Z"/>' +
      '<path class="lx-tooth" d="M96 104 L104 104 L102 120 L98 120 Z"/>' +
      '<ellipse class="lx-soft lx-lip up" cx="56" cy="112" rx="7" ry="7"/>' +
      '<g class="lx-jaw"><path class="lx-skin" d="M58 126 Q52 140 58 152 Q62 172 82 178 Q122 188 164 199"/><path class="lx-tooth" d="M98 124 L102 124 L104 140 L100 140 Z"/><ellipse class="lx-soft lx-lip lo" cx="56" cy="129" rx="7" ry="7"/></g>' +
      '<path class="lx-soft lx-tongue" d=""/><circle class="lx-peak" r="4.5" cx="0" cy="0"/>' +
      '<g class="lx-lar"><path class="lx-epi" d="M240 198 Q246 178 258 166"/><ellipse cx="226" cy="210" rx="9" ry="5" class="lx-bone"/>' +
      '<path class="lx-cart" d="M208 222 L248 218 L252 262 L212 266 Z"/><line x1="212" y1="246" x2="252" y2="242" class="lx-vf"/>' +
      '<path class="lx-cart" d="M214 268 L254 264 L256 282 L216 286 Z"/><path class="lx-wall" d="M220 288 L222 330 M254 284 L256 330"/>' +
      '<path class="lx-ld" d="M254 240 L300 240 M236 210 L300 210"/><text x="304" y="244" class="m d-ink">larynx</text><text x="304" y="214" class="m d-ink">os hyoïde</text></g>' +
      '<text x="150" y="76" text-anchor="middle" class="m d-muted">palais</text><path class="lx-ld" d="M232 98 L226 76"/><text x="224" y="70" text-anchor="end" class="m d-muted">voile</text>' +
      '<text x="304" y="150" class="m d-muted">pharynx</text><path class="lx-ld" d="M262 146 L300 146"/><text class="m d-ink lx-tlab" x="160" y="0" text-anchor="middle">langue</text>' +
      '</svg>';
    box.innerHTML = svg +
      '<div class="ctrl lx-vow" role="group" aria-label="Choisir une voyelle">' + Object.keys(V).map(function (k) { return btn(names[k], ' data-v="' + k + '" aria-pressed="false"'); }).join('') + '</div>' +
      '<div class="ctrl">' + btn('Langue qui écrase', ' data-act="press" aria-pressed="false"') + '</div>' +
      '<p class="out" aria-live="polite"></p>';
    var s = $(box, 'svg'), out = $(box, '.out'), press = $(box, '[data-act="press"]');
    var state = { t: V.a.t.map(function (p) { return p.slice(); }), jaw: V.a.jaw, dy: V.a.dy, round: 0 }, cur = 'a', pressed = false;
    function target() {
      var b = V[cur], t = b.t.map(function (p) { return p.slice(); }), dy = b.dy;
      if (pressed) { dy += 14; t[4] = [t[4][0] + 12, t[4][1] + 10]; t[5] = [257, t[5][1] + 26]; t[6] = [252, t[6][1] + 14]; t[7] = [t[7][0], t[7][1] + 8]; }
      t[6][1] += dy; t[7][1] += dy * 0.5;
      return { t: t, jaw: b.jaw, dy: dy, round: b.round };
    }
    function render(st) {
      $(s, '.lx-tongue').setAttribute('d', smooth(st.t));
      $(s, '.lx-jaw').setAttribute('transform', 'rotate(' + r1(st.jaw) + ' ' + PIVJ[0] + ' ' + PIVJ[1] + ')');
      $(s, '.lx-lar').setAttribute('transform', 'translate(0 ' + r1(st.dy) + ')');
      var rx = 7 - st.round * 1.2, sh = -st.round * 6;
      $$(s, '.lx-lip').forEach(function (l) { l.setAttribute('rx', r1(rx)); l.setAttribute('cx', r1(56 + sh)); });
      var top = Math.min.apply(null, st.t.slice(1, 6).map(function (p) { return p[1]; }));
      var pk = st.t.slice(1, 6).filter(function (p) { return p[1] === top; })[0];
      $(s, '.lx-peak').setAttribute('cx', r1(pk[0])); $(s, '.lx-peak').setAttribute('cy', r1(pk[1] + 3));
      $(s, '.lx-tlab').setAttribute('y', r1(Math.max(top + 30, 150)));
    }
    function go() {
      var from = { t: state.t.map(function (p) { return p.slice(); }), jaw: state.jaw, dy: state.dy, round: state.round }, to = target();
      tween(450, function (k) {
        state = { t: from.t.map(function (p, i) { return [lerp(p[0], to.t[i][0], k), lerp(p[1], to.t[i][1], k)]; }), jaw: lerp(from.jaw, to.jaw, k), dy: lerp(from.dy, to.dy, k), round: lerp(from.round, to.round, k) };
        render(state);
      });
      $$(box, '.lx-vow button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === cur ? 'true' : 'false'); });
      press.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      out.textContent = pressed ? "Langue qui écrase : la racine de la langue recule et appuie vers le bas. Elle pousse l'os hyoïde et le larynx, et rétrécit le pharynx. Le son devient sombre et étouffé, et le larynx ne peut plus bouger librement." : V[cur].txt;
    }
    $$(box, '.lx-vow button').forEach(function (b) { b.addEventListener('click', function () { cur = b.getAttribute('data-v'); go(); }); });
    press.addEventListener('click', function () { pressed = !pressed; go(); });
    render(target()); state = target(); go();
  }

  var map = { parts: partsFig, meca: mecaFig, langue: tongueFig };
  $$(doc, '[data-lx]').forEach(function (box) { var f = map[box.getAttribute('data-lx')]; if (f) f(box); });
})();
