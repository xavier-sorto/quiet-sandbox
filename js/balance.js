/* The Balancing Branch.
 * Drag slow woodland animals onto either side of a branch and watch it tip.
 * Weight and counting are felt, never scored. No win state, no timer. */
(function () {
  "use strict";
  var P = window.PALETTE;
  var S = window.SHAPES;
  var Core = window.QSCore;

  QuietAudio.startAmbient("garden");

  var canvas = document.getElementById("stage");
  var ctx = window.fitCanvas(canvas);

  var ANIMAL = 62;                 // draw size of a creature
  var HIT = ANIMAL * 0.6;          // grab radius

  var left = [];                   // placed on the left tray
  var right = [];                  // placed on the right tray
  var drag = null;                 // { kind, color, weight, x, y, fromPan }
  var angle = 0;                   // current eased tilt (rad), + = right down

  // Layout is recomputed every frame so it survives resize/orientation.
  function layout() {
    var W = canvas._cssW, H = canvas._cssH;
    var beamHalf = Math.min(W * 0.34, 340);
    var shelfTop = H - 176;
    return {
      W: W, H: H,
      pivotX: W / 2,
      pivotY: Math.min(H * 0.46, shelfTop - 170),
      beamHalf: beamHalf,
      shelfTop: shelfTop,
    };
  }

  // Where a creature at index `i` on a side sits, in beam-local coordinates
  // (relative to that side's tray center, before rotation).
  var COL_ORDER = [0, -1, 1];       // first animal centered, then left, then right
  function slotLocal(i) {
    var col = COL_ORDER[i % 3], rowN = Math.floor(i / 3);
    return { x: col * 46, y: -ANIMAL * 0.34 - rowN * 40 };
  }

  // Rotate a point (lx,ly) given in pivot-local space by `angle`, to world.
  function toWorld(L, lx, ly) {
    var c = Math.cos(angle), s = Math.sin(angle);
    return { x: L.pivotX + lx * c - ly * s, y: L.pivotY + lx * s + ly * c };
  }

  function trayCenterWorld(L, side) {
    var lx = side === "L" ? -L.beamHalf : L.beamHalf;
    return toWorld(L, lx, 8);       // just under the beam
  }

  function placedWorld(L, side, i) {
    var tray = side === "L" ? -L.beamHalf : L.beamHalf;
    var s = slotLocal(i);
    return toWorld(L, tray + s.x, 8 + s.y);
  }

  /* ---- The shelf of available animals -------------------------------- */
  function shelfSlots(L) {
    var creatures = S.CREATURES;
    var gap = Math.min(112, (L.W - 60) / creatures.length);
    var startX = L.W / 2 - (gap * (creatures.length - 1)) / 2;
    var y = L.shelfTop + 62;
    return creatures.map(function (c, i) {
      return { c: c, x: startX + i * gap, y: y };
    });
  }

  /* ---- Rendering ----------------------------------------------------- */
  function paintBackground(L) {
    var g = ctx.createLinearGradient(0, 0, 0, L.H);
    g.addColorStop(0, "#eee7d6");
    g.addColorStop(1, "#e2d8bd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.W, L.H);

    // soft ground band behind the shelf
    ctx.fillStyle = "rgba(122,154,128,0.16)";
    ctx.beginPath();
    ctx.moveTo(0, L.shelfTop + 18);
    ctx.quadraticCurveTo(L.W / 2, L.shelfTop - 6, L.W, L.shelfTop + 18);
    ctx.lineTo(L.W, L.H); ctx.lineTo(0, L.H);
    ctx.closePath(); ctx.fill();
  }

  function drawTray(L, side) {
    var t = trayCenterWorld(L, side);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(angle);
    // a soft mossy nest/platform
    ctx.fillStyle = P.forestSoft;
    ctx.beginPath();
    ctx.ellipse(0, 6, 62, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = S.shade(P.wood, 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBeam(L) {
    ctx.save();
    ctx.translate(L.pivotX, L.pivotY);
    ctx.rotate(angle);
    // the branch
    ctx.fillStyle = P.wood;
    ctx.strokeStyle = P.woodDeep;
    ctx.lineWidth = 2;
    roundBar(-L.beamHalf, -9, L.beamHalf * 2, 18, 9);
    ctx.fill();
    // a couple of soft knots for character
    ctx.fillStyle = S.shade(P.wood, -0.12);
    [-0.5, 0.35].forEach(function (f) {
      ctx.beginPath();
      ctx.ellipse(L.beamHalf * f, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function roundBar(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSupport(L) {
    // upright post
    ctx.fillStyle = S.shade(P.wood, -0.08);
    roundBar(L.pivotX - 10, L.pivotY, 20, L.shelfTop - L.pivotY + 6, 8);
    ctx.fill();
    // fulcrum triangle
    ctx.fillStyle = P.woodDeep;
    ctx.beginPath();
    ctx.moveTo(L.pivotX, L.pivotY - 4);
    ctx.lineTo(L.pivotX - 26, L.pivotY + 30);
    ctx.lineTo(L.pivotX + 26, L.pivotY + 30);
    ctx.closePath();
    ctx.fill();
  }

  function drawPlaced(L, side) {
    var list = side === "L" ? left : right;
    for (var i = 0; i < list.length; i++) {
      var inst = list[i];
      var w = placedWorld(L, side, i);
      var yb = inst.bob ? -Math.sin(inst.bob * Math.PI) * 10 : 0;
      inst.bob *= 0.9; if (inst.bob < 0.02) inst.bob = 0;
      ctx.save();
      ctx.translate(w.x, w.y + yb);
      ctx.rotate(angle);
      S.drawCreature(ctx, inst.kind, 0, -ANIMAL * 0.22, ANIMAL, inst.color);
      ctx.restore();
    }
  }

  function drawShelf(L) {
    var slots = shelfSlots(L);
    // a soft ground line the animals rest on
    var groundY = L.shelfTop + 96;
    ctx.fillStyle = "rgba(111,85,64,0.10)";
    slots.forEach(function (slot) {
      ctx.beginPath();
      ctx.ellipse(slot.x, groundY, ANIMAL * 0.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    slots.forEach(function (slot) {
      S.drawCreature(ctx, slot.c.kind, slot.x, slot.y, ANIMAL, slot.c.color);
    });
  }

  function drawCountChip(L, side) {
    var list = side === "L" ? left : right;
    if (!list.length) return;
    var x = side === "L" ? L.W * 0.22 : L.W * 0.78;
    var y = 66;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.inkSoft;
    ctx.font = "600 24px " + fontStack();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(list.length), x, y + 1);
    ctx.restore();
  }

  function fontStack() {
    return '"Segoe UI","Avenir Next",system-ui,sans-serif';
  }

  function drawDrag(L) {
    if (!drag) return;
    ctx.save();
    ctx.globalAlpha = 0.96;
    S.drawCreature(ctx, drag.kind, drag.x, drag.y, ANIMAL * 1.05, drag.color);
    ctx.restore();
  }

  var sway = 0;
  function frame() {
    var L = layout();

    // Ease the tilt toward the target from current weights, plus a tiny
    // breathing sway so a balanced branch still feels alive.
    var target = Core.computeTilt(Core.totalWeight(left), Core.totalWeight(right));
    sway += 0.012;
    target += Math.sin(sway) * 0.004;
    angle += (target - angle) * 0.08;

    paintBackground(L);
    drawSupport(L);
    drawBeam(L);
    drawTray(L, "L");
    drawTray(L, "R");
    drawPlaced(L, "L");
    drawPlaced(L, "R");
    drawShelf(L);
    drawCountChip(L, "L");
    drawCountChip(L, "R");
    drawDrag(L);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---- Input -------------------------------------------------------- */
  function pos(e) { return { x: e.clientX, y: e.clientY }; }

  function topPlacedHit(L, p) {
    // search both sides, later-placed (on top) first
    var sides = ["L", "R"];
    for (var s = 0; s < 2; s++) {
      var side = sides[s];
      var list = side === "L" ? left : right;
      for (var i = list.length - 1; i >= 0; i--) {
        var w = placedWorld(L, side, i);
        if (Math.hypot(p.x - w.x, p.y - w.y) < HIT) {
          return { side: side, index: i, inst: list[i] };
        }
      }
    }
    return null;
  }

  canvas.addEventListener("pointerdown", function (e) {
    QuietAudio.unlock();
    var L = layout();
    var p = pos(e);
    canvas.setPointerCapture(e.pointerId);

    if (p.y >= L.shelfTop) {
      // grabbing a fresh animal from the shelf
      var slots = shelfSlots(L);
      for (var i = 0; i < slots.length; i++) {
        if (Math.hypot(p.x - slots[i].x, p.y - slots[i].y) < HIT + 8) {
          var c = slots[i].c;
          drag = { kind: c.kind, color: c.color, weight: c.weight,
                   x: p.x, y: p.y, fromPan: false };
          return;
        }
      }
    } else {
      // grabbing an animal already on a tray (to move or remove it)
      var hit = topPlacedHit(L, p);
      if (hit) {
        (hit.side === "L" ? left : right).splice(hit.index, 1);
        drag = { kind: hit.inst.kind, color: hit.inst.color,
                 weight: hit.inst.weight, x: p.x, y: p.y, fromPan: true };
      }
    }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var p = pos(e);
    drag.x = p.x; drag.y = p.y;
  });

  function endDrag(e) {
    if (!drag) return;
    var L = layout();
    var p = pos(e);
    if (p.y < L.shelfTop) {
      // dropped in the play area -> settle on the nearer side
      var side = p.x < L.pivotX ? "L" : "R";
      drag.bob = 1;
      (side === "L" ? left : right).push(drag);
      QuietAudio.woodClink();
    } else if (drag.fromPan) {
      // dragged back down to the shelf -> gently removed
      QuietAudio.tone({ type: "sine", freq: 240, gain: 0.05, dur: 0.25 });
    }
    drag = null;
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", function () { drag = null; });
})();
