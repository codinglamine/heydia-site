// Make the Windows button DOWNLOAD the installer directly (instead of opening the GitHub
// releases page). Asks GitHub for the latest release, finds the Windows .exe/.msi asset, and
// sends the browser straight to it. Falls back to the releases page if there's no release yet.
(function () {
  var btn = document.getElementById("dlWin");
  if (!btn) return;
  var REPO = "codinglamine/dia";
  var FALLBACK = "https://github.com/" + REPO + "/releases/latest";

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    var label = btn.querySelector("b");
    var was = label ? label.textContent : "";
    if (label) label.textContent = "Fetching…";
    btn.classList.add("dl-busy");
    var done = function () { if (label) label.textContent = was; btn.classList.remove("dl-busy"); };

    fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var assets = (d && d.assets) || [];
        var pick =
          assets.filter(function (a) { return /-setup\.exe$/i.test(a.name); })[0] ||
          assets.filter(function (a) { return /\.exe$/i.test(a.name); })[0] ||
          assets.filter(function (a) { return /\.msi$/i.test(a.name); })[0];
        window.location.href = pick ? pick.browser_download_url : FALLBACK;
      })
      .catch(function () { window.location.href = FALLBACK; })
      .finally(function () { setTimeout(done, 1500); });
  });
})();
