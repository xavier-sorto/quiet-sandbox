/* Shared per-activity chrome: a gentle back-to-home button, the mute toggle,
 * a slow screen fade-in, and audio unlock. Each activity page just includes
 * this and then its own logic file. */
(function () {
  "use strict";

  QuietAudio.armUnlock();

  // Reveal the screen with a slow fade.
  var screen = document.getElementById("screen");
  if (screen) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { screen.classList.add("ready"); });
    });
  }

  // Back button (returns to The Quiet Garden).
  var back = document.createElement("button");
  back.className = "softbtn";
  back.type = "button";
  back.setAttribute("aria-label", "Back to the garden");
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener("click", function () {
    QuietAudio.unlock();
    QuietAudio.tone({ type: "sine", freq: 280, gain: 0.07, dur: 0.4 });
    document.body.classList.add("leaving");
    setTimeout(function () { window.location.href = "../index.html"; }, 620);
  });
  var left = document.getElementById("corner-left");
  if (left) left.appendChild(back);

  // Mute toggle.
  var right = document.getElementById("corner-right");
  if (right) right.appendChild(QuietAudio.makeMuteToggle());

  // Expose a tiny helper for high-DPI canvas sizing, reused by activities.
  window.fitCanvas = function (canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var ctx = canvas.getContext("2d");
    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas._cssW = w; canvas._cssH = h;
    }
    window.addEventListener("resize", resize);
    resize();
    return ctx;
  };
})();
