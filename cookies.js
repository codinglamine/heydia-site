// Self-injecting cookie consent: Accept all / Deny / Customize. Stores the choice in
// localStorage so it shows once. Drop <script src="cookies.js" defer></script> on any page.
(function () {
  var KEY = "heydia-cookie-consent";
  function saved() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  if (saved()) return;

  function close() { var b = document.querySelector(".ck-bar"); if (b) b.remove(); var m = document.getElementById("ck-modal"); if (m) m.remove(); }
  function decide(analytics, marketing) { set({ essential: true, analytics: analytics, marketing: marketing, ts: Date.now() }); close(); }

  var bar = document.createElement("div");
  bar.className = "ck-bar";
  bar.innerHTML =
    '<div class="ck-in">' +
      '<div class="ck-txt"><span class="mark"></span><p>We use cookies to keep heydia running and to understand how the site is used. Choose what you’re ok with.</p></div>' +
      '<div class="ck-btns">' +
        '<button class="ck-b ck-ghost" data-a="custom">Customize</button>' +
        '<button class="ck-b ck-ghost" data-a="deny">Deny</button>' +
        '<button class="ck-b ck-primary" data-a="accept">Accept all</button>' +
      "</div>" +
    "</div>";
  document.body.appendChild(bar);

  bar.addEventListener("click", function (e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-a");
    if (a === "accept") decide(true, true);
    else if (a === "deny") decide(false, false);
    else if (a === "custom") showModal();
  });

  function showModal() {
    if (document.getElementById("ck-modal")) return;
    var m = document.createElement("div");
    m.id = "ck-modal"; m.className = "ck-modal";
    m.innerHTML =
      '<div class="ck-card">' +
        "<h3>Cookie preferences</h3>" +
        '<p class="ck-sub">Essential cookies are always on so the site works. Turn the rest on or off.</p>' +
        '<label class="ck-row"><div><b>Essential</b><span>Login, security, your preferences.</span></div><input type="checkbox" checked disabled></label>' +
        '<label class="ck-row"><div><b>Analytics</b><span>Anonymous usage, so we can improve heydia.</span></div><input type="checkbox" id="ck-an"></label>' +
        '<label class="ck-row"><div><b>Marketing</b><span>Measure campaigns. Off by default.</span></div><input type="checkbox" id="ck-mk"></label>' +
        '<div class="ck-modal-btns"><button class="ck-b ck-ghost" data-m="deny">Reject all</button><button class="ck-b ck-primary" data-m="save">Save choices</button></div>' +
      "</div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m) { m.remove(); return; }
      var mm = e.target.getAttribute && e.target.getAttribute("data-m");
      if (mm === "deny") decide(false, false);
      else if (mm === "save") decide(!!document.getElementById("ck-an").checked, !!document.getElementById("ck-mk").checked);
    });
  }
})();
