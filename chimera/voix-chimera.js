/*
 * La voix CHIMERA pour la roue des voyelles : une voyelle chantée par un conduit vocal simulé
 * (poumons, plis vocaux, gorge, bouche), au lieu d'un son de synthé filtré.
 * Moteur : CHIMERA de Jameson Hodge (https://github.com/jamesondh/chimera-vocal-synth, licence MIT,
 * voir LICENSE-chimera.txt), compilé par .github/workflows/chimera-wasm.yml.
 *
 * window.ChimeraVoice.preload()                     charge le moteur à l'avance (sans son)
 * window.ChimeraVoice.sing(ipa, midi, opts) → bool  chante ; false si le moteur est indisponible
 *   opts : {female: 0..1, dur: secondes, onFail: () => …}  (onFail : le moteur n'a pas pu chanter)
 */
(function () {
  const BASE = new URL('.', document.currentScript.src).href;
  const VIBRATO = 35; // cents, la valeur par défaut de CHIMERA
  let mod = null, x = null, loading = null, failed = false;
  let ctx = null, node = null, nodeReady = null;
  let exhale = null, body = null, nextTag = 1, sounding = null, offTimer = null;
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
      exhale = call('catalog').exhaleLabel;
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
      node.port.onmessage = (e) => { if (e.data.type === 'error') { failed = true; console.warn(e.data.message); } };
      const gain = ctx.createGain(); gain.gain.value = 1.6;
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

  window.ChimeraVoice = { preload, sing, get failed() { return failed; }, get loaded() { return !!x; } };
})();
