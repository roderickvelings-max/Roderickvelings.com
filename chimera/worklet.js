/*
 * La voix CHIMERA sur le fil audio (AudioWorklet), pour la roue des voyelles.
 * Adapté de src/worklet/processor.ts et src/wasm/wire.ts de CHIMERA
 * (https://github.com/jamesondh/chimera-vocal-synth, © Jameson Hodge, licence MIT : LICENSE-chimera.txt).
 * Messages reçus : {type:'body', female, child} · {type:'schedule', gestures, lead} · {type:'release', tag}
 */
const GESTURE_RECORD = 272, LABEL_CAP = 24, MAX_GESTURES = 4000;
const CONTROL_KEYS = ["jaw", "tbX", "tbY", "ttX", "ttY", "ttCurl", "root", "lipAp", "lipProt", "lipWidth", "labiodental", "velum", "larynx", "epilarynx", "ventricular", "lateral", "dorsum",
  "abduction", "closure", "breath", "f0", "vibrato"];
const KEY_INDEX = Object.fromEntries(CONTROL_KEYS.map((k, i) => [k, i]));

function utf8(s) {
  const out = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function writeGestures(buf, at, gestures, max) {
  const n = Math.min(gestures.length, max);
  const dv = new DataView(buf, at, n * GESTURE_RECORD), bytes = new Uint8Array(buf, at, n * GESTURE_RECORD);
  for (let i = 0; i < n; i++) {
    const g = gestures[i], o = i * GESTURE_RECORD;
    const head = [g.t0, g.t1, g.rampIn, g.rampOut, g.strength, g.speed ?? NaN, g.releaseHold ?? NaN, g.tag ?? NaN];
    for (let j = 0; j < 8; j++) dv.setFloat64(o + j * 8, head[j], true);
    for (let k = 0; k < CONTROL_KEYS.length; k++) dv.setFloat64(o + 64 + k * 8, NaN, true);
    for (const [key, value] of Object.entries(g.targets || {})) {
      const k = KEY_INDEX[key];
      if (k !== undefined && value !== undefined && value !== null) dv.setFloat64(o + 64 + k * 8, value, true);
    }
    if (g.label === undefined || g.label === null) bytes[o + 240] = 255;
    else {
      let b = utf8(g.label);
      if (b.length > LABEL_CAP) { let m = LABEL_CAP; while (m > 0 && (b[m] & 0xc0) === 0x80) m--; b = b.slice(0, m); }
      bytes[o + 240] = b.length;
      bytes.set(b, o + 241);
    }
  }
  return n;
}

class ChimeraRoue extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.dead = false;
    this.x = new WebAssembly.Instance(options.processorOptions.module, {}).exports;
    this.h = this.x.engine_new(sampleRate);
    this.port.onmessage = (e) => {
      if (this.dead) return;
      const m = e.data, x = this.x, h = this.h;
      try {
        if (m.type === "body") x.engine_set_body(h, m.female, m.child);
        else if (m.type === "schedule") {
          const n = writeGestures(x.memory.buffer, x.engine_records(h), m.gestures, MAX_GESTURES);
          x.engine_schedule(h, n, m.lead ?? 0.01, 0);
        } else if (m.type === "release") x.engine_release(h, m.tag);
      } catch (err) { this.fail(err); }
    };
    this.blocks = 0;
    this.lastArtic = null;
    this.port.postMessage({ type: "ready" });
  }
  // la position des articulateurs (langue, mâchoire, lèvres…) pour la coupe animée, ~47 fois par seconde quand elle bouge
  postArtic() {
    const x = this.x, p = x.engine_telemetry(this.h);
    const n = new Float64Array(x.memory.buffer, p, 16)[11];
    const a = Array.from(new Float64Array(x.memory.buffer, p + 16 * 8, n));
    const last = this.lastArtic;
    if (last && a.every((v, i) => Math.abs(v - last[i]) < 1e-4)) return;
    this.lastArtic = a;
    this.port.postMessage({ type: "artic", artic: a });
  }
  fail(err) {
    if (this.dead) return;
    this.dead = true;
    this.port.postMessage({ type: "error", message: String(err) });
  }
  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || !out.length) return true;
    const ch0 = out[0];
    if (this.dead) { for (const ch of out) ch.fill(0); return true; }
    try {
      const p = this.x.engine_render(this.h, ch0.length);
      ch0.set(new Float32Array(this.x.memory.buffer, p, ch0.length));
    } catch (err) { ch0.fill(0); this.fail(err); }
    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    if (++this.blocks % 8 === 0) { try { this.postArtic(); } catch (err) { this.fail(err); } }
    return true;
  }
}
registerProcessor("chimera-roue", ChimeraRoue);
