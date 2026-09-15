/* Reusable code-drawn creatures and objects.
 * Everything is soft geometry (arcs, ellipses) in muted tones — no images.
 *
 * Each creature draws centered at (cx, cy) and fits within a box of `size`.
 * Weights are small whole numbers (1..3) for gentle comparisons on the branch.
 */
(function () {
  "use strict";
  var C = window.PALETTE.creature;

  // The woodland cast, in the order they appear on the shelf.
  var CREATURES = [
    { kind: "snail",    name: "Snail",    weight: 1, color: C.snail },
    { kind: "mouse",    name: "Mouse",    weight: 1, color: C.mouse },
    { kind: "frog",     name: "Frog",     weight: 2, color: C.frog },
    { kind: "bird",     name: "Bird",     weight: 2, color: C.bird },
    { kind: "turtle",   name: "Turtle",   weight: 3, color: C.turtle },
    { kind: "hedgehog", name: "Hedgehog", weight: 3, color: C.hedgehog },
  ];

  function shade(hex, amt) {
    // amt in [-1,1]; negative darkens, positive lightens.
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function mix(c) {
      return Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    }
    return "rgb(" + mix(r) + "," + mix(g) + "," + mix(b) + ")";
  }

  function eye(ctx, x, y, r) {
    ctx.fillStyle = "#4a443b";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw a creature. Returns nothing; caller sets any transform first.
  function drawCreature(ctx, kind, cx, cy, size, color) {
    var s = size / 2;               // half-extent
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = "round";
    var dark = shade(color, -0.18);

    if (kind === "snail") {
      // body
      ctx.fillStyle = shade(color, 0.12);
      ctx.beginPath();
      ctx.ellipse(-s * 0.1, s * 0.35, s * 0.9, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // shell spiral
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s * 0.2, -s * 0.05, s * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = s * 0.1;
      ctx.beginPath();
      for (var a = 0; a < Math.PI * 3.4; a += 0.15) {
        var rr = s * 0.55 * (1 - a / (Math.PI * 4));
        var px = s * 0.2 + Math.cos(a) * rr;
        var py = -s * 0.05 + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // head + antenna
      ctx.fillStyle = shade(color, 0.12);
      ctx.beginPath();
      ctx.ellipse(-s * 0.85, s * 0.2, s * 0.22, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, s * 0.0); ctx.lineTo(-s * 1.0, -s * 0.4);
      ctx.stroke();
      eye(ctx, -s * 0.92, -s * 0.42, s * 0.08);

    } else if (kind === "mouse") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.1, s * 0.75, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // ears
      ctx.beginPath();
      ctx.arc(-s * 0.45, -s * 0.45, s * 0.35, 0, Math.PI * 2);
      ctx.arc(s * 0.45, -s * 0.45, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(color, 0.25);
      ctx.beginPath();
      ctx.arc(-s * 0.45, -s * 0.45, s * 0.18, 0, Math.PI * 2);
      ctx.arc(s * 0.45, -s * 0.45, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // tail
      ctx.strokeStyle = dark; ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(s * 0.7, s * 0.3);
      ctx.quadraticCurveTo(s * 1.2, s * 0.1, s * 1.0, -s * 0.4);
      ctx.stroke();
      eye(ctx, s * 0.15, s * 0.05, s * 0.09);
      // nose
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(-s * 0.7, s * 0.2, s * 0.09, 0, Math.PI * 2); ctx.fill();

    } else if (kind === "frog") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.2, s * 0.85, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye bumps
      ctx.beginPath();
      ctx.arc(-s * 0.4, -s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx.arc(s * 0.4, -s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4eede";
      ctx.beginPath();
      ctx.arc(-s * 0.4, -s * 0.4, s * 0.16, 0, Math.PI * 2);
      ctx.arc(s * 0.4, -s * 0.4, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      eye(ctx, -s * 0.4, -s * 0.4, s * 0.08);
      eye(ctx, s * 0.4, -s * 0.4, s * 0.08);
      // smile
      ctx.strokeStyle = dark; ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.arc(0, s * 0.25, s * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

    } else if (kind === "bird") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      // wing
      ctx.fillStyle = shade(color, -0.12);
      ctx.beginPath();
      ctx.ellipse(s * 0.15, s * 0.1, s * 0.4, s * 0.28, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(-s * 0.5, -s * 0.45, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = "#c98a4a";
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, -s * 0.45);
      ctx.lineTo(-s * 1.15, -s * 0.32);
      ctx.lineTo(-s * 0.85, -s * 0.22);
      ctx.closePath(); ctx.fill();
      eye(ctx, -s * 0.55, -s * 0.5, s * 0.08);

    } else if (kind === "turtle") {
      // legs
      ctx.fillStyle = shade(color, 0.2);
      [-0.55, 0.55].forEach(function (dx) {
        ctx.beginPath();
        ctx.ellipse(s * dx, s * 0.45, s * 0.22, s * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // shell dome
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, s * 0.25, s * 0.8, Math.PI, 0);
      ctx.closePath(); ctx.fill();
      // shell pattern
      ctx.strokeStyle = shade(color, -0.2); ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.25); ctx.lineTo(s * 0.8, s * 0.25);
      for (var k = -1; k <= 1; k++) {
        ctx.moveTo(s * 0.4 * k, s * 0.25);
        ctx.lineTo(s * 0.4 * k, -s * 0.5);
      }
      ctx.stroke();
      // head
      ctx.fillStyle = shade(color, 0.2);
      ctx.beginPath();
      ctx.arc(-s * 0.85, s * 0.1, s * 0.24, 0, Math.PI * 2);
      ctx.fill();
      eye(ctx, -s * 0.92, s * 0.05, s * 0.07);

    } else if (kind === "hedgehog") {
      // spikes
      ctx.fillStyle = shade(color, -0.22);
      var spikes = 11;
      for (var i = 0; i <= spikes; i++) {
        var ang = Math.PI + (i / spikes) * Math.PI;
        var bx = Math.cos(ang) * s * 0.75;
        var by = Math.sin(ang) * s * 0.6 + s * 0.15;
        var tx = Math.cos(ang) * s * 1.05;
        var ty = Math.sin(ang) * s * 0.95 + s * 0.15;
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.09, by);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx + s * 0.09, by);
        ctx.closePath(); ctx.fill();
      }
      // body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.2, s * 0.75, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // face
      ctx.fillStyle = shade(color, 0.22);
      ctx.beginPath();
      ctx.ellipse(-s * 0.6, s * 0.28, s * 0.3, s * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a443b";
      ctx.beginPath(); ctx.arc(-s * 0.85, s * 0.28, s * 0.09, 0, Math.PI * 2); ctx.fill();
      eye(ctx, -s * 0.6, s * 0.18, s * 0.08);
    }
    ctx.restore();
  }

  window.SHAPES = {
    CREATURES: CREATURES,
    drawCreature: drawCreature,
    shade: shade,
  };
})();
