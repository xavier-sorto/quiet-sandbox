/* Pure, deterministic logic shared by the activities.
 * No DOM, no canvas — just math, so it can be unit-tested on its own
 * (see tests/test.html). */
(function () {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // Sum the .weight of a list of placed items.
  function totalWeight(items) {
    var s = 0;
    for (var i = 0; i < items.length; i++) s += items[i].weight || 0;
    return s;
  }

  // Tilt angle (radians) of the branch from the weight on each side.
  // Convention: positive angle => the RIGHT side dips down.
  // The result is eased/clamped so the branch never swings violently.
  function computeTilt(leftWeight, rightWeight, opts) {
    opts = opts || {};
    var k = opts.k == null ? 0.09 : opts.k;      // radians per unit of weight difference
    var max = opts.max == null ? 0.22 : opts.max; // ~12.6 degrees, gentle
    return clamp((rightWeight - leftWeight) * k, -max, max);
  }

  // Steer a particle's velocity gently around circular obstacles.
  // Returns a new {vx, vy}. Obstacles: [{x, y, r}]. `influence` is how far
  // beyond an obstacle's radius its push reaches.
  function deflect(px, py, vx, vy, obstacles, influence) {
    influence = influence == null ? 26 : influence;
    var ax = 0, ay = 0;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var dx = px - o.x, dy = py - o.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      var reach = o.r + influence;
      if (dist < reach) {
        var strength = (reach - dist) / reach;   // 0..1, stronger when closer
        ax += (dx / dist) * strength;
        ay += (dy / dist) * strength;
      }
    }
    return { vx: vx + ax * 0.9, vy: vy + ay * 0.9 };
  }

  window.QSCore = {
    clamp: clamp,
    totalWeight: totalWeight,
    computeTilt: computeTilt,
    deflect: deflect,
  };
})();
