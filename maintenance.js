(function () {
  "use strict";

  var SB_URL = "https://wdrgcavxwamwqgxkdscn.supabase.co";
  var SB_KEY = "sb_publishable_XlL1WvosmoBvl3vttrT-xw_nVvtMrQo";
  var sb = null;

  function goIfOff() {
    if (!sb || goIfOff.checking) return;
    goIfOff.checking = true;
    sb.rpc("is_maintenance_mode").then(function (res) {
      if (!res.error && !(res.data === true || String(res.data).toLowerCase() === "true")) {
        location.replace("index.html");
      }
    }).catch(function () {}).finally(function () {
      goIfOff.checking = false;
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  var script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = function () {
    if (window.supabase) {
      sb = window.supabase.createClient(SB_URL, SB_KEY);
      goIfOff();
    }
  };
  document.head.appendChild(script);
  setInterval(goIfOff, 5000);
})();
