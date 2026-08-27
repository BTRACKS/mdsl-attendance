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

  /* Current session context. Convenience only — never used for authorisation:
     every privileged action is re-checked in Postgres. */
  var ME = { user: null, role: null, allowed: false };

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
  /* Support-ticket actions use this loading helper. Keep the original button
     markup so Save changes / Send can be restored cleanly after success or error. */
  function setBtnLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      if (btn.dataset.loadingHtml === undefined) btn.dataset.loadingHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("is-loading");
      var light = btn.classList.contains("btn-dark") ? " spinner-light" : "";
      if (!btn.querySelector(".spinner")) {
        btn.insertAdjacentHTML("beforeend", '<span class="spinner' + light + '" aria-hidden="true"></span>');
      }
    } else {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      if (btn.dataset.loadingHtml !== undefined) {
        btn.innerHTML = btn.dataset.loadingHtml;
        delete btn.dataset.loadingHtml;
      }
    }
  }
  function message(text, kind) {
    var el = $("loginMsg");
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    el.className = "alert alert-" + (kind || "error");
    el.innerHTML = text;
  }
  function kv(target, rows) {
    var el = $(target);
    if (!el) return;
    el.innerHTML = rows.map(function (r) {
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
  function withTimeout(promise, ms, label) {
    return Promise.race([promise, new Promise(function(_, reject){ setTimeout(function(){ reject(new Error(label || "Request timed out.")); }, ms); })]);
  }

  async function resolveAccess(user) {
    var result = { role: null, allowed: false, source: "none", error: null };

    // 1. Preferred: a single security-definer function.
    try {
      var rpc = await withTimeout(sb.rpc("portal_role"), 5000, "Portal role check timed out.");
      if (!rpc.error && rpc.data) {
        result.role = String(rpc.data);
        result.source = "portal_role() RPC";
        result.allowed = ALLOWED_ROLES.indexOf(result.role) !== -1;
        return result;
      }
    } catch (e) { /* function not deployed yet — fall through */ }

    // 2. Dedicated roles table (user_roles, falling back to legacy support_roles).
    try {
      var rolesRes = await withTimeout(sb.from("user_roles").select("role").eq("user_id", user.id), 5000, "Role lookup timed out.");
      if (rolesRes.error || !rolesRes.data || !rolesRes.data.length) {
        rolesRes = await withTimeout(sb.from("support_roles").select("role").eq("user_id", user.id), 5000, "Support role lookup timed out.");
      }
      if (!rolesRes.error && rolesRes.data && rolesRes.data.length) {
        var roles = rolesRes.data.map(function (r) { return r.role; });
        result.role = roles.indexOf("admin") !== -1 ? "admin" : roles[0];
        result.source = "user_roles table";
        result.allowed = roles.some(function (r) { return ALLOWED_ROLES.indexOf(r) !== -1; });
        return result;
      }
      if (rolesRes.error) result.error = rolesRes.error.message;
    } catch (e) { result.error = e.message; }

    // 3. Fallback to the existing attendance profile role (admins only).
    try {
      var prof = await withTimeout(sb.from("profiles").select("role").eq("id", user.id).maybeSingle(), 5000, "Profile role lookup timed out.");
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


  /* ------------------------- Users & profiles (Phase 2) -------------------------
     Read-only. Every query runs as the signed-in user under RLS; no records are
     created, duplicated or modified here. */
  var USERS = { rows: [], loaded: false, loading: false, current: null };

  var NAME_KEYS = ["full_name", "name", "fullname", "display_name"];
  var TITLE_NAME_KEYS = ["title"];
  var FIRST_NAME_KEYS = ["first_name"];
  var LAST_NAME_KEYS = ["last_name"];
  var EMAIL_KEYS = ["email", "work_email", "email_address"];
  var PHONE_KEYS = ["phone", "phone_number", "mobile", "telephone", "msisdn"];
  var TITLE_KEYS = ["position", "job_title", "title", "designation", "role_title"];
  var STAFF_KEYS = ["staff_id", "staff_no", "employee_id", "staff_number"];
  var DEPT_KEYS = ["department", "dept", "unit", "branch"];
  var STATUS_KEYS = ["status", "account_status", "is_active", "active", "employment_status"];
  var TYPE_KEYS = ["employment_type", "staff_type", "category"];
  var AVATAR_KEYS = ["avatar_url", "photo_url", "profile_picture", "picture_url", "image_url", "avatar", "photo"];
  var ROLE_KEYS = ["role", "user_role", "account_role"];

  function pick(row, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = row[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
  }
  function labelize(key) {
    return key.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function fmtValue(v) {
    if (v === null || v === undefined || String(v).trim() === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var dt = new Date(s); if (!isNaN(dt)) return dt.toLocaleString(); }
    return s;
  }
  function statusText(row) {
    var v = pick(row, STATUS_KEYS);
    if (v === null) return "Active";
    if (typeof v === "boolean") return v ? "Active" : "Inactive";
    return String(v).replace(/_/g, " ");
  }
  function displayName(row) {
    var title = pick(row, TITLE_NAME_KEYS);
    var first = pick(row, FIRST_NAME_KEYS);
    var last = pick(row, LAST_NAME_KEYS);
    if (first || last) {
      var parts = [];
      if (title) parts.push(String(title));
      if (first) parts.push(String(first));
      if (last) parts.push(String(last));
      return parts.join(" ");
    }
    var n = pick(row, NAME_KEYS);
    if (n) return String(n);
    var e = pick(row, EMAIL_KEYS);
    return e ? String(e).split("@")[0] : "Unnamed user";
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "?";
  }
  /* Uses the same picture the main website stores — an absolute URL is used as
     is, a storage path is resolved through the shared avatars bucket. */
  function avatarUrl(row) {
    var raw = pick(row, AVATAR_KEYS);
    if (!raw) return null;
    var s = String(raw);
    if (/^https?:\/\//i.test(s) || s.indexOf("data:") === 0) return s;
    var path = s.replace(/^\/+/, "");
    var bucket = "avatars";
    if (path.indexOf("/") !== -1) {
      var head = path.split("/")[0];
      if (["avatars", "profile-pictures", "profiles", "public"].indexOf(head) !== -1) {
        bucket = head;
        path = path.slice(head.length + 1);
      }
    }
    try {
      var pub = sb.storage.from(bucket).getPublicUrl(path);
      return (pub && pub.data && pub.data.publicUrl) || null;
    } catch (e) { return null; }
  }
  function avatarHtml(row, big) {
    var name = displayName(row);
    var url = avatarUrl(row);
    var cls = "avatar" + (big ? " avatar-lg" : "");
    if (url) {
      return '<div class="' + cls + '"><img src="' + esc(url) + '" alt="' + esc(name) +
        '" loading="lazy" onerror="this.parentNode.textContent=\'' + esc(initials(name)) + '\'" /></div>';
    }
    return '<div class="' + cls + '">' + esc(initials(name)) + "</div>";
  }

  var LEAVE_TYPES = ["Annual Leave", "Sick Leave", "Casual Leave", "Maternity Leave", "Paternity Leave", "Study Leave", "Compassionate Leave", "Other"];
  var LEAVES = { rows: [], loaded: false, error: null };

  function leaveForDate(userId, key) {
    return (LEAVES.rows || []).find(function(l) {
      return String(l.staff_id || l.user_id) === String(userId) &&
        l.status !== "cancelled" && l.start_date <= key && key <= l.end_date;
    }) || null;
  }
  function leaveRowsFor(userId) {
    return (LEAVES.rows || []).filter(function(l){ return String(l.staff_id || l.user_id) === String(userId); })
      .sort(function(a,b){ return String(b.start_date).localeCompare(String(a.start_date)); });
  }
  function leaveTypeLabel(v) { return String(v || "").replace(/_/g," ").replace(/\b\w/g,function(c){return c.toUpperCase();}); }
  function leaveStateText(userId, key) {
    var l=leaveForDate(userId,key);
    return l ? "Leave" : null;
  }
  async function loadLeaves() {
    var res = await sb.from("staff_leave").select("*").order("start_date",{ascending:false});
    LEAVES.error = res.error ? res.error.message : null;
    LEAVES.rows = res.error ? [] : (res.data || []);
    LEAVES.loaded = true;
    return res;
  }
  function ensureUserLeavePanel() {
    var root=$("userProfileView");
    if(!root) return null;
    var box=$("userLeaveInfo");
    if(!box){
      box=document.createElement("section");
      box.id="userLeaveInfo";
      box.className="section leave-support-panel";
      root.appendChild(box);
    }
    return box;
  }
  function renderUserLeave(row) {
    var box=ensureUserLeavePanel(); if(!box) return;
    var rows=leaveRowsFor(rowId(row)), today=localDateIso();
    var active=rows.find(function(l){return l.status!=="cancelled"&&l.start_date<=today&&today<=l.end_date;});
    box.innerHTML='<div class="section-head"><h2>Leave Information</h2><span>View only</span></div>' +
      (active ? '<div class="leave-active-banner"><strong>Leave</strong><span>'+esc(leaveTypeLabel(active.leave_type))+' · '+esc(dashboardDateOnly(active.start_date))+' – '+esc(dashboardDateOnly(active.end_date))+'</span></div>' : '<p class="dateline">No active leave for this staff member today.</p>') +
      (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr></thead><tbody>'+
        rows.map(function(l){var activeNow=l.status!=="cancelled"&&l.start_date<=today&&today<=l.end_date;var future=l.status!=="cancelled"&&l.start_date>today;var st=l.status==="cancelled"?"Cancelled":activeNow?"Active":future?"Scheduled":"Completed";return '<tr><td>'+esc(leaveTypeLabel(l.leave_type))+'</td><td>'+esc(dashboardDateOnly(l.start_date))+'</td><td>'+esc(dashboardDateOnly(l.end_date))+'</td><td>'+esc(l.reason||"—")+'</td><td>'+esc(st)+'</td></tr>';}).join("")+
        '</tbody></table></div>' : '<p class="empty">No leave history recorded.</p>');
  }

  /* ------------------------- Tech Support Leave page ------------------------- */
  function ensureLeavePortalTab() {
    var nav = $("nav");
    var portal = $("portalView");
    if (!nav || !portal) return null;

    /* Leave is a normal main navigation item and its panel lives with the
       other portal sections, not at the bottom of portalView. */
    var btn = nav.querySelector('button[data-tab="leave"]');
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-tab", "leave");
      btn.textContent = "Leave";
      var settingsBtn = nav.querySelector('button[data-tab="settings"]');
      if (settingsBtn) nav.insertBefore(btn, settingsBtn);
      else nav.appendChild(btn);
    }

    var panel = $("tab-leave");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "tab-leave";
      panel.className = "section support-leave-page";
      panel.hidden = true;
      var page = portal.querySelector("main.page");
      if (page) page.appendChild(panel);
      else portal.appendChild(panel);
    }
    return panel;
  }

  function leavePortalStatus(row, today) {
    var status = String(row.status || "active").toLowerCase();
    if (status === "cancelled") return "Cancelled";
    if (row.start_date <= today && today <= row.end_date) return "Active";
    if (row.start_date > today) return "Scheduled";
    return "Completed";
  }

  async function renderSupportLeave() {
    var root = ensureLeavePortalTab();
    if (!root) return;
    root.hidden = false;

    if (!LEAVES.loaded) {
      root.innerHTML = '<div class="page-head"><p class="eyebrow">Time Away</p><h1>Leave</h1><p class="dateline">Loading staff leave information…</p></div>';
      await loadLeaves();
    }

    if (LEAVES.error) {
      root.innerHTML = '<div class="page-head"><p class="eyebrow">Time Away</p><h1>Leave</h1><p class="dateline">View-only leave information for Tech Support.</p></div>' +
        '<section class="leave-empty-state leave-error-state"><strong>Leave records could not be loaded</strong><p>' + esc(LEAVES.error) + '</p><button type="button" class="btn btn-secondary" id="leaveRetry">Retry</button></section>';
      var retry = $("leaveRetry");
      if (retry) retry.addEventListener("click", async function(){ LEAVES.loaded=false; await renderSupportLeave(); });
      return;
    }

    if (!USERS.loaded) {
      try { await loadUsers(false); } catch (e) {}
    }

    var today = localDateIso();
    var qEl = $("leaveSupportSearch");
    var q = qEl ? qEl.value.trim().toLowerCase() : "";
    var rows = (LEAVES.rows || []).filter(function(l) {
      var id = l.staff_id || l.user_id;
      var user = (USERS.rows || []).find(function(u){ return String(rowId(u)) === String(id); });
      var hay = [
        user ? displayName(user) : "Staff member",
        user ? pick(user, STAFF_KEYS) : "",
        user ? pick(user, DEPT_KEYS) : "",
        leaveTypeLabel(l.leave_type),
        l.reason || "",
        leavePortalStatus(l, today)
      ].join(" ").toLowerCase();
      return !q || hay.indexOf(q) !== -1;
    });

    var activeCount = (LEAVES.rows || []).filter(function(l){
      return leavePortalStatus(l, today) === "Active";
    }).length;
    var scheduledCount = (LEAVES.rows || []).filter(function(l){
      return leavePortalStatus(l, today) === "Scheduled";
    }).length;

    var body;
    if (!LEAVES.rows.length) {
      body = '<div class="leave-empty-state"><strong>No staff are currently on leave</strong><p>There are no leave records in the system at the moment.</p><p class="leave-empty-note">When a staff member activates leave, it will appear here automatically.</p></div>';
    } else if (!rows.length) {
      body = '<div class="leave-empty-state"><strong>No leave records found</strong><p>No staff leave records match your search.</p></div>';
    } else {
      body = '<div class="table-wrap"><table><thead><tr><th>Staff</th><th>Leave type</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr></thead><tbody>' +
        rows.map(function(l){
          var id = l.staff_id || l.user_id;
          var user = (USERS.rows || []).find(function(u){ return String(rowId(u)) === String(id); });
          var name = user ? displayName(user) : "Staff member";
          var avatar = user ? avatarHtml(user) : '<div class="avatar">?</div>';
          var status = leavePortalStatus(l, today);
          return '<tr><td><div class="leave-staff-cell">' + avatar + '<div><strong>' + esc(name) + '</strong>' + (user && pick(user, STAFF_KEYS) ? '<small>' + esc(pick(user, STAFF_KEYS)) + '</small>' : '') + '</div></div></td>' +
            '<td>' + esc(leaveTypeLabel(l.leave_type)) + '</td>' +
            '<td>' + esc(dashboardDateOnly(l.start_date)) + '</td>' +
            '<td>' + esc(dashboardDateOnly(l.end_date)) + '</td>' +
            '<td>' + esc(l.reason || "—") + '</td>' +
            '<td><span class="leave-status leave-status-' + status.toLowerCase() + '">' + esc(status) + '</span></td></tr>';
        }).join("") + '</tbody></table></div>';
    }

    root.innerHTML = '<div class="page-head"><p class="eyebrow">Time Away</p><h1>Leave</h1><p class="dateline">View-only staff leave information. Tech Support cannot approve, reject, edit or cancel leave.</p></div>' +
      '<section class="section"><div class="leave-summary-grid"><div><span>Currently on leave</span><strong>' + activeCount + '</strong></div><div><span>Scheduled</span><strong>' + scheduledCount + '</strong></div><div><span>Total records</span><strong>' + LEAVES.rows.length + '</strong></div></div>' +
      '<div class="leave-support-toolbar"><label class="search-field"><span>Search staff or leave</span><input id="leaveSupportSearch" type="search" placeholder="Search name, staff ID, department, leave type…" value="' + esc(q) + '"></label><span class="leave-view-note">View only</span></div>' +
      body + '</section>';

    var search = $("leaveSupportSearch");
    if (search) search.addEventListener("input", function(){ renderSupportLeave(); });
  }

  function matchesQuery(row, q) {
    if (!q) return true;
    var hay = [displayName(row), pick(row, EMAIL_KEYS), pick(row, STAFF_KEYS)]
      .map(function (v) { return String(v == null ? "" : v).toLowerCase(); }).join(" ");
    return hay.indexOf(q) !== -1;
  }

  function renderUsers() {
    var q = ($("userSearch").value || "").trim().toLowerCase();
    var rows = USERS.rows.filter(function (r) { return matchesQuery(r, q); });
    var grid = $("usersGrid");
    var state = $("usersState");

    if (!rows.length) {
      grid.innerHTML = "";
      state.textContent = USERS.rows.length
        ? "No staff member matches “" + q + "”."
        : "No staff records are visible to your account.";
      $("usersCount").textContent = "";
      return;
    }

    state.textContent = q
      ? rows.length + " of " + USERS.rows.length + " staff records match your search."
      : "Showing " + rows.length + " staff record" + (rows.length === 1 ? "" : "s") + " from the database.";
    $("usersCount").textContent = USERS.rows.length + " total";

    grid.innerHTML = rows.map(function (r, i) {
      var idx = USERS.rows.indexOf(r);
      return '<button type="button" class="user-card" data-user="' + idx + '">' +
        avatarHtml(r) +
        '<span class="u-body"><span class="u-name">' + esc(displayName(r)) + "</span></span>" +
        "</button>";
    }).join("");
  }

  function openUserProfile(row) {
    USERS.current = row;
    var name = displayName(row);
    $("profileAvatar").outerHTML = avatarHtml(row, true).replace('class="avatar avatar-lg"', 'class="avatar avatar-lg" id="profileAvatar"');
    $("profileName").textContent = name;
    $("profileMeta").textContent = "";

    kv("kvUserIdentity", [
      ["Title", fmtValue(pick(row, TITLE_NAME_KEYS))],
      ["First Name", fmtValue(pick(row, FIRST_NAME_KEYS))],
      ["Last Name", fmtValue(pick(row, LAST_NAME_KEYS))],
      ["Staff ID", fmtValue(pick(row, STAFF_KEYS))]
    ]);

    kv("kvUserContact", [
      ["Email", fmtValue(pick(row, EMAIL_KEYS))],
      ["Phone number", fmtValue(pick(row, PHONE_KEYS))],
      ["Address", fmtValue(row.address)]
    ]);
    kv("kvUserWork", [
      ["Position", fmtValue(pick(row, TITLE_KEYS))],
      ["Department", fmtValue(pick(row, DEPT_KEYS))],
      ["Staff ID", fmtValue(pick(row, STAFF_KEYS))],
      ["Employment type", fmtValue(pick(row, TYPE_KEYS))]
    ]);
    kv("kvUserAccount", [
      ["Account status", fmtValue(statusText(row))],
      ["Current role", roleLabel(roleOf(row))],
      ["User ID", fmtValue(row.id || row.user_id)],
      ["Created", fmtValue(row.created_at)],
      ["Last updated", fmtValue(row.updated_at)]
    ]);

    var known = {};
    [NAME_KEYS, TITLE_NAME_KEYS, FIRST_NAME_KEYS, LAST_NAME_KEYS, EMAIL_KEYS, PHONE_KEYS, TITLE_KEYS, STAFF_KEYS, DEPT_KEYS, STATUS_KEYS, TYPE_KEYS, AVATAR_KEYS, ROLE_KEYS]
      .forEach(function (g) { g.forEach(function (k) { known[k] = 1; }); });
    ["id", "user_id", "created_at", "updated_at", "address"].forEach(function (k) { known[k] = 1; });
    var extras = Object.keys(row).filter(function (k) {
      return !known[k] && row[k] !== null && String(row[k]).trim() !== "";
    }).map(function (k) { return [labelize(k), fmtValue(row[k])]; });
    kv("kvUserOther", extras.length ? extras : [["Additional fields", "Nothing further stored for this user."]]);

    renderRolePanel(row);
    renderAccountPanel(row);
    renderProfileEditor(row);
    renderUserLeave(row);

    $("usersListView").hidden = true;
    $("userProfileView").hidden = false;
  }

  function closeUserProfile() {
    $("userProfileView").hidden = true;
    $("usersListView").hidden = false;
  }

  async function loadUsers(force) {
    if (USERS.loading || (USERS.loaded && !force)) return;
    USERS.loading = true;
    $("usersState").textContent = "Loading staff records…";
    $("usersGrid").innerHTML = "";
    loader(true);
    var res = await sb.from("profiles").select("*").limit(1000);
    await loadRoles();
    await loadLeaves();
    loader(false);
    USERS.loading = false;

    if (res.error) {
      USERS.rows = [];
      $("usersState").textContent = "Staff records could not be loaded: " + res.error.message;
      return;
    }
    USERS.rows = (res.data || []).sort(function (a, b) {
      return displayName(a).localeCompare(displayName(b));
    });
    USERS.loaded = true;
    renderUsers();
    var restoredStaffId = null;
    try { restoredStaffId = sessionStorage.getItem("tech_support_attendance_staff_id"); } catch (e) {}
    if (!ATT.staff && restoredStaffId) {
      var restoredStaff = USERS.rows.find(function (r) { return String(r.id || r.user_id || "") === String(restoredStaffId); });
      if (restoredStaff) selectAttStaff(restoredStaff);
    }
    renderAttStaffResults();
  }

  function initUsers() {
    var grid = $("usersGrid");
    if (grid.getAttribute("data-ready") === "1") return;
    grid.setAttribute("data-ready", "1");
    grid.addEventListener("click", function (e) {
      var card = e.target.closest("[data-user]");
      if (!card) return;
      var row = USERS.rows[Number(card.getAttribute("data-user"))];
      if (row) openUserProfile(row);
    });
    $("userBack").addEventListener("click", closeUserProfile);
    $("usersRefresh").addEventListener("click", function () { closeUserProfile(); loadUsers(true); });
    var t;
    $("userSearch").addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(renderUsers, 140);
    });
  }

  /* ------------------------- Phase 3: role management -------------------------
     Role management is available to authorized IT Support and administrators.
     The UI is only a convenience layer: the database RPC re-checks the caller
     and performs the actual write. Changes are reloaded from the database
     immediately so every portal view sees the new role. */
  var ROLES = {};          /* user_id -> role, as stored in the database */
  var ADMIN_COUNT = 0;     /* administrators currently on record */
  var PENDING = null;      /* role change awaiting confirmation */

  function roleOf(row) {
    var id = row.id || row.user_id;
    return ROLES[id] || pick(row, ROLE_KEYS) || "staff";
  }
  function roleLabel(r) { return ROLE_LABEL[r] || r || "Staff"; }
  function canManageRoles() { return ME.role === "admin" || ME.role === "it_support"; }
  function isAdmin() { return ME.role === "admin"; }

  async function loadRoles() {
    ROLES = {};
    ADMIN_COUNT = 0;
    var res = await sb.rpc("list_portal_roles");
    if (res.error || !res.data) {
      res = await sb.from("user_roles").select("user_id, role");
      if (res.error) res = await sb.from("support_roles").select("user_id, role");
    }
    if (res.error || !res.data) return;
    (res.data || []).forEach(function (r) {
      var id = r.user_id || r.id;
      if (!id) return;
      /* admin always wins if several rows exist for one user */
      if (ROLES[id] === "admin") return;
      ROLES[id] = r.role;
    });
    ADMIN_COUNT = Object.keys(ROLES).filter(function (k) { return ROLES[k] === "admin"; }).length;
  }

  function renderRolePanel(row) {
    var id = row.id || row.user_id;
    var current = roleOf(row);
    var name = displayName(row);
    var self = ME.user && id === ME.user.id;

    kv("kvUserRole", [
      ["Current portal role", roleLabel(current)],
      ["Portal access", ALLOWED_ROLES.indexOf(current) !== -1 ? "Granted" : "Not granted"],
      ["Changed by", canManageRoles() ? "IT Support / Administrators" : "Administrators only"]
    ]);

    var form = $("roleForm");
    var note = $("roleNote");
    var sel = $("roleSelect");

    if (!canManageRoles()) {
      form.hidden = true;
      note.textContent = "Only authorized IT Support or an administrator can change portal roles. Your account has read-only access to this section.";
      return;
    }
    if (!id) {
      form.hidden = true;
      note.textContent = "This record has no linked user account, so a portal role cannot be assigned to it.";
      return;
    }

    form.hidden = false;
    sel.value = current === "admin" || current === "it_support" ? current : "staff";
    sel.setAttribute("data-user", id);
    sel.setAttribute("data-name", name);
    sel.setAttribute("data-current", current);

    if (self && current === "admin" && ADMIN_COUNT <= 1) {
      note.textContent = "You are the only administrator on record. Promote another user to Administrator before changing your own role.";
    } else if (self) {
      note.textContent = "You are editing your own account. Reducing your role will immediately limit your access to this portal.";
    } else {
      note.textContent = canManageRoles() ? "Changing a role takes effect immediately for " + name + ". You will be asked to confirm first." : "Role management is available only to authorized IT Support and administrators.";
    }
  }

  function closeConfirm() {
    PENDING = null;
    $("confirmBackdrop").hidden = true;
    document.body.classList.remove("modal-open");
  }

  function askConfirm(userId, name, from, to) {
    PENDING = { userId: userId, name: name, from: from, to: to };
    $("confirmBody").innerHTML =
      "Change <strong>" + esc(name) + "</strong>'s role from <strong>" + esc(roleLabel(from)) +
      "</strong> to <strong>" + esc(roleLabel(to)) + "</strong>?" +
      (to === "staff"
        ? "<br /><br />This removes their access to the Tech Support portal."
        : to === "admin"
          ? "<br /><br />Administrators can manage users, profiles and roles."
          : "");
    $("confirmBackdrop").hidden = false;
    document.body.classList.add("modal-open");
    $("confirmOk").focus();
  }

  async function applyRoleChange() {
    if (!PENDING) return;
    var job = PENDING;
    var btn = $("confirmOk");
    busy(btn, true);
    loader(true);

    var roleRpc = ME.role === "it_support" ? "it_support_set_user_role" : "set_user_role";
    var res = await sb.rpc(roleRpc, { target_user: job.userId, new_role: job.to });

    busy(btn, false);
    loader(false);

    if (res.error) {
      closeConfirm();
      toast(res.error.message || "The role change was refused by the database.", "bad");
      return;
    }

    closeConfirm();
    ROLES[job.userId] = job.to;
    ADMIN_COUNT = ADMIN_COUNT + (job.to === "admin" ? 1 : 0) - (job.from === "admin" ? 1 : 0);
    toast(job.name + " is now " + roleLabel(job.to) + ".", "good");

    /* If an administrator changed their own role, re-run the access gate. */
    if (ME.user && job.userId === ME.user.id && job.to !== ME.role) {
      only("boot");
      await gate();
      return;
    }

    await loadRoles();
    renderUsers();
    if (USERS.current) renderRolePanel(USERS.current);
  }

  function initRoleUi() {
    var save = $("roleSave");
    if (save.getAttribute("data-ready") === "1") return;
    save.setAttribute("data-ready", "1");

    save.addEventListener("click", function () {
      var sel = $("roleSelect");
      var id = sel.getAttribute("data-user");
      var name = sel.getAttribute("data-name") || "this user";
      var from = sel.getAttribute("data-current");
      var to = sel.value;
      if (!id) return;
      if (to === from) { toast("That is already " + name + "'s role."); return; }
      if (!canManageRoles()) { toast("Only authorized IT Support or an administrator can change portal roles.", "bad"); return; }
      if (ME.user && id === ME.user.id && from === "admin" && ADMIN_COUNT <= 1) {
        toast("You are the last administrator. Promote another user first.", "bad");
        return;
      }
      askConfirm(id, name, from, to);
    });

    $("confirmCancel").addEventListener("click", closeConfirm);
    $("confirmOk").addEventListener("click", applyRoleChange);
    $("confirmBackdrop").addEventListener("click", function (e) {
      if (e.target === $("confirmBackdrop")) closeConfirm();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("confirmBackdrop").hidden) closeConfirm();
    });
  }

  /* ------------------------- Phase 4: attendance & timestamp correction -------------------------
     Reads the company's existing attendance table (no second database) and
     performs every correction through public.correct_attendance_timestamp(),
     a security-definer function that re-checks the caller is an administrator,
     records the original value, the new value, the reason and who made the
     change. Hiding the button here protects nothing on its own. */
  var ATT_TABLES = ["attendance", "attendance_records", "attendances", "attendance_logs"];
  var ATT_USER_KEYS = ["user_id", "profile_id", "staff_uuid", "employee_id", "staff_id"];
  var ATT_DATE_KEYS = ["date", "attendance_date", "work_date", "record_date", "day"];
  var ATT_STATUS_KEYS = ["status", "attendance_status", "attendance_type", "entry_type", "type"];
  var ATT_TS_FIELDS = [
    ["check_in", "Resumption (clock-in)"], ["clock_in", "Resumption (clock-in)"],
    ["time_in", "Resumption (clock-in)"], ["resumption_time", "Resumption (clock-in)"],
    ["resumption", "Resumption (clock-in)"], ["sign_in_time", "Resumption (clock-in)"],
    ["morning_time", "Resumption (clock-in)"], ["check_in_time", "Resumption (clock-in)"],
    ["check_out", "Closing (clock-out)"], ["clock_out", "Closing (clock-out)"],
    ["time_out", "Closing (clock-out)"], ["closing_time", "Closing (clock-out)"],
    ["closing", "Closing (clock-out)"], ["sign_out_time", "Closing (clock-out)"],
    ["evening_time", "Closing (clock-out)"], ["check_out_time", "Closing (clock-out)"],
    ["timestamp", "Recorded timestamp"], ["recorded_at", "Recorded timestamp"],
    ["logged_at", "Recorded timestamp"]
  ];
  var REASONS = ["System error", "Incorrect device time", "Network issue", "Missed clock-in", "Missed clock-out", "Other"];

  var ATT = {
    table: null, ready: false, error: null,
    userKey: null, dateKey: null, statusKey: null, fields: [], jsonFields: [],
    staff: null, rows: [], loading: false, statuses: [],
    pending: null, step: 1
  };

  /* Some deployments store the morning/evening check as a JSONB object on the
     row — confirmed shape here is {"at": <epoch ms>, "time": "7:23 AM"}.
     These are detected and DISPLAYED below so both periods are always
     visible, but are intentionally read-only for now — correcting a value
     nested inside a JSONB column would need to go through
     correct_attendance_timestamp() (or a JSONB-aware equivalent) in a way
     this file can't safely guess at without knowing the exact key your RPC
     expects. */
  var ATT_JSON_PAIR_KEYS = [["morning", "Morning attendance"], ["evening", "Evening attendance"]];
  /* Fallback subkeys, in case a row doesn't have "at" — tried in order. */
  var JSON_TIME_SUBKEYS = ["clock_in", "clock_out", "timestamp", "recorded_at", "checked_at", "time_in", "time_out", "value", "time"];
  function jsonTimeText(obj, fallbackDate) {
    if (obj === null || obj === undefined || obj === "") return "Not recorded";
    if (typeof obj !== "object") return stampText(obj, fallbackDate);
    /* "at" is an epoch-millisecond timestamp — the only unambiguous field,
       so prefer it over the human-readable "time" string (e.g. "7:23 AM"),
       which JS's Date parser can't reliably parse back on its own. */
    if (obj.at !== undefined && obj.at !== null && String(obj.at).trim() !== "") {
      var n = Number(obj.at);
      if (!isNaN(n)) {
        var dt = new Date(n);
        if (!isNaN(dt.getTime())) {
          var iso = dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
          return ukDate(iso) + " — " + pad(dt.getHours()) + ":" + pad(dt.getMinutes());
        }
      }
    }
    for (var i = 0; i < JSON_TIME_SUBKEYS.length; i++) {
      var v = obj[JSON_TIME_SUBKEYS[i]];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        var parsed = stampText(v, fallbackDate);
        return parsed !== "Not recorded" ? parsed : String(v); /* show the raw string rather than hide real data */
      }
    }
    try { return JSON.stringify(obj); } catch (e) { return "Recorded"; }
  }
  /* Mirrors the "7:23 AM" style already used in the stored morning/evening
     objects, so a correction doesn't change the record's display format. */
  function to12Hour(dt) {
    var h = dt.getHours(), m = dt.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ":" + pad(m) + " " + ampm;
  }
  function buildLocalEpoch(dateStr, timeStr) {
    var dt = new Date(dateStr + "T" + timeStr + ":00");
    return isNaN(dt.getTime()) ? null : dt.getTime();
  }

  function isTimeOnly(v) { return typeof v === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* Splits any stored value into { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
  function splitStamp(value, fallbackDate) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    var s = String(value).trim();
    if (isTimeOnly(s)) {
      var p = s.split(":");
      return { date: fallbackDate || "", time: pad(Number(p[0])) + ":" + pad(Number(p[1])) };
    }
    var d = new Date(s.indexOf("T") === -1 && s.indexOf(" ") !== -1 ? s.replace(" ", "T") : s);
    if (isNaN(d.getTime())) return null;
    return {
      date: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
      time: pad(d.getHours()) + ":" + pad(d.getMinutes())
    };
  }
  function ukDate(iso) {
    if (!iso) return "—";
    var p = String(iso).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso);
  }

  /* Dashboard-only display formatter: 24 Aug 2026, 12:26 PM.
     Seconds are intentionally omitted so both activity cards use one format. */
  function dashboardDateTime(value, dateOnlyFallback) {
    if (!value) return dateOnlyFallback ? dashboardDateOnly(dateOnlyFallback) : "—";
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) {
      return dateOnlyFallback ? dashboardDateOnly(dateOnlyFallback) : String(value);
    }
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + ", " + to12Hour(d);
  }

  function dashboardDateOnly(iso) {
    if (!iso) return "—";
    var d = new Date(String(iso) + "T00:00:00");
    if (isNaN(d.getTime())) return String(iso);
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function dashboardAttendanceTime(row) {
    var keys = ["updated_at","recorded_at","logged_at","timestamp","check_in","clock_in","time_in","resumption_time","resumption","sign_in_time","check_out","clock_out","time_out","closing_time","closing","sign_out_time"];
    for (var i = 0; i < keys.length; i++) {
      if (row[keys[i]] != null && String(row[keys[i]]).trim() !== "") {
        var d = new Date(row[keys[i]]);
        if (!isNaN(d.getTime()) && String(row[keys[i]]).indexOf(":") !== -1) return d;
      }
    }
    return null;
  }
  function stampText(value, fallbackDate) {
    var s = splitStamp(value, fallbackDate);
    return s ? ukDate(s.date) + " — " + s.time : "Not recorded";
  }
  function rowDate(row) {
    if (ATT.dateKey && row[ATT.dateKey]) {
      var s = splitStamp(row[ATT.dateKey], null);
      return s ? s.date : String(row[ATT.dateKey]).slice(0, 10);
    }
    for (var i = 0; i < ATT.fields.length; i++) {
      var s2 = splitStamp(row[ATT.fields[i][0]], null);
      if (s2 && s2.date) return s2.date;
    }
    return "";
  }
  function attStaffId(row) {
    for (var i = 0; i < ATT_USER_KEYS.length; i++) {
      if (row[ATT_USER_KEYS[i]]) return String(row[ATT_USER_KEYS[i]]);
    }
    return null;
  }

  async function detectAttendance() {
    if (ATT.ready || ATT.error) return;
    for (var i = 0; i < ATT_TABLES.length; i++) {
      var res = await sb.from(ATT_TABLES[i]).select("*").limit(1);
      if (res.error) continue;
      ATT.table = ATT_TABLES[i];
      var sample = (res.data && res.data[0]) || null;
      var cols = sample ? Object.keys(sample) : [];
      ATT.userKey = ATT_USER_KEYS.filter(function (k) { return cols.indexOf(k) !== -1; })[0] || "user_id";
      ATT.dateKey = ATT_DATE_KEYS.filter(function (k) { return cols.indexOf(k) !== -1; })[0] || null;
      ATT.statusKey = ATT_STATUS_KEYS.filter(function (k) { return cols.indexOf(k) !== -1; })[0] || null;
      ATT.fields = ATT_TS_FIELDS.filter(function (f) { return cols.indexOf(f[0]) !== -1; });
      ATT.jsonFields = ATT_JSON_PAIR_KEYS.filter(function (f) { return cols.indexOf(f[0]) !== -1; });
      if (!ATT.fields.length && !ATT.jsonFields.length && cols.indexOf("created_at") !== -1) ATT.fields = [["created_at", "Recorded timestamp"]];
      ATT.ready = true;
      return;
    }
    ATT.error = "No attendance table is readable by your account. Expected one of: " + ATT_TABLES.join(", ") + ".";
  }

  var ATT_STAFF_LIMIT = 10;

  /* Ranks staff by closeness to the typed query instead of requiring an exact
     substring match anywhere: name-starts-with beats name-contains beats an
     email/staff-ID match, and ties break by where the match falls. Lets a
     partial first name like "Oladapo" surface the right person immediately. */
  function attStaffRank(row, q) {
    var name = displayName(row).toLowerCase();
    var other = [pick(row, EMAIL_KEYS), pick(row, STAFF_KEYS)]
      .map(function (v) { return String(v == null ? "" : v).toLowerCase(); }).join(" ");
    if (name === q) return 0;
    var ni = name.indexOf(q);
    if (ni === 0) return 1;
    if (ni > -1) return 2 + ni / 100;
    var parts = name.split(/\s+/);
    for (var i = 0; i < parts.length; i++) { if (parts[i].indexOf(q) === 0) return 1.5; }
    if (other.indexOf(q) > -1) return 4;
    return -1;
  }

  function attFilteredStaff(q) {
    if (!q) return USERS.rows.slice(0, ATT_STAFF_LIMIT);
    return USERS.rows
      .map(function (r) { return { row: r, score: attStaffRank(r, q) }; })
      .filter(function (m) { return m.score > -1; })
      .sort(function (a, b) { return a.score - b.score; })
      .slice(0, ATT_STAFF_LIMIT)
      .map(function (m) { return m.row; });
  }

  function renderAttStaffResults() {
    if (ATT.staff) return; /* a staff member is already selected — nothing to show here */
    var box = $("attStaffResults");
    if (!box) return;
    if (!USERS.rows.length) { box.innerHTML = ""; return; }
    var q = ($("attSearch").value || "").trim().toLowerCase();
    var rows = attFilteredStaff(q);
    var note = q
      ? ""
      : '<p class="att-staff-note">Showing ' + rows.length + " of " + USERS.rows.length + " staff. Search to find someone else.</p>";

    box.innerHTML = rows.length
      ? note + rows.map(function (r) {
          var idx = USERS.rows.indexOf(r);
          return '<button type="button" class="att-staff-item" data-staff="' + idx + '">' +
            avatarHtml(r) +
            "<span>" + esc(displayName(r)) + "</span></button>";
        }).join("")
      : '<p class="att-empty">No staff member matches “' + esc($("attSearch").value.trim()) + '”.</p>';
  }

  function selectAttStaff(row) {
    ATT.staff = row;
    try { sessionStorage.setItem("tech_support_attendance_staff_id", String(row.id || row.user_id || "")); } catch (e) {}
    $("attSearch").value = "";
    $("attStaffResults").hidden = true;
    $("attStaffResults").innerHTML = "";
    $("attSelected").hidden = false;
    var selectedAvatar = $("attSelectedAvatar");
    if (selectedAvatar) {
      selectedAvatar.outerHTML = avatarHtml(row).replace('class="avatar"', 'class="avatar avatar-sm" id="attSelectedAvatar"');
    }
    $("attSelectedName").textContent = displayName(row);
    renderSelectedStaffLeave(row);
    loadAttendance();
  }

  function renderSelectedStaffLeave(row) {
    var selected=$("attSelected"); if(!selected) return;
    var box=$("attSelectedLeave");
    if(!box){ box=document.createElement("div"); box.id="attSelectedLeave"; box.className="att-selected-leave"; var anchor=$("attSelectedName"); if(anchor&&anchor.parentNode) anchor.parentNode.appendChild(box); }
    var today=localDateIso(), active=leaveForDate(rowId(row),today);
    box.innerHTML=active ? '<span class="tag tag-leave">Leave</span><span>'+esc(leaveTypeLabel(active.leave_type))+' · '+esc(dashboardDateOnly(active.start_date))+' – '+esc(dashboardDateOnly(active.end_date))+'</span>' : '<span class="tag tag-miss">Not on leave</span>';
  }

  function clearAttStaff() {
    ATT.staff = null;
    try { sessionStorage.removeItem("tech_support_attendance_staff_id"); } catch (e) {}
    ATT.rows = [];
    $("attSelected").hidden = true;
    $("attRecords").innerHTML = "";
    $("attState").textContent = "Search for a staff member to view their attendance records.";
    $("attCount").textContent = "";
    $("attSearch").value = "";
    $("attStaffResults").hidden = false;
    renderAttStaffResults();
  }

  async function loadAttendance() {
    if (!ATT.staff || ATT.loading) return;
    await detectAttendance();
    if (ATT.error) { $("attState").textContent = ATT.error; return; }

    ATT.loading = true;
    $("attState").textContent = "Loading attendance records…";
    $("attRecords").innerHTML = "";
    loader(true);

    var staffId = ATT.staff.id || ATT.staff.user_id;
    var q = sb.from(ATT.table).select("*").eq(ATT.userKey, staffId).limit(500);
    if (ATT.dateKey) {
      var from = $("attFrom").value, to = $("attTo").value, one = $("attDate").value;
      if (one) q = q.eq(ATT.dateKey, one);
      else {
        if (from) q = q.gte(ATT.dateKey, from);
        if (to) q = q.lte(ATT.dateKey, to);
      }
      q = q.order(ATT.dateKey, { ascending: false });
    }
    var res = await q;

    loader(false);
    ATT.loading = false;

    if (res.error) {
      ATT.rows = [];
      $("attState").textContent = "Attendance records could not be loaded: " + res.error.message;
      return;
    }
    ATT.rows = res.data || [];
    if (ATT.statusKey) {
      var seen = {};
      ATT.rows.forEach(function (r) { if (r[ATT.statusKey]) seen[String(r[ATT.statusKey])] = 1; });
      var opts = Object.keys(seen).sort();
      var sel = $("attStatus");
      var keep = sel.value;
      sel.innerHTML = '<option value="">All types</option>' +
        opts.map(function (o) { return '<option value="' + esc(o) + '">' + esc(String(o).replace(/_/g, " ")) + "</option>"; }).join("");
      sel.value = opts.indexOf(keep) !== -1 ? keep : "";
      $("attStatusField").hidden = false;
    } else {
      $("attStatusField").hidden = true;
    }
    renderAttendance();
  }

  function filteredAttRows() {
    var one = $("attDate").value, from = $("attFrom").value, to = $("attTo").value;
    var status = ATT.statusKey ? $("attStatus").value : "";
    return ATT.rows.filter(function (r) {
      var d = rowDate(r);
      if (one && d !== one) return false;
      if (!one && from && d && d < from) return false;
      if (!one && to && d && d > to) return false;
      if (status && String(r[ATT.statusKey]) !== status) return false;
      return true;
    });
  }

  function renderAttendance() {
    var rows = filteredAttRows();
    var box = $("attRecords");
    $("attCount").textContent = ATT.rows.length ? ATT.rows.length + " loaded" : "";

    if (!rows.length) {
      box.innerHTML = "";
      var selectedId=ATT.staff && rowId(ATT.staff), today=localDateIso();
      var leave=selectedId ? leaveForDate(selectedId, $("attDate").value || today) : null;
      $("attState").textContent = leave
        ? "Leave — " + leaveTypeLabel(leave.leave_type) + " (" + dashboardDateOnly(leave.start_date) + " – " + dashboardDateOnly(leave.end_date) + ")."
        : (ATT.rows.length ? "No attendance record matches the current filters." : "No attendance records found for " + displayName(ATT.staff) + ".");
      return;
    }
    $("attState").textContent = "Showing " + rows.length + " of " + ATT.rows.length + " record" + (ATT.rows.length === 1 ? "" : "s") + ".";

    var canEdit = isAdmin();
    box.innerHTML = rows.map(function (r) {
      var idx = ATT.rows.indexOf(r);
      var d = rowDate(r);
      var status = ATT.statusKey && r[ATT.statusKey] ? String(r[ATT.statusKey]).replace(/_/g, " ") : null;
      var lines = ATT.fields.map(function (f) {
        var val = r[f[0]];
        var btn = canEdit
          ? '<button type="button" class="btn btn-ghost btn-sm" data-edit="' + idx + '" data-field="' + esc(f[0]) + '">Correct</button>'
          : "";
        return '<div class="att-line"><span class="att-line-label">' + esc(f[1]) + "</span>" +
          '<span class="att-line-value">' + esc(stampText(val, d)) + "</span>" + btn + "</div>";
      }).join("");
      var jsonLines = (ATT.jsonFields || []).map(function (f) {
        var jbtn = canEdit
          ? '<button type="button" class="btn btn-ghost btn-sm" data-editjson="' + idx + '" data-jsonfield="' + esc(f[0]) + '">Correct attendance</button>'
          : "";
        return '<div class="att-line"><span class="att-line-label">' + esc(f[1]) + "</span>" +
          '<span class="att-line-value">' + esc(jsonTimeText(r[f[0]], d)) + "</span>" + jbtn + "</div>";
      }).join("");
      var dateBtn = canEdit && ATT.dateKey
        ? '<button type="button" class="btn btn-ghost btn-sm" data-editdate="' + idx + '">Correct date</button>'
        : "";
      var leave=ATT.staff ? leaveForDate(rowId(ATT.staff), d) : null;
      return '<article class="att-record"><header class="att-record-head">' +
        "<h4>" + esc(ukDate(d)) + "</h4>" +
        "<span>" + esc(leave ? "Leave" : (status || "Attendance record")) + "</span>" + dateBtn +
        "</header><div class=\"att-record-body\">" + lines + jsonLines + "</div></article>";
    }).join("");

    if (!canEdit) {
      $("attState").textContent += " Corrections require an administrator account.";
    }
  }

  /* ---------- correction modal ---------- */
  function closeAtt() {
    ATT.pending = null;
    ATT.step = 1;
    $("attBackdrop").hidden = true;
    document.body.classList.remove("modal-open");
  }

  function openCorrection(row, field, opts) {
    opts = opts || {};
    if (!isAdmin()) { toast("Only an administrator can correct attendance timestamps.", "bad"); return; }
    var label = (ATT.fields.filter(function (f) { return f[0] === field; })[0] || [field, labelize(field)])[1];
    var d = rowDate(row);
    var cur = splitStamp(row[field], d) || { date: d || "", time: "" };

    ATT.pending = {
      row: row, field: field, label: label, jsonField: false,
      original: row[field] === null || row[field] === undefined || String(row[field]) === "" ? null : String(row[field]),
      originalText: stampText(row[field], d),
      timeOnly: isTimeOnly(row[field]),
      dateOnly: !!opts.dateOnly,
      recordDate: d
    };
    ATT.step = 1;

    $("attCorrStaff").textContent = displayName(ATT.staff);
    $("attCorrFieldLabel").textContent = "Field";
    $("attCorrField").textContent = label;
    $("attCorrTitle").textContent = opts.dateOnly ? "Correct attendance date" : "Correct attendance timestamp";
    var tf = $("attNewTimeField"); if (tf) tf.hidden = !!opts.dateOnly;
    $("attCorrOriginal").textContent = ATT.pending.originalText;
    $("attNewDate").value = cur.date;
    $("attNewTime").value = cur.time;
    $("attReason").value = "";
    $("attReasonOther").value = "";
    $("attReasonOtherField").hidden = true;
    $("attCorrError").hidden = true;
    $("attStep1").hidden = false;
    $("attStep2").hidden = true;
    $("attContinue").hidden = false;
    $("attConfirm").hidden = true;
    $("attBack").hidden = true;
    $("attBackdrop").hidden = false;
    document.body.classList.add("modal-open");
  }

  /* Correction entry point for the morning/evening JSONB fields — same modal,
     but the "field" being corrected is a JSON object rather than a flat
     column, and the period name (Morning/Evening) is shown instead of a
     generic column label. */
  function openJsonCorrection(row, jsonKey) {
    if (!isAdmin()) { toast("Only an administrator can correct attendance timestamps.", "bad"); return; }
    var pair = ATT.jsonFields.filter(function (f) { return f[0] === jsonKey; })[0] || [jsonKey, labelize(jsonKey)];
    var periodLabel = jsonKey.charAt(0).toUpperCase() + jsonKey.slice(1);
    var d = rowDate(row);
    var obj = row[jsonKey] && typeof row[jsonKey] === "object" ? row[jsonKey] : null;
    var cur = { date: d || "", time: "" };
    if (obj && obj.at !== undefined && obj.at !== null) {
      var epoch = Number(obj.at);
      if (!isNaN(epoch)) {
        var dt = new Date(epoch);
        if (!isNaN(dt.getTime())) {
          cur.date = dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
          cur.time = pad(dt.getHours()) + ":" + pad(dt.getMinutes());
        }
      }
    }

    ATT.pending = {
      row: row, field: jsonKey, label: periodLabel, jsonField: true, jsonOriginal: obj,
      original: obj ? JSON.stringify(obj) : null,
      originalText: jsonTimeText(row[jsonKey], d),
      timeOnly: false, dateOnly: false, recordDate: d
    };
    ATT.step = 1;

    $("attCorrStaff").textContent = displayName(ATT.staff);
    $("attCorrFieldLabel").textContent = "Attendance period";
    $("attCorrField").textContent = periodLabel;
    $("attCorrTitle").textContent = "Correct attendance timestamp";
    var tf = $("attNewTimeField"); if (tf) tf.hidden = false;
    $("attCorrOriginal").textContent = ATT.pending.originalText;
    $("attNewDate").value = cur.date;
    $("attNewTime").value = cur.time;
    $("attReason").value = "";
    $("attReasonOther").value = "";
    $("attReasonOtherField").hidden = true;
    $("attCorrError").hidden = true;
    $("attStep1").hidden = false;
    $("attStep2").hidden = true;
    $("attContinue").hidden = false;
    $("attConfirm").hidden = true;
    $("attBack").hidden = true;
    $("attBackdrop").hidden = false;
    document.body.classList.add("modal-open");
  }

  function correctionReason() {
    var r = $("attReason").value;
    if (!r) return null;
    if (r === "Other") {
      var t = $("attReasonOther").value.trim();
      return t ? "Other — " + t : null;
    }
    return r;
  }

  function toStep2() {
    var p = ATT.pending;
    if (!p) return;
    var date = $("attNewDate").value;
    var time = $("attNewTime").value;
    var reason = correctionReason();
    var err = $("attCorrError");

    if (!date || (!time && !p.dateOnly)) { err.hidden = false; err.textContent = p.dateOnly ? "Enter the correct date." : "Enter both the correct date and the correct time."; return; }
    if (!reason) { err.hidden = false; err.textContent = "Select a reason for this correction. If you choose Other, describe it briefly."; return; }
    if (reason.length > 300) { err.hidden = false; err.textContent = "Keep the reason under 300 characters."; return; }
    err.hidden = true;

    p.newDate = date;
    p.newTime = time;
    p.reason = reason;

    if (p.jsonField) {
      var epochMs = buildLocalEpoch(date, time);
      if (epochMs === null) { err.hidden = false; err.textContent = "That date and time couldn't be understood."; return; }
      var merged = {};
      if (p.jsonOriginal) {
        for (var k in p.jsonOriginal) { if (Object.prototype.hasOwnProperty.call(p.jsonOriginal, k)) merged[k] = p.jsonOriginal[k]; }
      }
      merged.at = epochMs;
      merged.time = to12Hour(new Date(epochMs));
      p.newValue = merged;
      p.newText = ukDate(date) + " — " + merged.time;
    } else {
      p.newValue = p.dateOnly ? date : (p.timeOnly ? time + ":00" : date + "T" + time + ":00");
      p.newText = p.dateOnly ? ukDate(date) : ukDate(date) + " — " + time;
    }

    $("sumStaff").textContent = displayName(ATT.staff);
    $("sumFieldLabel").textContent = p.jsonField ? "Attendance period" : "Field";
    $("sumField").textContent = p.label;
    $("sumOriginal").textContent = p.originalText;
    $("sumNew").textContent = p.newText;
    $("sumReason").textContent = p.reason;

    ATT.step = 2;
    $("attStep1").hidden = true;
    $("attStep2").hidden = false;
    $("attContinue").hidden = true;
    $("attConfirm").hidden = false;
    $("attBack").hidden = false;
    $("attConfirm").focus();
  }

  async function submitCorrection() {
    var p = ATT.pending;
    if (!p) return;
    var btn = $("attConfirm");
    busy(btn, true);
    loader(true);

    /* Flat timestamp columns keep using the existing, unmodified RPC. The
       morning/evening JSONB fields call a dedicated function instead — see
       SUPABASE-SETUP.sql — since writing into a JSONB column safely (without
       clobbering the sibling keys) needs different SQL than a plain column
       update, and correct_attendance_timestamp() was never built for that. */
    var res = p.jsonField
      ? await sb.rpc("correct_attendance_period_timestamp", {
          p_table: ATT.table,
          p_record_id: p.row.id,
          p_period: p.field,
          p_new_value: JSON.stringify(p.newValue),
          p_new_date: ATT.dateKey ? p.newDate : null,
          p_reason: p.reason
        })
      : await sb.rpc("correct_attendance_timestamp", {
          p_table: ATT.table,
          p_record_id: p.row.id,
          p_field: p.field,
          p_new_value: p.newValue,
          p_new_date: ATT.dateKey && !p.timeOnly ? p.newDate : (ATT.dateKey ? p.newDate : null),
          p_reason: p.reason
        });

    busy(btn, false);
    loader(false);

    if (res.error) {
      var err = $("attCorrError");
      err.hidden = false;
      err.textContent = (p.jsonField && /function .*correct_attendance_period_timestamp.* does not exist/i.test(res.error.message || ""))
        ? "This database doesn't have the correct_attendance_period_timestamp function yet — it needs to be added in the Supabase SQL editor before Morning/Evening corrections can be saved."
        : (res.error.message || "The correction was refused by the database.");
      $("attStep1").hidden = false;
      $("attStep2").hidden = true;
      $("attContinue").hidden = false;
      $("attConfirm").hidden = true;
      $("attBack").hidden = true;
      return;
    }

    closeAtt();
    toast("Timestamp corrected and recorded for audit.", "good");
    loadAttendance();
  }

  function initAttendance() {
    var root = $("tab-attendance");
    if (!root || root.getAttribute("data-ready") === "1") return;
    root.setAttribute("data-ready", "1");

    $("attStaffResults").hidden = false;
    var t;
    $("attSearch").addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(renderAttStaffResults, 140);
    });
    $("attStaffResults").addEventListener("click", function (e) {
      var b = e.target.closest("[data-staff]");
      if (!b) return;
      var row = USERS.rows[Number(b.getAttribute("data-staff"))];
      if (row) selectAttStaff(row);
    });
    $("attClear").addEventListener("click", clearAttStaff);
    $("attRefresh").addEventListener("click", function () { loadAttendance(); });
    ["attDate", "attFrom", "attTo"].forEach(function (id) {
      $(id).addEventListener("change", function () { loadAttendance(); });
    });
    $("attStatus").addEventListener("change", renderAttendance);
    $("attFilterReset").addEventListener("click", function () {
      $("attDate").value = ""; $("attFrom").value = ""; $("attTo").value = "";
      if (ATT.statusKey) $("attStatus").value = "";
      loadAttendance();
    });

    $("attRecords").addEventListener("click", function (e) {
      var dd = e.target.closest("[data-editdate]");
      if (dd) {
        var drow = ATT.rows[Number(dd.getAttribute("data-editdate"))];
        if (drow && ATT.dateKey) openCorrection(drow, ATT.dateKey, { dateOnly: true });
        return;
      }
      var jb = e.target.closest("[data-editjson]");
      if (jb) {
        var jrow = ATT.rows[Number(jb.getAttribute("data-editjson"))];
        var jkey = jb.getAttribute("data-jsonfield");
        if (jrow && jkey) openJsonCorrection(jrow, jkey);
        return;
      }
      var b = e.target.closest("[data-edit]");
      if (!b) return;
      var row = ATT.rows[Number(b.getAttribute("data-edit"))];
      if (row) openCorrection(row, b.getAttribute("data-field"));
    });

    $("attReason").addEventListener("change", function () {
      $("attReasonOtherField").hidden = $("attReason").value !== "Other";
    });
    $("attContinue").addEventListener("click", toStep2);
    $("attConfirm").addEventListener("click", submitCorrection);
    $("attBack").addEventListener("click", function () {
      ATT.step = 1;
      $("attStep1").hidden = false;
      $("attStep2").hidden = true;
      $("attContinue").hidden = false;
      $("attConfirm").hidden = true;
      $("attBack").hidden = true;
    });
    $("attCancel").addEventListener("click", closeAtt);
    $("attBackdrop").addEventListener("click", function (e) {
      if (e.target === $("attBackdrop")) closeAtt();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("attBackdrop").hidden) closeAtt();
    });

    $("attReason").innerHTML = '<option value="">Select a reason…</option>' +
      REASONS.map(function (r) { return '<option value="' + r + '">' + r + "</option>"; }).join("");

    $("attNote").textContent = isAdmin()
      ? "Corrections are executed by the database, which records the original value, the new value, your account and your reason."
      : "Your account can review attendance records. Only an administrator can correct a timestamp.";
  }


  /* ------------------------- Phase 6: IT / system management -------------------------
     A controlled administration surface over the data the main website already
     owns. Nothing here is a generic database editor: only the fields listed in
     EDIT_FIELDS, the account status column, the attendance timestamps handled in
     Phase 4 and the key/value application settings table can be written, and
     every write goes through a security-definer function that re-checks the
     caller is an administrator (with a direct, RLS-protected update as fallback).
     Authentication data (passwords, emails, sessions) is never touched in the
     database — password resets go through Supabase Auth. */

  var EDIT_FIELDS = [
    { keys: TITLE_NAME_KEYS, label: "Title", max: 4, type: "select", options: ["Mr", "Mrs", "Miss"] },
    { keys: FIRST_NAME_KEYS, label: "First Name", max: 80 },
    { keys: LAST_NAME_KEYS, label: "Last Name", max: 80 },
    { keys: PHONE_KEYS, label: "Phone number", max: 32 },
    { keys: TITLE_KEYS, label: "Position / job title", max: 80 },
    { keys: DEPT_KEYS, label: "Department", max: 80 },
    { keys: TYPE_KEYS, label: "Employment type", max: 40 },
    { keys: ["address"], label: "Address", max: 200 }
  ];

  var EDIT = { avatarFile: null, cols: [] };

  /* First column of a group that actually exists on the record. */
  function colOf(row, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(row, keys[i])) return keys[i];
    }
    return null;
  }
  function rowId(row) { return row.id || row.user_id; }
  function txt(v) { return (v === null || v === undefined || String(v).trim() === "") ? "—" : String(v); }

  /* ---------- generic “existing value → new value” confirmation ---------- */
  var CHANGE = null;

  function closeChange() {
    CHANGE = null;
    $("changeBackdrop").hidden = true;
    document.body.classList.remove("modal-open");
  }

  /* opts: { title, lede, rows:[[label, oldText, newText]], needReason, onConfirm(reason) } */
  function openChange(opts) {
    CHANGE = opts;
    $("changeTitle").textContent = opts.title || "Confirm changes";
    $("changeLede").textContent = opts.lede || "Review the existing value against the new value before saving.";
    $("changeDiff").innerHTML =
      '<div class="diff-row diff-head"><span>Field</span><span>Existing value</span><span>New value</span></div>' +
      opts.rows.map(function (r) {
        return '<div class="diff-row"><span class="diff-label">' + esc(r[0]) + "</span>" +
          '<span class="diff-old">' + esc(txt(r[1])) + "</span>" +
          '<span class="diff-new">' + esc(txt(r[2])) + "</span></div>";
      }).join("");
    $("changeReasonField").hidden = !opts.needReason;
    $("changeReason").value = "";
    $("changeError").hidden = true;
    $("changeBackdrop").hidden = false;
    document.body.classList.add("modal-open");
  }

  async function runChange() {
    if (!CHANGE) return;
    var reason = $("changeReason").value.trim();
    if (CHANGE.needReason && !reason) {
      var e0 = $("changeError"); e0.hidden = false; e0.textContent = "Enter a reason for this change.";
      return;
    }
    var btn = $("changeOk");
    busy(btn, true);
    loader(true);
    var res;
    try { res = await CHANGE.onConfirm(reason); }
    catch (ex) { res = { error: { message: ex && ex.message ? ex.message : String(ex) } }; }
    busy(btn, false);
    loader(false);
    if (res && res.error) {
      var el = $("changeError");
      el.hidden = false;
      el.textContent = res.error.message || "The change was refused by the database.";
      return;
    }
    var done = CHANGE.done;
    closeChange();
    if (done) done();
  }

  /* Calls an admin security-definer function; falls back to a direct,
     RLS-protected write when the function is not installed yet. */
  function missingFunction(err) {
    var m = ((err && err.message) || "").toLowerCase();
    return (err && (err.code === "42883" || err.code === "PGRST202")) ||
      m.indexOf("could not find the function") !== -1 ||
      m.indexOf("does not exist") !== -1;
  }

  /* ---------- Phase 7: account & password support ----------
     Lets an authorised administrator help staff with sign-in problems without
     ever seeing, storing or choosing a password. Passwords are handled only by
     Supabase Authentication; the portal simply asks Auth to email a recovery
     link. Account status is a profile-record flag (never a user deletion), and
     every write is re-checked in Postgres by a security-definer function. */
  function isActiveRow(row) {
    var col = colOf(row, STATUS_KEYS);
    if (!col) return true;
    var v = row[col];
    if (v === null || v === undefined || String(v).trim() === "") return true;
    if (typeof v === "boolean") return v;
    return ["active", "enabled", "true", "yes", "1"].indexOf(String(v).toLowerCase()) !== -1;
  }

  function isSelf(row) { return !!(ME.user && rowId(row) === ME.user.id); }

  function renderAccountPanel(row) {
    var col = colOf(row, STATUS_KEYS);
    var active = isActiveRow(row);
    var email = pick(row, EMAIL_KEYS);
    var name = displayName(row);
    var admin = isAdmin();

    /* identity summary */
    var av = $("acctAvatar");
    if (av) av.outerHTML = avatarHtml(row, true).replace('class="avatar avatar-lg"', 'class="avatar avatar-lg" id="acctAvatar"');
    $("acctName").textContent = name;
    $("acctEmail").textContent = email ? String(email) : "No email on record";
    $("acctSub").textContent = [roleLabel(roleOf(row)), active ? "Account active" : "Account deactivated",
      pick(row, DEPT_KEYS), pick(row, STAFF_KEYS) ? "Staff ID " + pick(row, STAFF_KEYS) : null]
      .filter(Boolean).join(" · ");

    kv("kvAccountState", [
      ["Access", pill(active ? "Active" : "Deactivated", active ? "ok" : "bad"), true],
      ["Sign-in email", txt(email)],
      ["Current role", roleLabel(roleOf(row))],
      ["Status stored in", col ? labelize(col) : "Not tracked on this record"],
      ["Password", "Held only by Supabase Authentication"],
      ["User ID", txt(rowId(row))],
      ["Last updated", fmtValue(row.updated_at)]
    ]);

    $("accountActions").hidden = !admin;
    $("acctToggle").hidden = !(admin && col);
    $("acctToggle").textContent = active ? "Deactivate account" : "Activate account";
    $("acctReset").hidden = !(admin && email);
    $("acctRecheck").hidden = !admin;
    $("acctEmailBtn").hidden = !(admin && isSelf(row));

    $("accountNote").textContent = !admin
      ? "Your account can review account details. Only an administrator may send a password reset or change account status."
      : (col
        ? "Sending a reset emails " + name + " a Supabase Authentication recovery link — you never see or set the password. Deactivating removes platform access without deleting the account."
        : "This installation does not store an account status field, so access cannot be activated or deactivated from the portal. Password resets are still available.");
  }

  function accountStatusValue(row, active) {
    var col = colOf(row, STATUS_KEYS);
    var cur = row[col];
    if (typeof cur === "boolean" || col === "is_active" || col === "active") return active;
    return active ? "active" : "inactive";
  }

  async function writeAccountStatus(row, active) {
    var id = rowId(row);
    /* Never fall back to a profile-only update: deactivation must also reach
       Supabase Authentication so the credentials can no longer establish a session. */
    return await sb.rpc("admin_set_account_status", { p_user_id: id, p_active: active });
  }

  /* ---------- confirmation screen for sensitive account actions ---------- */
  var ACCT = null;

  function closeAcct() {
    ACCT = null;
    $("acctBackdrop").hidden = true;
    document.body.classList.remove("modal-open");
  }

  /* opts: { title, body, rows, okLabel, needEmail, onConfirm(value), done } */
  function openAcct(opts) {
    ACCT = opts;
    $("acctConfirmTitle").textContent = opts.title;
    $("acctConfirmBody").textContent = opts.body || "";
    $("acctConfirmKv").innerHTML = (opts.rows || []).map(function (r) {
      return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(txt(r[1])) + "</dd></div>";
    }).join("");
    $("acctConfirmInputField").hidden = !opts.needEmail;
    $("acctConfirmInput").value = "";
    $("acctConfirmOk").textContent = opts.okLabel || "Confirm";
    $("acctConfirmError").hidden = true;
    $("acctBackdrop").hidden = false;
    document.body.classList.add("modal-open");
    $("acctConfirmOk").focus();
  }

  async function runAcct() {
    if (!ACCT) return;
    var job = ACCT;
    var value = $("acctConfirmInput").value.trim();
    var err = $("acctConfirmError");
    if (job.needEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      err.hidden = false;
      err.textContent = "Enter a valid email address.";
      return;
    }
    var btn = $("acctConfirmOk");
    busy(btn, true);
    loader(true);
    var res;
    try { res = await job.onConfirm(value); }
    catch (ex) { res = { error: { message: ex && ex.message ? ex.message : String(ex) } }; }
    busy(btn, false);
    loader(false);
    if (res && res.error) {
      err.hidden = false;
      err.textContent = res.error.message || "The request was refused.";
      return;
    }
    var done = job.done;
    closeAcct();
    if (done) done();
  }

  /* ---------- password reset (Supabase Auth recovery only) ---------- */
  function askReset() {
    var row = USERS.current;
    if (!row || !isAdmin()) return;
    var email = pick(row, EMAIL_KEYS);
    if (!email) { toast("This record has no email address, so a reset cannot be sent.", "bad"); return; }
    var name = displayName(row);
    openAcct({
      title: "Reset password for " + name + "?",
      body: "Supabase Authentication will email " + name + " a secure recovery link. No password is shown to you, chosen by you, or stored in the application database.",
      rows: [
        ["Staff member", name],
        ["Recovery email", String(email)],
        ["Action", "Send Supabase Authentication reset link"],
        ["Requested by", (ME.user && ME.user.email) || "—"]
      ],
      okLabel: "Yes, send reset email",
      onConfirm: function () {
        return sb.auth.resetPasswordForEmail(String(email), { redirectTo: location.origin + "/index.html" });
      },
      done: function () { toast("Password reset link sent to " + email + ".", "good"); }
    });
  }

  /* ---------- account status ---------- */
  function askAccountToggle() {
    var row = USERS.current;
    if (!row || !isAdmin()) return;
    var active = isActiveRow(row);
    var name = displayName(row);
    if (isSelf(row) && active) { toast("You cannot deactivate your own account.", "bad"); return; }
    openAcct({
      title: (active ? "Deactivate account for " : "Activate account for ") + name + "?",
      body: active
        ? "This removes platform access for " + name + ". The account is not deleted and no sign-in credentials are changed."
        : "This restores platform access for " + name + ". Sign-in credentials are unchanged.",
      rows: [
        ["Staff member", name],
        ["Current status", active ? "Active" : "Deactivated"],
        ["New status", active ? "Deactivated" : "Active"],
        ["Account record", "Kept — never deleted"]
      ],
      okLabel: active ? "Yes, deactivate" : "Yes, activate",
      onConfirm: function () { return writeAccountStatus(row, !active); },
      done: function () {
        toast(active ? "Account deactivated." : "Account activated.", "good");
        refreshUser(rowId(row));
      }
    });
  }

  /* Re-reads the record so the administrator can confirm the live status. */
  async function recheckAccount() {
    var row = USERS.current;
    if (!row) return;
    loader(true);
    var res = await sb.from("profiles").select("*").eq("id", rowId(row)).maybeSingle();
    loader(false);
    if (res.error || !res.data) { toast("The account status could not be re-checked.", "bad"); return; }
    for (var i = 0; i < USERS.rows.length; i++) {
      if (rowId(USERS.rows[i]) === rowId(row)) { USERS.rows[i] = res.data; break; }
    }
    USERS.current = res.data;
    renderAccountPanel(res.data);
    toast(isActiveRow(res.data) ? "Account is currently active." : "Account is currently deactivated.", isActiveRow(res.data) ? "good" : "bad");
  }

  /* ---------- sign-in email change ----------
     Authentication emails are never overwritten from the profile editor. The
     change is requested through Supabase Authentication, which emails the
     verification links; the profile email is only refreshed once Auth confirms. */
  function askEmailChange() {
    var row = USERS.current;
    if (!row || !isAdmin() || !isSelf(row)) return;
    openAcct({
      title: "Change your sign-in email?",
      body: "Supabase Authentication will email verification links to both addresses. The change only takes effect after you confirm, which keeps the profile email and the authentication email consistent.",
      rows: [
        ["Account", displayName(row)],
        ["Current sign-in email", (ME.user && ME.user.email) || txt(pick(row, EMAIL_KEYS))],
        ["Process", "Supabase Authentication verification"]
      ],
      okLabel: "Send verification",
      needEmail: true,
      onConfirm: function (value) {
        return sb.auth.updateUser({ email: value });
      },
      done: function () { toast("Verification sent. The email changes only after both addresses are confirmed.", "good"); }
    });
  }

  /* ---------- profile management ---------- */
  function renderProfileEditor(row) {
    var box = $("profileEditFields");
    EDIT.avatarFile = null;
    EDIT.cols = [];

    if (!isAdmin()) {
      box.innerHTML = "";
      $("profileAvatarRow").hidden = true;
      $("profileEditActions").hidden = true;
      $("profileEditNote").textContent =
        "Your account can review profile details. Only an administrator can edit them, and the database enforces that rule.";
      return;
    }

    EDIT_FIELDS.forEach(function (f) {
      var col = colOf(row, f.keys);
      if (col) {
        EDIT.cols.push({ col: col, label: f.label, max: f.max, type: f.type, options: f.options });
      }
    });

    box.innerHTML = EDIT.cols.map(function (f) {
      var v = row[f.col];
      var value = v === null || v === undefined ? "" : String(v);
      if (f.type === "select") {
        return '<div class="field"><label for="pf_' + esc(f.col) + '">' + esc(f.label) + '</label>' +
          '<select id="pf_' + esc(f.col) + '" data-col="' + esc(f.col) + '">' +
          '<option value="">Select title…</option>' + f.options.map(function (o) {
            return '<option value="' + esc(o) + '"' + (value === o ? ' selected' : '') + '>' + esc(o) + '</option>';
          }).join("") + '</select></div>';
      }
      return '<div class="field"><label for="pf_' + esc(f.col) + '">' + esc(f.label) + "</label>" +
        '<input id="pf_' + esc(f.col) + '" data-col="' + esc(f.col) + '" type="text" maxlength="' + f.max +
        '" value="' + esc(value) + '" /></div>';
    }).join("") || '<p class="edit-hint">No editable profile fields are stored on this record.</p>';

    var avatarCol = colOf(row, AVATAR_KEYS);
    $("profileAvatarRow").hidden = !avatarCol;
    $("avatarFile").value = "";
    $("profileEditActions").hidden = !(EDIT.cols.length || avatarCol);
    $("profileEditNote").textContent =
      "These are the only profile fields the portal may change. The sign-in (authentication) email is deliberately not editable here — use Account & password support. Saving updates the existing staff record — no duplicate profile is created — and the main website shows the new details immediately.";
  }

  async function uploadAvatar(row, file) {
    var id = rowId(row);
    var ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    var path = id + "/" + Date.now() + "." + (ext || "png");
    var up = await sb.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) return { error: up.error };
    var pub = sb.storage.from("avatars").getPublicUrl(path);
    return { url: (pub && pub.data && pub.data.publicUrl) || path };
  }

  async function writeProfile(id, patch) {
    /* The database RPC is authoritative. Verify the actual row after the
       write so the portal never reports success when a field did not persist. */
    var res = await sb.rpc("admin_update_profile", { p_user_id: id, p_changes: patch });
    if (res.error && missingFunction(res.error)) {
      res = await sb.from("profiles").update(patch).eq("id", id).select("*").maybeSingle();
    }
    if (res.error) return res;

    var check = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    if (check.error) return check;
    if (!check.data) return { error: { message: "The profile could not be found after saving." } };

    var mismatches = [];
    Object.keys(patch).forEach(function (key) {
      var expected = patch[key] == null ? null : String(patch[key]);
      var actual = check.data[key] == null ? null : String(check.data[key]);
      if (expected !== actual) mismatches.push(key);
    });
    if (mismatches.length) {
      return { error: { message: "The database did not persist these profile fields: " + mismatches.join(", ") + ". Please run the updated SUPABASE-TITLE-FIRST-LAST-FIX.sql." } };
    }
    return { data: check.data };
  }

  function askProfileSave() {
    var row = USERS.current;
    if (!row || !isAdmin()) return;

    var diffs = [];
    var patch = {};
    EDIT.cols.forEach(function (f) {
      var input = document.getElementById("pf_" + f.col);
      if (!input) return;
      var next = input.value.trim();
      var cur = row[f.col] === null || row[f.col] === undefined ? "" : String(row[f.col]);
      if (next === cur.trim()) return;
      if (next.length > f.max) return;
      patch[f.col] = next === "" ? null : next;
      diffs.push([f.label, cur, next]);
    });

    var file = EDIT.avatarFile;
    var avatarCol = colOf(row, AVATAR_KEYS);
    if (file && avatarCol) diffs.push(["Profile picture", "Current picture", file.name]);

    if (!diffs.length) { toast("Nothing has been changed yet.", "bad"); return; }

    openChange({
      title: "Confirm profile changes",
      lede: "These values will replace the current profile details on the staff record.",
      rows: diffs,
      needReason: false,
      onConfirm: async function () {
        if (file && avatarCol) {
          var up = await uploadAvatar(row, file);
          if (up.error) return { error: up.error };
          patch[avatarCol] = up.url;
        }
        return writeProfile(rowId(row), patch);
      },
      done: function () {
        toast("Profile updated. The main website now shows the new details.", "good");
        refreshUser(rowId(row));
      }
    });
  }

  /* Re-reads one record so the portal never shows a stale value. */
  async function refreshUser(id) {
    var res = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    if (res.error || !res.data) { loadUsers(true); return; }
    for (var i = 0; i < USERS.rows.length; i++) {
      if (rowId(USERS.rows[i]) === id) { USERS.rows[i] = res.data; break; }
    }
    renderUsers();
    openUserProfile(res.data);
  }

  function initProfileTools() {
    var panel = $("profileEditPanel");
    if (!panel || panel.getAttribute("data-ready") === "1") return;
    panel.setAttribute("data-ready", "1");

    $("profileSave").addEventListener("click", askProfileSave);
    $("profileReset").addEventListener("click", function () {
      if (USERS.current) renderProfileEditor(USERS.current);
    });
    $("avatarFile").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) { EDIT.avatarFile = null; return; }
      if (f.size > 20 * 1024 * 1024) { toast("Choose an image under 20 MB.", "bad"); e.target.value = ""; return; }
      if (["image/png", "image/jpeg", "image/webp"].indexOf(f.type) === -1) {
        toast("Only PNG, JPG or WebP images are accepted.", "bad"); e.target.value = ""; return;
      }
      EDIT.avatarFile = f;
    });
    $("acctToggle").addEventListener("click", askAccountToggle);
    $("acctReset").addEventListener("click", askReset);
    $("acctRecheck").addEventListener("click", recheckAccount);
    $("acctEmailBtn").addEventListener("click", askEmailChange);

    $("acctConfirmCancel").addEventListener("click", closeAcct);
    $("acctConfirmOk").addEventListener("click", runAcct);
    $("acctBackdrop").addEventListener("click", function (e) {
      if (e.target === $("acctBackdrop")) closeAcct();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("acctBackdrop").hidden) closeAcct();
    });

    $("changeCancel").addEventListener("click", closeChange);
    $("changeOk").addEventListener("click", runChange);
    $("changeBackdrop").addEventListener("click", function (e) {
      if (e.target === $("changeBackdrop")) closeChange();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("changeBackdrop").hidden) closeChange();
    });
  }

  /* ---------- Phase 8: controlled application settings ---------- */
  /*
     IMPORTANT:
     This is deliberately NOT a generic database editor. The portal reads only
     public.app_settings and only rows explicitly registered there. The database
     RPC is the authority for writes and re-checks the caller's role and the
     setting's editable_by/sensitive flags on every request.
  */
  var SETTINGS = {
    rows: [],
    loaded: false,
    loading: false
  };

  function settingValueText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function settingDisplayValue(value, type) {
    if (value === null || value === undefined || value === "") return "Not set";
    if (type === "boolean") return value ? "Enabled" : "Disabled";
    return settingValueText(value);
  }

  function settingOptions(row) {
    if (!row.options) return [];
    if (Array.isArray(row.options)) return row.options;
    try {
      var parsed = typeof row.options === "string" ? JSON.parse(row.options) : row.options;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function settingInputHtml(row, i) {
    var type = String(row.data_type || "text").toLowerCase();
    var value = row.value;
    var disabled = !isAdmin() && !(
      ME.role === "it_support" &&
      Array.isArray(row.editable_by) &&
      row.editable_by.indexOf("it_support") !== -1 &&
      !row.is_sensitive
    );
    var dis = disabled ? " disabled" : "";
    var id = "st_" + i;
    var val = settingValueText(value);

    if (type === "boolean") {
      return '<label class="setting-toggle" for="' + id + '">' +
        '<input id="' + id + '" data-setting="' + i + '" type="checkbox"' +
        (value === true ? " checked" : "") + dis + ' />' +
        '<span>Enabled</span></label>';
    }

    if (type === "number") {
      return '<input id="' + id + '" data-setting="' + i + '" type="number" step="any" value="' +
        esc(val) + '"' + dis + ' />';
    }

    if (type === "date") {
      return '<input id="' + id + '" data-setting="' + i + '" type="date" value="' +
        esc(val) + '"' + dis + ' />';
    }

    if (type === "datetime") {
      var dtVal = val;
      try {
        if (dtVal) {
          var d = new Date(dtVal);
          if (!isNaN(d.getTime())) dtVal = d.toISOString().slice(0,16);
        }
      } catch (e) {}
      return '<input id="' + id + '" data-setting="' + i + '" type="datetime-local" value="' +
        esc(dtVal) + '"' + dis + ' />';
    }

    if (type === "select") {
      return '<select id="' + id + '" data-setting="' + i + '"' + dis + '>' +
        settingOptions(row).map(function (o) {
          var ov = typeof o === "object" ? o.value : o;
          var ol = typeof o === "object" ? (o.label || o.value) : o;
          return '<option value="' + esc(String(ov)) + '"' +
            (String(ov) === String(value == null ? "" : value) ? " selected" : "") + '>' +
            esc(String(ol)) + '</option>';
        }).join("") + '</select>';
    }

    return '<input id="' + id + '" data-setting="' + i + '" type="text" maxlength="500" value="' +
      esc(val) + '"' + dis + ' />';
  }

  function settingReadInput(row, i) {
    var input = $("st_" + i);
    if (!input) return null;
    var type = String(row.data_type || "text").toLowerCase();

    if (type === "boolean") return !!input.checked;
    if (type === "number") {
      if (input.value.trim() === "") return null;
      var n = Number(input.value);
      return isFinite(n) ? n : NaN;
    }
    if (type === "date") return input.value || null;
    if (type === "datetime") return input.value ? new Date(input.value).toISOString() : null;
    if (type === "select") return input.value;
    return input.value.trim();
  }

  function renderSettings() {
    var list = $("settingsList");
    var rows = SETTINGS.rows || [];
    if (!rows.length) {
      list.innerHTML =
        '<div class="settings-empty">' +
        '<h3>No supported settings are configured</h3>' +
        '<p>The current website source does not expose a system configuration value that can safely be controlled from this portal yet. No placeholder settings have been invented.</p>' +
        '</div>';
      $("settingsActions").hidden = true;
      $("settingsState").textContent = "0 supported settings";
      return;
    }

    var categories = {};
    rows.forEach(function (r, i) {
      var cat = r.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push([r, i]);
    });

    $("settingsState").textContent = rows.length + " supported setting" + (rows.length === 1 ? "" : "s") + ".";
    list.innerHTML = Object.keys(categories).sort().map(function (cat) {
      return '<div class="settings-category">' +
        '<h3>' + esc(cat) + '</h3>' +
        categories[cat].map(function (pair) {
          var r = pair[0], i = pair[1];
          var editable = isAdmin() || (
            ME.role === "it_support" &&
            Array.isArray(r.editable_by) &&
            r.editable_by.indexOf("it_support") !== -1 &&
            !r.is_sensitive
          );
          var sensitive = r.is_sensitive ? '<p class="setting-security">Sensitive setting — Administrator only</p>' : "";
          return '<div class="setting-row">' +
            '<div class="setting-meta"><h4>' + esc(r.label || labelize(String(r.key))) + '</h4>' +
            (r.description ? '<p>' + esc(r.description) + '</p>' : '') +
            '<p class="setting-current">Current value: <strong>' + esc(settingDisplayValue(r.value, r.data_type)) + '</strong></p>' +
            sensitive + '</div>' +
            '<div class="field"><label for="st_' + i + '" class="sr-label">New value</label>' +
            settingInputHtml(r, i) + '</div>' +
            (editable && r.default_value !== null && r.default_value !== undefined
              ? '<button type="button" class="link-muted setting-reset" data-reset-setting="' + i + '">Restore default</button>'
              : '') +
            '</div>';
        }).join("") +
      '</div>';
    }).join("");

    $("settingsActions").hidden = !rows.some(function (r) {
      return isAdmin() || (
        ME.role === "it_support" &&
        Array.isArray(r.editable_by) &&
        r.editable_by.indexOf("it_support") !== -1 &&
        !r.is_sensitive
      );
    });
  }

  async function loadSettings() {
    if (SETTINGS.loading) return;
    SETTINGS.loading = true;
    $("settingsState").textContent = "Loading supported settings…";
    try {
      var res = await sb.from("app_settings")
        .select("key,label,description,category,data_type,options,value,default_value,editable_by,is_sensitive,updated_at")
        .order("category", { ascending: true })
        .order("label", { ascending: true });

      if (res.error) {
        SETTINGS.rows = [];
        $("settingsList").innerHTML = "";
        $("settingsActions").hidden = true;
        $("settingsState").textContent = "Settings could not be loaded: " + res.error.message;
        return;
      }

      SETTINGS.rows = res.data || [];
      SETTINGS.loaded = true;
      renderSettings();
    } finally {
      SETTINGS.loading = false;
    }
  }

  async function writeSetting(key, value) {
    return await sb.rpc("support_update_setting", {
      p_key: key,
      p_value: value
    });
  }

  async function resetSetting(key) {
    return await sb.rpc("support_reset_setting", {
      p_key: key
    });
  }

  function canEditSetting(row) {
    return isAdmin() || (
      ME.role === "it_support" &&
      Array.isArray(row.editable_by) &&
      row.editable_by.indexOf("it_support") !== -1 &&
      !row.is_sensitive
    );
  }

  function askSettingsSave() {
    var diffs = [], jobs = [];
    SETTINGS.rows.forEach(function (r, i) {
      if (!canEditSetting(r)) return;
      var next = settingReadInput(r, i);
      if (next !== null && typeof next === "number" && isNaN(next)) {
        toast((r.label || r.key) + " must be a valid number.", "bad");
        return;
      }
      var current = r.value;
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      diffs.push([r.label || labelize(r.key), settingDisplayValue(current, r.data_type), settingDisplayValue(next, r.data_type)]);
      jobs.push({ key: r.key, value: next });
    });

    if (!diffs.length) {
      toast("No setting has been changed.", "bad");
      return;
    }

    openChange({
      title: "Confirm setting changes",
      lede: "Review the current and new values. Changes are applied only after you confirm.",
      rows: diffs,
      needReason: false,
      onConfirm: async function () {
        for (var i = 0; i < jobs.length; i++) {
          var res = await writeSetting(jobs[i].key, jobs[i].value);
          if (res.error) return { error: res.error };
        }
        return {};
      },
      done: function () {
        toast("Settings saved successfully.", "good");
        loadSettings();
      }
    });
  }

  function askSettingReset(index) {
    var r = SETTINGS.rows[index];
    if (!r || !canEditSetting(r)) return;

    openChange({
      title: "Restore default setting",
      lede: "Only this selected setting will be restored. No other setting will change.",
      rows: [[
        r.label || labelize(r.key),
        settingDisplayValue(r.value, r.data_type),
        settingDisplayValue(r.default_value, r.data_type)
      ]],
      needReason: false,
      onConfirm: async function () {
        return await resetSetting(r.key);
      },
      done: function () {
        toast("The selected setting was restored to its default.", "good");
        loadSettings();
      }
    });
  }

  function initSettings() {
    var root = $("tab-settings");
    if (!root || root.getAttribute("data-ready") === "1") return;
    root.setAttribute("data-ready", "1");

    $("settingsScope").textContent = isAdmin() ? "Administrator configuration" : "IT Support — safe settings only";
    $("settingsNote").textContent = isAdmin()
      ? "Only explicitly supported application settings are shown. The database re-checks your administrator role for every write."
      : "IT Support can edit only settings explicitly marked safe for that role. Sensitive settings remain Administrator-only.";

    $("settingsSave").addEventListener("click", askSettingsSave);
    $("settingsReload").addEventListener("click", loadSettings);
    $("settingsList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-reset-setting]");
      if (!b) return;
      askSettingReset(Number(b.getAttribute("data-reset-setting")));
    });

    loadSettings();
  }

  /* ---------- system management tab ---------- */
  function initSystem() {
    /* System management is optional. Some Tech-Support builds intentionally
       remove the System Check/System Status UI. Never let missing system
       elements stop the entire portal from rendering. */
    var root = $("tab-system");
    if (!root || root.getAttribute("data-ready") === "1") return;
    root.setAttribute("data-ready", "1");
    try { initProfileTools(); } catch (e) {}

    var scope = $("sysScope");
    var note = $("sysNote");
    if (scope) scope.textContent = isAdmin() ? "Administrator tools" : "IT Support view";
    if (note) note.textContent = isAdmin()
      ? "Everything below writes to the data the main website already uses. Only the fields shown here can be changed — there is no raw table access, no SQL and no service key in the browser, and the database re-checks your role on every write."
      : "IT Support accounts can review staff records, roles and attendance. Account, profile, correction and settings changes are reserved for administrators and are refused by the database for other roles.";

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]");
      if (!b) return;
      var target = document.querySelector('.nav button[data-tab="' + b.getAttribute("data-goto") + '"]');
      if (target) target.click();
    });
  }

  /* ------------------------- Phase 9: IT administration dashboard ------------------------- */
  var DASH = { loading:false, attendanceRows:[] };
  function localDateIso(){var d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
  function dashStatus(t,k){return '<strong class="'+(k==='ok'?'service-ok':k==='bad'?'service-bad':'service-warn')+'">'+esc(t)+'</strong>';}
  function renderDashboardStats(){var r=USERS.rows||[],c={admin:0,it_support:0,staff:0,active:0,inactive:0};r.forEach(function(x){var role=roleOf(x);if(role==='admin')c.admin++;else if(role==='it_support')c.it_support++;else c.staff++;var s=statusText(x).toLowerCase().replace(/[\s-]+/g,'_');if(s==='inactive'||s==='disabled'||s==='deactivated'||s==='false')c.inactive++;else c.active++;});$("statUsers").textContent=r.length;$("statAdmins").textContent=c.admin;$("statSupport").textContent=c.it_support;$("statStaff").textContent=c.staff;$("statActive").textContent=c.active;$("statInactive").textContent=c.inactive;}
  function attFlags(r){var i=false,o=false;ATT.fields.forEach(function(f){var v=r[f[0]];if(v==null||String(v).trim()==='')return;var l=f[1].toLowerCase();if(l.indexOf('clock-in')!==-1)i=true;if(l.indexOf('clock-out')!==-1)o=true;});['check_in','clock_in','time_in','resumption_time','resumption','sign_in_time'].forEach(function(k){if(r[k]!=null&&String(r[k]).trim()!=='')i=true;});['check_out','clock_out','time_out','closing_time','closing','sign_out_time'].forEach(function(k){if(r[k]!=null&&String(r[k]).trim()!=='')o=true;});if(r.morning!=null&&r.morning!=='')i=true;if(r.evening!=null&&r.evening!=='')o=true;return{in:i,out:o};}
  function renderRecentAttendance(rows){var b=$("recentAttendance"),s=$("recentAttendanceState");if(!rows.length){b.innerHTML='';s.textContent='No attendance activity was found for today.';return;}s.textContent='';b.innerHTML=rows.slice(0,6).map(function(r){var id=attStaffId(r),u=(USERS.rows||[]).find(function(x){return String(x.id||x.user_id)===String(id);}),f=attFlags(r),l=f.in&&f.out?'Clock-in and clock-out recorded':f.in?'Clock-in recorded':f.out?'Clock-out recorded':'Attendance record';var d=dashboardAttendanceTime(r);var date=rowDate(r);var stamp=d?dashboardDateTime(d):dashboardDateOnly(date||localDateIso());return '<div class="activity-item"><div class="activity-main"><div class="activity-title"><strong>'+esc(u?displayName(u):'Staff member')+'</strong><span class="activity-separator">—</span><span class="activity-action">'+esc(l)+'</span></div></div><time class="activity-time" datetime="'+esc(d?d.toISOString():(date||localDateIso()))+'">'+esc(stamp)+'</time></div>';}).join('');}
  function renderRecentProfiles(){var b=$("recentProfiles"),s=$("recentProfilesState"),r=(USERS.rows||[]).slice().sort(function(a,b){return new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0);}).slice(0,6);if(!r.length){b.innerHTML='';s.textContent='No profile or account updates are visible.';return;}s.textContent='';b.innerHTML=r.map(function(x){var w=x.updated_at||x.created_at,l=x.updated_at?'Profile updated':'Account created';var d=new Date(w);var stamp=!isNaN(d.getTime())?dashboardDateTime(d):String(w);return '<div class="activity-item"><div class="activity-main"><div class="activity-title"><strong>'+esc(displayName(x))+'</strong><span class="activity-separator">—</span><span class="activity-action">'+esc(l)+' · '+esc(roleLabel(roleOf(x)))+'</span></div></div><time class="activity-time" datetime="'+esc(!isNaN(d.getTime())?d.toISOString():"")+'">'+esc(stamp)+'</time></div>';}).join('');}
  async function loadDashboardAttendance(){await detectAttendance();if(ATT.error){$("dashboardAttendanceState").textContent='Attendance service is not available to this account.';return{ok:false};}var q=sb.from(ATT.table).select('*').limit(1000);if(ATT.dateKey)q=q.eq(ATT.dateKey,localDateIso()).order(ATT.dateKey,{ascending:false});var r=await q;if(r.error){$("dashboardAttendanceState").textContent="Today's attendance could not be loaded.";return{ok:false};}DASH.attendanceRows=r.data||[];var i=0,o=0,m=0;DASH.attendanceRows.forEach(function(x){var f=attFlags(x);if(f.in)i++;if(f.out)o++;if(f.in&&!f.out)m++;});$("attendanceSummary").innerHTML='<div><span>Clock-ins</span><strong>'+i+'</strong></div><div><span>Clock-outs</span><strong>'+o+'</strong></div><div><span>Missing clock-outs</span><strong>'+m+'</strong></div>';$("dashboardAttendanceState").textContent=DASH.attendanceRows.length?DASH.attendanceRows.length+' attendance record'+(DASH.attendanceRows.length===1?'':'s')+' found today.':'No attendance records found for today.';renderRecentAttendance(DASH.attendanceRows);return{ok:true};}
  async function runDashboardChecks(){
    /* Deprecated: System Checks were removed from the dashboard. Keep this
       function harmless for older markup that may still contain a retry button. */
    return {ok:true, skipped:true};
  }
  async function loadDashboard(force){if(DASH.loading)return;DASH.loading=true;loader(true);try{if(force)await loadUsers(true);else if(!USERS.loaded)await loadUsers(false);renderDashboardStats();renderRecentProfiles();await loadDashboardAttendance();}catch(e){var st=$("dashboardAttendanceState");if(st)st.textContent='Some dashboard information could not be loaded. Please retry.';}finally{DASH.loading=false;loader(false);}}
  function removeDashboardQuickActions(){
    /* Remove ONLY the Quick Actions section. Leave all other dashboard markup and functionality unchanged. */
    var headings = document.querySelectorAll("#tab-overview h2, #tab-overview h3, #tab-overview .section-head");
    Array.prototype.forEach.call(headings, function(el){
      if (String(el.textContent || "").trim().toUpperCase() !== "QUICK ACTIONS") return;
      var section = el.closest(".section");
      if (section) section.remove();
      else el.remove();
    });
  }
  function removeDashboardSystemStatus(){
    var list=$("systemStatusList");
    if(!list) return;
    var panel=list.closest(".panel");
    if(panel) panel.remove(); else list.remove();
  }
  function initDashboard(){var root=$("tab-overview");if(!root||root.getAttribute('data-ready')==='1')return;root.setAttribute('data-ready','1');removeDashboardQuickActions();removeDashboardSystemStatus();var refresh=$("dashboardRefresh");if(refresh)refresh.addEventListener('click',function(){loadDashboard(true);});var retry=$("dashboardRetry");if(retry)retry.addEventListener('click',function(){runDashboardChecks();});root.addEventListener('click',function(e){var b=e.target.closest('[data-goto]');if(!b)return;var t=document.querySelector('.nav button[data-tab="'+b.getAttribute('data-goto')+'"]');if(t)t.click();});}

  /* ------------------------- portal render ------------------------- */
  async function renderPortal(user, access) {
    ME.user = user;
    ME.role = access.role;
    ME.allowed = access.allowed;

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

    initDashboard();
    initUsers();
    initRoleUi();
    initAttendance();
    initSystem();
    initSettings();
    // Start the ticket count immediately so the Support Tickets badge is populated
    // during the initial portal load rather than waiting for a later refresh.
    loadSupportTicketBadge();
    initSupportTickets();
    loadDashboard(false);

    only("portalView");
    var head = $("masthead");
    if (head) document.documentElement.style.setProperty("--header-h", head.offsetHeight + "px");
  }


  /* ------------------------- Support Tickets ------------------------- */
  var SUPPORT_TICKET_BUCKET = "support-ticket-attachments";
  var SUPPORT_TICKET_TYPES = ["Technical Issue","Login/Access Problem","Attendance Issue","Account/Profile Issue","System Error","Feature Request","Other"];
  var SUPPORT_TICKET_PRIORITIES = ["Low","Medium","High","Urgent"];
  var SUPPORT_TICKET_STATUSES = ["Open","In Progress","Resolved","Closed"];
  var SUPPORT_TICKETS = { rows: [], active: null, loaded: false, loading: false };

  function supportTicketNum(t){return t.ticket_number || "TKT-" + String(t.id||"").slice(0,8).toUpperCase();}
  function supportTicketDate(t){var d=new Date(t||"");return isNaN(d)?"—":d.toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});}
  function supportTicketStatusClass(s){return "support-status support-status-"+String(s||"Open").toLowerCase().replace(/\s+/g,"-");}
  function supportTicketPriorityClass(s){return "support-priority support-priority-"+String(s||"Medium").toLowerCase();}
  function supportTicketPerson(id){var x=(USERS.rows||[]).find(function(r){return String(r.id||r.user_id)===String(id);});return x||{full_name:"Staff member",email:"",avatar_url:""};}
  function supportTicketName(id){var x=supportTicketPerson(id);return displayName(x);}
  function supportTicketAvatar(id){var x=supportTicketPerson(id);var name=displayName(x);var url=avatarUrl(x);return url?'<div class="avatar"><img src="'+esc(url)+'" alt="'+esc(name)+'" /></div>':'<div class="avatar">'+esc(initials(name))+'</div>';}

  async function loadSupportTickets(){
    if(SUPPORT_TICKETS.loading)return;
    SUPPORT_TICKETS.loading=true; var state=$("supportTicketsState"); if(state)state.textContent="Loading tickets…";
    try{
      if(!USERS.loaded) await loadUsers(false);
      var r=await sb.from("support_tickets").select("id,ticket_number,user_id,issue_type,subject,description,priority,status,assigned_to,created_at,updated_at,resolved_at").order("updated_at",{ascending:false});
      if(r.error)throw r.error;
      SUPPORT_TICKETS.rows=r.data||[]; SUPPORT_TICKETS.loaded=true;
      renderSupportTickets(); await loadSupportTicketBadge();
    }catch(e){if(state)state.textContent="Tickets could not be loaded. Run support-tickets.sql if this is the first deployment.";toast(e.message||"Could not load support tickets.","bad");}
    finally{SUPPORT_TICKETS.loading=false;}
  }

  function renderSupportTickets(){
    var list=$("supportTicketsList"),state=$("supportTicketsState"); if(!list)return;
    var rows=SUPPORT_TICKETS.rows||[];
    if(state)state.textContent=rows.length?rows.length+" ticket"+(rows.length===1?"":"s")+" visible to your support role.":"No support tickets yet.";
    list.innerHTML=rows.length?'<div class="support-admin-ticket-list">'+rows.map(function(t){
      return '<button type="button" class="support-admin-ticket-card" data-support-ticket="'+esc(t.id)+'"><div class="support-admin-ticket-avatar">'+supportTicketAvatar(t.user_id)+'</div><div class="support-admin-ticket-main"><div class="support-admin-ticket-top"><strong>'+esc(supportTicketNum(t))+'</strong><span class="'+supportTicketStatusClass(t.status)+'">'+esc(t.status)+'</span></div><h3>'+esc(t.subject)+'</h3><div class="support-admin-ticket-meta"><span>'+esc(supportTicketName(t.user_id))+'</span><span>'+esc(t.issue_type)+'</span><span class="'+supportTicketPriorityClass(t.priority)+'">'+esc(t.priority)+'</span><time>'+esc(supportTicketDate(t.updated_at||t.created_at))+'</time></div></div></button>';
    }).join('')+'</div>':'<div class="settings-empty"><h3>No tickets</h3><p>New staff and administrator support requests will appear here.</p></div>';
    Array.prototype.forEach.call(list.querySelectorAll("[data-support-ticket]"),function(b){b.addEventListener("click",function(){openSupportTicketAdmin(b.getAttribute("data-support-ticket"));});});
  }

  async function loadSupportTicketBadge(){
    var badge=$("supportTicketNavBadge"); if(!badge)return;
    try{
      var r=await sb.from("support_tickets").select("id",{count:"exact",head:true});
      if(!r.error && Number(r.count||0)>0){
        var count=Number(r.count||0);
        badge.hidden=false;
        badge.textContent=count>99?"99+":String(count);
      }else{
        badge.hidden=true;
      }
    }catch(e){
      // Keep the badge stable if the count request temporarily fails; the ticket list
      // will update it again after loading.
    }
  }

  function supportTicketCreateHtml(){
    return '<div class="ticket-admin-modal"><p class="eyebrow">Support / Help</p><h2>Submit a Support Ticket</h2><p class="dateline">Admins and IT Support can submit issues here too.</p><form id="supportAdminCreateForm" class="support-ticket-form">'+
      '<div class="field"><label>Issue type</label><select id="supportAdminType"><option value="">Select issue type</option>'+SUPPORT_TICKET_TYPES.map(function(x){return '<option>'+esc(x)+'</option>';}).join('')+'</select></div>'+
      '<div class="field"><label>Subject</label><input id="supportAdminSubject" maxlength="160" placeholder="Brief description" /></div>'+
      '<div class="field"><label>Description</label><textarea id="supportAdminDescription" rows="6" maxlength="8000" placeholder="Explain the problem"></textarea></div>'+
      '<div class="field"><label>Priority</label><select id="supportAdminPriority">'+SUPPORT_TICKET_PRIORITIES.map(function(x){return '<option'+(x==='Medium'?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></div>'+
      '<div class="form-foot"><button class="btn btn-primary btn-block" type="submit">Submit Ticket</button></div></form></div>';
  }

  async function openSupportTicketAdmin(id){
    var t=(SUPPORT_TICKETS.rows||[]).find(function(x){return String(x.id)===String(id);}); if(!t)return;
    SUPPORT_TICKETS.active=t;
    try { await sb.from("support_ticket_notifications").update({read_at:new Date().toISOString()}).eq("ticket_id",t.id).eq("user_id",ME.user.id).is("read_at",null); } catch(ignore) {}
    await loadSupportTicketBadge();
    renderSupportTicketAdminModal(t);
  }

  async function renderSupportTicketAdminModal(t){
    var msgs=await sb.from("support_ticket_messages").select("id,sender_id,body,is_internal,created_at").eq("ticket_id",t.id).order("created_at",{ascending:true});
    if(msgs.error){toast(msgs.error.message,"bad");return;}
    var files=await sb.from("support_ticket_attachments").select("id,file_name,file_path,content_type,file_size,created_at").eq("ticket_id",t.id).order("created_at",{ascending:true});
    var assignedName=t.assigned_to?supportTicketName(t.assigned_to):"Unassigned";
    var body='<div class="ticket-admin-modal"><div class="ticket-admin-head"><div><p class="eyebrow">'+esc(supportTicketNum(t))+'</p><h2>'+esc(t.subject)+'</h2><p class="dateline">Submitted by '+esc(supportTicketName(t.user_id))+' · '+esc(supportTicketDate(t.created_at))+'</p></div><span class="'+supportTicketStatusClass(t.status)+'">'+esc(t.status)+'</span></div>'+
      '<div class="ticket-admin-meta"><span>'+esc(t.issue_type)+'</span><span class="'+supportTicketPriorityClass(t.priority)+'">'+esc(t.priority)+'</span><span>Assigned: '+esc(assignedName)+'</span></div>'+
      '<div class="support-ticket-description"><strong>Issue</strong><p>'+esc(t.description).replace(/\n/g,'<br>')+'</p></div>'+
      '<div class="ticket-admin-controls"><div class="field"><label>Status</label><select id="ticketAdminStatus">'+SUPPORT_TICKET_STATUSES.map(function(x){return '<option'+(x===t.status?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></div><div class="field"><label>Priority</label><select id="ticketAdminPriority">'+SUPPORT_TICKET_PRIORITIES.map(function(x){return '<option'+(x===t.priority?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select></div><div class="field"><label>Assign to IT</label><select id="ticketAdminAssignee"><option value="">Unassigned</option>'+(USERS.rows||[]).filter(function(x){return roleOf(x)==='admin'||roleOf(x)==='it_support';}).map(function(x){var id=x.id||x.user_id;return '<option value="'+esc(id)+'"'+(String(id)===String(t.assigned_to)?' selected':'')+'>'+esc(displayName(x))+'</option>';}).join('')+'</select></div><button class="btn btn-dark btn-sm" id="ticketAdminSave">Save changes</button></div>'+
      '<div class="ticket-admin-thread">'+((msgs.data||[]).length?(msgs.data||[]).map(function(m){return '<div class="ticket-admin-message '+(m.is_internal?'internal ':'')+(String(m.sender_id)===String(ME.user.id)?'mine':'')+'"><div><strong>'+esc(supportTicketName(m.sender_id))+'</strong><span>'+esc(m.is_internal?'Internal note':'Reply')+'</span></div><p>'+esc(m.body).replace(/\n/g,'<br>')+'</p><time>'+esc(supportTicketDate(m.created_at))+'</time></div>';}).join(''):'<p class="settings-empty">No replies yet.</p>')+'</div>'+
      ((files.data||[]).length?'<div class="ticket-admin-files"><strong>Attachments</strong><div>'+files.data.map(function(f){return '<button type="button" class="link-muted" data-ticket-file="'+esc(f.file_path)+'">'+esc(f.file_name)+'</button>';}).join('')+'</div></div>':'')+
      '<form id="ticketAdminReplyForm" class="ticket-admin-reply"><div class="field"><label>Reply to user</label><textarea id="ticketAdminReply" rows="4" maxlength="8000" placeholder="Write a response…"></textarea></div><div class="field"><label class="check"><input id="ticketAdminInternal" type="checkbox" /> Internal note (user will not see this)</label></div><button class="btn btn-primary" type="submit">Send</button></form></div>';
    showSupportModal(body);
    var saveBtn = $("ticketAdminSave");
    if (saveBtn) saveBtn.addEventListener("click", async function(){
      var b=this;
      var statusEl=$("ticketAdminStatus"), priorityEl=$("ticketAdminPriority"), assigneeEl=$("ticketAdminAssignee");
      if (!statusEl || !priorityEl || !assigneeEl) { toast("Ticket controls could not be loaded. Please reopen the ticket.","bad"); return; }
      setBtnLoading(b,true);
      try {
        var patch={status:statusEl.value,priority:priorityEl.value,assigned_to:assigneeEl.value||null};
        var r=await sb.from("support_tickets").update(patch).eq("id",t.id);
        if(r.error) throw r.error;
        t.status=patch.status; t.priority=patch.priority; t.assigned_to=patch.assigned_to;
        await loadSupportTickets();
        // Keep the ticket card/modal open after saving changes.
        var statusBadge = document.querySelector("#supportTicketModalBody .ticket-admin-head > span");
        if (statusBadge) {
          statusBadge.className = supportTicketStatusClass(t.status);
          statusBadge.textContent = t.status;
        }
        var meta = document.querySelector("#supportTicketModalBody .ticket-admin-meta");
        if (meta) {
          var metaSpans = meta.querySelectorAll("span");
          if (metaSpans[1]) {
            metaSpans[1].className = supportTicketPriorityClass(t.priority);
            metaSpans[1].textContent = t.priority;
          }
          if (metaSpans[2]) metaSpans[2].textContent = "Assigned: " + (t.assigned_to ? supportTicketName(t.assigned_to) : "Unassigned");
        }
        toast("Ticket updated. The ticket remains open.","good");
      } catch(e) {
        toast(e.message||"Could not update ticket. Check the Supabase support-ticket RLS policies.","bad");
      } finally { setBtnLoading(b,false); }
    });

    var replyForm=$("ticketAdminReplyForm");
    if (replyForm) replyForm.addEventListener("submit",async function(e){
      e.preventDefault();
      var replyEl=$("ticketAdminReply"), internalEl=$("ticketAdminInternal");
      var text=(replyEl && replyEl.value||"").trim();
      if(!text){toast("Write a reply before sending.","bad");return;}
      var b=this.querySelector('button[type="submit"]');
      setBtnLoading(b,true);
      try {
        var r=await sb.from("support_ticket_messages").insert({ticket_id:t.id,sender_id:ME.user.id,body:text,is_internal:!!(internalEl&&internalEl.checked)});
        if(r.error) throw r.error;
        closeSupportModal();
        await loadSupportTickets();
        await openSupportTicketAdmin(t.id);
        toast("Reply sent.","good");
      } catch(e) {
        toast(e.message||"Could not send reply. Check the support-ticket message RLS/notification trigger.","bad");
      } finally { setBtnLoading(b,false); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ticket-file]'),function(b){b.addEventListener('click',async function(){try{var r=await sb.storage.from(SUPPORT_TICKET_BUCKET).createSignedUrl(b.getAttribute('data-ticket-file'),300);if(r.error)throw r.error;window.open(r.data.signedUrl,'_blank','noopener');}catch(e){toast(e.message||'Attachment could not be opened.','bad');}});});
  }

  function showSupportModal(html){
    var wrap=document.createElement('div');wrap.className='modal-backdrop support-ticket-modal-backdrop';wrap.id='supportTicketModal';wrap.innerHTML='<div class="modal modal-wide" role="dialog" aria-modal="true"><div id="supportTicketModalBody">'+html+'</div><div class="modal-actions"><button class="btn btn-ghost" type="button" id="supportTicketModalClose">Close</button></div></div>';
    document.body.appendChild(wrap);wrap.querySelector('#supportTicketModalClose').addEventListener('click',closeSupportModal);wrap.addEventListener('click',function(e){if(e.target===wrap)closeSupportModal();});
  }
  function closeSupportModal(){var m=$("supportTicketModal");if(m)m.remove();}

  function initSupportTickets(){
    var root=$("tab-tickets");if(!root||root.getAttribute('data-ready')==='1')return;root.setAttribute('data-ready','1');
    if(!document.getElementById("support-ticket-spacing-fix")){
      var style=document.createElement("style");
      style.id="support-ticket-spacing-fix";
      style.textContent=""+
        "#tab-tickets .section-head-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}"+
        "#tab-tickets .ticket-admin-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:16px 0 20px;}"+
        "#tab-tickets .ticket-admin-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:end;margin-top:20px;}"+
        "#tab-tickets .ticket-admin-controls .btn{margin-top:4px;}"+
        "#tab-tickets .ticket-admin-reply{margin-top:20px;padding-top:18px;border-top:1px solid var(--rule);}"+
        "#tab-tickets .ticket-admin-reply .field + .field{margin-top:14px;}"+
        "#tab-tickets .ticket-admin-reply .check{display:flex;align-items:center;gap:10px;}"+
        "#tab-tickets .ticket-admin-reply button[type=submit]{margin-top:10px;}"+
        "@media(max-width:760px){#tab-tickets .section-head-actions{width:100%;gap:12px;}#tab-tickets .section-head-actions .btn{flex:1 1 140px;}#tab-tickets .ticket-admin-meta{gap:10px;margin:14px 0 18px;}#tab-tickets .ticket-admin-controls{grid-template-columns:1fr;gap:12px;}#tab-tickets .ticket-admin-reply{margin-top:16px;padding-top:16px;}}";
      document.head.appendChild(style);
    }
    var refresh=$("supportTicketsRefresh");if(refresh)refresh.addEventListener('click',function(){loadSupportTickets();});
    var newBtn=$("supportTicketNewBtn");if(newBtn)newBtn.addEventListener('click',function(){showSupportModal(supportTicketCreateHtml());var f=$("supportAdminCreateForm");f.addEventListener('submit',async function(e){e.preventDefault();var type=$("supportAdminType").value,subject=$("supportAdminSubject").value.trim(),description=$("supportAdminDescription").value.trim(),priority=$("supportAdminPriority").value;if(!type||!subject||!description){toast('Complete the required fields.','bad');return;}var b=f.querySelector('button[type=submit]');setBtnLoading(b,true);try{var r=await sb.from('support_tickets').insert({user_id:ME.user.id,issue_type:type,subject:subject,description:description,priority:priority});if(r.error)throw r.error;closeSupportModal();await loadSupportTickets();toast('Support ticket created.','good');}catch(e){toast(e.message||'Could not create ticket.','bad');}finally{setBtnLoading(b,false);}});});
    loadSupportTickets();
  }

  /* ------------------------- gate ------------------------- */
  async function gate() {
    loader(true);
    var sessionRes = await sb.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;
    if (!session) {
      ME = { user: null, role: null, allowed: false };
      loader(false);
      only("loginView");
      return;
    }

    var user = session.user;
    var profileState = await sb.from("profiles")
      .select("id,status,account_status,is_active,active")
      .eq("id", user.id).maybeSingle();
    if (!profileState.error && profileState.data) {
      var p = profileState.data;
      var v = p.is_active !== null && p.is_active !== undefined ? p.is_active :
        (p.active !== null && p.active !== undefined ? p.active :
        (p.account_status !== null && p.account_status !== undefined ? p.account_status : p.status));
      var active = v == null || ["active","enabled","true","yes","1"].indexOf(String(v).toLowerCase()) !== -1;
      if (!active) {
        await sb.auth.signOut();
        $("loginMsg").hidden = false;
        $("loginMsg").className = "alert alert-error";
        $("loginMsg").innerHTML = "<strong>Account Deactivated</strong><br>Your staff account has been deactivated and you cannot access the system at this time.<br>If you believe this was done by mistake, please contact the <strong>IT Support Department</strong> to rectify the issue.";
        only("loginView");
        loader(false);
        return;
      }
    }
    var access;
    try {
      access = await withTimeout(resolveAccess(user), 16000, "Access verification timed out. Please refresh and try again.");
    } catch (e) {
      loader(false);
      message(e.message || "Access verification failed. Please refresh and try again.", "error");
      only("loginView");
      return;
    }
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

    try {
      await renderPortal(user, access);
    } catch (e) {
      console.error("Tech Support portal initialization failed:", e);
      var boot = $("boot");
      if (boot) {
        boot.innerHTML = '<div class="auth-card" style="max-width:620px;margin:40px auto;padding:28px"><h2>Tech Support could not finish loading</h2><p>There was a problem initialising the portal. Please reload the page.</p><p class="hint">' + esc(e && e.message ? e.message : "Unknown initialisation error") + '</p></div>';
        boot.hidden = false;
      }
    }
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

    /* ------------------------- persistent portal section ------------------------- */
    var PORTAL_SECTION_KEY = "tech_support_active_section";
    function validPortalSection(name) {
      return ["overview", "users", "attendance", "system", "leave", "settings", "tickets", "checks"].indexOf(name) !== -1;
    }
    function getPortalSection() {
      var hash = String(location.hash || "").replace(/^#\/?/, "").toLowerCase();
      if (validPortalSection(hash)) return hash;
      try {
        var stored = sessionStorage.getItem(PORTAL_SECTION_KEY);
        if (validPortalSection(stored)) return stored;
      } catch (e) {}
      return "overview";
    }
    function setPortalSection(name, replace) {
      if (!validPortalSection(name)) name = "overview";
      try { sessionStorage.setItem(PORTAL_SECTION_KEY, name); } catch (e) {}
      var targetHash = "#" + name;
      if (replace) history.replaceState(null, "", targetHash);
      else history.pushState(null, "", targetHash);
    }
    function activatePortalSection(name, options) {
      options = options || {};
      if (!validPortalSection(name)) name = "overview";
      var btn = document.querySelector('.nav button[data-tab="' + name + '"]');
      if (!btn) return;
      Array.prototype.forEach.call(document.querySelectorAll('.nav button[data-tab]'), function (b) {
        b.classList.toggle("active", b === btn);
        var panel = $("tab-" + b.getAttribute("data-tab"));
        if (panel) panel.hidden = b !== btn;
      });
      if (!options.skipPersist) setPortalSection(name, !!options.replace);
      if (name === "leave") renderSupportLeave();
      if (name === "tickets") loadSupportTickets();
      if (options.closeNav && typeof closeNav === "function") closeNav();
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
        activatePortalSection(btn.getAttribute("data-tab"), { closeNav: true });
          });
    }
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        if (navEl.classList.contains("open")) closeNav(); else openNav();
      });
    }
    if (backdrop) backdrop.addEventListener("click", closeNav);
    ensureLeavePortalTab();
    activatePortalSection(getPortalSection(), { skipPersist: true });
    window.addEventListener("popstate", function () {
      activatePortalSection(getPortalSection(), { skipPersist: true, closeNav: true });
    });
    window.addEventListener("hashchange", function () {
      activatePortalSection(getPortalSection(), { skipPersist: true, closeNav: true });
    });
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
