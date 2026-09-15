/* The Sifting Box.
 * A layer of sand hides a letter, number, or shape. Sweeping a finger sweeps
 * the sand away to reveal what is underneath. Pour fresh sand for the next one.
 * No score, no timer — just the quiet pleasure of uncovering. */
(function () {
  "use strict";
  var P = window.PALETTE;

  QuietAudio.startAmbient("garden");

  var revealCanvas = document.getElementById("reveal");
  var sandCanvas = document.getElementById("sand");
  var rctx = revealCanvas.getContext("2d");
  var sctx = sandCanvas.getContext("2d");
  var foundEl = document.getElementById("found");

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  // The things hiding under the sand, cycled in order.
  var ITEMS = buildItems();
  var itemIndex = Math.floor(Math.random() * ITEMS.length);

  // Low-res grid tracking how much has been uncovered.
  var GRID = 28;
  var cells, cleared, totalCells, announced;

  function buildItems() {
    var out = [];
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(function (c) {
      out.push({ type: "letter", value: c, label: c });
    });
    "012345".split("").forEach(function (c) {
      out.push({ type: "number", value: c, label: c });
    });
    ["circle", "square", "triangle", "star", "heart", "moon"].forEach(function (s) {
      out.push({ type: "shape", value: s, label: cap(s) });
    });
    // gently interleave so consecutive pours feel varied
    return shuffle(out);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    [revealCanvas, sandCanvas].forEach(function (cv) {
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
    });
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  window.addEventListener("resize", debounce(resize, 150));

  /* ---- Draw the hidden item ----------------------------------------- */
  function drawReveal() {
    rctx.clearRect(0, 0, W, H);
    // soft box background so the reveal reads as "inside the box"
    var g = rctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e7dcc4");
    g.addColorStop(1, "#dccba6");
    rctx.fillStyle = g;
    rctx.fillRect(0, 0, W, H);

    var item = ITEMS[itemIndex];
    var cx = W / 2, cy = H / 2;
    var size = Math.min(W, H) * 0.5;
    rctx.fillStyle = P.clay;
    rctx.strokeStyle = P.clay;

    if (item.type === "shape") {
      drawShape(item.value, cx, cy, size);
    } else {
      rctx.textAlign = "center";
      rctx.textBaseline = "middle";
      rctx.font = "700 " + Math.floor(size) + 'px "Segoe UI",system-ui,sans-serif';
      rctx.fillText(item.value, cx, cy + size * 0.03);
    }
  }

  function drawShape(kind, cx, cy, s) {
    var r = s / 2;
    rctx.beginPath();
    if (kind === "circle") {
      rctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (kind === "square") {
      rctx.rect(cx - r, cy - r, s, s);
    } else if (kind === "triangle") {
      rctx.moveTo(cx, cy - r);
      rctx.lineTo(cx + r, cy + r);
      rctx.lineTo(cx - r, cy + r);
      rctx.closePath();
    } else if (kind === "star") {
      star(cx, cy, r, r * 0.45, 5);
    } else if (kind === "heart") {
      heart(cx, cy, r);
    } else if (kind === "moon") {
      rctx.arc(cx, cy, r, 0, Math.PI * 2);
      rctx.fill();
      rctx.globalCompositeOperation = "destination-out";
      rctx.beginPath();
      rctx.arc(cx + r * 0.4, cy - r * 0.25, r * 0.85, 0, Math.PI * 2);
      rctx.fill();
      rctx.globalCompositeOperation = "source-over";
      return;
    }
    rctx.fill();
  }
  function star(cx, cy, rOut, rIn, points) {
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? rOut : rIn;
      var a = (Math.PI * i) / points - Math.PI / 2;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) rctx.moveTo(x, y); else rctx.lineTo(x, y);
    }
    rctx.closePath();
  }
  function heart(cx, cy, r) {
    cy -= r * 0.2;
    rctx.moveTo(cx, cy + r * 0.75);
    rctx.bezierCurveTo(cx + r * 1.1, cy - r * 0.35, cx + r * 0.4, cy - r * 0.95, cx, cy - r * 0.3);
    rctx.bezierCurveTo(cx - r * 0.4, cy - r * 0.95, cx - r * 1.1, cy - r * 0.35, cx, cy + r * 0.75);
    rctx.closePath();
  }

  /* ---- Draw the sand layer ------------------------------------------ */
  function drawSand() {
    sctx.globalCompositeOperation = "source-over";
    var g = sctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#e6d9bd");
    g.addColorStop(1, "#d8c69f");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, W, H);
    // grain: scattered soft specks
    var n = Math.floor((W * H) / 2600);
    for (var i = 0; i < n; i++) {
      var x = Math.random() * W, y = Math.random() * H;
      sctx.fillStyle = Math.random() < 0.5
        ? "rgba(180,160,120,0.30)" : "rgba(255,250,238,0.30)";
      sctx.fillRect(x, y, 2, 2);
    }
  }

  // Only cells within the central region (where the hidden item sits) count
  // toward the reveal, so a child doesn't have to sweep the whole box.
  var relevant;
  function resetGrid() {
    cells = new Uint8Array(GRID * GRID);
    relevant = new Uint8Array(GRID * GRID);
    cleared = 0;
    totalCells = 0;
    announced = false;
    var cw = W / GRID, ch = H / GRID;
    var cx = W / 2, cy = H / 2;
    var half = Math.min(W, H) * 0.34;
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var x = (c + 0.5) * cw, y = (r + 0.5) * ch;
        if (Math.abs(x - cx) <= half && Math.abs(y - cy) <= half) {
          relevant[r * GRID + c] = 1;
          totalCells++;
        }
      }
    }
  }

  function redraw() {
    drawReveal();
    drawSand();
    resetGrid();
    foundEl.classList.remove("show");
  }

  /* ---- Sweeping the sand -------------------------------------------- */
  var R = 30;                       // brush radius (CSS px)
  function erase(x, y) {
    sctx.globalCompositeOperation = "destination-out";
    var grad = sctx.createRadialGradient(x, y, 0, x, y, R);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.7, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(x, y, R, 0, Math.PI * 2);
    sctx.fill();
    sctx.globalCompositeOperation = "source-over";
    markCells(x, y);
  }

  function markCells(x, y) {
    var cw = W / GRID, ch = H / GRID;
    var c0 = Math.floor((x - R) / cw), c1 = Math.floor((x + R) / cw);
    var r0 = Math.floor((y - R) / ch), r1 = Math.floor((y + R) / ch);
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        if (r < 0 || c < 0 || r >= GRID || c >= GRID) continue;
        var idx = r * GRID + c;
        if (!relevant[idx]) continue;
        if (!cells[idx]) { cells[idx] = 1; cleared++; }
      }
    }
    if (!announced && cleared / totalCells > 0.62) {
      announced = true;
      QuietAudio.reveal();
      foundEl.textContent = ITEMS[itemIndex].label;
      foundEl.classList.add("show");
    }
  }

  /* ---- Input -------------------------------------------------------- */
  var last = null, lastSound = 0;
  function xy(e) { return { x: e.clientX, y: e.clientY }; }

  sandCanvas.addEventListener("pointerdown", function (e) {
    QuietAudio.unlock();
    sandCanvas.setPointerCapture(e.pointerId);
    var p = xy(e);
    last = p;
    erase(p.x, p.y);
  });
  sandCanvas.addEventListener("pointermove", function (e) {
    if (!last) return;
    var p = xy(e);
    // erase along the segment so fast strokes stay continuous
    var dx = p.x - last.x, dy = p.y - last.y;
    var dist = Math.hypot(dx, dy);
    var steps = Math.max(1, Math.floor(dist / (R * 0.5)));
    for (var i = 1; i <= steps; i++) {
      erase(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
    }
    var now = performance.now();
    if (now - lastSound > 55) {
      lastSound = now;
      QuietAudio.brush(Math.min(1, dist / 40));
    }
    last = p;
  });
  function stop() { last = null; }
  sandCanvas.addEventListener("pointerup", stop);
  sandCanvas.addEventListener("pointercancel", stop);

  document.getElementById("pour").addEventListener("click", function () {
    QuietAudio.unlock();
    itemIndex = (itemIndex + 1) % ITEMS.length;
    QuietAudio.tone({ type: "sine", freq: 300, gain: 0.06, dur: 0.35 });
    redraw();
  });

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  resize();
})();
