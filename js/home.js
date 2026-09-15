/* The Quiet Garden — home screen.
 * A gentle ambient backdrop of slowly drifting leaves behind three doorways,
 * with slow fade transitions when a doorway is chosen. */
(function () {
  "use strict";
  var P = window.PALETTE;

  QuietAudio.armUnlock();
  QuietAudio.startAmbient("garden");
  document.getElementById("corner").appendChild(QuietAudio.makeMuteToggle());

  // Reveal the screen with a slow fade once styles are settled.
  var screen = document.getElementById("home");
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { screen.classList.add("ready"); });
  });

  // Slow, calm navigation: fade the page out before following the link.
  document.querySelectorAll(".door").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      QuietAudio.unlock();
      QuietAudio.tone({ type: "sine", freq: 300, gain: 0.08, dur: 0.4 });
      var href = a.getAttribute("href");
      document.body.classList.add("leaving");
      setTimeout(function () { window.location.href = href; }, 620);
    });
  });

  /* ---- Ambient drifting leaves -------------------------------------- */
  var canvas = document.getElementById("bg");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var leaves = [];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  function makeLeaf() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 6 + Math.random() * 10,
      vx: 0.15 + Math.random() * 0.25,
      drift: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.004,
      hue: Math.random() < 0.5 ? P.forestSoft : P.clay,
      alpha: 0.10 + Math.random() * 0.12,
    };
  }
  for (var i = 0; i < 14; i++) leaves.push(makeLeaf());

  function paintBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#efe8d8");
    g.addColorStop(1, "#e4dabf");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawLeaf(l) {
    ctx.save();
    ctx.globalAlpha = l.alpha;
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.fillStyle = l.hue;
    ctx.beginPath();
    ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  var t = 0;
  function loop() {
    t += 0.016;
    paintBackground();
    for (var i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      l.x += l.vx;
      l.y += Math.sin(t * l.drift + l.phase) * 0.25;
      l.rot += l.vr;
      if (l.x - l.r > W) { l.x = -l.r; l.y = Math.random() * H; }
      drawLeaf(l);
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
