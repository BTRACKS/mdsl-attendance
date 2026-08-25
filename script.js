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
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 16 9"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
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
    sunriseTabler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M5.6 7.6 7 9"/><path d="M18.4 7.6 17 9"/><path d="M3 17h3"/><path d="M18 17h3"/><path d="M8 17a4 4 0 0 1 8 0"/><path d="M2 21h20"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
  };
  /* Dashboard and Attendance History no longer show a leading icon in the nav. */
  var NAV_ICON = {};

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
  var db = { users: [], attendance: [], leaves: [], staffCount: null, hse: [], hseSettings: null };
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
  function mapLeave(r) {
    return {
      id: r.id, userId: r.staff_id || r.user_id, leaveType: r.leave_type || "",
      startDate: r.start_date, endDate: r.end_date, reason: r.reason || "",
      status: r.status || "active", createdAt: r.created_at, updatedAt: r.updated_at
    };
  }
  function leaveForDate(userId, key) {
    return (db.leaves || []).find(function (l) {
      return String(l.userId) === String(userId) &&
        l.status !== "cancelled" &&
        l.startDate <= key && key <= l.endDate;
    }) || null;
  }
  function leaveStatusText(userId, key) {
    var l = leaveForDate(userId, key);
    return l ? "Leave" : null;
  }
  function leaveTypeLabel(v) { return String(v || "").replace(/_/g, " ").replace(/\b\w/g, function(c){return c.toUpperCase();}); }

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
      var leaveRes = await supabaseClient.from("staff_leave").select("*").order("start_date", { ascending: false });
      db.leaves = leaveRes.error ? [] : (leaveRes.data || []).map(mapLeave);

      // HSE module data. Errors here are non-fatal so the core attendance
      // system keeps working even before the HSE tables are created.
      var hseRes = await supabaseClient.from("hse_attendance").select("*");
      db.hse = (hseRes.error ? [] : (hseRes.data || [])).map(mapHse);
      var hseSetRes = await supabaseClient.from("hse_settings").select("*").limit(1);
      db.hseSettings = (!hseSetRes.error && hseSetRes.data && hseSetRes.data[0]) ? hseSetRes.data[0] : null;

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

  /* =========================================================================
     WORKING-DAY / PUBLIC HOLIDAY MODULE
     Normal staff attendance is Monday–Friday only, and any Nigerian public
     holiday that falls on a weekday is treated as a non-working day.
     To update the calendar, simply edit NIGERIA_HOLIDAYS below (keys are
     "YYYY-MM-DD", values are the holiday name). Islamic holidays are moon
     sighting dependent, so confirm and adjust them each year.
     ========================================================================= */
  var NIGERIA_HOLIDAYS = {
    /* ---- 2026 ---- */
    "2026-01-01": "New Year's Day",
    "2026-03-20": "Eid-el-Fitr",
    "2026-03-23": "Eid-el-Fitr Holiday",
    "2026-04-03": "Good Friday",
    "2026-04-06": "Easter Monday",
    "2026-05-01": "Workers' Day",
    "2026-05-27": "Eid-el-Kabir",
    "2026-05-28": "Eid-el-Kabir Holiday",
    "2026-06-12": "Democracy Day",
    "2026-08-25": "Eid-el-Maulud",
    "2026-10-01": "Independence Day",
    "2026-12-25": "Christmas Day",
    "2026-12-26": "Boxing Day",
    /* ---- 2027 ---- */
    "2027-01-01": "New Year's Day",
    "2027-03-10": "Eid-el-Fitr",
    "2027-03-11": "Eid-el-Fitr Holiday",
    "2027-03-26": "Good Friday",
    "2027-03-29": "Easter Monday",
    "2027-05-01": "Workers' Day",
    "2027-05-17": "Eid-el-Kabir",
    "2027-05-18": "Eid-el-Kabir Holiday",
    "2027-06-12": "Democracy Day",
    "2027-08-15": "Eid-el-Maulud",
    "2027-10-01": "Independence Day",
    "2027-12-25": "Christmas Day",
    "2027-12-26": "Boxing Day"
  };

  function dateFromKey(key) {
    var p = String(key).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  /* Single source of truth for "is attendance open on this date?".
     Returns { open, kind, title, reason, holiday, dateLabel, weekdayLabel }. */
  function dayStatus(input) {
    var d = input instanceof Date ? input : dateFromKey(input);
    var key = dateKey(d);
    var weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
    var dow = d.getDay();
    if (dow === 0 || dow === 6) {
      return {
        open: false, kind: "weekend", title: "Attendance Unavailable",
        reason: "Weekend", holiday: null, dateLabel: longDate(d), weekdayLabel: weekday,
        note: "Attendance stamping is only available Monday–Friday."
      };
    }
    var name = NIGERIA_HOLIDAYS[key];
    if (name) {
      return {
        open: false, kind: "holiday", title: "Attendance Locked",
        reason: name, holiday: name, dateLabel: longDate(d), weekdayLabel: weekday,
        note: "Attendance stamping is unavailable today because today is a public holiday."
      };
    }
    return {
      open: true, kind: "working", title: "Attendance Open",
      reason: "Working Day", holiday: null, dateLabel: longDate(d), weekdayLabel: weekday, note: ""
    };
  }

  /* Locked-state card shown in place of the attendance blocks. */
  function dayLockCard(st) {
    return '<div class="day-lock ' + st.kind + '">' +
      '<span class="day-lock-icon" aria-hidden="true">' + ICON.lock + "</span>" +
      '<div class="day-lock-body">' +
      '<p class="day-lock-title">' + esc(st.title) + "</p>" +
      '<p class="day-lock-reason">' + esc(st.reason) + "</p>" +
      '<p class="day-lock-date">' + esc(st.dateLabel) + "</p>" +
      '<p class="day-lock-note">' + esc(st.note) + "</p>" +
      "</div></div>";
  }

  function dayStatusTag(st) {
    if (st.kind === "weekend") return '<span class="tag tag-miss">Weekend</span>';
    if (st.kind === "holiday") return '<span class="tag tag-pending">Public Holiday</span>';
    return '<span class="tag tag-ok">Working Day</span>';
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
      await stopMessagingRealtime();
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
  function closeModal() { var mm = el("modal"); mm.hidden = true; mm.classList.remove("message-modal"); el("modalKicker").hidden = false; el("modalConfirm").hidden = false; el("modalCancel").textContent = "Cancel"; pendingConfirm = null; }
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
        ? [["#/admin", "Overview"], ["#/admin/attendance", "Attendance Management"], ["#/admin/hse", "HSE Attendance"], ["#/dashboard", "My Dashboard"], ["#/messages", "Messages"], ["#/settings", "Settings"]]
        : [["#/dashboard", "Dashboard"], ["#/history", "Attendance History"], ["#/leave", "Leave"], ["#/messages", "Messages"], ["#/settings", "Settings"]];

    }
    var hash = PAGE === "about" ? "" : (location.hash || (u ? "#/dashboard" : "#/login"));
    links = links.concat([[ABOUT_URL, "About Us"]]);
    el("nav").innerHTML = links.map(function (l) {
      var href = l[0].charAt(0) === "#" ? HOME + l[0] : l[0];
      var active = l[0].charAt(0) === "#" ? hash === l[0] : PAGE === "about";
      var messageNav = l[1] === "Messages" ? ' data-message-nav="1"' : "";
      var label = l[1] === "Messages" ? '<span data-message-label>Messages</span>' : '<span>' + l[1] + "</span>";
      return '<a href="' + href + '" class="' + (active ? "active" : "") + '"' + messageNav + '>' + (NAV_ICON[l[1]] || "") + label + "</a>";
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
    var leave = leaveForDate(u.id, key);
    var m = rec && rec.morning, e = rec && rec.evening;
    var dayState = dayStatus(now);


    var greeting = greetingInfo(now);
    return '<div class="page"><div class="page-head"><p class="eyebrow">Staff Dashboard</p>' +
      '<h1 class="greeting-line">' +
      '<span class="greeting-salutation">' + esc(greeting.text) + ",</span>" +
      '<span class="greeting-name">' + esc(u.fullName.split(" ")[0]) +
      '<span class="greeting-icon" aria-hidden="true">' + greeting.icon + "</span></span>" +
      "</h1></div>" +
      '<div class="layout"><div>' +

      '<section class="section"><div class="section-head"><h2>Today\'s Attendance</h2><span>' + longDate(now) + " · " + esc(dayState.reason) + "</span></div>" +
      (leave
        ? '<div class="leave-active-banner"><strong>Leave</strong><span>' + esc(leaveTypeLabel(leave.leaveType)) + ' · ' + esc(prettyDate(leave.startDate)) + ' – ' + esc(prettyDate(leave.endDate)) + '</span></div>'
        : !dayState.open
          ? dayLockCard(dayState)
          : '<div class="att-grid">' +
            attBlock("Morning", "Resumption", m, "morning", !!m) +
            attBlock("Evening", "Closing", e, "evening", !!e || !m) +
            "</div>" +
            (!m ? '<p class="dateline" style="margin-top:12px">Closing time unlocks once your morning resumption has been submitted.</p>' : "")) +

      "</section>" +

      hseStaffCard(u) +

      '<section class="section dashboard-leave-card">' +
        '<div class="section-head"><h2>Leave</h2><span>' + (leave ? "Currently on leave" : "Time away") + '</span></div>' +
        (leave
          ? '<div class="dashboard-leave-summary"><div><span>Status</span><strong>Leave</strong></div><div><span>Type</span><strong>' + esc(leaveTypeLabel(leave.leaveType)) + '</strong></div><div><span>Period</span><strong>' + esc(prettyDate(leave.startDate)) + ' – ' + esc(prettyDate(leave.endDate)) + '</strong></div></div>'
          : '<p class="dateline dashboard-leave-empty">You are not currently on leave.</p>') +
        '<div class="dashboard-leave-actions"><a class="btn btn-primary btn-sm" href="#/leave">Manage Leave</a></div>' +
      '</section>' +

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
        ? '<div class="locked-note"><span class="lock-icon" aria-hidden="true">' + ICON.lock + '</span> Locked — cannot be edited or resubmitted</div>'
        : '<button class="btn btn-primary btn-block" data-att="' + kind + '"' + (disabled ? " disabled" : "") + ">Submit " + label.toLowerCase() + " time</button>") +
      "</div>";
  }

  function profilePanel(u) {
    return '<aside><div class="panel"><div class="panel-head">' + ICON.userCard + 'Staff Profile</div><div class="panel-body">' +
      '<div class="identity">' + avatarHtml(u) +
      "<div><h3>" + esc(u.fullName) + "</h3></div></div>" +
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

  /* Compact person row: profile picture + name only (no staff code). */
  function staffRow(u) {
    return '<div class="person-row">' + avatarHtml(u, "avatar-sm") +
      '<span class="person-name">' + esc(u.fullName) + "</span></div>";
  }
  function staffList(list) {
    return '<div class="person-list">' + list.map(staffRow).join("") + "</div>";
  }

  function monthSummary(u) {
    var now = new Date(), prefix = now.getFullYear() + "-" + pad(now.getMonth() + 1);
    var recs = db.attendance.filter(function (a) { return a.userId === u.id && a.date.indexOf(prefix) === 0; });
    var full = recs.filter(function (a) { return a.morning && a.evening; }).length;
    return '<dl class="dl">' + row("Days recorded", recs.length) + row("Complete days", full) +
      row("Awaiting closing", recs.filter(function (a) { return a.morning && !a.evening; }).length) + "</dl>";
  }

  function statusOf(a, userId, key) {
    var leave = userId && key ? leaveForDate(userId, key) : null;
    if (leave) return '<span class="tag tag-leave">Leave</span>';
    if (a && a.morning && a.evening) return '<span class="tag tag-ok">Complete</span>';
    if (a && a.morning) return '<span class="tag tag-pending">Awaiting closing</span>';
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

  var LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Study Leave", "Compassionate Leave", "Other"];

  function leaveHistoryFor(userId) {
    return (db.leaves || []).filter(function(l){ return String(l.userId) === String(userId); })
      .sort(function(a,b){ return String(b.startDate).localeCompare(String(a.startDate)); });
  }

  function leaveView(u) {
    var rows = leaveHistoryFor(u.id);
    var today = dateKey(new Date());
    var active = rows.find(function(l){ return l.status !== "cancelled" && l.startDate <= today && today <= l.endDate; });
    return '<div class="page"><div class="page-head"><p class="eyebrow">Time Away</p><h1>Leave Management</h1>' +
      '<p class="dateline">Activate your own leave period. Future leave will not affect attendance until its start date.</p></div>' +
      (active ? '<section class="section leave-active-card"><div class="section-head"><h2>You are currently on leave</h2><span>Leave</span></div>' +
        '<div class="leave-detail-grid"><div><span>Type</span><strong>' + esc(leaveTypeLabel(active.leaveType)) + '</strong></div><div><span>Start</span><strong>' + esc(prettyDate(active.startDate)) + '</strong></div><div><span>End</span><strong>' + esc(prettyDate(active.endDate)) + '</strong></div></div>' +
        (active.reason ? '<p class="dateline leave-reason">Reason: ' + esc(active.reason) + '</p>' : '') + '</section>' : '') +
      '<section class="section"><div class="section-head"><h2>Activate Leave</h2><span>Staff controlled</span></div>' +
      '<form id="leaveForm" novalidate><div class="form-grid">' +
      '<div class="field"><label for="leaveType">Leave type</label><select id="leaveType" name="leaveType"><option value="">Select leave type</option>' +
      LEAVE_TYPES.map(function(t){return '<option value="'+esc(t)+'">'+esc(t)+'</option>';}).join("") +
      '</select><span class="error"></span></div>' +
      '<div class="field"><label for="leaveStart">Start date</label><input id="leaveStart" name="startDate" type="date" min="'+esc(today)+'" /><span class="error"></span></div>' +
      '<div class="field"><label for="leaveEnd">End date</label><input id="leaveEnd" name="endDate" type="date" /><span class="error"></span></div>' +
      '<div class="field full"><label for="leaveReason">Reason (optional)</label><textarea id="leaveReason" name="reason" rows="4" maxlength="1000" placeholder="Optional reason"></textarea><span class="error"></span></div>' +
      '</div><div class="form-foot"><button class="btn btn-primary" type="submit">Activate leave</button></div></form></section>' +
      '<section class="section"><div class="section-head"><h2>Leave History</h2><span>'+rows.length+' record'+(rows.length===1?'':'s')+'</span></div>' +
      (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr></thead><tbody>' +
        rows.map(function(l){ var activeNow=l.status!=="cancelled"&&l.startDate<=today&&today<=l.endDate; var future=l.status!=="cancelled"&&l.startDate>today; var st=l.status==="cancelled"?"Cancelled":activeNow?"Active":future?"Scheduled":"Completed"; return '<tr><td>'+esc(leaveTypeLabel(l.leaveType))+'</td><td>'+esc(prettyDate(l.startDate))+'</td><td>'+esc(prettyDate(l.endDate))+'</td><td>'+esc(l.reason||"—")+'</td><td>'+esc(st)+'</td></tr>'; }).join("") +
        '</tbody></table></div>' : '<p class="empty">No leave records yet.</p>') +
      '</section></div>';
  }

  async function submitLeave() {
    var u=session(); if(!u) return;
    var form=el("leaveForm"); if(!form) return;
    var v=readForm(form,{leaveType:req("Leave type"),startDate:req("Start date"),endDate:req("End date"),reason:function(){return "";}});
    if(!v) return;
    var today=dateKey(new Date());
    if(v.startDate < today){toast("Leave cannot start in the past.","error");return;}
    if(v.endDate < v.startDate){toast("End date must be on or after the start date.","error");return;}
    var overlap=(db.leaves||[]).some(function(l){return String(l.userId)===String(u.id)&&l.status!=="cancelled"&&v.startDate<=l.endDate&&v.endDate>=l.startDate;});
    if(overlap){toast("These dates overlap an existing leave record.","error");return;}
    var btn=form.querySelector('button[type="submit"]'); setBtnLoading(btn,true); loader(true);
    try{
      var res=await supabaseClient.from("staff_leave").insert({staff_id:u.id,leave_type:v.leaveType,start_date:v.startDate,end_date:v.endDate,reason:v.reason||null,status:"active"});
      if(res.error){toast(res.error.message,"error");return;}
      await refreshData(); toast("Leave activated successfully."); render();
    }finally{setBtnLoading(btn,false);loader(false);}
  }

  function historyView(u) {
    return '<div class="page"><div class="page-head"><p class="eyebrow">Records</p><h1>Attendance History</h1>' +
      '<p class="dateline">Every resumption and closing time recorded under Staff ID ' + esc(u.staffId) + "</p></div>" +
      '<section class="section"><div class="section-head"><h2>All Records</h2><span>Most recent first</span></div>' +
      historyTable(u) + "</section></div>";
  }

  /* ------------------------- attendance export ------------------------- */
  var exportState = { preset: "today", from: "", to: "" };

  var EXPORT_PRESETS = [
    ["today", "Today"], ["week", "This Week"], ["2weeks", "2 Weeks"], ["3weeks", "3 Weeks"],
    ["month", "This Month"], ["year", "This Year"], ["custom", "Custom Date Range"]
  ];

  function startOfWeek(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = (x.getDay() + 6) % 7; /* Monday start */
    x.setDate(x.getDate() - day);
    return x;
  }

  function exportRange() {
    var now = new Date();
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var start;
    switch (exportState.preset) {
      case "today": start = new Date(end); break;
      case "week": start = startOfWeek(now); break;
      case "2weeks": start = startOfWeek(now); start.setDate(start.getDate() - 7); break;
      case "3weeks": start = startOfWeek(now); start.setDate(start.getDate() - 14); break;
      case "month": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case "year": start = new Date(now.getFullYear(), 0, 1); break;
      case "custom":
        if (!exportState.from || !exportState.to) return null;
        return exportState.from <= exportState.to
          ? { from: exportState.from, to: exportState.to }
          : { from: exportState.to, to: exportState.from };
      default: start = new Date(end);
    }
    return { from: dateKey(start), to: dateKey(end) };
  }

  function exportRows() {
    var range = exportRange();
    if (!range) return [];
    var byId = {};
    db.users.forEach(function (u) { byId[u.id] = u; });

    return db.attendance
      .filter(function (a) {
        if (!a.date || a.date < range.from || a.date > range.to) return false;
        var u = byId[a.userId];
        return !!u && u.role !== "admin" && !!(a.morning || a.evening);
      })
      .map(function (a) {
        var u = byId[a.userId];
        return {
          name: u.fullName,
          staffId: u.staffId,
          employmentType: u.employmentType,
          date: a.date,
          signIn: a.morning ? a.morning.time : "",
          signOut: a.evening ? a.evening.time : ""
        };
      })
      .sort(function (x, y) {
        if (x.date !== y.date) return x.date < y.date ? -1 : 1;
        return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1;
      });
  }

  /* CSV date: DD/MM/YYYY */
  function csvDate(key) {
    var p = String(key || "").split("-");
    if (p.length !== 3) return "";
    return pad(+p[2]) + "/" + pad(+p[1]) + "/" + p[0];
  }

  /* CSV time: hh:mm AM/PM (zero padded); blank when not recorded */
  function csvTime(value) {
    if (!value) return "";
    var m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/);
    if (!m) return String(value).trim();
    var h = +m[1], mer = m[3] ? m[3].toUpperCase() : "";
    if (!mer) { mer = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; }
    return pad(h) + ":" + m[2] + " " + mer;
  }

  var EXPORT_HEADERS = ["Name", "Staff ID", "Date",
    "Attendance Resumption (Morning)", "Closing (Evening)", "Employment"];

  function exportMatrix() {
    return exportRows().map(function (r) {
      return [r.name, r.staffId, csvDate(r.date),
        csvTime(r.signIn), csvTime(r.signOut), r.employmentType || ""];
    });
  }

  function csvCell(v) {
    var s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportFileName(ext) {
    var r = exportRange();
    return "attendance_" + (r ? r.from + "_to_" + r.to : "records") + "." + ext;
  }

  function downloadCsv() {
    var r = exportRange();
    if (!r) { toast("Select both start and end dates for the custom range.", "error"); return; }
    var rows = exportMatrix();
    if (!rows.length) { toast("No attendance records in the selected period.", "error"); return; }
    var csv = [EXPORT_HEADERS].concat(rows).map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url; link.download = exportFileName("csv");
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast(rows.length + " attendance record" + (rows.length === 1 ? "" : "s") + " exported.");
  }

  function openInGoogleSheets() {
    var r = exportRange();
    if (!r) { toast("Select both start and end dates for the custom range.", "error"); return; }
    var rows = exportMatrix();
    if (!rows.length) { toast("No attendance records in the selected period.", "error"); return; }
    var tsv = [EXPORT_HEADERS].concat(rows).map(function (row) {
      return row.map(function (c) { return String(c).replace(/[\t\r\n]+/g, " "); }).join("\t");
    }).join("\n");

    function opened() {
      window.open("https://docs.google.com/spreadsheets/create", "_blank", "noopener");
      toast("Data copied. Paste (Ctrl/Cmd + V) into the new Google Sheet.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(opened, function () {
        legacyCopy(tsv); opened();
      });
    } else { legacyCopy(tsv); opened(); }
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (err) { /* ignore */ }
    ta.remove();
  }

  function exportPanel() {
    var r = exportRange();
    var count = exportRows().length;
    return '<div class="export-card" id="exportCard">' +
      '<div class="export-head"><div><p class="export-title">' + ICON.download + 'Attendance Export</p>' +
      '<p class="export-sub">Download every staff attendance record for the selected period.</p></div>' +
      '<span class="export-count">' + count + " record" + (count === 1 ? "" : "s") + "</span></div>" +
      '<div class="export-chips">' + EXPORT_PRESETS.map(function (p) {
        return '<button type="button" class="export-chip' + (exportState.preset === p[0] ? " active" : "") +
          '" data-export-preset="' + p[0] + '">' + esc(p[1]) + "</button>";
      }).join("") + "</div>" +
      (exportState.preset === "custom"
        ? '<div class="export-dates"><div class="field"><label for="exportFrom">From</label>' +
          '<input type="date" id="exportFrom" value="' + esc(exportState.from) + '" /></div>' +
          '<div class="field"><label for="exportTo">To</label>' +
          '<input type="date" id="exportTo" value="' + esc(exportState.to) + '" /></div></div>'
        : "") +
      '<p class="export-range">' + (r ? "Period: " + esc(prettyDate(r.from)) + " — " + esc(prettyDate(r.to))
        : "Select a start and end date to continue.") + "</p>" +
      '<div class="export-actions">' +
      '<button type="button" class="btn btn-primary" id="exportCsvBtn">' + ICON.download + "<span>Download CSV</span></button>" +
      '<button type="button" class="btn btn-ghost" id="exportSheetsBtn">' + ICON.sheet + "<span>Open in Google Sheets</span></button>" +
      "</div></div>";
  }

  function bindExport() {
    var card = el("exportCard");
    if (!card) return;
    Array.prototype.forEach.call(card.querySelectorAll("[data-export-preset]"), function (b) {
      b.addEventListener("click", function () {
        exportState.preset = b.getAttribute("data-export-preset");
        render();
      });
    });
    var from = el("exportFrom"), to = el("exportTo");
    if (from) from.addEventListener("change", function () { exportState.from = from.value; render(); });
    if (to) to.addEventListener("change", function () { exportState.to = to.value; render(); });
    var csvBtn = el("exportCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", downloadCsv);
    var sheetBtn = el("exportSheetsBtn");
    if (sheetBtn) sheetBtn.addEventListener("click", openInGoogleSheets);
  }

  /* ---------- admin ---------- */
  function adminOverview() {
    var now = new Date(), key = dateKey(now);
    var staff = db.users.filter(function (u) { return u.role !== "admin"; });
    var today = db.attendance.filter(function (a) { return a.date === key; });
    var morning = today.filter(function (a) { return a.morning; });
    var evening = today.filter(function (a) { return a.evening; });
    var dayState = dayStatus(now);
    /* On weekends and public holidays attendance is locked, so no one counts as missing. */
    var missing = dayState.open ? staff.filter(function (u) { return !record(u.id, key); }) : [];

    var activity = db.attendance.slice().sort(function (a, b) {
      return (Math.max((b.evening && b.evening.at) || 0, (b.morning && b.morning.at) || 0)) -
             (Math.max((a.evening && a.evening.at) || 0, (a.morning && a.morning.at) || 0));
    }).slice(0, 8);

    return '<div class="page"><div class="page-head"><p class="eyebrow">Administration</p><h1>Attendance Overview</h1></div>' +
      '<div class="stats">' +
      stat("Total Staff", staff.length, "", ICON.users) + stat("Staff Present", morning.length, "ok", ICON.check) +
      stat("Morning Submitted", morning.length, "ok", ICON.sunrise) + stat("Evening Submitted", evening.length, "accent", ICON.sunset) +
      (dayState.open
        ? stat("Missing Attendance", missing.length, missing.length ? "danger" : "", ICON.alert)
        : stat("Missing Attendance", "—", "", ICON.alert)) + "</div>" +
      weekStatusPanel(now) +
      '<div class="layout"><div><section class="section"><div class="section-head"><h2>Today\'s Register</h2><span>' + longDate(now) + " · " + esc(dayStatus(now).reason) + "</span></div>" +
      (dayStatus(now).open ? "" : '<div class="day-lock compact ' + dayStatus(now).kind + '">' +
        '<span class="day-lock-icon" aria-hidden="true">' + ICON.lock + "</span>" +
        '<div class="day-lock-body"><p class="day-lock-title">Attendance locked today</p>' +
        '<p class="day-lock-note">' + esc(dayStatus(now).kind === "weekend" ? "Weekend — attendance stamping is only available Monday–Friday." : "Public holiday: " + dayStatus(now).reason + ". Staff cannot stamp attendance today.") + "</p></div></div>") +

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
      (!dayState.open
        ? '<p class="dateline">' + esc(dayState.kind === "weekend"
            ? "Weekend — attendance is not required today, so no staff are marked missing."
            : "Public holiday (" + dayState.reason + ") — attendance is not required today, so no staff are marked missing.") + "</p>"
        : (missing.length ? staffList(missing)
          : '<p class="dateline">All staff have submitted attendance.</p>')) +
      "</div></div></aside></div></div>";
  }

  /* Admin-facing week overview: which days of the current week are working
     days, weekends or public holidays. */
  function weekStatusPanel(now) {
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var shift = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - shift);
    var todayKey = dateKey(now);
    var cells = "";
    for (var i = 0; i < 7; i++) {
      var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      var st = dayStatus(d);
      cells += '<div class="week-day ' + st.kind + (dateKey(d) === todayKey ? " is-today" : "") + '">' +
        '<span class="week-day-name">' + esc(st.weekdayLabel) + "</span>" +
        '<span class="week-day-date">' + esc(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })) + "</span>" +
        dayStatusTag(st) + "</div>";
    }
    return '<section class="section week-status"><div class="section-head"><h2>Attendance Status</h2>' +
      "<span>This week</span></div><div class=\"week-grid\">" + cells + "</div>" +
      '<p class="dateline" style="margin-top:12px">Attendance stamping is automatically locked on weekends and Nigerian public holidays.</p></section>';
  }

  function stat(label, value, tone, icon) {
    return '<div class="stat' + (tone ? " " + tone : "") + '"><div class="stat-top"><span class="stat-label">' + label + '</span>' +
      (icon ? '<span class="stat-icon">' + icon + '</span>' : '') + '</div><b>' + value + "</b></div>";
  }

  var filters = { q: "", dept: "", type: "", date: "" };
  var historyCollapsed = true;

  function adminTable(staff, key) {
    if (!staff.length) return '<div class="table-wrap"><p class="empty">No staff match the selected filters.</p></div>';
    return '<div class="table-wrap"><table><thead><tr><th>Staff</th><th>Department</th><th>Type</th><th>Resumption</th><th>Closing</th><th>Status</th></tr></thead><tbody>' +
      staff.map(function (u) {
        var a = record(u.id, key);
        return '<tr><td><div class="staff-cell">' + avatarHtml(u, "avatar-sm") +
          '<div class="staff-cell-info"><div class="who">' + esc(u.fullName) + '</div></div></div></td>' +
          "<td>" + esc(u.department) + "</td><td>" + esc(u.employmentType) + "</td>" +
          '<td class="num">' + (a && a.morning ? esc(a.morning.time) : "—") + "</td>" +
          '<td class="num">' + (a && a.evening ? esc(a.evening.time) : "—") + "</td>" +
          "<td>" + (leaveForDate(u.id, key) ? '<span class="tag tag-leave">Leave</span>'
            : (a ? statusOf(a, u.id, key)
              : (!dayStatus(key).open
                ? dayStatusTag(dayStatus(key))
                : '<span class="tag tag-miss">Not submitted</span>'))) + "</td></tr>";

      }).join("") + "</tbody></table></div>";
  }

  function toggleHistoryContent() {
    historyCollapsed = !historyCollapsed;
    var content = el("historyContent");
    var btn = el("historyToggle");
    if (content) {
      if (historyCollapsed) {
        content.style.maxHeight = content.scrollHeight + "px";
        /* force reflow so the browser registers the start height before animating to 0 */
        content.offsetHeight;
        content.classList.add("collapsed");
        content.style.maxHeight = "0px";
        content.style.opacity = "0";
      } else {
        content.classList.remove("collapsed");
        content.style.opacity = "1";
        content.style.maxHeight = content.scrollHeight + "px";
        content.addEventListener("transitionend", function handler(e) {
          if (e.propertyName === "max-height") {
            content.style.maxHeight = "";
            content.removeEventListener("transitionend", handler);
          }
        });
      }
    }
    if (btn) {
      btn.classList.toggle("collapsed", historyCollapsed);
      btn.setAttribute("aria-expanded", historyCollapsed ? "false" : "true");
      btn.setAttribute("aria-label", (historyCollapsed ? "Expand" : "Collapse") + " individual attendance history");
    }
  }

  function adminManagement() {
    var key = filters.date || dateKey(new Date());
    var staff = db.users.filter(function (u) { return u.role !== "admin"; }).filter(function (u) {
      var q = filters.q.toLowerCase();
      var match = !q || u.fullName.toLowerCase().indexOf(q) > -1 || u.staffId.toLowerCase().indexOf(q) > -1 || u.email.toLowerCase().indexOf(q) > -1;
      return match && (!filters.dept || u.department === filters.dept) && (!filters.type || u.employmentType === filters.type);
    });

    return '<div class="page"><div class="page-head"><p class="eyebrow">Administration</p><h1>Attendance Management</h1></div>' +
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
      '<section class="section"><div class="section-head"><h2>Individual Attendance History</h2>' +
      '<div class="section-head-actions"><span>Last 10 records per staff</span>' +
      '<button class="collapse-toggle' + (historyCollapsed ? " collapsed" : "") + '" id="historyToggle" type="button" ' +
      'aria-expanded="' + (historyCollapsed ? "false" : "true") + '" aria-controls="historyContent" ' +
      'aria-label="' + (historyCollapsed ? "Expand" : "Collapse") + ' individual attendance history">' +
      ICON.chevronDown + "</button></div></div>" +
      exportPanel() +
      '<div class="history-content' + (historyCollapsed ? " collapsed" : "") + '" id="historyContent"' +
      (historyCollapsed ? ' style="max-height:0;opacity:0"' : "") + ">" +
      staff.map(function (u) {
        var recs = db.attendance.filter(function (a) { return a.userId === u.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 10);
        return '<div class="panel" style="margin-bottom:18px"><div class="panel-head panel-head-staff">' + avatarHtml(u, "avatar-sm") +
          "<span>" + esc(u.fullName) + "</span></div>" +
          '<div class="panel-body panel-body-history">' +
          (leaveHistoryFor(u.id).length ? '<div class="leave-history-mini">' + leaveHistoryFor(u.id).slice(0,5).map(function(l){var today=dateKey(new Date());var st=l.status==="cancelled"?"Cancelled":(l.startDate<=today&&today<=l.endDate?"Active":(l.startDate>today?"Scheduled":"Completed"));return '<div><strong>'+esc(leaveTypeLabel(l.leaveType))+'</strong><span>'+esc(prettyDate(l.startDate))+' – '+esc(prettyDate(l.endDate))+' · '+esc(st)+(l.reason?' · '+esc(l.reason):'')+'</span></div>';}).join("") + '</div>' : '') +
          (recs.length ? '<div class="history-list">' +
            recs.map(function (a) {
              return '<div class="history-row">' +
                '<div class="history-item history-item-date"><span class="history-label">Attendance Date</span><span class="history-value">' + esc(prettyDate(a.date)) + "</span></div>" +
                '<div class="history-item"><span class="history-label">Morning</span><span class="history-value num">' + (a.morning ? esc(a.morning.time) : "—") + "</span></div>" +
                '<div class="history-item"><span class="history-label">Evening</span><span class="history-value num">' + (a.evening ? esc(a.evening.time) : "—") + "</span></div>" +
                '<div class="history-item history-item-status"><span class="history-label">Status</span>' + statusOf(a) + "</div>" +
                "</div>";
            }).join("") + "</div>" : '<p class="empty">No records.</p>') + "</div></div>";
      }).join("") + "</div></section></div>";
  }

  /* ------------------------- actions ------------------------- */
  function submitAttendance(kind) {
    var u = session(); if (!u) return;
    var now = new Date(), key = dateKey(now);
    var rec = record(u.id, key);
    var dayState = dayStatus(now);
    if (!dayState.open) {
      toast(dayState.kind === "weekend"
        ? "Attendance is only available Monday–Friday."
        : "Attendance is locked today — public holiday (" + dayState.reason + ").", "error");
      return;
    }

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


  /* =========================================================================
     HSE ATTENDANCE MODULE
     HSE holds every Monday. The current Monday session is derived from the
     device/system date — no admin has to create a session each week.
     Records live in the `hse_attendance` table; the attendance window and
     weekly topic live in `hse_settings` (single row, admin editable).
     ========================================================================= */

  var HSE_DEFAULTS = { open_time: "08:00", close_time: "10:00", topic: "" };

  function hseSettings() {
    var s = db.hseSettings || {};
    return {
      open_time: s.open_time || HSE_DEFAULTS.open_time,
      close_time: s.close_time || HSE_DEFAULTS.close_time,
      topic: s.topic || ""
    };
  }

  /* Monday of the week containing d */
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function nextMonday(d) {
    var x = mondayOf(d); x.setDate(x.getDate() + 7); return x;
  }
  function isMondayKey(key) {
    var p = String(key || "").split("-");
    if (p.length !== 3) return false;
    return new Date(+p[0], +p[1] - 1, +p[2]).getDay() === 1;
  }
  /* ISO week identifier, e.g. 2026-W35 — the HSE session/week id */
  function hseWeekId(key) {
    var p = String(key).split("-");
    var t = new Date(+p[0], +p[1] - 1, +p[2]);
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    var week1 = new Date(t.getFullYear(), 0, 4);
    var n = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + "-W" + pad(n);
  }
  function currentHseDate() { return dateKey(mondayOf(new Date())); }

  function minutesOf(hhmm) {
    var m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  }
  function prettyClock(hhmm) {
    var m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return hhmm || "";
    var h = +m[1], mer = h >= 12 ? "PM" : "AM";
    return (h % 12 || 12) + ":" + m[2] + " " + mer;
  }

  /* Current state of today's HSE session */
  function hseWindowState() {
    var now = new Date();
    var s = hseSettings();
    if (now.getDay() !== 1) return { phase: "not-monday", next: dateKey(nextMonday(now)), settings: s };
    var mins = now.getHours() * 60 + now.getMinutes();
    var open = minutesOf(s.open_time), close = minutesOf(s.close_time);
    if (mins < open) return { phase: "before", settings: s };
    if (mins > close) return { phase: "closed", settings: s };
    return { phase: "open", settings: s };
  }

  function mapHse(r) {
    return {
      id: r.id, userId: r.user_id, name: r.staff_name || "", staffId: r.staff_id || "",
      department: r.department || "", date: r.session_date, weekId: r.week_id || "",
      time: r.check_in_time || "", status: r.status || "Present", topic: r.topic || ""
    };
  }
  function hseRecordFor(userId, key) {
    return db.hse.find(function (r) { return r.userId === userId && r.date === key; }) || null;
  }
  function hseRecordsFor(key) {
    return db.hse.filter(function (r) { return r.date === key; })
      .sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
  }
  function hseSessionDates() {
    var seen = {};
    db.hse.forEach(function (r) { if (r.date) seen[r.date] = (seen[r.date] || 0) + 1; });
    var cur = currentHseDate();
    if (!seen[cur]) seen[cur] = 0;
    return Object.keys(seen).sort().reverse().map(function (d) { return { date: d, count: seen[d] }; });
  }

  /* ---------- staff dashboard card ---------- */
  function hseStaffCard(u) {
    var key = currentHseDate();
    var st = hseWindowState();
    var rec = hseRecordFor(u.id, key);
    var s = st.settings;
    var body;

    if (rec) {
      body = '<div class="hse-done"><span class="hse-done-mark" aria-hidden="true">' + ICON.check + "</span>" +
        "<div><p class=\"hse-done-title\">HSE Attendance Recorded</p>" +
        '<p class="hse-done-sub">Checked in at ' + esc(rec.time) + "</p></div></div>" +
        '<div class="locked-note"><span class="lock-icon" aria-hidden="true">' + ICON.lock + '</span> Locked — one check-in per HSE session</div>';
    } else if (st.phase === "not-monday") {
      body = '<p class="hse-note">The next HSE session is ' +
        esc(prettyDate(st.next)) + ', ' + esc(prettyClock(s.open_time)) + " – " + esc(prettyClock(s.close_time)) + ".</p>";
    } else if (st.phase === "before") {
      body = '<p class="hse-note warn">HSE attendance has not opened yet.</p>' +
        '<p class="hse-sub">Check-in opens at ' + esc(prettyClock(s.open_time)) + " today.</p>";
    } else if (st.phase === "closed") {
      body = '<p class="hse-note danger">HSE attendance is closed for today.</p>' +
        '<p class="hse-sub">The window ran from ' + esc(prettyClock(s.open_time)) + " to " + esc(prettyClock(s.close_time)) + ".</p>";
    } else {
      body = '<p class="hse-sub">You are signed in as <b>' + esc(u.fullName) + "</b> (" + esc(u.staffId) +
        "). Your details are recorded automatically.</p>" +
        '<button class="btn btn-primary btn-lg btn-block" id="hseCheckIn" type="button">Check In for HSE</button>' +
        '<p class="hse-sub muted">Window: ' + esc(prettyClock(s.open_time)) + " – " + esc(prettyClock(s.close_time)) + "</p>";
    }

    return '<section class="section hse-card"><div class="section-head"><h2>HSE Attendance</h2>' +
      "<span>" + esc(prettyDate(key)) + "</span></div>" +
      (s.topic ? '<p class="hse-topic">' + ICON.shield + "<span>Topic: " + esc(s.topic) + "</span></p>" : "") +
      '<div class="hse-body">' + body + "</div></section>";
  }

  async function hseCheckIn(btn) {
    var u = session(); if (!u) return;
    var key = currentHseDate();
    var st = hseWindowState();
    if (st.phase !== "open") { toast("HSE attendance is not open right now.", "error"); return; }
    if (hseRecordFor(u.id, key)) { toast("You have already checked in for this HSE session.", "error"); return; }

    setBtnLoading(btn, true);
    try {
      var now = new Date();
      var res = await supabaseClient.from("hse_attendance").insert({
        user_id: u.id,
        staff_name: u.fullName,
        staff_id: u.staffId,
        department: u.department,
        session_date: key,
        week_id: hseWeekId(key),
        check_in_time: clockTime(now),
        status: "Present",
        topic: st.settings.topic || null
      });
      if (res.error) {
        var msg = /duplicate|unique/i.test(res.error.message)
          ? "You have already checked in for this HSE session."
          : res.error.message;
        toast(msg, "error");
        return;
      }
      await refreshData();
      toast("HSE attendance recorded successfully.");
      render();
    } finally {
      setBtnLoading(btn, false);
    }
  }

  /* ---------- admin ---------- */
  var hseAdmin = { date: "" };

  function hseAdminView() {
    var key = hseAdmin.date || currentHseDate();
    var s = hseSettings();
    var staff = db.users.filter(function (u) { return u.role !== "admin"; });
    var recs = hseRecordsFor(key);
    var presentIds = {};
    recs.forEach(function (r) { presentIds[r.userId] = true; });
    var missing = staff.filter(function (u) { return !presentIds[u.id]; });
    var pct = staff.length ? Math.round((recs.length / staff.length) * 100) : 0;

    return '<div class="page"><div class="page-head"><p class="eyebrow">Administration</p><h1>HSE Attendance</h1></div>' +

      '<div class="stats">' +
      stat("Total Staff", staff.length, "", ICON.users) +
      stat("Present", recs.length, "ok", ICON.check) +
      stat("Not Checked In", missing.length, missing.length ? "danger" : "", ICON.alert) +
      stat("Attendance", pct + "%", "accent", ICON.activity) + "</div>" +

      '<section class="section"><div class="section-head"><h2>Session Records</h2>' +
      '<div class="section-head-actions"><span>' + recs.length + " record" + (recs.length === 1 ? "" : "s") + "</span>" +
      '<button class="btn btn-primary btn-sm" type="button" id="hseCsvBtn">' + ICON.download + "<span>Download CSV</span></button>" +
      "</div></div>" +
      (s.topic ? '<p class="hse-topic">' + ICON.shield + "<span>Topic: " + esc(s.topic) + "</span></p>" : "") +
      hseTable(recs) + "</section>" +

      '<div class="layout"><div>' +
      '<section class="section"><div class="section-head"><h2>HSE Attendance History</h2><span>Previous Mondays</span></div>' +
      '<div class="hse-history">' + hseSessionDates().map(function (d) {
        return '<button type="button" class="hse-session' + (d.date === key ? " active" : "") + '" data-hse-date="' + esc(d.date) + '">' +
          "<span>" + esc(prettyDate(d.date)) + "</span><b>" + d.count + " Present</b></button>";
      }).join("") + "</div></section></div>" +

      '<aside><div class="panel"><div class="panel-head">' + ICON.settings + "HSE Session Settings</div>" +
      '<div class="panel-body"><form id="hseSettingsForm" novalidate>' +
      '<div class="field"><label for="hseOpen">Window opens</label><input type="time" id="hseOpen" value="' + esc(s.open_time) + '" /></div>' +
      '<div class="field"><label for="hseClose">Window closes</label><input type="time" id="hseClose" value="' + esc(s.close_time) + '" /></div>' +
      '<div class="field"><label for="hseTopic">HSE topic (optional)</label><input type="text" id="hseTopic" value="' + esc(s.topic) + '" placeholder="e.g. Fire Safety Drill" /></div>' +
      '<button class="btn btn-dark btn-block" type="submit">Save settings</button>' +
      "</form></div></div>" +
      '<div class="panel" style="margin-top:20px"><div class="panel-head">' + ICON.alert + "Not Checked In</div><div class=\"panel-body\">" +
      (missing.length ? staffList(missing)
        : '<p class="dateline">All staff checked in for this session.</p>') +
      "</div></div></aside></div></div>";
  }

  function hseTable(recs) {
    if (!recs.length) return '<div class="table-wrap"><p class="empty">No HSE check-ins recorded for this session.</p></div>';
    return '<div class="table-wrap"><table><thead><tr><th>Staff Name</th><th>Staff ID</th><th>Department</th><th>Date</th><th>Check-in Time</th><th>Status</th></tr></thead><tbody>' +
      recs.map(function (r) {
        return "<tr><td>" + esc(r.name) + "</td><td>" + esc(r.staffId) + "</td><td>" + esc(r.department) + "</td>" +
          "<td>" + esc(csvDate(r.date)) + '</td><td class="num">' + esc(r.time) + "</td>" +
          '<td><span class="tag tag-ok">' + esc(r.status) + "</span></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  var HSE_CSV_HEADERS = ["Staff Name", "Staff ID", "Department", "HSE Date", "HSE Topic", "Check-in Time", "Status"];

  function downloadHseCsv() {
    var key = hseAdmin.date || currentHseDate();
    var recs = hseRecordsFor(key);
    if (!recs.length) { toast("No HSE records for the selected session.", "error"); return; }
    var topic = hseSettings().topic;
    var rows = recs.map(function (r) {
      return [r.name, r.staffId, r.department, csvDate(r.date), r.topic || topic || "", csvTime(r.time), r.status];
    });
    var csv = [HSE_CSV_HEADERS].concat(rows).map(function (line) {
      return line.map(csvCell).join(",");
    }).join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url; link.download = "HSE_Attendance_" + key + ".csv";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast(rows.length + " HSE record" + (rows.length === 1 ? "" : "s") + " exported.");
  }

  function bindHse() {
    var checkIn = el("hseCheckIn");
    if (checkIn) checkIn.addEventListener("click", function () { hseCheckIn(checkIn); });

    Array.prototype.forEach.call(document.querySelectorAll("[data-hse-date]"), function (b) {
      b.addEventListener("click", function () {
        hseAdmin.date = b.getAttribute("data-hse-date");
        render();
      });
    });

    var csvBtn = el("hseCsvBtn");
    if (csvBtn) csvBtn.addEventListener("click", downloadHseCsv);

    var form = el("hseSettingsForm");
    if (form) form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var open = el("hseOpen").value, close = el("hseClose").value;
      if (!open || !close) { toast("Set both an opening and closing time.", "error"); return; }
      if (minutesOf(open) >= minutesOf(close)) { toast("The closing time must be after the opening time.", "error"); return; }
      setBtnLoading(btn, true);
      try {
        var res = await supabaseClient.from("hse_settings")
          .upsert({ id: 1, open_time: open, close_time: close, topic: el("hseTopic").value.trim() || null });
        if (res.error) { toast(res.error.message, "error"); return; }
        await refreshData();
        toast("HSE settings saved.");
        render();
      } finally {
        setBtnLoading(btn, false);
      }
    });
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
      '</div>' +

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
  var AVATAR_MAX_BYTES = 20 * 1024 * 1024;

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
    if (file.size > AVATAR_MAX_BYTES) return "Image must be 20MB or smaller.";
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
    return '<div class="page"><div class="page-head"><p class="eyebrow">Account</p><h1>Profile &amp; Settings</h1></div>' +

      '<div class="layout"><div>' +

      '<section class="section"><div class="section-head"><h2>My Profile</h2><span>Editable details</span></div>' +
      '<div class="photo-row">' + avatarHtml(u, "avatar-xl") +
      '<div class="photo-copy"><h3>Profile picture</h3>' +
      '<p>JPG, PNG or WebP · up to 20MB. Shown on your dashboard and staff profile.</p>' +
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

  /* ========================= INTERNAL MESSAGING ========================= */
  var messageState = {
    conversations: [], activeConversation: null, unlockedPrivateKey: null,
    ownPublicKey: null, unread: 0, sound: localStorage.getItem("md_message_sound") !== "off",
    realtime: null, initialized: false, loading: false
  };

  function b64(bytes) {
    var bin = ""; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function unb64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function deriveWrapKey(passphrase, salt) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" }, base,
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function generateMessagingKeys(passphrase) {
    if (!crypto || !crypto.subtle) throw new Error("This browser does not support the required Web Crypto API.");
    var pair = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
    var pub = b64(new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey)));
    var priv = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var wrap = await deriveWrapKey(passphrase, salt);
    var encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, wrap, priv));
    var u = session();
    var a = await supabaseClient.from("user_public_keys").upsert({ user_id: u.id, public_key: pub }, { onConflict: "user_id" });
    if (a.error) throw a.error;
    var b = await supabaseClient.from("user_private_keys").upsert({ user_id: u.id, encrypted_private_key: b64(encrypted), iv: b64(iv), salt: b64(salt) }, { onConflict: "user_id" });
    if (b.error) throw b.error;
    messageState.ownPublicKey = pub;
    messageState.unlockedPrivateKey = pair.privateKey;
  }
  async function unlockMessagingKeys(passphrase) {
    var u = session();
    var privRes = await supabaseClient.from("user_private_keys").select("encrypted_private_key,iv,salt").eq("user_id", u.id).maybeSingle();
    if (privRes.error) throw privRes.error;
    if (!privRes.data) throw new Error("No encryption key has been created for this account yet.");
    var wrap = await deriveWrapKey(passphrase, unb64(privRes.data.salt));
    var raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(privRes.data.iv) }, wrap, unb64(privRes.data.encrypted_private_key));
    messageState.unlockedPrivateKey = await crypto.subtle.importKey("pkcs8", raw, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
    var pubRes = await supabaseClient.from("user_public_keys").select("public_key").eq("user_id", u.id).maybeSingle();
    if (pubRes.error || !pubRes.data) throw new Error("Your public encryption key is missing.");
    messageState.ownPublicKey = pubRes.data.public_key;
  }
  async function getOwnKeyState() {
    var u = session();
    var pub = await supabaseClient.from("user_public_keys").select("public_key").eq("user_id", u.id).maybeSingle();
    var priv = await supabaseClient.from("user_private_keys").select("user_id").eq("user_id", u.id).maybeSingle();
    if (pub.error) throw pub.error; if (priv.error) throw priv.error;
    return { publicKey: pub.data && pub.data.public_key, hasPrivate: !!priv.data };
  }
  async function encryptForRecipients(text, recipientIds) {
    if (!messageState.unlockedPrivateKey) throw new Error("Unlock messaging first.");
    var keysRes = await supabaseClient.from("user_public_keys").select("user_id,public_key").in("user_id", recipientIds);
    if (keysRes.error) throw keysRes.error;
    var map = {}; (keysRes.data || []).forEach(function (r) { map[r.user_id] = r.public_key; });
    for (var i = 0; i < recipientIds.length; i++) if (!map[recipientIds[i]]) throw new Error("One recipient has not activated secure messaging yet.");
    var aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, aes, new TextEncoder().encode(text)));
    var rawAes = await crypto.subtle.exportKey("raw", aes), envelopes = [];
    for (var j = 0; j < recipientIds.length; j++) {
      var pk = await crypto.subtle.importKey("spki", unb64(map[recipientIds[j]]), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
      var wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pk, rawAes);
      envelopes.push({ user_id: recipientIds[j], encrypted_key: b64(new Uint8Array(wrapped)) });
    }
    return { ciphertext: b64(cipher), iv: b64(iv), envelopes: envelopes };
  }
  async function decryptMessage(row, envelope) {
    if (!messageState.unlockedPrivateKey || !envelope) return "";
    try {
      var rawAes = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, messageState.unlockedPrivateKey, unb64(envelope.encrypted_key));
      var aes = await crypto.subtle.importKey("raw", rawAes, { name: "AES-GCM" }, false, ["decrypt"]);
      var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(row.iv) }, aes, unb64(row.ciphertext));
      return new TextDecoder().decode(plain);
    } catch (e) { return "[Unable to decrypt this message]"; }
  }
  function messageAvatar(u, cls) { return avatarHtml(u, cls || "avatar-sm"); }
  function messagePerson(id) { return db.users.find(function (u) { return String(u.id) === String(id); }) || { id: id, fullName: "Staff member", avatarUrl: "" }; }
  function messageTime(ts) { if (!ts) return ""; var d = new Date(ts); return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function messageDate(ts) { var d = new Date(ts); var today = new Date(); if (d.toDateString() === today.toDateString()) return messageTime(ts); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }

  async function fetchConversationList() {
    var u = session(); if (!u) return [];
    var p = await supabaseClient.from("message_participants").select("conversation_id,user_id,joined_at").eq("user_id", u.id);
    if (p.error) throw p.error;
    var ids = (p.data || []).map(function (x) { return x.conversation_id; });
    if (!ids.length) return [];
    var c = await supabaseClient.from("message_conversations").select("id,kind,created_by,created_at").in("id", ids).order("created_at", { ascending: false });
    if (c.error) throw c.error;
    var parts = await supabaseClient.from("message_participants").select("conversation_id,user_id").in("conversation_id", ids);
    if (parts.error) throw parts.error;
    var result = [];
    for (var i = 0; i < (c.data || []).length; i++) {
      var conv = c.data[i], members = (parts.data || []).filter(function (x) { return x.conversation_id === conv.id; });
      var other = members.find(function (x) { return x.user_id !== u.id; });
      var person = conv.kind === "broadcast" ? { fullName: "Company", avatarUrl: "", id: null } : (other ? messagePerson(other.user_id) : { fullName: "Staff member", avatarUrl: "", id: null });
      var last = await supabaseClient.from("messages").select("id,sender_id,ciphertext,iv,created_at").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1);
      var lastText = "Encrypted message";
      if (!last.error && last.data && last.data[0] && messageState.unlockedPrivateKey) {
        var env = await supabaseClient.from("message_key_envelopes").select("encrypted_key").eq("message_id", last.data[0].id).eq("user_id", u.id).maybeSingle();
        if (!env.error && env.data) lastText = await decryptMessage(last.data[0], env.data);
      }
      var unreadRows = await supabaseClient.from("messages").select("id,sender_id").eq("conversation_id", conv.id).neq("sender_id", u.id);
      var unreadCount = 0;
      if (!unreadRows.error && unreadRows.data && unreadRows.data.length) {
        var receiptRows = await supabaseClient.from("message_receipts").select("message_id,read_at").eq("user_id", u.id).in("message_id", unreadRows.data.map(function(x){return x.id;}));
        var readMap = {}; (receiptRows.data || []).forEach(function(x){ if(x.read_at) readMap[x.message_id]=true; });
        unreadCount = unreadRows.data.filter(function(x){return !readMap[x.id];}).length;
      }
      result.push({ id: conv.id, kind: conv.kind, person: person, last: last.data && last.data[0], preview: lastText, unread: unreadCount });
    }
    return result;
  }
  async function refreshMessageUnread() {
    if (!session()) return;
    var r = await supabaseClient.rpc("unread_message_count");
    if (!r.error) { messageState.unread = Number(r.data || 0); updateMessageBadge(); }
  }
  function updateMessageBadge() {
    var a = document.querySelector('[data-message-nav]'); if (!a) return;
    var label = a.querySelector("[data-message-label]"); if (!label) return;
    label.textContent = messageState.unread > 99 ? "Messages (99+)" : "Messages" + (messageState.unread ? " (" + messageState.unread + ")" : "");
    a.classList.toggle("has-unread", messageState.unread > 0);
  }
  function playMessageSound() {
    if (messageState.sound) {
      /* Browsers generally allow audio after user interaction; the generated tone is tiny and local. */
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        var ctx = new C(), osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.frequency.value = 660; gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + .01); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .18);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .19); setTimeout(function(){ctx.close();},300);
      } catch(e) {}
    }
  }
  async function startMessagingRealtime() {
    if (messageState.realtime || !session()) return;
    var u = session();
    messageState.realtime = supabaseClient.channel("md-messages-" + u.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async function (payload) {
        if (!session()) return;
        var m = payload.new;
        var participant = await supabaseClient.from("message_participants").select("conversation_id").eq("conversation_id", m.conversation_id).eq("user_id", u.id).maybeSingle();
        if (participant.error || !participant.data || m.sender_id === u.id) return;
        await refreshMessageUnread();
        if (location.hash === "#/messages") renderMessagesKeepState();
        if (document.hidden || messageState.sound) playMessageSound();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Message", { body: "You have a new secure message.", icon: "favicon.png" });
        }
      }).subscribe();
  }
  async function stopMessagingRealtime() { if (messageState.realtime) { await supabaseClient.removeChannel(messageState.realtime); messageState.realtime = null; } }

  function messagingSetupView(mode) {
    var create = mode === "create";
    return '<div class="message-lock"><div class="message-lock-card">' +
      '<div class="message-lock-icon">' + ICON.lock + '</div>' +
      '<p class="eyebrow">Secure Messaging</p><h2>' + (create ? "Set up secure messaging" : "Unlock your messages") + '</h2>' +
      '<p>' + (create ? "Create a private recovery passphrase. It protects your messaging private key and is never sent to the database." : "Enter the recovery passphrase you created for secure messaging on this account.") + '</p>' +
      '<form id="messageKeyForm" class="message-key-form">' +
      '<div class="field password-field"><label for="messageRecovery">Recovery passphrase</label>' +
      '<div class="pw-wrap"><input id="messageRecovery" name="recovery" type="password" minlength="12" autocomplete="new-password" placeholder="At least 12 characters" />' +
      '<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">' + ICON.eye + "</button></div>" +
      (create ? '<div class="pw-strength" data-pw-strength hidden><span class="pw-strength-track"><i></i></span><span class="pw-strength-label"></span></div>' : "") +
      '<span class="error"></span></div>' +
      (create ? '<div class="field password-field"><label for="messageRecoveryConfirm">Confirm passphrase</label>' +
        '<div class="pw-wrap"><input id="messageRecoveryConfirm" name="confirm" type="password" minlength="12" autocomplete="new-password" placeholder="Repeat your passphrase" />' +
        '<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">' + ICON.eye + "</button></div>" +
        '<span class="error"></span></div>' : "") +
      '<button class="btn btn-primary btn-block" type="submit">' + (create ? "Create encryption keys" : "Unlock messages") + '</button></form>' +
      '<p class="message-lock-note">Your recovery passphrase cannot be recovered by the administrator. Keep it somewhere safe.</p></div></div>';
  }

  function messagesView() {
    var locked = !messageState.unlockedPrivateKey;
    if (locked) return messagingSetupView(messageState.hasKey ? "unlock" : "create");
    var convs = messageState.conversations || [];
    var active = convs.find(function (c) { return c.id === messageState.activeConversation; });
    return '<div class="page messaging-page"><div class="page-head message-page-head"><div><p class="eyebrow">Internal Communication</p><h1>Messages</h1><p class="dateline">Private, encrypted communication inside the staff portal.</p></div>' +
      '<div class="message-head-actions"><button class="btn btn-ghost" id="messageSoundBtn">' + (messageState.sound ? 'Sound on' : 'Sound off') + '</button><button class="btn btn-primary" id="newMessageBtn">+ New Message</button>' + (session().role === "admin" ? '<button class="btn btn-ghost" id="broadcastBtn">Broadcast</button>' : '') + '</div></div>' +
      '<section class="messenger-shell"><aside class="conversation-pane"><div class="conversation-search"><input id="messageSearch" type="search" placeholder="Search conversations or staff..." autocomplete="off" /></div><div id="conversationList">' + conversationListHtml(convs) + '</div></aside>' +
      '<section class="chat-pane">' + (active ? chatHtml(active) : '<div class="chat-empty"><div class="chat-empty-icon">' + ICON.users + '</div><h2>Select a conversation</h2><p>Choose a staff member or start a new message.</p><button class="btn btn-primary" id="emptyNewMessage">New Message</button></div>') + '</section></section></div>';
  }
  function conversationListHtml(convs) {
    if (!convs.length) return '<div class="message-empty-list"><p>No conversations yet.</p><span>Start a new message to a colleague.</span></div>';
    return convs.map(function (c) {
      var p = c.person, active = c.id === messageState.activeConversation;
      return '<button type="button" class="conversation-item' + (active ? ' active' : '') + (c.unread ? ' unread' : '') + '" data-conversation="' + esc(c.id) + '">' + messageAvatar(p, "avatar-sm") + '<span class="conversation-main"><strong>' + esc(p.fullName) + '</strong><span>' + esc((c.preview || "Encrypted message").slice(0, 42)) + '</span></span><span class="conversation-meta"><time>' + esc(messageDate(c.last && c.last.created_at)) + '</time>' + (c.unread ? '<b>' + (c.unread > 99 ? '99+' : c.unread) + '</b>' : '') + '</span></button>';
    }).join('');
  }
  function chatHtml(c) {
    var p = c.person;
    return '<div class="chat-header">' + messageAvatar(p, "avatar-sm") + '<div><h2>' + esc(p.fullName) + '</h2><span>End-to-end encrypted</span></div><button type="button" class="chat-back" id="chatBack">Back</button></div><div class="message-stream" id="messageStream"><div class="message-loading">Loading secure messages...</div></div><form class="message-composer" id="messageComposer"><textarea id="messageInput" rows="1" maxlength="4000" placeholder="Type a message..." autocomplete="off"></textarea><button class="btn btn-primary" type="submit">Send</button></form>';
  }
  async function loadMessagesForConversation(conversationId) {
    var u = session();
    var m = await supabaseClient.from("messages").select("id,conversation_id,sender_id,ciphertext,iv,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    if (m.error) throw m.error;
    var ids = (m.data || []).map(function (x) { return x.id; });
    var env = ids.length ? await supabaseClient.from("message_key_envelopes").select("message_id,encrypted_key").in("message_id", ids).eq("user_id", u.id) : { data: [] };
    var em = {}; (env.data || []).forEach(function (x) { em[x.message_id] = x; });
    var html = '';
    for (var i = 0; i < (m.data || []).length; i++) {
      var row = m.data[i], text = await decryptMessage(row, em[row.id]), mine = row.sender_id === u.id;
      html += '<div class="message-row ' + (mine ? 'mine' : 'theirs') + '"><div class="message-bubble">' + esc(text).replace(/\n/g,'<br>') + '<span class="message-meta">' + esc(messageTime(row.created_at)) + '</span></div></div>';
      if (!mine) await supabaseClient.rpc("mark_message_read", { p_message_id: row.id });
    }
    var stream = el("messageStream"); if (stream) { stream.innerHTML = html || '<div class="chat-empty chat-empty-small"><p>No messages yet. Say hello.</p></div>'; stream.scrollTop = stream.scrollHeight; }
    await refreshMessageUnread();
  }
  async function sendMessage(conversationId, text) {
    var u = session(), c = messageState.conversations.find(function(x){return x.id===conversationId;});
    if (!c) throw new Error("Conversation not found");
    var p = await supabaseClient.from("message_participants").select("user_id").eq("conversation_id", conversationId);
    if (p.error) throw p.error;
    var ids = (p.data || []).map(function(x){return x.user_id;});
    var pack = await encryptForRecipients(text, ids);
    var r = await supabaseClient.rpc("send_encrypted_message", { p_conversation_id: conversationId, p_ciphertext: pack.ciphertext, p_iv: pack.iv, p_envelopes: pack.envelopes });
    if (r.error) throw r.error;
  }
  async function openDirectConversation(userId) {
    var r = await supabaseClient.rpc("get_or_create_direct_conversation", { p_other_user: userId });
    if (r.error) throw r.error;
    messageState.activeConversation = r.data;
    await loadMessagingData();
    renderMessagesKeepState();
  }
  async function loadMessagingData() {
    messageState.conversations = await fetchConversationList();
    await refreshMessageUnread();
  }
  function renderMessagesKeepState() { var v=el("view"); if(!v) return; v.innerHTML=messagesView(); var shell=v.querySelector(".messenger-shell"); if(shell && messageState.activeConversation) shell.classList.add("chat-open"); bindMessaging(); }
  async function showStaffPicker() {
    var staff = db.users.filter(function(u){return u.id !== session().id;});
    var body = '<div class="message-picker"><p class="eyebrow">New Message</p><h2>Choose a colleague</h2><input id="staffPickerSearch" type="search" placeholder="Search staff..." autocomplete="off" /><div id="staffPickerList">' + staff.map(function(u){return '<button type="button" class="staff-picker-item" data-staff="'+esc(u.id)+'">'+messageAvatar(u,"avatar-sm")+'<span><strong>'+esc(u.fullName)+'</strong><small>'+esc(u.department||"")+'</small></span></button>';}).join('') + '</div></div>';
    showMessageModal(body);
    var q=el("staffPickerSearch"); if(q) q.addEventListener("input",function(){var term=q.value.toLowerCase();Array.prototype.forEach.call(document.querySelectorAll(".staff-picker-item"),function(b){b.hidden=(b.textContent||"").toLowerCase().indexOf(term)===-1;});});
    Array.prototype.forEach.call(document.querySelectorAll(".staff-picker-item"),function(b){b.addEventListener("click",async function(){closeMessageModal();try{await openDirectConversation(b.getAttribute("data-staff"));}catch(e){toast(e.message||"Could not open conversation.","error");}});});
  }
  function showMessageModal(html) { var m=el("modal"); m.classList.add("message-modal"); el("modalTitle").textContent=""; el("modalBody").innerHTML=html; el("modalKicker").hidden=true; m.hidden=false; el("modalConfirm").hidden=true; el("modalCancel").textContent="Close"; }
  function closeMessageModal() { var m=el("modal"); m.hidden=true; el("modalKicker").hidden=false; el("modalConfirm").hidden=false; el("modalCancel").textContent="Cancel"; }
  async function showBroadcast() {
    var staff = db.users.filter(function(u){return u.role !== "admin";});
    var body='<div class="message-picker"><p class="eyebrow">Administrator</p><h2>Broadcast to staff</h2><p class="dateline">One encrypted message will be delivered to all active staff accounts.</p><textarea id="broadcastInput" rows="6" maxlength="4000" placeholder="Write your company-wide message..."></textarea><button type="button" class="btn btn-primary btn-block" id="sendBroadcastBtn">Send to Everyone</button><small class="message-lock-note">Recipients without secure messaging keys will be skipped until they activate secure messaging.</small></div>';
    showMessageModal(body);
    el("sendBroadcastBtn").addEventListener("click",async function(){var text=(el("broadcastInput").value||"").trim();if(!text){toast("Write a message first.","error");return;}var b=setBtnLoading;setBtnLoading(this,true);try{var keyRes=await supabaseClient.from("user_public_keys").select("user_id").in("user_id",staff.map(function(u){return u.id;}));if(keyRes.error)throw keyRes.error;var ready={};(keyRes.data||[]).forEach(function(x){ready[x.user_id]=true;});var ids=staff.filter(function(u){return ready[u.id];}).map(function(u){return u.id;});if(!ids.length)throw new Error("No staff member has activated secure messaging yet.");var pack=await encryptForRecipients(text,ids);var r=await supabaseClient.rpc("send_broadcast_message",{p_ciphertext:pack.ciphertext,p_iv:pack.iv,p_envelopes:pack.envelopes});if(r.error)throw r.error;closeMessageModal();toast("Broadcast sent securely to " + ids.length + " staff member" + (ids.length===1?".":"s."));await loadMessagingData();renderMessagesKeepState();}catch(e){toast(e.message||"Broadcast could not be sent.","error");}finally{setBtnLoading(this,false);}});
  }
  function bindMessaging() {
    var form=el("messageKeyForm");
    if(form){form.addEventListener("submit",async function(e){e.preventDefault();var r=el("messageRecovery"),c=el("messageRecoveryConfirm"),v=(r.value||"");if(v.length<12){toast("Use a recovery passphrase of at least 12 characters.","error");return;}if(c&&v!==c.value){toast("Recovery passphrases do not match.","error");return;}var btn=form.querySelector("button[type=submit]");setBtnLoading(btn,true);try{if(!messageState.hasKey){await generateMessagingKeys(v);}else{await unlockMessagingKeys(v);}await loadMessagingData();renderMessagesKeepState();toast("Secure messaging is ready.");}catch(err){toast(messageState.hasKey?"Incorrect recovery passphrase or damaged key.":(err.message||"Could not create secure keys."),"error");}finally{setBtnLoading(btn,false);}});return;}
    var soundBtn=el("messageSoundBtn");if(soundBtn)soundBtn.addEventListener("click",function(){messageState.sound=!messageState.sound;localStorage.setItem("md_message_sound",messageState.sound?"on":"off");renderMessagesKeepState();});
    var n=el("newMessageBtn")||el("emptyNewMessage");if(n)n.addEventListener("click",showStaffPicker);var bc=el("broadcastBtn");if(bc)bc.addEventListener("click",showBroadcast);
    Array.prototype.forEach.call(document.querySelectorAll("[data-conversation]"),function(b){b.addEventListener("click",function(){messageState.activeConversation=b.getAttribute("data-conversation");renderMessagesKeepState();loadMessagesForConversation(messageState.activeConversation);});});
    var search=el("messageSearch");if(search)search.addEventListener("input",function(){var t=search.value.toLowerCase();Array.prototype.forEach.call(document.querySelectorAll(".conversation-item"),function(b){b.hidden=(b.textContent||"").toLowerCase().indexOf(t)===-1;});});
    var composer=el("messageComposer");if(composer)composer.addEventListener("submit",async function(e){e.preventDefault();var input=el("messageInput"),text=(input.value||"").trim();if(!text)return;var btn=composer.querySelector("button[type=submit]");setBtnLoading(btn,true);try{await sendMessage(messageState.activeConversation,text);input.value="";await loadMessagingData();renderMessagesKeepState();await loadMessagesForConversation(messageState.activeConversation);}catch(err){toast(err.message||"Message could not be sent.","error");}finally{setBtnLoading(btn,false);}});
    var back=el("chatBack");if(back)back.addEventListener("click",function(){messageState.activeConversation=null;renderMessagesKeepState();});
    if(messageState.activeConversation) loadMessagesForConversation(messageState.activeConversation);
  }
  async function initMessaging() {
    if (!session()) { await stopMessagingRealtime(); return; }
    try { var k=await getOwnKeyState(); messageState.hasKey=!!k.hasPrivate && !!k.publicKey; messageState.ownPublicKey=k.publicKey||null; await startMessagingRealtime(); await refreshMessageUnread(); } catch(e) { console.warn("Messaging init:",e); }
    if ("Notification" in window && Notification.permission === "default") { /* request only after the user opens Messages */ }
  }

  /* ------------------------- router ------------------------- */
  function render() {
    var __scrollY = window.scrollY || window.pageYOffset || 0;
    var __restoreScroll = function () { window.requestAnimationFrame(function () { window.scrollTo(0, __scrollY); }); };
    var u = session();
    var hash = location.hash || (u ? "#/dashboard" : "#/login");
    var view = el("view");

    if (PAGE === "about") { view.innerHTML = aboutView(); renderChrome(); return; }
    if (hash === "#/about") { location.replace("about.html"); return; }

    if (!u) {
      if (hash === "#/signup") view.innerHTML = signupView();
      else if (hash === "#/forgot") view.innerHTML = forgotView();
      else { if (hash !== "#/login") { location.hash = "#/login"; } view.innerHTML = loginView(); }
      renderChrome(); bindAuth(); __restoreScroll(); return;
    }

    if (hash === "#/admin" || hash === "#/admin/attendance" || hash === "#/admin/hse") {
      if (u.role !== "admin") { location.hash = "#/dashboard"; return; }
      view.innerHTML = hash === "#/admin" ? adminOverview()
        : hash === "#/admin/hse" ? hseAdminView()
        : adminManagement();
    } else if (hash === "#/history") {
      view.innerHTML = historyView(u);
    } else if (hash === "#/leave") {
      view.innerHTML = leaveView(u);
      renderChrome(); bindAuth(); bindLeave(); __restoreScroll(); return;
    } else if (hash === "#/settings") {
      view.innerHTML = settingsView(u);
      renderChrome(); bindAuth(); bindSettings(); __restoreScroll(); return;
    } else if (hash === "#/messages") {
      view.innerHTML = messagesView();
      renderChrome(); bindAuth(); bindMessaging(); __restoreScroll();
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(function(){});
      return;
    } else {
      if (hash !== "#/dashboard") { location.hash = "#/dashboard"; return; }
      view.innerHTML = dashboardView(u);
    }
    renderChrome(); bindApp(); __restoreScroll();
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
    var historyToggle = el("historyToggle");
    if (historyToggle) historyToggle.addEventListener("click", toggleHistoryContent);
    bindExport();
    bindHse();
  }

  function bindLeave() {
    var form=el("leaveForm");
    if(form) form.addEventListener("submit",function(e){e.preventDefault();submitLeave();});
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
      await initMessaging();
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
      await initMessaging();
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
    await initMessaging();
    render();
  }

  supabaseClient.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT") { authUser = null; currentUser = null; }
  });

  if (PAGE === "app") window.addEventListener("hashchange", render);
  setInterval(function () { if (session()) renderChrome(); }, 30000);
  init();
})();

/* =========================================================================
   COLLAPSIBLE INFORMATION CARDS
   Site-wide rule: any card/section that holds a lot of information, records,
   rows or history stays visible but keeps its detail collapsed until the user
   expands it. Applied automatically to every render, so future sections that
   match the pattern inherit the behaviour with no extra work.
   ========================================================================= */
(function () {
  "use strict";

  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

  /* Headings that indicate an information-heavy section. */
  var HEAVY = /(histor|record|register|notification|activit|report|log|staff list|all staff|list|archive|audit|entries|submissions)/i;

  /* Sections that must never collapse (short, action-first cards). */
  var SKIP = /(today's attendance|activate leave|password|profile|attendance status|purpose|problem it solves|what it does|currently on leave)/i;

  /* Remembered open/closed state, keyed by heading text, so re-renders keep
     whatever the user chose. Default for every heavy section is collapsed. */
  var state = {};

  function headingOf(section) {
    var h = section.querySelector(".section-head h2, .section-head h3, .panel-head > span, .panel-head");
    return h ? (h.textContent || "").trim() : "";
  }

  function isHeavy(section, title) {
    if (!title) return false;
    if (SKIP.test(title)) return false;
    if (HEAVY.test(title)) return true;
    /* Fallback: a lot of rows/cards, even if the title is not obviously "history". */
    var rows = section.querySelectorAll("tbody tr, .history-row, .panel, .leave-history-mini > div").length;
    return rows >= 6;
  }

  function measure(content) {
    return content.scrollHeight;
  }

  function open(content, btn) {
    content.classList.remove("collapsed");
    content.style.opacity = "1";
    content.style.maxHeight = measure(content) + "px";
    content.addEventListener("transitionend", function h(e) {
      if (e.propertyName === "max-height") {
        content.style.maxHeight = "";
        content.removeEventListener("transitionend", h);
      }
    });
    sync(btn, false);
  }

  function close(content, btn, instant) {
    if (instant) {
      content.classList.add("collapsed");
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
    } else {
      content.style.maxHeight = measure(content) + "px";
      void content.offsetHeight; /* reflow so the animation has a start value */
      content.classList.add("collapsed");
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
    }
    sync(btn, true);
  }

  function sync(btn, collapsed) {
    if (!btn) return;
    btn.classList.toggle("collapsed", collapsed);
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    var label = btn.querySelector(".collapse-label");
    var name = btn.getAttribute("data-title") || "details";
    if (label) {
      /* Narrow panels only get "View"/"Hide" so the pill never overflows. */
      label.textContent = btn.hasAttribute("data-compact")
        ? (collapsed ? "View" : "Hide")
        : (collapsed ? "View " : "Hide ") + name;
    }
    btn.setAttribute("aria-label", (collapsed ? "Expand " : "Collapse ") + name);
    var head = btn.closest(".section-head, .panel-head");
    if (head) head.classList.toggle("is-collapsed", collapsed);
  }

  var uid = 0;

  function enhance(section) {
    if (section.hasAttribute("data-collapsible")) return;
    /* Leave hand-built collapsibles alone. */
    if (section.querySelector(".collapse-toggle")) { section.setAttribute("data-collapsible", "native"); return; }

    var head = section.querySelector(".section-head");
    if (!head) return;
    var title = headingOf(section);
    if (!isHeavy(section, title)) return;

    section.setAttribute("data-collapsible", "auto");

    /* Wrap everything after the header into the collapsible body. */
    var content = document.createElement("div");
    content.className = "collapsible-content";
    content.id = "collapsible-" + (++uid);
    var node = head.nextSibling;
    while (node) {
      var next = node.nextSibling;
      content.appendChild(node);
      node = next;
    }
    section.appendChild(content);

    var actions = head.querySelector(".section-head-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "section-head-actions";
      /* Move any existing meta text (e.g. "Last 10 records") into the actions row. */
      Array.prototype.forEach.call(head.querySelectorAll(":scope > span"), function (s) { actions.appendChild(s); });
      head.appendChild(actions);
    }

    var short = title.replace(/\s*—.*$/, "").trim() || "details";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collapse-toggle collapse-toggle-labelled";
    btn.setAttribute("aria-controls", content.id);
    btn.setAttribute("data-title", short);
    btn.innerHTML = '<span class="collapse-label"></span>' + CHEVRON;
    actions.appendChild(btn);

    var key = short.toLowerCase();
    var collapsed = state[key] === undefined ? true : state[key];

    head.classList.add("collapsible-head");
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");

    function toggle() {
      collapsed = !collapsed;
      state[key] = collapsed;
      if (collapsed) close(content, btn); else open(content, btn);
    }

    head.addEventListener("click", function (e) {
      /* Don't hijack clicks on real controls inside the header. */
      if (e.target.closest("a, input, select, textarea")) return;
      if (e.target.closest("button") && !e.target.closest(".collapse-toggle")) return;
      toggle();
    });
    head.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });

    if (collapsed) close(content, btn, true); else sync(btn, false);
  }

  /* Side panels (e.g. "Recent Attendance Activity") use .panel-head/.panel-body
     instead of a section head, so they get the same treatment here. */
  function enhancePanel(panel) {
    if (panel.hasAttribute("data-collapsible")) return;
    var head = panel.querySelector(":scope > .panel-head");
    var body = panel.querySelector(":scope > .panel-body");
    if (!head || !body) return;
    if (head.classList.contains("panel-head-staff")) return;

    var title = (head.textContent || "").trim();
    if (!title || SKIP.test(title) || !HEAVY.test(title)) return;

    panel.setAttribute("data-collapsible", "auto");

    var content = document.createElement("div");
    content.className = "collapsible-content";
    content.id = "collapsible-" + (++uid);
    panel.insertBefore(content, body);
    content.appendChild(body);

    var short = title.replace(/\s*—.*$/, "").trim() || "details";

    /* Wrap the bare title text node so it can shrink/wrap next to the pill. */
    Array.prototype.slice.call(head.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        var span = document.createElement("span");
        span.className = "panel-head-title";
        span.textContent = n.textContent.trim();
        head.replaceChild(span, n);
      }
    });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collapse-toggle collapse-toggle-labelled collapse-toggle-compact";
    btn.setAttribute("aria-controls", content.id);
    btn.setAttribute("data-title", short);
    btn.setAttribute("data-compact", "");
    btn.innerHTML = '<span class="collapse-label"></span>' + CHEVRON;
    head.appendChild(btn);
    head.classList.add("collapsible-head", "panel-head-collapsible");
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");

    var key = short.toLowerCase();
    var collapsed = state[key] === undefined ? true : state[key];

    function toggle() {
      collapsed = !collapsed;
      state[key] = collapsed;
      if (collapsed) close(content, btn); else open(content, btn);
    }
    head.addEventListener("click", function (e) {
      if (e.target.closest("a, input, select, textarea")) return;
      if (e.target.closest("button") && !e.target.closest(".collapse-toggle")) return;
      toggle();
    });
    head.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });

    if (collapsed) close(content, btn, true); else sync(btn, false);
  }

  function enhanceAll() {
    Array.prototype.forEach.call(
      document.querySelectorAll("#view .section, #view .card-collapsible"),
      enhance
    );
    Array.prototype.forEach.call(
      document.querySelectorAll("#view .panel"),
      enhancePanel
    );
  }

  var pending = null;
  function schedule() {
    if (pending) return;
    pending = window.requestAnimationFrame(function () { pending = null; enhanceAll(); });
  }

  function start() {
    enhanceAll();
    var view = document.getElementById("view");
    if (view && window.MutationObserver) {
      new MutationObserver(schedule).observe(view, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
