/* Light / dark for heydia.com.
 * Dark is the default look; this remembers your choice and follows the OS the first time.
 * Loaded in <head> (not deferred) so the theme is set before first paint — no flash. */
(function () {
  var KEY = "heydia-theme";
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  var prefersLight = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches;
  var theme = saved || (prefersLight ? "light" : "dark");
  apply(theme);

  function apply(t) {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");   // dark = the base tokens
  }

  // build the toggle once the nav exists
  function mount() {
    var end = document.querySelector("nav .nav-end");
    if (!end || end.querySelector(".theme-tog")) return;
    var b = document.createElement("button");
    b.className = "theme-tog";
    b.type = "button";
    b.setAttribute("aria-label", "Switch between light and dark");
    b.title = "Light / dark";
    b.innerHTML =
      '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
      '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
    b.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* */ }
    });
    end.insertBefore(b, end.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
