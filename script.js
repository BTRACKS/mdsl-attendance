/* Multidigital Service Limited — E-Attendance Platform
   Front-end app backed by Supabase (Auth + Postgres). */
(function () {
  "use strict";

  /* ------------------------- Supabase ------------------------- */
  var SUPABASE_URL = "https://wdrgcavxwamwqgxkdscn.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XlL1WvosmoBvl3vttrT-xw_nVvtMrQo";

  var supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  /* ------------------------- routing ------------------------- */
  var PAGE = (document.body.getAttribute("data-page") || "app");
  var HOME = PAGE === "app" ? "" : "index.html";
  var ABOUT_URL = PAGE === "app" ? "about.html" : "about.html";
  function go(hash) {
    if (PAGE === "app") { location.hash = hash; render(); }
    else { location.href = "index.html" + hash; }
  }

  var DEPARTMENTS = ["Operations", "Media & Broadcast", "Technology", "Marketing", "Creative & Design", "Finance", "Human Resources", "Sales",
    "Administration", "Finance & Accounting", "Information Technology", "Customer Service", "Sales & Marketing", "Procurement",
    "Logistics", "Engineering", "Maintenance", "Quality Assurance", "Business Development", "Legal & Compliance", "Security", "Research & Development"];
  var POSITIONS_HINT = "e.g. Video Editor, Backend Engineer";

  /* ------------------------- icons ------------------------- */
  var ICON = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 16 9"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="1" y1="18" x2="23" y2="18"/></svg>',
    sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="1" y1="18" x2="23" y2="18"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    userCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.4"/><path d="M4.5 17c.6-1.7 2-2.6 3.5-2.6s2.9.9 3.5 2.6"/><line x1="14" y1="9" x2="19" y2="9"/><line x1="14" y1="13" x2="19" y2="13"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><line x1="12" y1="7.6" x2="12.01" y2="7.6"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z"/><polyline points="9 12 11 14 15 10"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></svg>',
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5 12 4l10 4.5-10 4.5z"/><path d="M6 10.8V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.2"/></svg>',
    signin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    register: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.06A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.06A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7h.06A1.7 1.7 0 0 0 10.1 3.14V3a2 2 0 1 1 4 0v.06A1.7 1.7 0 0 0 15 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 9v.06A1.7 1.7 0 0 0 20.86 10.1H21a2 2 0 1 1 0 4h-.06A1.7 1.7 0 0 0 19.4 15z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a1.5 1.5 0 0 0 1.3-.75l.6-1A1.5 1.5 0 0 1 9.9 3.5h4.2a1.5 1.5 0 0 1 1.3.75l.6 1A1.5 1.5 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19.5C5 19.5 1 12 1 12a19.4 19.4 0 0 1 5.06-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4.5c7 0 11 7.5 11 7.5a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/></svg>',
    sunriseTabler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M5.6 7.6 7 9"/><path d="M18.4 7.6 17 9"/><path d="M3 17h3"/><path d="M18 17h3"/><path d="M8 17a4 4 0 0 1 8 0"/><path d="M2 21h20"/></svg>'
  };
  /* Only "Overview" and "Settings" carried nav icons before; those icons
     are now removed. Other nav icons (e.g. Attendance History) are unchanged. */
  var NAV_ICON = { "Dashboard": ICON.grid, "Attendance History": ICON.clock };

  /* Time-of-day greeting used on the staff dashboard header.
     Icons are outline-style, matching the Tabler Icons set (tabler.io/icons):
     sunrise for morning, sun for afternoon, moon for evening. */
  function greetingInfo(now) {
    var h = now.getHours();
    if (h >= 5 && h < 12) return { text: "Good morning", icon: ICON.sunriseTabler };
    if (h >= 12 && h < 17) return { text: "Good afternoon", icon: ICON.sun };
    return { text: "Good evening", icon: ICON.moon };
  }

  /* db is an in-memory cache of Supabase data, refreshed via refreshData().
     Views read synchronously from this cache; actions that change data
     (sign up, sign in, submit attendance) await refreshData() before
     re-rendering, so the UI code below stays largely unchanged. */
  var db = { users: [], attendance: [], staffCount: null };
  var authUser = null;     // the raw Supabase auth user (has .id, .email)
  var currentUser = null;  // the matching row from db.users (profile + role)
  var dataError = null;

  function mapProfile(p) {
    return {
      id: p.id, fullName: p.full_name, staffId: p.staff_id, email: p.email,
      employmentType: p.employment_type, department: p.department, position: p.position,
      role: p.role, createdAt: p.created_at,
      phone: p.phone || "", avatarUrl: p.avatar_url || ""
    };
  }
  function mapAttendance(a) {
    return { userId: a.user_id, date: a.date, morning: a.morning || null, evening: a.evening || null };
  }

  async function refreshData() {
    pageLoader.show();
    try {
      dataError = null;
      var profilesRes = await supabaseClient.from("profiles").select("*");
      var attendanceRes = await supabaseClient.from("attendance").select("*");
      if (profilesRes.error) dataError = profilesRes.error.message;
      if (attendanceRes.error) dataError = attendanceRes.error.message;
      db.users = (profilesRes.data || []).map(mapProfile);
      db.attendance = (attendanceRes.data || []).map(mapAttendance);

      // profiles select() is RLS-restricted before login, so db.users can be
      // empty pre-auth. staff_count() is a SECURITY DEFINER RPC that returns
      // just the count without exposing any profile rows to anon visitors.
      var countRes = await supabaseClient.rpc("staff_count");
      db.staffCount = (!countRes.error && typeof countRes.data === "number")
        ? countRes.data
        : db.users.filter(function (u) { return u.role !== "admin"; }).length;
    } finally {
      pageLoader.hide();
    }
  }

  async function refreshSessionUser() {
    var sessionRes = await supabaseClient.auth.getSession();
    authUser = (sessionRes.data && sessionRes.data.session) ? sessionRes.data.session.user : null;
    currentUser = authUser ? (db.users.find(function (u) { return u.id === authUser.id; }) || null) : null;
  }

  /* ------------------------- helpers ------------------------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function longDate(d) {
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function prettyDate(key) {
    var p = key.split("-");
    return longDate(new Date(+p[0], +p[1] - 1, +p[2]));
  }
  function clockTime(d) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
  }
  function el(id) { return document.getElementById(id); }

  /* ------------------------- loading UI ------------------------- */
  /* Reusable top-of-page progress bar. Every refreshData() call routes
     through show()/hide(), so any screen that fetches data gets the same
     indicator automatically — no per-page loader markup needed.
     A short delay-in avoids flashing on fast requests, and a minimum
     visible time avoids the bar blinking on and off for quick ones. */
  function makeLoader(node, delayMs, minVisibleMs) {
    var showTimer = null, shownAt = null, pending = 0;
    function reveal() {
      showTimer = null;
      node.hidden = false;
      requestAnimationFrame(function () { node.classList.add("visible"); });
      shownAt = Date.now();
    }
    return {
      show: function () {
        pending++;
        if (shownAt || showTimer) return;
        showTimer = setTimeout(reveal, delayMs);
      },
      hide: function () {
        pending = Math.max(0, pending - 1);
        if (pending > 0) return;
        if (showTimer) { clearTimeout(showTimer); showTimer = null; return; }
        if (!shownAt) return;
        var wait = Math.max(0, minVisibleMs - (Date.now() - shownAt));
        setTimeout(function () {
          node.classList.remove("visible");
          setTimeout(function () { node.hidden = true; }, 200);
          shownAt = null;
        }, wait);
      }
    };
  }
  var pageLoader = makeLoader(el("topLoader"), 150, 300);

  /* Reusable button-loading toggle: swaps the button's content for a
     centered spinner (keeping the button's size/label markup intact) and
     disables it, so it can never be double-submitted or left stuck. */
  function setBtnLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      if (btn.dataset.loadingHtml === undefined) btn.dataset.loadingHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      var light = btn.classList.contains("btn-dark") ? " spinner-light" : "";
      btn.insertAdjacentHTML("beforeend", '<span class="spinner' + light + '" aria-hidden="true"></span>');
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (btn.dataset.loadingHtml !== undefined) { btn.innerHTML = btn.dataset.loadingHtml; delete btn.dataset.loadingHtml; }
    }
  }

  function session() { return currentUser; }

  async function doLogout(btn) {
    setBtnLoading(btn, true);
    try {
      await supabaseClient.auth.signOut();
      authUser = null; currentUser = null;
      toast("You have been signed out.");
      go("#/login");
    } finally {
      setBtnLoading(btn, false);
    }
  }

  function record(userId, key) {
    return db.attendance.find(function (a) { return a.userId === userId && a.date === key; }) || null;
  }

  /* ------------------------- toasts & modal ------------------------- */
  function toast(msg, type) {
    var t = document.createElement("div");
    t.className = "toast" + (type === "error" ? " error" : "");
    t.textContent = msg;
    el("toasts").appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .25s"; }, 3200);
    setTimeout(function () { t.remove(); }, 3600);
  }

  var pendingConfirm = null;
  function confirmDialog(title, body, onYes) {
    el("modalTitle").textContent = title;
    el("modalBody").textContent = body;
    el("modal").hidden = false;
    pendingConfirm = onYes;
  }
  function closeModal() { el("modal").hidden = true; pendingConfirm = null; }
  el("modalCancel").addEventListener("click", closeModal);
  el("modal").addEventListener("click", function (e) { if (e.target === el("modal")) closeModal(); });
  el("modalConfirm").addEventListener("click", function () {
    var fn = pendingConfirm; closeModal(); if (fn) fn();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /* ------------------------- chrome ------------------------- */
  function renderChrome() {
    var u = session();
    var head = el("masthead"), foot = el("footer"), faq = el("faqSection");
    /* Chrome (header, FAQ, footer) is shown on every page, including the
       login / registration screens and the standalone About Us page. */
    head.hidden = false; foot.hidden = false; faq.hidden = false;
    renderFaq();
    el("year").textContent = new Date().getFullYear();

    var brand = document.querySelector(".masthead .brand");
    if (brand) brand.setAttribute("href", HOME + (u ? "#/dashboard" : "#/login"));
    el("logoutBtn").hidden = !u;
    document.body.classList.toggle("public-chrome", !u);

    var links;
    if (!u) {
      links = [["#/login", "Sign in"], ["#/signup", "Register"]];
    } else {
      links = u.role === "admin"
        ? [["#/admin", "Overview"], ["#/admin/attendance", "Attendance Management"], ["#/dashboard", "My Dashboard"], ["#/settings", "Settings"]]
        : [["#/dashboard", "Dashboard"], ["#/history", "Attendance History"], ["#/settings", "Settings"]];

    }
    var hash = PAGE === "about" ? "" : (location.hash || (u ? "#/dashboard" : "#/login"));
    links = links.concat([[ABOUT_URL, "About Us"]]);
    el("nav").innerHTML = links.map(function (l) {
      var href = l[0].charAt(0) === "#" ? HOME + l[0] : l[0];
      var active = l[0].charAt(0) === "#" ? hash === l[0] : PAGE === "about";
      return '<a href="' + href + '" class="' + (active ? "active" : "") + '">' + (NAV_ICON[l[1]] || "") + '<span>' + l[1] + "</span></a>";
    }).join("") + (u ? '<button type="button" class="nav-signout" id="navSignout"><span>Sign out</span></button>' : "");
    el("nav").classList.remove("open");
    document.body.classList.remove("nav-open");
    el("navBackdrop").hidden = true;
    el("navBackdrop").classList.remove("show");

    syncHeaderHeight();
  }

  el("logoutBtn").addEventListener("click", function () { doLogout(el("logoutBtn")); });

  function openNav() {
    syncHeaderHeight();
    el("nav").classList.add("open");
    document.body.classList.add("nav-open");
    el("navBackdrop").hidden = false;
    el("navBackdrop").classList.add("show");
    el("menuToggle").setAttribute("aria-expanded", "true");
  }
  function closeNav() {
    el("nav").classList.remove("open");
    document.body.classList.remove("nav-open");
    el("navBackdrop").hidden = true;
    el("navBackdrop").classList.remove("show");
    el("menuToggle").setAttribute("aria-expanded", "false");
  }

  el("nav").addEventListener("click", function (e) {
    if (e.target.closest("#navSignout")) {
      doLogout(el("navSignout"));
      return;
    }
    if (e.target.closest("a")) closeNav();
  });
  function syncHeaderHeight() {
    var head = el("masthead");
    if (head && !head.hidden) {
      document.documentElement.style.setProperty("--header-h", head.offsetHeight + "px");
    }
  }
  window.addEventListener("resize", function () {
    syncHeaderHeight();
    if (window.innerWidth > 760) closeNav();
  });

  el("menuToggle").addEventListener("click", function (e) {
    e.stopPropagation();
    if (el("nav").classList.contains("open")) closeNav(); else openNav();
  });
  el("navBackdrop").addEventListener("click", closeNav);
  document.addEventListener("click", function (e) {
    var nav = el("nav");
    if (!nav.classList.contains("open")) return;
    if (nav.contains(e.target) || el("menuToggle").contains(e.target)) return;
    closeNav();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && el("nav").classList.contains("open")) closeNav();
  });

  /* ------------------------- validation ------------------------- */
  function readForm(form, rules) {
    var values = {}, ok = true;
    Object.keys(rules).forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      var wrap = input.closest(".field");
      var errBox = wrap.querySelector(".error");
      var v = (input.value || "").trim();
      values[name] = v;
      var msg = rules[name](v, values);
      errBox.textContent = msg || "";
      wrap.classList.toggle("invalid", !!msg);
      if (msg) ok = false;
    });
    return ok ? values : null;
  }
  var req = function (label) { return function (v) { return v ? "" : label + " is required."; }; };

  /* ------------------------- views ------------------------- */
  function signupView() {
    return '<div class="auth">' + aside("Register once.<br><span>Attend daily.</span>",
      "Multidigital Service Limited's internal attendance record. Create your staff profile to begin logging resumption and closing times.") +
      '<div class="auth-main"><div class="auth-card">' +
      '<p class="eyebrow">Staff Registration</p><h1>Create your account</h1>' +
      '<p class="auth-sub">For Multidigital Service Limited personnel only. Details are verified against the staff register.</p>' +
      '<form id="signupForm" novalidate><div class="form-grid">' +
      field("fullName", "Full Name", "text", "Adaeze Okonkwo") +
      field("staffId", "Staff ID", "text", "MD-0123") +
      field("email", "Email Address", "email", "name@multidigitalng.com", true) +
      selectField("employmentType", "Employment Type", ["Intern", "Staff"]) +
      selectField("department", "Department", DEPARTMENTS) +
      field("position", "Position / Role", "text", POSITIONS_HINT) +
      passwordField("password", "Password", "Minimum 8 characters", { strength: true }) +
      passwordField("confirmPassword", "Confirm Password", "Re-enter password") +
      '</div><div class="form-foot">' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit"><span>Create account</span></button>' +
      '<p class="form-alt">Already registered? <a class="auth-link" href="#/login">' + ICON.signin + '<span>Sign in instead</span></a></p>' +
      "</div></form></div></div></div>";
  }

  function loginView() {
    return '<div class="auth">' + aside("Multidigital Service Limited<br><span>attendance record.</span>",
      "Sign in to submit your morning resumption and evening closing times, and to review your attendance history.") +
      '<div class="auth-main"><div class="auth-card">' +
      '<p class="eyebrow">Staff Sign In</p><h1>Welcome back</h1>' +
      '<p class="auth-sub">Use your registered email address or staff ID.</p>' +
      '<form id="loginForm" novalidate><div class="form-grid">' +
      field("identifier", "Email or Staff ID", "text", "name@multidigitalng.com", true) +
      passwordField("password", "Password", "Your password", { full: true }) +
      '</div><div class="form-foot">' +
      '<div class="inline-between"><a class="link-muted" href="#/forgot">Forgot password?</a>' +
      '<a class="link-muted auth-link" href="#/signup">' + ICON.register + '<span>Create an account</span></a></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit"><span>Sign in</span></button>' +
      "</div></form>" +
      "</div></div></div>";
  }

  function forgotView() {
    return '<div class="auth">' + aside("Password<br><span>recovery.</span>",
      "Enter the email address linked to your Multidigital Service Limited staff profile and we will send reset instructions.") +
      '<div class="auth-main"><div class="auth-card">' +
      '<p class="eyebrow">Account Recovery</p><h1>Forgot password</h1>' +
      '<p class="auth-sub">Reset instructions are sent to your registered work email.</p>' +
      '<form id="forgotForm" novalidate><div class="form-grid">' +
      field("email", "Email Address", "email", "name@multidigitalng.com", true) +
      '</div><div class="form-foot"><button class="btn btn-dark btn-lg btn-block" type="submit">Send reset link</button>' +
      '<p class="form-alt"><a class="auth-link" href="#/login">' + ICON.signin + '<span>Back to sign in</span></a></p></div></form></div></div></div>';
  }

  function aside(headline, lede) {
    return '<div class="auth-aside"><a class="brand brand-lg" href="#/login">' +
      '<img class="brand-logo" src="logo-mark.png" alt="Multidigital Service Limited logo" width="52" height="52" />' +
      '<span class="brand-text">Multidigital Service Limited<em>E-Attendance Platform</em></span></a>' +
      '<div><h2 class="auth-headline">' + headline + "</h2>" +
      '<p class="auth-lede">' + esc(lede) + "</p></div>" +
      '<div class="auth-stats"><div><span>Staff on record</span><b>' + (db.staffCount != null ? db.staffCount : 0) +
      "</b></div><div><span>Daily windows</span><b>2</b></div><div><span>Editable after submit</span><b>No</b></div></div></div>";
  }

  function field(name, label, type, placeholder, full) {
    return '<div class="field' + (full ? " full" : "") + '"><label for="f-' + name + '">' + label + "</label>" +
      '<input id="f-' + name + '" name="' + name + '" type="' + type + '" placeholder="' + esc(placeholder) + '" autocomplete="off" />' +
      '<span class="error"></span></div>';
  }
  function selectField(name, label, options) {
    return '<div class="field"><label for="f-' + name + '">' + label + "</label><select id=\"f-" + name + '" name="' + name + '">' +
      '<option value="">Select ' + label.toLowerCase() + "</option>" +
      options.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + "</option>"; }).join("") +
      '</select><span class="error"></span></div>';
  }
  function passwordField(name, label, placeholder, opts) {
    opts = opts || {};
    return '<div class="field password-field' + (opts.full ? " full" : "") + '"><label for="f-' + name + '">' + label + "</label>" +
      '<div class="pw-wrap">' +
      '<input id="f-' + name + '" name="' + name + '" type="password" placeholder="' + esc(placeholder) + '" autocomplete="off" />' +
      '<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">' + ICON.eye + "</button>" +
      "</div>" +
      (opts.strength ? '<div class="pw-strength" data-pw-strength hidden><span class="pw-strength-track"><i></i></span><span class="pw-strength-label"></span></div>' : "") +
      '<span class="error"></span></div>';
  }

  /* ---------- staff dashboard ---------- */
  function dashboardView(u) {
    var now = new Date(), key = dateKey(now);
    var rec = record(u.id, key);
    var m = rec && rec.morning, e = rec && rec.evening;

    var greeting = greetingInfo(now);
    return '<div class="page"><div class="page-head"><p class="eyebrow">Staff Dashboard</p>' +
      '<h1 class="greeting-line">' +
      '<span class="greeting-salutation">' + esc(greeting.text) + ",</span>" +
      '<span class="greeting-name">' + esc(u.fullName.split(" ")[0]) +
      '<span class="greeting-icon" aria-hidden="true">' + greeting.icon + "</span></span>" +
      "</h1></div>" +
      '<div class="layout"><div>' +

      '<section class="section"><div class="section-head"><h2>Today\'s Attendance</h2><span>' + longDate(now) + "</span></div>" +
      '<div class="att-grid">' +
      attBlock("Morning", "Resumption", m, "morning", !!m) +
      attBlock("Evening", "Closing", e, "evening", !!e || !m) +
      "</div>" +
      (!m ? '<p class="dateline" style="margin-top:12px">Closing time unlocks once your morning resumption has been submitted.</p>' : "") +
      "</section>" +

      '<section class="section"><div class="section-head"><h2>Recent Records</h2><span><a class="link-muted" href="#/history">View full history</a></span></div>' +
      historyTable(u, 5) + "</section>" +

      "</div>" + profilePanel(u) + "</div></div>";
  }

  function attBlock(title, label, entry, kind, disabled) {
    var submitted = !!entry;
    return '<div class="att' + (submitted ? " locked" : "") + '">' +
      '<div class="att-top"><h3>' + title + "</h3>" +
      (submitted ? '<span class="tag tag-ok">Submitted</span>' : '<span class="tag tag-pending">Pending</span>') + "</div>" +
      '<p class="att-time' + (submitted ? "" : " pending") + '">' + (submitted ? esc(entry.time) : "--:--") + "</p>" +
      '<p class="att-meta">' + label + " time" + (submitted ? " recorded" : " not yet recorded") + ".</p>" +
      (submitted
        ? '<div class="locked-note"><span class="lock-icon"></span> Locked — cannot be edited or resubmitted</div>'
        : '<button class="btn btn-primary btn-block" data-att="' + kind + '"' + (disabled ? " disabled" : "") + ">Submit " + label.toLowerCase() + " time</button>") +
      "</div>";
  }

  function profilePanel(u) {
    return '<aside><div class="panel"><div class="panel-head">' + ICON.userCard + 'Staff Profile</div><div class="panel-body">' +
      '<div class="identity">' + avatarHtml(u) +
      "<div><h3>" + esc(u.fullName) + "</h3><p>" + esc(u.position) + "</p></div></div>" +
      '<dl class="dl">' +
      row("Staff ID", u.staffId) + row("Employment Type", u.employmentType) +
      row("Department", u.department) + row("Position", u.position) + row("Email", u.email) +
      (u.phone ? row("Phone", u.phone) : "") +
      "</dl>" +
      '<a class="btn btn-ghost btn-sm btn-block" style="margin-top:16px" href="#/settings">' + ICON.settings + "<span>Profile &amp; settings</span></a>" +
      "</div></div>" +
      '<div class="panel" style="margin-top:20px"><div class="panel-head">' + ICON.activity + 'This Month</div><div class="panel-body">' +
      monthSummary(u) + "</div></div></aside>";
  }
  function row(k, v) { return "<div><dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd></div>"; }

  function monthSummary(u) {
    var now = new Date(), prefix = now.getFullYear() + "-" + pad(now.getMonth() + 1);
    var recs = db.attendance.filter(function (a) { return a.userId === u.id && a.date.indexOf(prefix) === 0; });
    var full = recs.filter(function (a) { return a.morning && a.evening; }).length;
    return '<dl class="dl">' + row("Days recorded", recs.length) + row("Complete days", full) +
      row("Awaiting closing", recs.filter(function (a) { return a.morning && !a.evening; }).length) + "</dl>";
  }

  function statusOf(a) {
    if (a.morning && a.evening) return '<span class="tag tag-ok">Complete</span>';
    if (a.morning) return '<span class="tag tag-pending">Awaiting closing</span>';
    return '<span class="tag tag-miss">Incomplete</span>';
  }

  function historyTable(u, limit) {
    var recs = db.attendance.filter(function (a) { return a.userId === u.id; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    if (limit) recs = recs.slice(0, limit);
    if (!recs.length) return '<div class="table-wrap"><p class="empty">No attendance records yet. Your first submission will appear here.</p></div>';
    return '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Resumption</th><th>Closing</th><th>Status</th></tr></thead><tbody>' +
      recs.map(function (a) {
        return "<tr><td>" + esc(prettyDate(a.date)) + '</td><td class="num">' + (a.morning ? esc(a.morning.time) : "—") +
          '</td><td class="num">' + (a.evening ? esc(a.evening.time) : "—") + "</td><td>" + statusOf(a) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function historyView(u) {
    return '<div class="page"><div class="page-head"><p class="eyebrow">Records</p><h1>Attendance History</h1>' +
      '<p class="dateline">Every resumption and closing time recorded under Staff ID ' + esc(u.staffId) + "</p></div>" +
      '<section class="section"><div class="section-head"><h2>All Records</h2><span>Most recent first</span></div>' +
      historyTable(u) + "</section></div>";
  }

  /* ---------- admin ---------- */
  function adminOverview() {
    var now = new Date(), key = dateKey(now);
    var staff = db.users.filter(function (u) { return u.role !== "admin"; });
    var today = db.attendance.filter(function (a) { return a.date === key; });
    var morning = today.filter(function (a) { return a.morning; });
    var evening = today.filter(function (a) { return a.evening; });
    var missing = staff.filter(function (u) { return !record(u.id, key); });

    var activity = db.attendance.slice().sort(function (a, b) {
      return (Math.max((b.evening && b.evening.at) || 0, (b.morning && b.morning.at) || 0)) -
             (Math.max((a.evening && a.evening.at) || 0, (a.morning && a.morning.at) || 0));
    }).slice(0, 8);

    return '<div class="page"><div class="page-head"><p class="eyebrow">Administration</p><h1>Attendance Overview</h1>' +
      '<p class="dateline">' + longDate(now) + " · organisation-wide monitoring</p></div>" +
      '<div class="stats">' +
      stat("Total Staff", staff.length, "", ICON.users) + stat("Staff Present", morning.length, "ok", ICON.check) +
      stat("Morning Submitted", morning.length, "ok", ICON.sunrise) + stat("Evening Submitted", evening.length, "accent", ICON.sunset) +
      stat("Missing Attendance", missing.length, missing.length ? "danger" : "", ICON.alert) + "</div>" +
      '<div class="layout"><div><section class="section"><div class="section-head"><h2>Today\'s Register</h2><span>' + longDate(now) + "</span></div>" +
      adminTable(staff, key) + "</section></div>" +
      '<aside><div class="panel"><div class="panel-head">' + ICON.activity + 'Recent Attendance Activity</div><div class="panel-body">' +
      '<div class="feed">' + (activity.length ? activity.map(function (a) {
        var user = db.users.find(function (u) { return u.id === a.userId; }) || { fullName: "Unknown" };
        var latest = a.evening || a.morning;
        return '<div class="feed-item"><span class="feed-time">' + esc(latest ? latest.time : "—") + "</span>" +
          "<p><b>" + esc(user.fullName) + "</b> submitted " + (a.evening ? "closing" : "resumption") +
          " time · " + esc(prettyDate(a.date)) + "</p></div>";
      }).join("") : '<p class="empty">No activity recorded.</p>') + "</div></div></div>" +
      '<div class="panel" style="margin-top:20px"><div class="panel-head">' + ICON.alert + 'Missing Today</div><div class="panel-body">' +
      (missing.length ? '<dl class="dl">' + missing.map(function (u) { return row(u.fullName, u.staffId); }).join("") + "</dl>"
        : '<p class="dateline">All staff have submitted attendance.</p>') +
      "</div></div></aside></div></div>";
  }
  function stat(label, value, tone, icon) {
    return '<div class="stat' + (tone ? " " + tone : "") + '"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      (icon ? '<span class="stat-icon">' + icon + '</span>' : '') + '</div><b>' + value + "</b></div>";
  }

  var filters = { q: "", dept: "", type: "", date: "" };

  function adminTable(staff, key) {
    if (!staff.length) return '<div class="table-wrap"><p class="empty">No staff match the selected filters.</p></div>';
    return '<div class="table-wrap"><table><thead><tr><th>Staff</th><th>Department</th><th>Type</th><th>Resumption</th><th>Closing</th><th>Status</th></tr></thead><tbody>' +
      staff.map(function (u) {
        var a = record(u.id, key);
        return '<tr><td><div class="who">' + esc(u.fullName) + '</div><div class="sub">' + esc(u.staffId) + " · " + esc(u.position) + "</div></td>" +
          "<td>" + esc(u.department) + "</td><td>" + esc(u.employmentType) + "</td>" +
          '<td class="num">' + (a && a.morning ? esc(a.morning.time) : "—") + "</td>" +
          '<td class="num">' + (a && a.evening ? esc(a.evening.time) : "—") + "</td>" +
          "<td>" + (a ? statusOf(a) : '<span class="tag tag-miss">Not submitted</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function adminManagement() {
    var key = filters.date || dateKey(new Date());
    var staff = db.users.filter(function (u) { return u.role !== "admin"; }).filter(function (u) {
      var q = filters.q.toLowerCase();
      var match = !q || u.fullName.toLowerCase().indexOf(q) > -1 || u.staffId.toLowerCase().indexOf(q) > -1 || u.email.toLowerCase().indexOf(q) > -1;
      return match && (!filters.dept || u.department === filters.dept) && (!filters.type || u.employmentType === filters.type);
    });

    return '<div class="page"><div class="page-head"><p class="eyebrow">Administration</p><h1>Attendance Management</h1>' +
      '<p class="dateline">Search staff, filter by department, employment type or date, and review individual records.</p></div>' +
      '<form class="filters" id="filterForm">' +
      '<div class="field"><label>Search name, staff ID or email</label><input name="q" value="' + esc(filters.q) + '" placeholder="e.g. MD-0102" /></div>' +
      '<div class="field"><label>Department</label><select name="dept"><option value="">All departments</option>' +
      DEPARTMENTS.map(function (d) { return '<option' + (filters.dept === d ? " selected" : "") + ">" + esc(d) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>Employment type</label><select name="type"><option value="">All types</option>' +
      ["Intern", "Staff"].map(function (t) { return '<option' + (filters.type === t ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>Date</label><input type="date" name="date" value="' + esc(key) + '" /></div>' +
      '<div class="field"><label>&nbsp;</label><button class="btn btn-ghost" type="button" id="resetFilters">Reset</button></div>' +
      "</form>" +
      '<section class="section"><div class="section-head"><h2>Register — ' + esc(prettyDate(key)) + "</h2><span>" + staff.length + " staff</span></div>" +
      adminTable(staff, key) + "</section>" +
      '<section class="section"><div class="section-head"><h2>Individual Attendance History</h2><span>Last 10 records per staff</span></div>' +
      staff.map(function (u) {
        var recs = db.attendance.filter(function (a) { return a.userId === u.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 10);
        return '<div class="panel" style="margin-bottom:18px"><div class="panel-head">' + esc(u.fullName) + " — " + esc(u.staffId) + "</div>" +
          (recs.length ? '<div class="table-wrap" style="border:0"><table><thead><tr><th>Date</th><th>Resumption</th><th>Closing</th><th>Status</th></tr></thead><tbody>' +
            recs.map(function (a) {
              return "<tr><td>" + esc(prettyDate(a.date)) + '</td><td class="num">' + (a.morning ? esc(a.morning.time) : "—") +
                '</td><td class="num">' + (a.evening ? esc(a.evening.time) : "—") + "</td><td>" + statusOf(a) + "</td></tr>";
            }).join("") + "</tbody></table></div>" : '<p class="empty">No records.</p>') + "</div>";
      }).join("") + "</section></div>";
  }

  /* ------------------------- actions ------------------------- */
  function submitAttendance(kind) {
    var u = session(); if (!u) return;
    var now = new Date(), key = dateKey(now);
    var rec = record(u.id, key);
    if (rec && rec[kind]) { toast("This attendance is locked and cannot be changed.", "error"); return; }
    if (kind === "evening" && (!rec || !rec.morning)) { toast("Submit your morning resumption first.", "error"); return; }

    var time = clockTime(now);
    var isMorning = kind === "morning";
    confirmDialog(
      isMorning ? "Confirm Attendance" : "Confirm Closing Time",
      (isMorning
        ? "Please review your resumption time before submitting. Once submitted, this attendance cannot be changed."
        : "Please review your closing time before submitting. Once submitted, this attendance cannot be changed.") +
      "  Recorded time: " + time + ".",
      async function () {
        var payload = { time: time, at: Date.now() };
        var writeRes;
        if (!rec) {
          var insertRow = { user_id: u.id, date: key, morning: null, evening: null };
          insertRow[kind] = payload;
          writeRes = await supabaseClient.from("attendance").insert(insertRow);
        } else {
          var updateRow = {};
          updateRow[kind] = payload;
          writeRes = await supabaseClient.from("attendance").update(updateRow).eq("user_id", u.id).eq("date", key);
        }
        if (writeRes.error) { toast(writeRes.error.message, "error"); return; }
        await refreshData();
        toast(isMorning ? "Morning attendance submitted successfully." : "Evening attendance submitted successfully.");
        render();
      }
    );
  }


  /* ------------------------- FAQ ------------------------- */
  var FAQS = [
    ["What is the E-Attendance System?",
     "The E-Attendance System is Multidigital Service Limited's internal platform for recording daily staff attendance. It replaces paper registers and spreadsheets with a single, time-stamped digital record."],
    ["How does the E-Attendance System work?",
     "Each member of staff signs in, submits a morning resumption time when the day begins and an evening closing time when it ends. Every submission is time-stamped and locked, so records stay accurate and final."],
    ["Who can use the platform?",
     "All Multidigital Service Limited personnel, interns and full staff across every department, plus administrators who monitor and report on attendance."],
    ["How does attendance tracking work?",
     "The platform captures two windows per working day: resumption and closing. Submitted entries cannot be edited or resubmitted, and every record is stored against your staff ID and department."],
    ["Can administrators manage attendance records?",
     "Yes. Administrators have an overview dashboard and a management view where records can be searched and filtered by staff, department, employment type and date."],
    ["Is the platform accessible on mobile devices?",
     "Yes. The interface is fully responsive and works on phones, tablets and desktops, so staff can log attendance from any device."],
    ["How does the system help organizations manage attendance?",
     "It removes manual record-keeping, gives leadership real-time visibility of punctuality and presence, and produces a reliable history for payroll, reviews and compliance."]
  ];

  function renderFaq() {
    var list = el("faqList");
    if (!list || list.getAttribute("data-ready") === "1") return;
    list.innerHTML = FAQS.map(function (f, i) {
      return '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false" data-faq="' + i + '">' +
        "<span>" + esc(f[0]) + '</span><span class="faq-icon" aria-hidden="true"></span></button>' +
        '<div class="faq-a"><div><p>' + esc(f[1]) + "</p></div></div></div>";
    }).join("");
    list.setAttribute("data-ready", "1");
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-faq]");
      if (!b) return;
      var item = b.parentNode, open = item.classList.contains("open");
      Array.prototype.forEach.call(list.querySelectorAll(".faq-item"), function (it) {
        it.classList.remove("open");
        it.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!open) { item.classList.add("open"); b.setAttribute("aria-expanded", "true"); }
    });
  }

  /* ------------------------- about ------------------------- */
  function aboutView() {
    function card(icon, title, body) {
      return '<div class="about-card"><span class="about-ic">' + icon + "</span><h3>" + title + "</h3><p>" + body + "</p></div>";
    }
    return '<div class="page about"><div class="page-head"><p class="eyebrow">About Us</p>' +
      "<h1>The E-Attendance Platform by Multidigital Service Limited.</h1>" +
      '<p class="dateline">A purpose-built internal system for accurate, transparent daily attendance.</p></div>' +

      '<section class="about-hero"><div><h2>What the system is</h2>' +
      "<p>The E-Attendance Platform is Multidigital Service Limited's internal system for capturing, storing and reviewing staff attendance. " +
      "Every member of staff records a morning resumption time and an evening closing time, and each entry is time-stamped and locked the moment it is submitted.</p>" +
      "<p>It gives the organisation one trusted source of truth for who resumed, when they resumed and when they closed — across every department.</p></div>" +
      '<div class="about-stats"><div><span>Daily windows</span><b>2</b></div><div><span>Records editable</span><b>No</b></div>' +
      "<div><span>Departments covered</span><b>" + DEPARTMENTS.length + "</b></div></div></section>" +

      '<section class="section"><div class="section-head"><h2>What it does</h2></div><div class="about-grid">' +
      card(ICON.clock, "Two-window logging", "Staff submit resumption and closing times from any device, with the exact time captured automatically.") +
      card(ICON.shield, "Tamper-proof records", "Submitted entries are locked and cannot be edited or resubmitted, keeping the register credible.") +
      card(ICON.users, "Departmental visibility", "Administrators can search and filter attendance by staff, department, employment type and date.") +
      card(ICON.activity, "Live overview", "Leadership sees presence and punctuality as the day unfolds instead of waiting for month-end reports.") +
      "</div></section>" +

      '<section class="section"><div class="section-head"><h2>The problem it solves</h2></div>' +
      '<div class="about-split"><div class="about-panel"><h3>Before</h3><ul>' +
      "<li>Paper registers and scattered spreadsheets</li><li>Times written in after the fact</li>" +
      "<li>No reliable history for payroll or reviews</li><li>Manual collation at the end of every month</li></ul></div>" +
      '<div class="about-panel accent"><h3>With E-Attendance</h3><ul>' +
      "<li>One digital register for the whole company</li><li>Time-stamped, final submissions</li>" +
      "<li>Instant history per staff member</li><li>Reports ready the moment they are needed</li></ul></div></div></section>" +

      '<section class="section"><div class="section-head"><h2>Our purpose</h2></div>' +
      '<p class="about-purpose">We built this platform to make attendance effortless for staff and dependable for management — accurate records, fair reporting, and a culture of punctuality that runs on trust rather than paperwork.</p></section>' +

      '<section class="creator"><p class="creator-kicker">Created by</p><div class="creator-grid">' +
      creatorCard("Oladapo Salami", "Computer Science Intern, University of Lagos") +
      creatorCard("Victor Utoo", "Computer Engineering Intern, Afe Babalola University") +
      "</div></section>" +
      "</div>";
  }
  function creatorCard(name, role) {
    return '<div class="creator-card"><span class="creator-ic">' + ICON.cap + "</span>" +
      '<div><p class="creator-name">' + esc(name) + '</p>' +
      '<p class="creator-role">' + esc(role) + "</p></div></div>";
  }


  /* ------------------------- profile picture helpers ------------------------- */
  var AVATAR_BUCKET = "avatars";
  var AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
  var AVATAR_MAX_BYTES = 2 * 1024 * 1024;

  /* Renders the staff avatar: the uploaded picture when present, initials
     otherwise. Used everywhere an avatar appears so a new upload shows up
     consistently across the platform. */
  function avatarHtml(u, extraClass) {
    var cls = "avatar" + (extraClass ? " " + extraClass : "");
    if (u.avatarUrl) {
      return '<span class="' + cls + ' avatar-photo"><img src="' + esc(u.avatarUrl) +
        '" alt="' + esc(u.fullName) + '" /></span>';
    }
    return '<div class="' + cls + '">' + esc(initials(u.fullName)) + "</div>";
  }

  function validateAvatar(file) {
    if (!file) return "Choose an image to upload.";
    if (AVATAR_TYPES.indexOf(file.type) === -1) return "Use a JPG, PNG or WebP image.";
    if (file.size > AVATAR_MAX_BYTES) return "Image must be 2MB or smaller.";
    return "";
  }

  /* ------------------------- settings ------------------------- */
  function readonlyField(name, label, value, full) {
    return '<div class="field field-locked' + (full ? " full" : "") + '"><label for="r-' + name + '">' + label + "</label>" +
      '<input id="r-' + name + '" type="text" value="' + esc(value || "—") + '" readonly tabindex="-1" />' +
      '<span class="error"></span></div>';
  }

  function settingsView(u) {
    var joined = u.createdAt ? prettyDate(String(u.createdAt).slice(0, 10)) : "—";
    return '<div class="page"><div class="page-head"><p class="eyebrow">Account</p><h1>Profile &amp; Settings</h1>' +
      '<p class="dateline">Update your details, profile picture and password. Attendance records are not affected.</p></div>' +

      '<div class="layout"><div>' +

      '<section class="section"><div class="section-head"><h2>My Profile</h2><span>Editable details</span></div>' +
      '<div class="photo-row">' + avatarHtml(u, "avatar-xl") +
      '<div class="photo-copy"><h3>Profile picture</h3>' +
      '<p>JPG, PNG or WebP · up to 2MB. Shown on your dashboard and staff profile.</p>' +
      '<div class="photo-actions">' +
      '<input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" hidden />' +
      '<button class="btn btn-ghost btn-sm" type="button" id="avatarPick">' + ICON.camera +
      "<span>" + (u.avatarUrl ? "Change picture" : "Upload picture") + "</span></button>" +
      '<button class="btn btn-primary btn-sm" type="button" id="avatarSave" hidden>Save picture</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" id="avatarCancel" hidden>Cancel</button>' +
      (u.avatarUrl ? '<button class="btn btn-ghost btn-sm" type="button" id="avatarRemove">Remove</button>' : "") +
      '</div><span class="error" id="avatarError"></span></div></div>' +

      '<form id="profileForm" novalidate><div class="form-grid">' +
      field("fullName", "Full Name", "text", "Adaeze Okonkwo") +
      field("phone", "Phone Number", "tel", "+234 800 000 0000") +
      field("position", "Position / Role", "text", POSITIONS_HINT, true) +
      '</div><div class="form-foot form-foot-inline">' +
      '<button class="btn btn-primary" type="submit"><span>Save changes</span></button>' +
      '<button class="btn btn-ghost" type="button" id="profileReset">Discard</button>' +
      "</div></form></section>" +

      '<section class="section"><div class="section-head"><h2>Password &amp; Security</h2><span>Minimum 8 characters</span></div>' +
      '<form id="passwordForm" novalidate><div class="form-grid">' +
      passwordField("currentPassword", "Current Password", "Your current password", { full: true }) +
      passwordField("newPassword", "New Password", "Minimum 8 characters", { strength: true }) +
      passwordField("confirmNewPassword", "Confirm New Password", "Re-enter new password") +
      '</div><div class="form-foot form-foot-inline">' +
      '<button class="btn btn-dark" type="submit"><span>Update password</span></button>' +
      "</div></form></section>" +

      "</div>" +

      '<aside><div class="panel"><div class="panel-head">' + ICON.userCard + 'Account Record</div><div class="panel-body">' +
      '<p class="dateline" style="margin-bottom:16px">These details are maintained by the administration team and cannot be edited here.</p>' +
      '<div class="form-grid form-grid-single">' +
      readonlyField("staffId", "Staff ID", u.staffId) +
      readonlyField("email", "Email Address", u.email) +
      readonlyField("department", "Department", u.department) +
      readonlyField("employmentType", "Employment Type", u.employmentType) +
      readonlyField("role", "Account Role", u.role === "admin" ? "Administrator" : "Staff") +
      readonlyField("joined", "Registered On", joined) +
      "</div></div></div></aside></div></div>";
  }

  function bindSettings() {
    var u = session();
    if (!u) return;

    /* ---- profile picture ---- */
    var input = el("avatarInput"), pick = el("avatarPick"), save = el("avatarSave"),
        cancel = el("avatarCancel"), remove = el("avatarRemove"), errBox = el("avatarError");
    var preview = document.querySelector(".photo-row .avatar");
    var pending = null, previousHtml = preview ? preview.outerHTML : "";

    function resetPhoto() {
      pending = null;
      if (input) input.value = "";
      errBox.textContent = "";
      save.hidden = true; cancel.hidden = true;
      if (remove) remove.hidden = false;
      var current = document.querySelector(".photo-row .avatar");
      if (current && previousHtml) current.outerHTML = previousHtml;
    }

    if (pick) pick.addEventListener("click", function () { input.click(); });
    if (cancel) cancel.addEventListener("click", resetPhoto);

    if (input) input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      var msg = validateAvatar(file);
      if (msg) { errBox.textContent = msg; input.value = ""; return; }
      errBox.textContent = "";
      pending = file;
      var reader = new FileReader();
      reader.onload = function () {
        var current = document.querySelector(".photo-row .avatar");
        if (current) {
          current.outerHTML = '<span class="avatar avatar-xl avatar-photo"><img src="' +
            reader.result + '" alt="Selected profile picture" /></span>';
        }
      };
      reader.readAsDataURL(file);
      save.hidden = false; cancel.hidden = false;
      if (remove) remove.hidden = true;
    });

    if (save) save.addEventListener("click", async function () {
      if (!pending) return;
      var msg = validateAvatar(pending);
      if (msg) { errBox.textContent = msg; return; }
      setBtnLoading(save, true);
      var ext = pending.type === "image/png" ? "png" : (pending.type === "image/webp" ? "webp" : "jpg");
      var path = u.id + "/avatar-" + Date.now() + "." + ext;
      var up = await supabaseClient.storage.from(AVATAR_BUCKET)
        .upload(path, pending, { upsert: true, contentType: pending.type });
      if (up.error) {
        setBtnLoading(save, false);
        errBox.textContent = up.error.message;
        toast("Profile picture could not be uploaded.", "error");
        return;
      }
      var pub = supabaseClient.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      var url = pub.data.publicUrl;
      var res = await supabaseClient.from("profiles").update({ avatar_url: url }).eq("id", u.id);
      if (res.error) {
        setBtnLoading(save, false);
        errBox.textContent = res.error.message;
        toast("Profile picture could not be saved.", "error");
        return;
      }
      await refreshData();
      await refreshSessionUser();
      toast("Profile picture updated.");
      render();
    });

    if (remove) remove.addEventListener("click", function () {
      confirmDialog("Remove profile picture", "Your picture will be removed and your initials shown instead.", async function () {
        setBtnLoading(remove, true);
        var res = await supabaseClient.from("profiles").update({ avatar_url: null }).eq("id", u.id);
        if (res.error) {
          setBtnLoading(remove, false);
          toast(res.error.message, "error");
          return;
        }
        await refreshData();
        await refreshSessionUser();
        toast("Profile picture removed.");
        render();
      });
    });

    /* ---- profile details ---- */
    var pf = el("profileForm");
    if (pf) {
      function fillProfile() {
        pf.querySelector('[name="fullName"]').value = u.fullName || "";
        pf.querySelector('[name="phone"]').value = u.phone || "";
        pf.querySelector('[name="position"]').value = u.position || "";
        Array.prototype.forEach.call(pf.querySelectorAll(".field"), function (f) {
          f.classList.remove("invalid");
          var e = f.querySelector(".error"); if (e) e.textContent = "";
        });
      }
      fillProfile();
      el("profileReset").addEventListener("click", function () {
        fillProfile();
        toast("Changes discarded.");
      });

      pf.addEventListener("submit", async function (e) {
        e.preventDefault();
        var v = readForm(pf, {
          fullName: function (x) { return x.length >= 3 ? "" : "Enter your full name."; },
          phone: function (x) { return !x || /^[0-9+()\s-]{7,20}$/.test(x) ? "" : "Enter a valid phone number."; },
          position: req("Position")
        });
        if (!v) { toast("Please correct the highlighted fields.", "error"); return; }

        var btn = pf.querySelector('button[type="submit"]');
        setBtnLoading(btn, true);
        var res = await supabaseClient.from("profiles").update({
          full_name: v.fullName, phone: v.phone || null, position: v.position
        }).eq("id", u.id);
        if (res.error) {
          setBtnLoading(btn, false);
          toast(res.error.message, "error");
          return;
        }
        await refreshData();
        await refreshSessionUser();
        toast("Profile updated successfully.");
        render();
      });
    }

    /* ---- password ---- */
    var qf = el("passwordForm");
    if (qf) qf.addEventListener("submit", async function (e) {
      e.preventDefault();
      var v = readForm(qf, {
        currentPassword: req("Current password"),
        newPassword: function (x, all) {
          if (x.length < 8) return "Password must be at least 8 characters.";
          if (x === all.currentPassword) return "Choose a password different from your current one.";
          return "";
        },
        confirmNewPassword: function (x, all) { return x && x === all.newPassword ? "" : "Passwords do not match."; }
      });
      if (!v) { toast("Please correct the highlighted fields.", "error"); return; }

      var btn = qf.querySelector('button[type="submit"]');
      setBtnLoading(btn, true);

      /* Verify the current password before changing it. */
      var check = await supabaseClient.auth.signInWithPassword({ email: u.email, password: v.currentPassword });
      if (check.error) {
        setBtnLoading(btn, false);
        var wrap = qf.querySelector('[name="currentPassword"]').closest(".field");
        wrap.classList.add("invalid");
        wrap.querySelector(".error").textContent = "Current password is incorrect.";
        toast("Current password is incorrect.", "error");
        return;
      }

      var upd = await supabaseClient.auth.updateUser({ password: v.newPassword });
      if (upd.error) {
        setBtnLoading(btn, false);
        toast(upd.error.message, "error");
        return;
      }
      qf.reset();
      setBtnLoading(btn, false);
      toast("Password updated successfully.");
    });
  }

  /* ------------------------- router ------------------------- */
  function render() {
    var u = session();
    var hash = location.hash || (u ? "#/dashboard" : "#/login");
    var view = el("view");

    if (PAGE === "about") { view.innerHTML = aboutView(); renderChrome(); return; }
    if (hash === "#/about") { location.replace("about.html"); return; }

    if (!u) {
      if (hash === "#/signup") view.innerHTML = signupView();
      else if (hash === "#/forgot") view.innerHTML = forgotView();
      else { if (hash !== "#/login") { location.hash = "#/login"; } view.innerHTML = loginView(); }
      renderChrome(); bindAuth(); window.scrollTo(0, 0); return;
    }

    if (hash === "#/admin" || hash === "#/admin/attendance") {
      if (u.role !== "admin") { location.hash = "#/dashboard"; return; }
      view.innerHTML = hash === "#/admin" ? adminOverview() : adminManagement();
    } else if (hash === "#/history") {
      view.innerHTML = historyView(u);
    } else if (hash === "#/settings") {
      view.innerHTML = settingsView(u);
      renderChrome(); bindAuth(); bindSettings(); window.scrollTo(0, 0); return;
    } else {
      if (hash !== "#/dashboard") { location.hash = "#/dashboard"; return; }
      view.innerHTML = dashboardView(u);
    }
    renderChrome(); bindApp(); window.scrollTo(0, 0);
  }

  function bindApp() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-att]"), function (b) {
      b.addEventListener("click", function () { submitAttendance(b.getAttribute("data-att")); });
    });
    var f = el("filterForm");
    if (f) {
      f.addEventListener("input", function (e) {
        var n = e.target.name;
        if (n === "q") { filters.q = e.target.value; }
        else if (n === "dept") filters.dept = e.target.value;
        else if (n === "type") filters.type = e.target.value;
        else if (n === "date") filters.date = e.target.value;
        var focus = e.target.name, pos = e.target.selectionStart;
        render();
        var again = document.querySelector('#filterForm [name="' + focus + '"]');
        if (again) { again.focus(); if (again.setSelectionRange && again.type === "text") again.setSelectionRange(pos, pos); }
      });
      el("resetFilters").addEventListener("click", function () {
        filters = { q: "", dept: "", type: "", date: "" }; render();
      });
    }
  }

  function bindAuth() {
    /* password visibility toggles */
    Array.prototype.forEach.call(document.querySelectorAll(".pw-toggle"), function (btn) {
      btn.addEventListener("click", function () {
        var input = btn.previousElementSibling;
        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.innerHTML = showing ? ICON.eye : ICON.eyeOff;
        btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        btn.setAttribute("aria-pressed", showing ? "false" : "true");
      });
    });

    /* password strength indicator */
    Array.prototype.forEach.call(document.querySelectorAll("[data-pw-strength]"), function (meter) {
      var wrap = meter.closest(".field");
      var input = wrap.querySelector("input");
      var label = meter.querySelector(".pw-strength-label");
      input.addEventListener("input", function () {
        var val = input.value;
        if (!val) { meter.hidden = true; meter.className = "pw-strength"; label.textContent = ""; return; }
        var score = 0;
        if (val.length >= 8) score++;
        if (val.length >= 12) score++;
        if (/[a-z]/.test(val)) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        var level, text;
        if (score <= 2) { level = "weak"; text = "Weak"; }
        else if (score <= 3) { level = "medium"; text = "Medium"; }
        else if (score <= 5) { level = "strong"; text = "Strong"; }
        else { level = "very-strong"; text = "Very Strong"; }
        meter.hidden = false;
        meter.className = "pw-strength pw-strength-" + level;
        label.textContent = text;
      });
    });

    var s = el("signupForm");
    if (s) s.addEventListener("submit", async function (e) {
      e.preventDefault();
      var v = readForm(s, {
        fullName: function (x) { return x.length >= 3 ? "" : "Enter your full name."; },
        staffId: function (x) { return x ? "" : "Staff ID is required."; },
        email: function (x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) ? "" : "Enter a valid email address."; },
        employmentType: req("Employment type"),
        department: req("Department"),
        position: req("Position"),
        password: function (x) { return x.length >= 8 ? "" : "Password must be at least 8 characters."; },
        confirmPassword: function (x, all) { return x === all.password && x ? "" : "Passwords do not match."; }
      });
      if (!v) { toast("Please correct the highlighted fields.", "error"); return; }
      if (db.users.some(function (u) { return u.email.toLowerCase() === v.email.toLowerCase() || u.staffId.toLowerCase() === v.staffId.toLowerCase(); })) {
        toast("An account with that email or staff ID already exists.", "error"); return;
      }

      var submitBtn = s.querySelector('button[type="submit"]');
      setBtnLoading(submitBtn, true);

      var signUpRes = await supabaseClient.auth.signUp({ email: v.email, password: v.password });
      if (signUpRes.error) {
        toast(signUpRes.error.message, "error");
        setBtnLoading(submitBtn, false);
        return;
      }
      var newAuthUser = signUpRes.data.user;
      if (!newAuthUser) {
        toast("Something went wrong creating your account. Please try again.", "error");
        setBtnLoading(submitBtn, false);
        return;
      }

      var profileRes = await supabaseClient.from("profiles").insert({
        id: newAuthUser.id, full_name: v.fullName, staff_id: v.staffId, email: v.email,
        employment_type: v.employmentType, department: v.department, position: v.position,
        role: "staff"
      });
      if (profileRes.error) {
        toast(profileRes.error.message, "error");
        setBtnLoading(submitBtn, false);
        return;
      }

      // If the Supabase project requires email confirmation, signUp won't
      // return an active session yet — send the person to sign in instead.
      if (!signUpRes.data.session) {
        toast("Account created. Check your email to confirm it, then sign in.");
        location.hash = "#/login"; render();
        return;
      }

      await refreshData();
      authUser = newAuthUser;
      currentUser = db.users.find(function (u) { return u.id === newAuthUser.id; }) || null;
      toast("Account created. Welcome to Multidigital Service Limited.");
      location.hash = "#/dashboard"; render();
    });

    var l = el("loginForm");
    if (l) l.addEventListener("submit", async function (e) {
      e.preventDefault();
      var v = readForm(l, { identifier: req("Email or staff ID"), password: req("Password") });
      if (!v) return;

      var submitBtn = l.querySelector('button[type="submit"]');
      setBtnLoading(submitBtn, true);

      var email = v.identifier;
      if (email.indexOf("@") === -1) {
        var lookup = await supabaseClient.from("profiles").select("email").ilike("staff_id", v.identifier).maybeSingle();
        if (lookup.error || !lookup.data) {
          toast("Invalid credentials. Please try again.", "error");
          setBtnLoading(submitBtn, false);
          return;
        }
        email = lookup.data.email;
      }

      var signInRes = await supabaseClient.auth.signInWithPassword({ email: email, password: v.password });
      if (signInRes.error || !signInRes.data.user) {
        toast("Invalid credentials. Please try again.", "error");
        setBtnLoading(submitBtn, false);
        return;
      }

      authUser = signInRes.data.user;
      await refreshData();
      currentUser = db.users.find(function (u) { return u.id === authUser.id; }) || null;
      if (!currentUser) {
        toast("No staff profile is linked to this account.", "error");
        setBtnLoading(submitBtn, false);
        return;
      }
      toast("Signed in as " + currentUser.fullName + ".");
      location.hash = currentUser.role === "admin" ? "#/admin" : "#/dashboard";
      render();
    });

    var fg = el("forgotForm");
    if (fg) fg.addEventListener("submit", async function (e) {
      e.preventDefault();
      var v = readForm(fg, { email: function (x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) ? "" : "Enter a valid email address."; } });
      if (!v) return;
      var submitBtn = fg.querySelector('button[type="submit"]');
      setBtnLoading(submitBtn, true);
      await supabaseClient.auth.resetPasswordForEmail(v.email);
      setBtnLoading(submitBtn, false);
      toast("If that address is registered, reset instructions have been sent.");
      fg.reset();
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-scroll]");
    if (!b) return;
    var t = el(b.getAttribute("data-scroll"));
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function loadingView() {
    return '<div class="page-loader"><span class="spinner spinner-lg" aria-hidden="true"></span>' +
      "<p>Loading your attendance data&hellip;</p></div>";
  }

  async function init() {
    el("view").innerHTML = loadingView();
    await refreshData();
    if (dataError) {
      toast("Could not reach the database: " + dataError, "error");
    }
    await refreshSessionUser();
    render();
  }

  supabaseClient.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT") { authUser = null; currentUser = null; }
  });

  if (PAGE === "app") window.addEventListener("hashchange", render);
  setInterval(function () { if (session()) renderChrome(); }, 30000);
  init();
})();
