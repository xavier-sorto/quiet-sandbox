/* The Water Stream.
 * A slow current drifts down the screen. Drop stones, leaves, and twigs to
 * deflect the flow and build little dams. Pure cause-and-effect, no goals. */
(function () {
  "use strict";
  var P = window.PALETTE;
  var Core = window.QSCore;

  QuietAudio.startAmbient("water");

  var canvas = document.getElementById("stage");
  var ctx = window.fitCanvas(canvas);

  var particles = [];
  var obstacles = [];               // { x, y, r, kind, color, angle }
  var TARGET = 260;                 // particle count (calm, not busy)
  var MAX_OBSTACLES = 30;

  function W() { return canvas._cssW; }
  function H() { return canvas._cssH; }

  function spawn(atTop) {
    return {
      x: Math.random() * W(),
      y: atTop ? -10 - Math.random() * H() : Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: 1.0 + Math.random() * 0.8,
      len: 12 + Math.random() * 16,
      alpha: 0.18 + Math.random() * 0.22,
      wobble: Math.random() * Math.PI * 2,
    };
  }
  function seed() {
    particles = [];
    for (var i = 0; i < TARGET; i++) particles.push(spawn(false));
  }
  seed();

  /* ---- Placing things in the stream --------------------------------- */
  var KINDS = ["stone", "leaf", "twig"];
  var kindTurn = 0;

  function addObstacle(x, y) {
    var kind = KINDS[kindTurn % KINDS.length];
    kindTurn++;
    var o = { x: x, y: y, kind: kind, angle: Math.random() * Math.PI };
    if (kind === "stone") { o.r = 26 + Math.random() * 12; o.color = P.stone; }
    else if (kind === "leaf") { o.r = 22 + Math.random() * 8; o.color = P.forestSoft; }
    else { o.r = 18 + Math.random() * 6; o.color = P.wood; }
    obstacles.push(o);
    if (obstacles.length > MAX_OBSTACLES) obstacles.shift();
    QuietAudio.drop();
  }

  /* ---- Simulation --------------------------------------------------- */
  function step() {
    var w = W(), h = H(), t = performance.now() * 0.001;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      // gentle steer around obstacles
      var d = Core.deflect(p.x, p.y, p.vx, p.vy, obstacles, 22);
      p.vx = d.vx; p.vy = d.vy;
      // relax back toward a calm downward drift
      p.vx += (0 - p.vx) * 0.04 + Math.sin(t + p.wobble) * 0.015;
      p.vy += (1.3 - p.vy) * 0.05;
      // clamp so nothing races
      var sp = Math.hypot(p.vx, p.vy);
      if (sp > 3.2) { p.vx *= 3.2 / sp; p.vy *= 3.2 / sp; }
      p.x += p.vx; p.y += p.vy;
      // recycle
      if (p.y > h + 12 || p.x < -20 || p.x > w + 20) {
        particles[i] = spawn(true);
      }
    }
  }

  /* ---- Rendering ---------------------------------------------------- */
  function paintBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, H());
    g.addColorStop(0, "#c7d3d4");
    g.addColorStop(1, "#aebfc0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W(), H());
  }

  function drawParticles() {
    ctx.lineCap = "round";
    ctx.strokeStyle = "#eef4f4";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var sp = Math.hypot(p.vx, p.vy) || 1;
      var nx = p.vx / sp, ny = p.vy / sp;
      ctx.globalAlpha = p.alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - nx * p.len, p.y - ny * p.len);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.angle);
      if (o.kind === "stone") {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, o.r, o.r * 0.78, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.ellipse(-o.r * 0.25, -o.r * 0.28, o.r * 0.4, o.r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "leaf") {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, o.r, o.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(74,68,59,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-o.r, 0); ctx.lineTo(o.r, 0);
        ctx.stroke();
      } else { // twig
        ctx.strokeStyle = o.color;
        ctx.lineCap = "round";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-o.r, 0); ctx.lineTo(o.r, 0);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(o.r * 0.2, 0); ctx.lineTo(o.r * 0.7, -o.r * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function frame() {
    step();
    paintBackground();
    drawParticles();
    drawObstacles();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---- Input -------------------------------------------------------- */
  var last = null, lastDrop = 0;
  function xy(e) { return { x: e.clientX, y: e.clientY }; }

  canvas.addEventListener("pointerdown", function (e) {
    QuietAudio.unlock();
    canvas.setPointerCapture(e.pointerId);
    var p = xy(e);
    last = p; lastDrop = performance.now();
    addObstacle(p.x, p.y);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!last) return;
    var p = xy(e);
    // dragging lays a little line of stones to build a dam
    if (Math.hypot(p.x - last.x, p.y - last.y) > 46 &&
        performance.now() - lastDrop > 90) {
      addObstacle(p.x, p.y);
      last = p; lastDrop = performance.now();
    }
  });
  function stop() { last = null; }
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
})();
