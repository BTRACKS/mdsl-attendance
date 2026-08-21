/* Multidigital Service Limited — Attendance Platform
   Standalone front-end app. Data persists in the browser (localStorage). */
(function () {
  "use strict";

  /* ------------------------- storage ------------------------- */
  var DB_KEY = "multidigital.attendance.v1";
  var SESSION_KEY = "multidigital.session.v1";

  var DEPARTMENTS = ["Media & Broadcast", "Technology", "Marketing", "Creative & Design", "Operations", "Finance", "Human Resources", "Sales"];
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
    userCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.4"/><path d="M4.5 17c.6-1.7 2-2.6 3.5-2.6s2.9.9 3.5 2.6"/><line x1="14" y1="9" x2="19" y2="9"/><line x1="14" y1="13" x2="19" y2="13"/></svg>'
  };
  var NAV_ICON = { "Overview": ICON.grid, "Attendance Management": ICON.list, "My Dashboard": ICON.grid, "Dashboard": ICON.grid, "Attendance History": ICON.clock };

  function load() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || seed(); }
    catch (e) { return seed(); }
  }
  function save(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  function seed() {
    var db = {
      users: [{
        id: "u-admin", fullName: "Adaeze Okonkwo", staffId: "MD-0001",
        email: "admin@multidigital.com", employmentType: "Staff",
        department: "Human Resources", position: "Head of People Operations",
        password: "Admin123!", role: "admin", createdAt: Date.now()
      }],
      attendance: []
    };
    var demo = [
      ["Tobi Alade", "MD-0102", "tobi@multidigital.com", "Staff", "Technology", "Frontend Engineer"],
      ["Ngozi Eze", "MD-0118", "ngozi@multidigital.com", "Staff", "Media & Broadcast", "Producer"],
      ["Yusuf Bello", "MD-0143", "yusuf@multidigital.com", "Intern", "Creative & Design", "Design Intern"],
      ["Chidera Nwosu", "MD-0150", "chidera@multidigital.com", "Staff", "Marketing", "Brand Strategist"]
    ];
    demo.forEach(function (d, i) {
      db.users.push({
        id: "u-" + (i + 2), fullName: d[0], staffId: d[1], email: d[2],
        employmentType: d[3], department: d[4], position: d[5],
        password: "Password1!", role: "staff", createdAt: Date.now()
      });
    });
    // a few historical records
    for (var back = 1; back <= 4; back++) {
      var d = new Date(); d.setDate(d.getDate() - back);
      var key = dateKey(d);
      db.users.slice(1).forEach(function (u, idx) {
        if (back === 2 && idx === 2) return; // one missing day
        db.attendance.push({
          userId: u.id, date: key,
          morning: { time: "08:" + pad(2 + idx * 3) + " AM", at: d.getTime() },
          evening: back === 1 && idx === 1 ? null : { time: "5:" + pad(1 + idx * 4) + " PM", at: d.getTime() }
        });
      });
    }
    save(db);
    return db;
  }

  var db = load();

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

  function session() {
    try { var id = localStorage.getItem(SESSION_KEY); return db.users.find(function (u) { return u.id === id; }) || null; }
    catch (e) { return null; }
  }
  function setSession(u) { u ? localStorage.setItem(SESSION_KEY, u.id) : localStorage.removeItem(SESSION_KEY); }

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
    var head = el("masthead"), foot = el("footer");
    head.hidden = !u; foot.hidden = !u;
    if (!u) return;

    var links = u.role === "admin"
      ? [["#/admin", "Overview"], ["#/admin/attendance", "Attendance Management"], ["#/dashboard", "My Dashboard"]]
      : [["#/dashboard", "Dashboard"], ["#/history", "Attendance History"]];
    var hash = location.hash || "#/dashboard";
    el("nav").innerHTML = links.map(function (l) {
      return '<a href="' + l[0] + '" class="' + (hash === l[0] ? "active" : "") + '">' + (NAV_ICON[l[1]] || "") + '<span>' + l[1] + "</span></a>";
    }).join("");
    el("nav").classList.remove("open");

    var now = new Date();
    el("year").textContent = now.getFullYear();
  }

  el("logoutBtn").addEventListener("click", function () {
    setSession(null); location.hash = "#/login"; toast("You have been signed out."); render();
  });
  el("menuToggle").addEventListener("click", function (e) {
    e.stopPropagation();
    el("nav").classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    var nav = el("nav");
    if (!nav.classList.contains("open")) return;
    if (nav.contains(e.target) || el("menuToggle").contains(e.target)) return;
    nav.classList.remove("open");
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
      field("email", "Email Address", "email", "name@multidigital.com", true) +
      selectField("employmentType", "Employment Type", ["Intern", "Staff"]) +
      selectField("department", "Department", DEPARTMENTS) +
      field("position", "Position / Role", "text", POSITIONS_HINT) +
      field("password", "Password", "password", "Minimum 8 characters") +
      field("confirmPassword", "Confirm Password", "password", "Re-enter password") +
      '</div><div class="form-foot">' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">Create account</button>' +
      '<p class="form-alt">Already registered? <a href="#/login">Sign in instead</a></p>' +
      "</div></form></div></div></div>";
  }

  function loginView() {
    return '<div class="auth">' + aside("The Multidigital Service Limited<br><span>attendance record.</span>",
      "Sign in to submit your morning resumption and evening closing times, and to review your attendance history.") +
      '<div class="auth-main"><div class="auth-card">' +
      '<p class="eyebrow">Staff Sign In</p><h1>Welcome back</h1>' +
      '<p class="auth-sub">Use your registered email address or staff ID.</p>' +
      '<form id="loginForm" novalidate><div class="form-grid">' +
      field("identifier", "Email or Staff ID", "text", "name@multidigital.com", true) +
      field("password", "Password", "password", "Your password", true) +
      '</div><div class="form-foot">' +
      '<div class="inline-between"><a class="link-muted" href="#/forgot">Forgot password?</a>' +
      '<a class="link-muted" href="#/signup">Create an account</a></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit">Log in</button>' +
      "</div></form>" +
      '<div class="hint"><b>Demo access</b> — Administrator: admin@multidigital.com / Admin123! · Staff: MD-0102 / Password1!</div>' +
      "</div></div></div>";
  }

  function forgotView() {
    return '<div class="auth">' + aside("Password<br><span>recovery.</span>",
      "Enter the email address linked to your Multidigital Service Limited staff profile and we will send reset instructions.") +
      '<div class="auth-main"><div class="auth-card">' +
      '<p class="eyebrow">Account Recovery</p><h1>Forgot password</h1>' +
      '<p class="auth-sub">Reset instructions are sent to your registered work email.</p>' +
      '<form id="forgotForm" novalidate><div class="form-grid">' +
      field("email", "Email Address", "email", "name@multidigital.com", true) +
      '</div><div class="form-foot"><button class="btn btn-dark btn-lg btn-block" type="submit">Send reset link</button>' +
      '<p class="form-alt"><a href="#/login">Back to sign in</a></p></div></form></div></div></div>';
  }

  function aside(headline, lede) {
    return '<div class="auth-aside"><a class="brand brand-lg" href="#/login">' +
      '<img class="brand-logo" src="logo-mark.png" alt="Multidigital Service Limited" />' +
      '<span class="brand-text">Multidigital Service Limited<em>Attendance Platform</em></span></a>' +
      '<div><h2 class="auth-headline">' + headline + "</h2>" +
      '<p class="auth-lede">' + esc(lede) + "</p></div>" +
      '<div class="auth-stats"><div><span>Staff on record</span><b>' + db.users.filter(function (u) { return u.role !== "admin"; }).length +
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

  /* ---------- staff dashboard ---------- */
  function dashboardView(u) {
    var now = new Date(), key = dateKey(now);
    var rec = record(u.id, key);
    var m = rec && rec.morning, e = rec && rec.evening;

    return '<div class="page"><div class="page-head"><p class="eyebrow">Staff Dashboard</p>' +
      "<h1>" + esc(u.fullName.split(" ")[0]) + ", here is your day.</h1>" +
      '<p class="dateline">' + longDate(now) + " · " + esc(u.department) + " · Staff ID " + esc(u.staffId) + "</p></div>" +
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
      '<div class="identity"><div class="avatar">' + esc(initials(u.fullName)) + "</div>" +
      "<div><h3>" + esc(u.fullName) + "</h3><p>" + esc(u.position) + "</p></div></div>" +
      '<dl class="dl">' +
      row("Staff ID", u.staffId) + row("Employment Type", u.employmentType) +
      row("Department", u.department) + row("Position", u.position) + row("Email", u.email) +
      "</dl></div></div>" +
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
    return '<div class="stat' + (tone ? " " + tone : "") + '"><div class="stat-top"><span>' + label + '</span>' +
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
    if (!rec) { rec = { userId: u.id, date: key, morning: null, evening: null }; db.attendance.push(rec); }
    if (rec[kind]) { toast("This attendance is locked and cannot be changed.", "error"); return; }
    if (kind === "evening" && !rec.morning) { toast("Submit your morning resumption first.", "error"); return; }

    var time = clockTime(now);
    var isMorning = kind === "morning";
    confirmDialog(
      isMorning ? "Confirm Attendance" : "Confirm Closing Time",
      (isMorning
        ? "Please review your resumption time before submitting. Once submitted, this attendance cannot be changed."
        : "Please review your closing time before submitting. Once submitted, this attendance cannot be changed.") +
      "  Recorded time: " + time + ".",
      function () {
        rec[kind] = { time: time, at: Date.now() };
        save(db);
        toast(isMorning ? "Morning attendance submitted successfully." : "Evening attendance submitted successfully.");
        render();
      }
    );
  }

  /* ------------------------- router ------------------------- */
  function render() {
    db = load();
    var u = session();
    var hash = location.hash || (u ? "#/dashboard" : "#/login");
    var view = el("view");

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
    var s = el("signupForm");
    if (s) s.addEventListener("submit", function (e) {
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
      var user = {
        id: "u-" + Date.now(), fullName: v.fullName, staffId: v.staffId, email: v.email,
        employmentType: v.employmentType, department: v.department, position: v.position,
        password: v.password, role: "staff", createdAt: Date.now()
      };
      db.users.push(user); save(db); setSession(user);
      toast("Account created. Welcome to Multidigital Service Limited.");
      location.hash = "#/dashboard"; render();
    });

    var l = el("loginForm");
    if (l) l.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = readForm(l, { identifier: req("Email or staff ID"), password: req("Password") });
      if (!v) return;
      var id = v.identifier.toLowerCase();
      var user = db.users.find(function (u) { return u.email.toLowerCase() === id || u.staffId.toLowerCase() === id; });
      if (!user || user.password !== v.password) { toast("Invalid credentials. Please try again.", "error"); return; }
      setSession(user);
      toast("Signed in as " + user.fullName + ".");
      location.hash = user.role === "admin" ? "#/admin" : "#/dashboard";
      render();
    });

    var fg = el("forgotForm");
    if (fg) fg.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = readForm(fg, { email: function (x) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) ? "" : "Enter a valid email address."; } });
      if (!v) return;
      toast("If that address is registered, reset instructions have been sent.");
      fg.reset();
    });
  }

  window.addEventListener("hashchange", render);
  setInterval(function () { if (session()) renderChrome(); }, 30000);
  render();
})();
