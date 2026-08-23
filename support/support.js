/* Multidigital Service Limited — Tech Support / IT Portal (Phase 1)
   Standalone front-end. Shares the company's existing Supabase project
   (Auth + Postgres) — no duplicate database, no duplicate user system. */
(function () {
  "use strict";

  /* ------------------------- Supabase ------------------------- */
  /* Same project as the E-Attendance Platform. The publishable key is safe to
     ship in the browser; all real protection comes from RLS policies (see
     SUPABASE-SETUP.sql). */
  var SUPABASE_URL = "https://wdrgcavxwamwqgxkdscn.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XlL1WvosmoBvl3vttrT-xw_nVvtMrQo";

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  /* Roles allowed into this portal. "staff" is deliberately excluded. */
  var ALLOWED_ROLES = ["admin", "it_support"];
  var ROLE_LABEL = { admin: "Administrator", it_support: "IT Support", staff: "Staff" };

  /* ------------------------- helpers ------------------------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function show(id) { var el = $(id); if (el) el.hidden = false; }
  function hide(id) { var el = $(id); if (el) el.hidden = true; }
  function only(id) {
    ["boot", "loginView", "deniedView", "portalView"].forEach(function (v) {
      var el = $(v); if (el) el.hidden = v !== id;
    });
  }
  function toast(msg, kind) {
    var box = $("toasts");
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 4800);
  }
  function loader(on) {
    var el = $("topLoader");
    el.hidden = false;
    el.classList.toggle("visible", !!on);
    if (!on) setTimeout(function () { el.hidden = true; }, 240);
  }
  function busy(btn, on) {
    if (!on) { btn.classList.remove("is-loading"); btn.disabled = false; var s = btn.querySelector(".spinner"); if (s) s.remove(); return; }
    btn.disabled = true;
    btn.classList.add("is-loading");
    var sp = document.createElement("span");
    sp.className = "spinner";
    btn.appendChild(sp);
  }
  function message(text, kind) {
    var el = $("loginMsg");
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    el.className = "alert alert-" + (kind || "error");
    el.innerHTML = text;
  }
  function kv(target, rows) {
    $(target).innerHTML = rows.map(function (r) {
      return "<div><dt>" + esc(r[0]) + "</dt><dd>" + (r[2] ? r[1] : esc(r[1])) + "</dd></div>";
    }).join("");
  }
  /* Plain, functional status text — no badges or pills. */
  function pill(text, kind) {
    var cls = kind === "ok" ? "status status-ok" : kind === "bad" ? "status status-bad" : "status status-warn";
    return '<span class="' + cls + '">' + esc(text) + "</span>";
  }

  /* ------------------------- role resolution -------------------------
     Resolution order (all server-side, all subject to RLS):
       1. public.has_portal_access()  — security-definer RPC, the source of truth
       2. public.support_roles        — dedicated role table (admin/it_support/staff)
       3. public.profiles.role        — legacy attendance role, admin only
     Never trust anything held in the browser. */
  async function resolveAccess(user) {
    var result = { role: null, allowed: false, source: "none", error: null };

    // 1. Preferred: a single security-definer function.
    try {
      var rpc = await sb.rpc("portal_role");
      if (!rpc.error && rpc.data) {
        result.role = String(rpc.data);
        result.source = "portal_role() RPC";
        result.allowed = ALLOWED_ROLES.indexOf(result.role) !== -1;
        return result;
      }
    } catch (e) { /* function not deployed yet — fall through */ }

    // 2. Dedicated roles table.
    try {
      var rolesRes = await sb.from("support_roles").select("role").eq("user_id", user.id);
      if (!rolesRes.error && rolesRes.data && rolesRes.data.length) {
        var roles = rolesRes.data.map(function (r) { return r.role; });
        result.role = roles.indexOf("admin") !== -1 ? "admin" : roles[0];
        result.source = "support_roles table";
        result.allowed = roles.some(function (r) { return ALLOWED_ROLES.indexOf(r) !== -1; });
        return result;
      }
      if (rolesRes.error) result.error = rolesRes.error.message;
    } catch (e) { result.error = e.message; }

    // 3. Fallback to the existing attendance profile role (admins only).
    try {
      var prof = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!prof.error && prof.data) {
        result.role = prof.data.role || "staff";
        result.source = "profiles.role (legacy)";
        result.allowed = result.role === "admin";
        return result;
      }
      if (prof.error) result.error = prof.error.message;
    } catch (e) { result.error = e.message; }

    return result;
  }

  /* ------------------------- portal render ------------------------- */
  async function renderPortal(user, access) {
    var profile = null;
    var profileError = null;
    try {
      var res = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (res.error) profileError = res.error.message; else profile = res.data;
    } catch (e) { profileError = e.message; }

    var name = (profile && (profile.full_name || profile.name)) || (user.email || "").split("@")[0];
    $("heroName").textContent = name;
    $("roleBadge").textContent = ROLE_LABEL[access.role] || access.role || "Unknown";

    kv("kvAuth", [
      ["Session", pill("Active", "ok"), true],
      ["Provider", (user.app_metadata && user.app_metadata.provider) || "email"],
      ["Email confirmed", user.email_confirmed_at ? "Yes" : "No"],
      ["Last sign-in", user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"]
    ]);

    kv("kvProfile", [
      ["User ID", user.id],
      ["Email", user.email || "—"],
      ["Full name", (profile && (profile.full_name || profile.name)) || "—"],
      ["Staff ID", (profile && profile.staff_id) || "—"],
      ["Department", (profile && profile.department) || "—"],
      ["Portal role", pill(ROLE_LABEL[access.role] || access.role || "none", access.allowed ? "ok" : "bad"), true]
    ]);

    kv("kvDb", [
      ["Project", SUPABASE_URL.replace("https://", "")],
      ["profiles read", profileError ? pill("Blocked", "bad") : pill("OK", "ok"), true],
      ["Role source", access.source],
      ["Row level security", pill("Enforced", "ok"), true],
      ["Notes", profileError ? esc(profileError) : "All reads run as your own user."]
    ]);

    only("portalView");
    var head = $("masthead");
    if (head) document.documentElement.style.setProperty("--header-h", head.offsetHeight + "px");
  }

  /* ------------------------- gate ------------------------- */
  async function gate() {
    loader(true);
    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;
    if (!session) { loader(false); only("loginView"); return; }

    var user = session.user;
    var access = await resolveAccess(user);
    loader(false);

    if (!access.allowed) {
      $("deniedEmail").textContent = user.email || user.id;
      $("deniedRole").textContent = ROLE_LABEL[access.role] || access.role || "No role assigned";
      if (access.error) {
        $("deniedBody").innerHTML =
          "We could not confirm your portal role. Ask the IT administrator to finish the portal database setup.<br /><small>" + esc(access.error) + "</small>";
      }
      only("deniedView");
      return;
    }

    await renderPortal(user, access);
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

  function escFaq(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renderFaq() {
    var list = document.getElementById("faqList");
    if (!list || list.getAttribute("data-ready") === "1") return;
    list.innerHTML = FAQS.map(function (f, i) {
      return '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false" data-faq="' + i + '">' +
        "<span>" + escFaq(f[0]) + '</span><span class="faq-icon" aria-hidden="true"></span></button>' +
        '<div class="faq-a"><div><p>' + escFaq(f[1]) + "</p></div></div></div>";
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

  /* ------------------------- events ------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".year"), function (el) {
      el.textContent = new Date().getFullYear();
    });

    renderFaq();

    Array.prototype.forEach.call(document.querySelectorAll("[data-scroll]"), function (b) {
      b.addEventListener("click", function () {
        var t = document.getElementById(b.getAttribute("data-scroll"));
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    $("showPw").addEventListener("change", function (e) {
      $("password").type = e.target.checked ? "text" : "password";
    });

    $("loginForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      message("");
      var email = $("email").value.trim();
      var password = $("password").value;
      if (!email || !password) { message("Enter your work email and password."); return; }

      var btn = $("loginSubmit");
      busy(btn, true);
      loader(true);
      var res = await sb.auth.signInWithPassword({ email: email, password: password });
      busy(btn, false);
      loader(false);

      if (res.error) {
        message(esc(res.error.message) || "Sign in failed.");
        return;
      }
      $("password").value = "";
      toast("Signed in. Checking your access…", "good");
      only("boot");
      gate();
    });

    $("forgotBtn").addEventListener("click", async function () {
      var email = $("email").value.trim();
      if (!email) { message("Enter your work email first, then tap reset password.", "warn"); return; }
      loader(true);
      var res = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href });
      loader(false);
      if (res.error) message(esc(res.error.message));
      else message("If that account exists, a reset link is on its way.", "ok");
    });

    function signOut() {
      return sb.auth.signOut().then(function () {
        toast("Signed out.");
        only("loginView");
      });
    }

    /* ------------------------- mobile nav (hamburger) -------------------------
       Mirrors the E-Attendance Platform's masthead: on mobile the tab nav
       becomes a fixed dropdown, the header sign-out button hides, and a
       "Sign out" row appears inside the dropdown instead. */
    var navEl = $("nav");
    var toggle = $("menuToggle");
    var backdrop = $("navBackdrop");

    function syncHeaderHeight() {
      var head = $("masthead");
      if (head) document.documentElement.style.setProperty("--header-h", head.offsetHeight + "px");
    }
    function openNav() {
      syncHeaderHeight();
      navEl.classList.add("open");
      document.body.classList.add("nav-open");
      backdrop.hidden = false;
      backdrop.classList.add("show");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }
    function closeNav() {
      navEl.classList.remove("open");
      document.body.classList.remove("nav-open");
      backdrop.hidden = true;
      backdrop.classList.remove("show");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    if (navEl) {
      navEl.addEventListener("click", function (e) {
        if (e.target.closest("#navSignout")) {
          closeNav();
          signOut();
          return;
        }
        var btn = e.target.closest("button[data-tab]");
        if (!btn) return;
        Array.prototype.forEach.call(navEl.querySelectorAll("button[data-tab]"), function (b) {
          b.classList.toggle("active", b === btn);
          var panel = $("tab-" + b.getAttribute("data-tab"));
          if (panel) panel.hidden = b !== btn;
        });
        closeNav();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        if (navEl.classList.contains("open")) closeNav(); else openNav();
      });
    }
    if (backdrop) backdrop.addEventListener("click", closeNav);
    document.addEventListener("click", function (e) {
      if (!navEl || !navEl.classList.contains("open")) return;
      if (navEl.contains(e.target) || (toggle && toggle.contains(e.target))) return;
      closeNav();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navEl && navEl.classList.contains("open")) closeNav();
    });
    window.addEventListener("resize", function () {
      syncHeaderHeight();
      if (window.innerWidth > 760) closeNav();
    });
    syncHeaderHeight();

    var logoutBtn = $("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", signOut);

    $("deniedSignOut").addEventListener("click", signOut);

    sb.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") only("loginView");
    });

    gate();
  });
})();
