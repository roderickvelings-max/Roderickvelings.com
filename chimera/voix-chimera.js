/*
 * La voix CHIMERA pour la roue des voyelles : une voyelle chantée par un conduit vocal simulé
 * (poumons, plis vocaux, gorge, bouche), au lieu d'un son de synthé filtré.
 * Moteur : CHIMERA de Jameson Hodge (https://github.com/jamesondh/chimera-vocal-synth, licence MIT,
 * voir LICENSE-chimera.txt), compilé par .github/workflows/chimera-wasm.yml.
 *
 * window.ChimeraVoice.preload()                     charge le moteur à l'avance (sans son)
 * window.ChimeraVoice.sing(ipa, midi, opts) → bool  chante ; false si le moteur est indisponible
 *   opts : {female: 0..1, dur: secondes, onFail: () => …}  (onFail : le moteur n'a pas pu chanter)
 * window.ChimeraVoice.attachCutaway(svg)            dessine dans ce <svg> la coupe du conduit vocal,
 *   animée par la position réelle des articulateurs du moteur (comme la vue « Play » de CHIMERA)
 */
(function () {
  const BASE = new URL('.', document.currentScript.src).href;
  const VIBRATO = 35; // cents, la valeur par défaut de CHIMERA
  let mod = null, x = null, loading = null, failed = false;
  let ctx = null, node = null, nodeReady = null;
  let cat = null, exhale = null, body = null, nextTag = 1, sounding = null, offTimer = null;
  const tails = [];

  const enc = new TextEncoder(), dec = new TextDecoder();
  function call(fn, args) {
    const bytes = enc.encode(JSON.stringify(Object.assign({ fn }, args || {})));
    const p = x.chimera_alloc(bytes.length);
    new Uint8Array(x.memory.buffer, p, bytes.length).set(bytes);
    const status = x.chimera_call(p, bytes.length);
    x.chimera_free(p, bytes.length);
    const v = JSON.parse(dec.decode(new Uint8Array(x.memory.buffer, x.chimera_result_ptr(), x.chimera_result_len())));
    if (status !== 0) throw new Error('CHIMERA ' + fn + ' : ' + v.error);
    return v;
  }

  function preload() {
    if (loading) return loading;
    loading = (async () => {
      if (!window.AudioWorkletNode || !window.WebAssembly) throw new Error('navigateur trop ancien');
      const res = await fetch(BASE + 'chimera.wasm');
      if (!res.ok) throw new Error('moteur absent (HTTP ' + res.status + ')');
      mod = await WebAssembly.compile(await res.arrayBuffer());
      x = (await WebAssembly.instantiate(mod, {})).exports;
      cat = call('catalog');
      exhale = cat.exhaleLabel;
    })();
    loading.catch(() => { failed = true; });
    return loading;
  }

  // Le contexte audio naît et reprend pendant le geste (iPhone : sinon il reste muet).
  function ensureContext() {
    if (!ctx) {
      try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
      try { ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 }); }
      catch (e) { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  }

  function ensureNode() {
    if (nodeReady) return nodeReady;
    nodeReady = (async () => {
      await preload();
      await ctx.audioWorklet.addModule(BASE + 'worklet.js');
      node = new AudioWorkletNode(ctx, 'chimera-roue', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { module: mod } });
      node.port.onmessage = (e) => {
        if (e.data.type === 'error') { failed = true; console.warn(e.data.message); }
        else if (e.data.type === 'artic') showArtic(e.data.artic);
      };
      const gain = ctx.createGain(); gain.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      node.connect(gain).connect(comp).connect(ctx.destination);
    })();
    nodeReady.catch(() => { failed = true; });
    return nodeReady;
  }

  const send = (m) => node.port.postMessage(m);
  const syllable = (ipa) => ({ text: ipa, onset: [], nucleus: { ipa, stress: 1 }, coda: [], wordEnd: true, phraseEnd: false });

  function noteOff() {
    const s = sounding;
    if (!s) return;
    sounding = null;
    send({ type: 'release', tag: s.tag });
    send({ type: 'release', tag: s.tag + 1 });
    const gs = call('planNoteOff', { syl: s.syl, midi: s.midi, body });
    if (!gs.length) return;
    const tag = nextTag; nextTag += 2;
    send({ type: 'schedule', gestures: gs.map((g) => Object.assign({}, g, { tag: g.label === exhale ? tag + 1 : tag })), lead: 0.006 });
    tails.push(tag); if (tails.length > 8) tails.shift();
  }

  function noteOn(ipa, midi, female, dur) {
    if (!body || body.female !== female) {
      if (sounding) { clearTimeout(offTimer); noteOff(); }
      body = { female, child: 0 };
      send({ type: 'body', female, child: 0 });
      cutBody = female;
    }
    // la respiration de fin de la note d'avant ne doit pas rouvrir les plis sur cette attaque
    for (const t of tails.splice(0)) send({ type: 'release', tag: t + 1 });
    const syl = syllable(ipa), from = sounding;
    clearTimeout(offTimer);
    if (from) { send({ type: 'release', tag: from.tag }); send({ type: 'release', tag: from.tag + 1 }); }
    const tag = nextTag; nextTag += 2;
    const options = { body, vibrato: VIBRATO, tag };
    if (from) options.legatoFrom = { syl: from.syl, midi: from.midi };
    send({ type: 'schedule', gestures: call('planNoteOn', { syl, midi, options }), lead: 0.01 });
    sounding = { tag, syl, midi };
    offTimer = setTimeout(noteOff, dur * 1000);
  }

  function sing(ipa, midi, opts) {
    if (failed) return false;
    opts = opts || {};
    try { ensureContext(); } catch (e) { failed = true; return false; }
    ensureNode()
      .then(() => { if (!failed) noteOn(ipa, midi, opts.female ? 1 : 0, opts.dur || 1.2); else throw new Error('moteur arrêté'); })
      .catch((e) => { failed = true; console.warn('CHIMERA indisponible :', e); if (opts.onFail) opts.onFail(); });
    return true;
  }

  /* ---------- la coupe du conduit vocal (vue de profil, le visage tourné vers la droite) ---------- */
  let cut = null, cutBody = 0, model = null, pending = null, raf = 0;
  const VB = { x0: -2.6, x1: 8.8, y0: -0.7, y1: 11.7 }; // cm, glotte en (0, 0)
  const pts = (a) => a.map((p) => p.x.toFixed(2) + ',' + (-p.y).toFixed(2)).join(' ');

  function modelFor(female) {
    const sr = ctx ? ctx.sampleRate : 48000, key = female + '/' + sr;
    if (model && model.key === key) return model.id;
    if (model) { try { call('dropModel', { model: model.id }); } catch (e) {} }
    model = { key, id: call('model', { body: { female, child: 0 }, sampleRate: sr }).model };
    return model.id;
  }

  function draw(artic) {
    raf = 0;
    if (!cut || !x) return;
    const a = {};
    cat.articKeys.forEach((k, i) => (a[k] = artic ? artic[i] : cat.neutral[k]));
    const f = call('frame', { model: modelFor(cutBody), artic: a });
    const air = pts(f.outer) + ' ' + pts(f.inner.slice().reverse());
    cut.innerHTML =
      `<defs><clipPath id="cpClip"><rect x="${VB.x0}" y="${-VB.y1}" width="${VB.x1 - VB.x0}" height="${VB.y1 - VB.y0}"/></clipPath></defs>` +
      `<g clip-path="url(#cpClip)" stroke-linejoin="round" stroke-linecap="round">` +
      `<polygon class="cp-air" points="${air}"/>` +
      `<polygon class="cp-nose" points="${pts(f.nasalCavity)}"/>` +
      `<polyline class="cp-jaw" points="${pts(f.jawBone)}"/>` +
      `<polyline class="cp-wall" points="${pts(f.outer)}"/><polyline class="cp-wall" points="${pts(f.inner)}"/>` +
      `<polygon class="cp-tongue" points="${pts(f.tongue)}"/>` +
      `<polyline class="cp-velum" points="${pts(f.velum)}"/>` +
      `<polyline class="cp-teeth" points="${pts(f.upperTeeth)}"/><polyline class="cp-teeth" points="${pts(f.lowerTeeth)}"/>` +
      `<polygon class="cp-lip" points="${pts(f.upperLip)}"/><polygon class="cp-lip" points="${pts(f.lowerLip)}"/>` +
      `<polyline class="cp-wall" points="${pts(f.epiglottis)}"/>` +
      `<circle class="cp-glottis" cx="${f.glottis.x}" cy="${-f.glottis.y}" r="0.28"/></g>`;
  }
  function showArtic(artic) { pending = artic; if (cut && !raf) raf = requestAnimationFrame(() => draw(pending)); }

  function attachCutaway(svg, female) {
    cut = svg;
    cut.setAttribute('viewBox', `${VB.x0} ${-VB.y1} ${VB.x1 - VB.x0} ${VB.y1 - VB.y0}`);
    if (!sounding) cutBody = female ? 1 : 0;
    return preload().then(() => draw(pending));
  }

  window.ChimeraVoice = { preload, sing, attachCutaway, get failed() { return failed; }, get loaded() { return !!x; } };
})();
