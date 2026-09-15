/* The Pebble Path — a calm Rube-Goldberg-style marble run.
 * A smooth pebble tumbles down wooden ramps the child can drag and rotate,
 * rolling past letter/number checkpoints that softly light and chime.
 * Slow, gentle physics. No score, no timer, no fail — just cause and effect. */
(function () {
  "use strict";
  var P = window.PALETTE;
  var clamp = window.QSCore.clamp;

  QuietAudio.startAmbient("garden");

  var canvas = document.getElementById("stage");
  var ctx = window.fitCanvas(canvas);
  var promptEl = document.getElementById("prompt");

  // World size helpers
  function W() { return canvas._cssW; }
  function H() { return canvas._cssH; }
  function minWH() { return Math.min(W(), H()); }

  /* ---- Physics tuning (deliberately slow & soft) -------------------- */
  var SUB = 5;                 // collision substeps per frame
  var G = 0.085;              // gravity per substep
  var VMAX = 7;               // speed clamp per substep (prevents tunneling)
  var E = 0.24;               // restitution (little bounce)
  var FRIC = 0.02;            // tangential friction on contact
  var PLANK_THK = 11;         // plank half-thickness for collisions

  /* ---- State (geometry stored as fractions, so it survives resize) --- */
  var planks, checkpoints, pegs, bell, start, groundY;
  var marble = { x: 0, y: 0, vx: 0, vy: 0, r: 16, resting: true };
  var mode = "numbers";       // "numbers" | "letters"
  var nextOrder = 1;
  var collected = 0;
  var soundGate = 0;

  var PROMPTS = [
    "Can the pebble roll past 1, then 2, then 3?",
    "Can the pebble reach the bell?",
    "Try tilting a ramp and drop it again.",
    "Move a ramp to make a new path.",
  ];

  function defaultLayout() {
    planks = [
      { nx: 0.30, ny: 0.28, angle: 0.32, nlen: 0.34 },
      { nx: 0.66, ny: 0.45, angle: -0.34, nlen: 0.34 },
      { nx: 0.36, ny: 0.63, angle: 0.30, nlen: 0.34 },
    ];
    checkpoints = [
      { nx: 0.50, ny: 0.33, order: 1, passed: false, pop: 0 },
      { nx: 0.52, ny: 0.51, order: 2, passed: false, pop: 0 },
      { nx: 0.55, ny: 0.69, order: 3, passed: false, pop: 0 },
    ];
    pegs = [
      { nx: 0.78, ny: 0.60 },
      { nx: 0.22, ny: 0.50 },
    ];
    bell = { nx: 0.82, ny: 0.82, pop: 0 };
    start = { nx: 0.22, ny: 0.10 };
  }
  defaultLayout();

  function resetMarble() {
    marble.x = start.nx * W();
    marble.y = start.ny * H();
    marble.vx = 0; marble.vy = 0;
    marble.resting = true;
    marble.r = clamp(minWH() * 0.024, 12, 20);
  }
  resetMarble();

  function newDrop() {
    resetMarble();
    marble.resting = false;
    nextOrder = 1; collected = 0;
    checkpoints.forEach(function (c) { c.passed = false; });
    QuietAudio.unlock();
    QuietAudio.drop();
    promptEl.textContent = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  }

  /* ---- Geometry helpers --------------------------------------------- */
  function plankPts(p) {
    var cx = p.nx * W(), cy = p.ny * H();
    var half = (p.nlen * minWH()) / 2;
    var dx = Math.cos(p.angle) * half, dy = Math.sin(p.angle) * half;
    return { cx: cx, cy: cy, ax: cx - dx, ay: cy - dy, bx: cx + dx, by: cy + dy };
  }
  function px(n, horiz) { return n * (horiz ? W() : H()); }

  /* ---- Collision primitives ----------------------------------------- */
  function collideCapsule(ax, ay, bx, by, half) {
    var abx = bx - ax, aby = by - ay;
    var len2 = abx * abx + aby * aby || 1;
    var t = ((marble.x - ax) * abx + (marble.y - ay) * aby) / len2;
    t = clamp(t, 0, 1);
    var cx = ax + abx * t, cy = ay + aby * t;
    resolve(cx, cy, half);
  }
  function collideCircle(cx, cy, r) { return resolve(cx, cy, r); }

  function resolve(cx, cy, surfaceR) {
    var dx = marble.x - cx, dy = marble.y - cy;
    var dist = Math.hypot(dx, dy);
    var minDist = marble.r + surfaceR;
    if (dist >= minDist) return false;
    if (dist < 1e-4) { dx = 0; dy = -1; dist = 1; }
    var nx = dx / dist, ny = dy / dist;
    // push out of penetration
    marble.x += nx * (minDist - dist);
    marble.y += ny * (minDist - dist);
    var vn = marble.vx * nx + marble.vy * ny;
    if (vn < 0) {
      marble.vx -= (1 + E) * vn * nx;
      marble.vy -= (1 + E) * vn * ny;
      // tangential friction
      var tx = -ny, ty = nx;
      var vt = marble.vx * tx + marble.vy * ty;
      marble.vx -= vt * FRIC * tx;
      marble.vy -= vt * FRIC * ty;
      var impact = -vn;
      if (impact > 1.1) softTap(impact);
    }
    return true;
  }

  function softTap(impact) {
    var now = performance.now();
    if (now - soundGate < 90) return;
    soundGate = now;
    QuietAudio.woodClink();
  }

  /* ---- Simulation --------------------------------------------------- */
  function substep() {
    if (marble.resting) return;
    marble.vy += G;
    var sp = Math.hypot(marble.vx, marble.vy);
    if (sp > VMAX) { marble.vx *= VMAX / sp; marble.vy *= VMAX / sp; }
    marble.x += marble.vx;
    marble.y += marble.vy;

    // ramps
    for (var i = 0; i < planks.length; i++) {
      var q = plankPts(planks[i]);
      collideCapsule(q.ax, q.ay, q.bx, q.by, PLANK_THK);
    }
    // pegs
    var pegR = minWH() * 0.02;
    for (var j = 0; j < pegs.length; j++) {
      collideCircle(px(pegs[j].nx, true), px(pegs[j].ny, false), pegR);
    }
    // walls
    if (marble.x < marble.r) { marble.x = marble.r; if (marble.vx < 0) marble.vx *= -E; }
    var right = W() - marble.r;
    if (marble.x > right) { marble.x = right; if (marble.vx > 0) marble.vx *= -E; }

    // bell (solid, rings on contact)
    var bx = px(bell.nx, true), by = px(bell.ny, false), br = minWH() * 0.045;
    if (collideCircle(bx, by, br)) ringBell();

    // ground
    groundY = H() * 0.9;
    if (marble.y > groundY - marble.r) {
      marble.y = groundY - marble.r;
      if (marble.vy > 0) marble.vy *= -E;
      marble.vx *= 0.86;                 // rolling friction on the ground
      if (Math.abs(marble.vx) < 0.06 && Math.abs(marble.vy) < 0.5) {
        marble.resting = true;
        marble.vx = marble.vy = 0;
      }
    }

    // checkpoints (must be reached in order)
    for (var k = 0; k < checkpoints.length; k++) {
      var c = checkpoints[k];
      var ccx = px(c.nx, true), ccy = px(c.ny, false);
      var cr = minWH() * 0.05;
      if (!c.passed && c.order === nextOrder &&
          Math.hypot(marble.x - ccx, marble.y - ccy) < cr + marble.r) {
        c.passed = true; c.pop = 1; nextOrder++; collected++;
        // rising chime by order
        QuietAudio.tone({ type: "sine", freq: 440 + c.order * 90, gain: 0.14, dur: 0.5 });
        QuietAudio.tone({ type: "sine", freq: 660 + c.order * 90, gain: 0.07, dur: 0.4 });
      }
    }
  }

  var bellGate = 0;
  function ringBell() {
    bell.pop = 1;
    var now = performance.now();
    if (now - bellGate < 400) return;
    bellGate = now;
    QuietAudio.tone({ type: "sine", freq: 990, gain: 0.16, dur: 0.9 });
    QuietAudio.tone({ type: "triangle", freq: 1480, gain: 0.05, dur: 0.7 });
  }

  /* ---- Rendering ---------------------------------------------------- */
  function label(order) {
    if (mode === "letters") return "ABC".charAt(order - 1);
    return String(order);
  }

  function paintBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, H());
    g.addColorStop(0, "#eee7d6");
    g.addColorStop(1, "#e3d9be");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W(), H());
    // ground band
    ctx.fillStyle = "rgba(122,154,128,0.18)";
    ctx.fillRect(0, H() * 0.9, W(), H() * 0.1);
  }

  function drawStartChute() {
    var sx = px(start.nx, true), sy = px(start.ny, false);
    ctx.fillStyle = P.woodDeep;
    ctx.beginPath();
    ctx.moveTo(sx - 34, sy - 24);
    ctx.lineTo(sx + 22, sy - 24);
    ctx.lineTo(sx + 30, sy + 16);
    ctx.lineTo(sx - 26, sy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.sandDeep;
    ctx.beginPath();
    ctx.moveTo(sx - 28, sy - 18);
    ctx.lineTo(sx + 16, sy - 18);
    ctx.lineTo(sx + 22, sy + 10);
    ctx.lineTo(sx - 20, sy + 10);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlanks() {
    for (var i = 0; i < planks.length; i++) {
      var q = plankPts(planks[i]);
      ctx.save();
      ctx.lineCap = "round";
      // plank body
      ctx.strokeStyle = P.wood;
      ctx.lineWidth = PLANK_THK * 2;
      ctx.beginPath();
      ctx.moveTo(q.ax, q.ay); ctx.lineTo(q.bx, q.by);
      ctx.stroke();
      ctx.strokeStyle = P.woodDeep;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(q.ax, q.ay); ctx.lineTo(q.bx, q.by);
      ctx.stroke();
      // rotate handles at the ends (gentle hint of interactivity)
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      [[q.ax, q.ay], [q.bx, q.by]].forEach(function (e) {
        ctx.beginPath(); ctx.arc(e[0], e[1], 7, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }
  }

  function drawPegs() {
    var pegR = minWH() * 0.02;
    ctx.fillStyle = P.stoneDeep;
    for (var j = 0; j < pegs.length; j++) {
      ctx.beginPath();
      ctx.arc(px(pegs[j].nx, true), px(pegs[j].ny, false), pegR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCheckpoints() {
    for (var k = 0; k < checkpoints.length; k++) {
      var c = checkpoints[k];
      var cx = px(c.nx, true), cy = px(c.ny, false), r = minWH() * 0.05;
      c.pop *= 0.94; if (c.pop < 0.01) c.pop = 0;
      ctx.save();
      // ring
      ctx.lineWidth = 4;
      ctx.strokeStyle = c.passed ? P.forest : "rgba(82,112,90,0.5)";
      ctx.fillStyle = c.passed ? "rgba(122,154,128,0.28)" : "rgba(255,255,255,0.28)";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // label
      ctx.fillStyle = c.passed ? P.forest : P.inkSoft;
      ctx.font = "600 " + Math.floor(r * 1.1) + 'px "Segoe UI",system-ui,sans-serif';
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label(c.order), cx, cy + 1);
      // pop: a soft floating label when just passed
      if (c.pop > 0) {
        ctx.globalAlpha = c.pop;
        ctx.font = "700 " + Math.floor(r * 2) + 'px "Segoe UI",system-ui,sans-serif';
        ctx.fillStyle = P.forest;
        ctx.fillText(label(c.order), cx, cy - (1 - c.pop) * 60 - r);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  function drawBell() {
    var bx = px(bell.nx, true), by = px(bell.ny, false), br = minWH() * 0.045;
    bell.pop *= 0.9; if (bell.pop < 0.01) bell.pop = 0;
    ctx.save();
    ctx.translate(bx, by + bell.pop * Math.sin(performance.now() * 0.03) * 3);
    // bell body
    ctx.fillStyle = "#c9a94f";
    ctx.beginPath();
    ctx.moveTo(-br, br * 0.6);
    ctx.quadraticCurveTo(-br, -br, 0, -br);
    ctx.quadraticCurveTo(br, -br, br, br * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b0923c";
    ctx.fillRect(-br * 1.1, br * 0.55, br * 2.2, br * 0.28);
    ctx.beginPath(); ctx.arc(0, br * 0.95, br * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMarble() {
    ctx.save();
    ctx.fillStyle = P.stone;
    ctx.beginPath();
    ctx.arc(marble.x, marble.y, marble.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(marble.x - marble.r * 0.3, marble.y - marble.r * 0.32, marble.r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCounter() {
    if (collected <= 0) return;
    var x = W() / 2, y = 60;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.forest;
    ctx.font = "600 26px " + '"Segoe UI",system-ui,sans-serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(mode === "letters" ? label(collected) : String(collected), x, y + 1);
    ctx.restore();
  }

  function frame() {
    for (var s = 0; s < SUB; s++) substep();
    paintBackground();
    drawStartChute();
    drawPlanks();
    drawPegs();
    drawCheckpoints();
    drawBell();
    drawMarble();
    drawCounter();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---- Dragging & rotating ramps ------------------------------------ */
  var grab = null;   // { plank, kind:'move'|'rotate', dx, dy }
  function pos(e) { return { x: e.clientX, y: e.clientY }; }

  function pickPlank(p) {
    // prefer an endpoint (rotate) then the body (move)
    for (var i = planks.length - 1; i >= 0; i--) {
      var q = plankPts(planks[i]);
      if (Math.hypot(p.x - q.ax, p.y - q.ay) < 22 ||
          Math.hypot(p.x - q.bx, p.y - q.by) < 22) {
        return { plank: planks[i], kind: "rotate" };
      }
    }
    for (var j = planks.length - 1; j >= 0; j--) {
      var r = plankPts(planks[j]);
      // distance from point to segment
      var abx = r.bx - r.ax, aby = r.by - r.ay;
      var t = clamp(((p.x - r.ax) * abx + (p.y - r.ay) * aby) /
                    (abx * abx + aby * aby || 1), 0, 1);
      var cx = r.ax + abx * t, cy = r.ay + aby * t;
      if (Math.hypot(p.x - cx, p.y - cy) < PLANK_THK + 12) {
        return { plank: planks[j], kind: "move",
                 dx: p.x - r.cx, dy: p.y - r.cy };
      }
    }
    return null;
  }

  canvas.addEventListener("pointerdown", function (e) {
    QuietAudio.unlock();
    var p = pos(e);
    grab = pickPlank(p);
    if (grab) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!grab) return;
    var p = pos(e);
    if (grab.kind === "move") {
      grab.plank.nx = clamp((p.x - grab.dx) / W(), 0.08, 0.92);
      grab.plank.ny = clamp((p.y - grab.dy) / H(), 0.08, 0.86);
    } else {
      var q = plankPts(grab.plank);
      grab.plank.angle = Math.atan2(p.y - q.cy, p.x - q.cx);
    }
  });
  function release() { grab = null; }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  /* ---- Controls ----------------------------------------------------- */
  document.getElementById("drop").addEventListener("click", newDrop);
  document.getElementById("reset").addEventListener("click", function () {
    defaultLayout();
    resetMarble();
    QuietAudio.unlock();
    QuietAudio.tone({ type: "sine", freq: 300, gain: 0.06, dur: 0.35 });
  });
  var modeBtn = document.getElementById("mode");
  modeBtn.addEventListener("click", function () {
    mode = mode === "numbers" ? "letters" : "numbers";
    modeBtn.textContent = mode === "numbers" ? "1 2 3" : "A B C";
    QuietAudio.unlock();
    QuietAudio.tone({ type: "sine", freq: 340, gain: 0.06, dur: 0.3 });
  });

  promptEl.textContent = PROMPTS[0];

  /* ---- Resize: keep the marble in proportion ------------------------ */
  // Debug hook: lets automated tests drive the sim deterministically without
  // relying on requestAnimationFrame (which throttles when the tab is hidden).
  window.__tumble = {
    substep: substep, newDrop: newDrop,
    get marble() { return marble; },
    get collected() { return collected; },
    checkpoints: checkpoints, bell: bell, planks: planks,
    W: W, H: H,
  };

  var prevW = W(), prevH = H();
  window.addEventListener("resize", function () {
    var nw = window.innerWidth, nh = window.innerHeight;
    if (prevW && prevH) {
      marble.x *= nw / prevW; marble.y *= nh / prevH;
    }
    prevW = nw; prevH = nh;
    marble.r = clamp(Math.min(nw, nh) * 0.024, 12, 20);
  });
})();
