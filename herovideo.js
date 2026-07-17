/* Hero video: only load/play it when it's actually worth it.
 * Skipped entirely on reduced-motion, small screens, or data-saver — the poster still shows. */
(function () {
  var v = document.getElementById("heroVid");
  if (!v) return;
  var rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = matchMedia("(max-width: 760px)").matches;
  var save = (navigator.connection || {}).saveData === true;
  if (rm || small || save) return;                 // poster only

  v.preload = "auto";
  var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  v.addEventListener("playing", function () { v.classList.add("on"); }, { once: true });
  if (v.readyState >= 2) play(); else v.addEventListener("loadeddata", play, { once: true });
  v.load();

  // don't burn cycles when it's scrolled away
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) play(); else v.pause(); });
  }, { threshold: 0.05 });
  io.observe(v);
  document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else play(); });
})();
