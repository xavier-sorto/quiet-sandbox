/* The Quiet Sandbox — procedural soundscape.
 *
 * Everything is generated with the Web Audio API, so there are NO audio
 * files to ship or license. Sounds are deliberately soft, low, and short.
 *
 * Browsers block audio until the first user gesture, so nothing plays until
 * the first pointer/touch anywhere on the page (see unlock()). Sound is "on"
 * by default; a mute toggle persists the child/parent's choice in localStorage.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "quietSandbox.muted";
  var ctx = null;          // AudioContext
  var master = null;       // master gain (mute lives here)
  var noiseBuffer = null;  // shared white-noise buffer
  var ambient = null;      // { stop() } for the running ambient bed
  var unlocked = false;

  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMuted() {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; }
    catch (e) { return false; }
  }
  function storeMuted(m) {
    try { localStorage.setItem(STORAGE_KEY, m ? "1" : "0"); } catch (e) {}
  }

  function ensureContext() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = isMuted() ? 0 : 1;
    master.connect(ctx.destination);
    noiseBuffer = makeNoiseBuffer(ctx, 2.0);
    return ctx;
  }

  function makeNoiseBuffer(ac, seconds) {
    var len = Math.floor(ac.sampleRate * seconds);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var data = buf.getChannelData(0);
    // Brownish noise: integrate white noise for a softer, lower character.
    var last = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* Unlock on first gesture: resume context and gently fade the bed in. */
  function unlock() {
    if (unlocked) return;
    if (!ensureContext()) return;
    unlocked = true;
    if (ctx.state === "suspended") ctx.resume();
  }

  function setMuted(m) {
    storeMuted(m);
    if (master) {
      var t = now();
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.4);
    }
  }
  function toggleMuted() {
    var m = !isMuted();
    setMuted(m);
    return m;
  }

  /* ---- Building blocks ------------------------------------------------ */

  // A short, enveloped tone. Used for wood clinks and gentle name chimes.
  function tone(opts) {
    if (!ctx) return;
    opts = opts || {};
    var t = now();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.cutoff || 1400;
    osc.type = opts.type || "sine";
    osc.frequency.value = opts.freq || 320;
    var peak = opts.gain == null ? 0.18 : opts.gain;
    var dur = opts.dur || 0.35;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f); f.connect(g); g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // A filtered noise burst. Used for finger-on-sand brushing.
  function noiseBurst(opts) {
    if (!ctx || !noiseBuffer) return;
    opts = opts || {};
    var t = now();
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = opts.freq || 900;
    f.Q.value = opts.q || 0.7;
    var g = ctx.createGain();
    var peak = opts.gain == null ? 0.08 : opts.gain;
    var dur = opts.dur || 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /* ---- Named effects -------------------------------------------------- */

  // Soft wooden clink when an animal settles on the branch.
  function woodClink() {
    if (!ctx) return;
    var base = 210 + Math.random() * 60;
    tone({ type: "triangle", freq: base, cutoff: 1100, gain: 0.16, dur: 0.28 });
    tone({ type: "sine", freq: base * 2.01, cutoff: 1600, gain: 0.05, dur: 0.18 });
  }

  // Sand brushing, intensity 0..1 from drag speed.
  function brush(intensity) {
    intensity = Math.max(0, Math.min(1, intensity || 0));
    noiseBurst({
      freq: 700 + intensity * 900,
      q: 0.6,
      gain: 0.03 + intensity * 0.09,
      dur: 0.1 + intensity * 0.08,
    });
  }

  // A soft "plip" when a stone/leaf drops into the stream.
  function drop() {
    if (!ctx) return;
    var t = now();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + 0.3);
  }

  // A gentle rising two-note chime, used when a hidden shape is revealed.
  function reveal() {
    if (!ctx) return;
    tone({ type: "sine", freq: 440, cutoff: 1800, gain: 0.12, dur: 0.5 });
    setTimeout(function () {
      tone({ type: "sine", freq: 660, cutoff: 1800, gain: 0.10, dur: 0.6 });
    }, 180);
  }

  /* ---- Ambient bed ---------------------------------------------------- */
  // A very quiet, slowly-wavering pad. `character` tints the filter:
  //   "garden" (default), "water" (airier), "wood" (darker).
  function startAmbient(character) {
    if (!ensureContext()) return;
    if (ambient) ambient.stop();
    if (prefersReducedMotion()) { ambient = null; return; }

    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    var f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = character === "water" ? 620 :
                        character === "wood"  ? 360 : 480;
    f.Q.value = 0.5;

    var g = ctx.createGain();
    g.gain.value = 0.0001;

    // Slow LFO gently breathes the volume so the bed never sits still.
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.06;              // ~16s cycle
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);

    src.connect(f); f.connect(g); g.connect(master);

    var t = now();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 4.0);   // slow fade-in

    src.start(); lfo.start();

    ambient = {
      stop: function () {
        try {
          var tt = now();
          g.gain.cancelScheduledValues(tt);
          g.gain.setValueAtTime(g.gain.value, tt);
          g.gain.linearRampToValueAtTime(0.0001, tt + 1.0);
          src.stop(tt + 1.1); lfo.stop(tt + 1.1);
        } catch (e) {}
      },
    };
  }

  /* ---- Mute toggle button (shared UI) -------------------------------- */
  var ICON_ON =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M5 9v6h4l5 4V5L9 9H5z"/>' +
    '<path d="M17 8c1.2 1 1.2 7 0 8"/>' +
    '<path d="M19.5 6c2.2 2 2.2 10 0 12"/></svg>';
  var ICON_OFF =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M5 9v6h4l5 4V5L9 9H5z"/>' +
    '<path d="M17 9l5 6M22 9l-5 6"/></svg>';

  function makeMuteToggle() {
    var btn = document.createElement("button");
    btn.className = "softbtn mute";
    btn.type = "button";
    btn.setAttribute("aria-label", "Sound on or off");
    function paint() {
      var m = isMuted();
      btn.innerHTML = m ? ICON_OFF : ICON_ON;
      btn.setAttribute("aria-pressed", String(m));
    }
    paint();
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      unlock();
      toggleMuted();
      paint();
    });
    return btn;
  }

  /* ---- Global first-gesture unlock ----------------------------------- */
  function armUnlock() {
    function handler() {
      unlock();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    }
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("touchstart", handler, { passive: true });
    window.addEventListener("keydown", handler);
  }

  window.QuietAudio = {
    unlock: unlock,
    armUnlock: armUnlock,
    isMuted: isMuted,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
    makeMuteToggle: makeMuteToggle,
    startAmbient: startAmbient,
    woodClink: woodClink,
    brush: brush,
    drop: drop,
    reveal: reveal,
    tone: tone,
  };
})();
