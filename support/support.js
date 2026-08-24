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

    // 2. Dedicated roles table (user_roles, falling back to legacy support_roles).
    try {
      var rolesRes = await sb.from("user_roles").select("role").eq("user_id", user.id);
      if (rolesRes.error) rolesRes = await sb.from("support_roles").select("role").eq("user_id", user.id);
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


  /* ------------------------- Users & profiles (Phase 2) -------------------------
     Read-only. Every query runs as the signed-in user under RLS; no records are
     created, duplicated or modified here. */
  var USERS = { rows: [], loaded: false, loading: false, current: null };

  var NAME_KEYS = ["full_name", "name", "fullname", "display_name"];
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
      var email = pick(r, EMAIL_KEYS);
      var title = pick(r, TITLE_KEYS);
      var dept = pick(r, DEPT_KEYS);
      var staff = pick(r, STAFF_KEYS);
      var second = [title, dept].filter(Boolean).join(" · ") || "Position not recorded";
      var third = [staff ? "Staff ID " + staff : null, statusText(r), roleLabel(roleOf(r))]
        .filter(Boolean).join(" · ");
      return '<button type="button" class="user-card" data-user="' + idx + '">' +
        avatarHtml(r) +
        '<span class="u-body">' +
          '<span class="u-name">' + esc(displayName(r)) + "</span>" +
          '<span class="u-line">' + esc(email || "No email on record") + "</span>" +
          '<span class="u-line">' + esc(second) + "</span>" +
          '<span class="u-line-2">' + esc(third) + "</span>" +
        "</span></button>";
    }).join("");
  }

  function openUserProfile(row) {
    USERS.current = row;
    var name = displayName(row);
    $("profileAvatar").outerHTML = avatarHtml(row, true).replace('class="avatar avatar-lg"', 'class="avatar avatar-lg" id="profileAvatar"');
    $("profileName").textContent = name;
    $("profileMeta").textContent = [pick(row, TITLE_KEYS), pick(row, DEPT_KEYS), pick(row, EMAIL_KEYS)]
      .filter(Boolean).join(" · ") || "No additional details recorded";

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
    [NAME_KEYS, EMAIL_KEYS, PHONE_KEYS, TITLE_KEYS, STAFF_KEYS, DEPT_KEYS, STATUS_KEYS, TYPE_KEYS, AVATAR_KEYS, ROLE_KEYS]
      .forEach(function (g) { g.forEach(function (k) { known[k] = 1; }); });
    ["id", "user_id", "created_at", "updated_at", "address"].forEach(function (k) { known[k] = 1; });
    var extras = Object.keys(row).filter(function (k) {
      return !known[k] && row[k] !== null && String(row[k]).trim() !== "";
    }).map(function (k) { return [labelize(k), fmtValue(row[k])]; });
    kv("kvUserOther", extras.length ? extras : [["Additional fields", "Nothing further stored for this user."]]);

    renderRolePanel(row);
    renderAccountPanel(row);
    renderProfileEditor(row);

    $("usersListView").hidden = true;
    $("userProfileView").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
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
     The UI below is a convenience layer only. Every role change is executed by
     public.set_user_role(), a security-definer function that re-checks the
     caller is an administrator, refuses to strip the last administrator, and
     is the only path permitted by the row level security policies on
     public.user_roles. Hiding a button here protects nothing on its own. */
  var ROLES = {};          /* user_id -> role, as stored in the database */
  var ADMIN_COUNT = 0;     /* administrators currently on record */
  var PENDING = null;      /* role change awaiting confirmation */

  function roleOf(row) {
    var id = row.id || row.user_id;
    return ROLES[id] || pick(row, ROLE_KEYS) || "staff";
  }
  function roleLabel(r) { return ROLE_LABEL[r] || r || "Staff"; }
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
      ["Changed by", "Administrators only"]
    ]);

    var form = $("roleForm");
    var note = $("roleNote");
    var sel = $("roleSelect");

    if (!isAdmin()) {
      form.hidden = true;
      note.textContent = "Only an administrator can change portal roles. Your account has read-only access to this section.";
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
      note.textContent = "Changing a role takes effect immediately for " + name + ". You will be asked to confirm first.";
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

    var res = await sb.rpc("set_user_role", { target_user: job.userId, new_role: job.to });

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
      if (!isAdmin()) { toast("Only an administrator can change portal roles.", "bad"); return; }
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
    userKey: null, dateKey: null, statusKey: null, fields: [],
    staff: null, rows: [], loading: false, statuses: [],
    pending: null, step: 1
  };

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
      if (!ATT.fields.length && cols.indexOf("created_at") !== -1) ATT.fields = [["created_at", "Recorded timestamp"]];
      ATT.ready = true;
      return;
    }
    ATT.error = "No attendance table is readable by your account. Expected one of: " + ATT_TABLES.join(", ") + ".";
  }

  function renderAttStaffResults() {
    var q = ($("attSearch").value || "").trim().toLowerCase();
    var box = $("attStaffResults");
    if (!q) { box.innerHTML = ""; box.hidden = true; return; }
    var rows = USERS.rows.filter(function (r) { return matchesQuery(r, q); }).slice(0, 12);
    box.hidden = false;
    box.innerHTML = rows.length
      ? rows.map(function (r) {
          var idx = USERS.rows.indexOf(r);
          return '<button type="button" class="att-staff-item" data-staff="' + idx + '">' +
            "<span>" + esc(displayName(r)) + "</span><small>" +
            esc([pick(r, EMAIL_KEYS), pick(r, STAFF_KEYS)].filter(Boolean).join(" · ") || "No email on record") +
            "</small></button>";
        }).join("")
      : '<p class="att-empty">No staff member matches “' + esc(q) + '”.</p>';
  }

  function selectAttStaff(row) {
    ATT.staff = row;
    $("attSearch").value = "";
    $("attStaffResults").hidden = true;
    $("attStaffResults").innerHTML = "";
    $("attSelected").hidden = false;
    $("attSelectedName").textContent = displayName(row);
    $("attSelectedMeta").textContent =
      [pick(row, STAFF_KEYS) ? "Staff ID " + pick(row, STAFF_KEYS) : null, pick(row, DEPT_KEYS), pick(row, EMAIL_KEYS)]
        .filter(Boolean).join(" · ") || "No further details recorded";
    loadAttendance();
  }

  function clearAttStaff() {
    ATT.staff = null;
    ATT.rows = [];
    $("attSelected").hidden = true;
    $("attRecords").innerHTML = "";
    $("attState").textContent = "Search for a staff member to view their attendance records.";
    $("attCount").textContent = "";
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
      $("attState").textContent = ATT.rows.length
        ? "No attendance record matches the current filters."
        : "No attendance records found for " + displayName(ATT.staff) + ".";
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
      var dateBtn = canEdit && ATT.dateKey
        ? '<button type="button" class="btn btn-ghost btn-sm" data-editdate="' + idx + '">Correct date</button>'
        : "";
      return '<article class="att-record"><header class="att-record-head">' +
        "<h4>" + esc(ukDate(d)) + "</h4>" +
        "<span>" + esc(status || "Attendance record") + "</span>" + dateBtn +
        "</header><div class=\"att-record-body\">" + lines + "</div></article>";
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
      row: row, field: field, label: label,
      original: row[field] === null || row[field] === undefined || String(row[field]) === "" ? null : String(row[field]),
      originalText: stampText(row[field], d),
      timeOnly: isTimeOnly(row[field]),
      dateOnly: !!opts.dateOnly,
      recordDate: d
    };
    ATT.step = 1;

    $("attCorrStaff").textContent = displayName(ATT.staff);
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
    p.newValue = p.dateOnly ? date : (p.timeOnly ? time + ":00" : date + "T" + time + ":00");
    p.newText = p.dateOnly ? ukDate(date) : ukDate(date) + " — " + time;

    $("sumStaff").textContent = displayName(ATT.staff);
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

    var res = await sb.rpc("correct_attendance_timestamp", {
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
      err.textContent = res.error.message || "The correction was refused by the database.";
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
    { keys: NAME_KEYS, label: "Full name", max: 120 },
    { keys: PHONE_KEYS, label: "Phone number", max: 32 },
    { keys: TITLE_KEYS, label: "Position / job title", max: 80 },
    { keys: DEPT_KEYS, label: "Department", max: 80 },
    { keys: STAFF_KEYS, label: "Staff ID", max: 40 },
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

  /* ---------- account access ---------- */
  function isActiveRow(row) {
    var col = colOf(row, STATUS_KEYS);
    if (!col) return true;
    var v = row[col];
    if (v === null || v === undefined || String(v).trim() === "") return true;
    if (typeof v === "boolean") return v;
    return ["active", "enabled", "true", "yes", "1"].indexOf(String(v).toLowerCase()) !== -1;
  }

  function renderAccountPanel(row) {
    var col = colOf(row, STATUS_KEYS);
    var active = isActiveRow(row);
    var email = pick(row, EMAIL_KEYS);

    kv("kvAccountState", [
      ["Access", pill(active ? "Active" : "Deactivated", active ? "ok" : "bad"), true],
      ["Stored in", col ? labelize(col) : "Not tracked on this record"],
      ["Sign-in email", txt(email)],
      ["Current role", roleLabel(roleOf(row))]
    ]);

    var canEdit = isAdmin() && !!col;
    $("accountActions").hidden = !isAdmin();
    $("acctToggle").hidden = !canEdit;
    $("acctToggle").textContent = active ? "Deactivate account" : "Activate account";
    $("acctReset").hidden = !isAdmin() || !email;

    $("accountNote").textContent = !isAdmin()
      ? "Your account can review account details. Only an administrator can activate, deactivate or edit an account."
      : (col
        ? "Deactivating removes the account's access to the platform. Passwords and sign-in details are handled by Supabase Authentication and are never edited here."
        : "This installation does not store an account status field, so access cannot be toggled from the portal.");
  }

  function accountStatusValue(row, active) {
    var col = colOf(row, STATUS_KEYS);
    var cur = row[col];
    if (typeof cur === "boolean" || col === "is_active" || col === "active") return active;
    return active ? "active" : "inactive";
  }

  async function writeAccountStatus(row, active) {
    var id = rowId(row);
    var res = await sb.rpc("admin_set_account_status", { p_user_id: id, p_active: active });
    if (res.error && missingFunction(res.error)) {
      var patch = {};
      patch[colOf(row, STATUS_KEYS)] = accountStatusValue(row, active);
      res = await sb.from("profiles").update(patch).eq("id", id);
    }
    return res;
  }

  function askAccountToggle() {
    var row = USERS.current;
    if (!row || !isAdmin()) return;
    var active = isActiveRow(row);
    openChange({
      title: active ? "Deactivate account" : "Activate account",
      lede: "This updates the staff record the main website reads. Sign-in credentials are not changed.",
      rows: [["Account access", active ? "Active" : "Deactivated", active ? "Deactivated" : "Active"]],
      needReason: true,
      onConfirm: function () { return writeAccountStatus(row, !active); },
      done: function () {
        toast(active ? "Account deactivated." : "Account activated.", "good");
        refreshUser(rowId(row));
      }
    });
  }

  async function sendReset() {
    var row = USERS.current;
    var email = row && pick(row, EMAIL_KEYS);
    if (!email) return;
    loader(true);
    var res = await sb.auth.resetPasswordForEmail(String(email), { redirectTo: location.origin + "/index.html" });
    loader(false);
    if (res.error) toast(res.error.message, "bad");
    else toast("Password reset email sent through Supabase Authentication.", "good");
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
      if (col) EDIT.cols.push({ col: col, label: f.label, max: f.max });
    });

    box.innerHTML = EDIT.cols.map(function (f) {
      var v = row[f.col];
      return '<div class="field"><label for="pf_' + esc(f.col) + '">' + esc(f.label) + "</label>" +
        '<input id="pf_' + esc(f.col) + '" data-col="' + esc(f.col) + '" type="text" maxlength="' + f.max +
        '" value="' + esc(v === null || v === undefined ? "" : String(v)) + '" /></div>';
    }).join("") || '<p class="edit-hint">No editable profile fields are stored on this record.</p>';

    var avatarCol = colOf(row, AVATAR_KEYS);
    $("profileAvatarRow").hidden = !avatarCol;
    $("avatarFile").value = "";
    $("profileEditActions").hidden = !(EDIT.cols.length || avatarCol);
    $("profileEditNote").textContent =
      "These are the only profile fields the portal may change. Saving updates the existing staff record — no duplicate profile is created — and the main website shows the new details immediately.";
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
    var res = await sb.rpc("admin_update_profile", { p_user_id: id, p_changes: patch });
    if (res.error && missingFunction(res.error)) {
      res = await sb.from("profiles").update(patch).eq("id", id);
    }
    return res;
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
      if (f.size > 2 * 1024 * 1024) { toast("Choose an image under 2 MB.", "bad"); e.target.value = ""; return; }
      if (["image/png", "image/jpeg", "image/webp"].indexOf(f.type) === -1) {
        toast("Only PNG, JPG or WebP images are accepted.", "bad"); e.target.value = ""; return;
      }
      EDIT.avatarFile = f;
    });
    $("acctToggle").addEventListener("click", askAccountToggle);
    $("acctReset").addEventListener("click", sendReset);

    $("changeCancel").addEventListener("click", closeChange);
    $("changeOk").addEventListener("click", runChange);
    $("changeBackdrop").addEventListener("click", function (e) {
      if (e.target === $("changeBackdrop")) closeChange();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("changeBackdrop").hidden) closeChange();
    });
  }

  /* ---------- application settings ---------- */
  var SETTING_TABLES = ["app_settings", "system_settings", "settings", "site_settings", "configuration"];
  var SETTING_KEY_COLS = ["key", "setting_key", "name", "code", "slug"];
  var SETTING_VALUE_COLS = ["value", "setting_value", "val", "content", "data"];
  var SETTING_DESC_COLS = ["description", "label", "note", "help"];

  var SETTINGS = { table: null, keyCol: null, valueCol: null, descCol: null, rows: [], loaded: false };

  async function detectSettings() {
    if (SETTINGS.table) return true;
    for (var i = 0; i < SETTING_TABLES.length; i++) {
      var res = await sb.from(SETTING_TABLES[i]).select("*").limit(200);
      if (res.error) continue;
      var sample = (res.data && res.data[0]) || null;
      if (!sample) continue;
      var cols = Object.keys(sample);
      var k = SETTING_KEY_COLS.filter(function (c) { return cols.indexOf(c) !== -1; })[0];
      var v = SETTING_VALUE_COLS.filter(function (c) { return cols.indexOf(c) !== -1; })[0];
      if (!k || !v) continue;
      SETTINGS.table = SETTING_TABLES[i];
      SETTINGS.keyCol = k;
      SETTINGS.valueCol = v;
      SETTINGS.descCol = SETTING_DESC_COLS.filter(function (c) { return cols.indexOf(c) !== -1; })[0] || null;
      SETTINGS.rows = res.data;
      return true;
    }
    return false;
  }

  function renderSettings() {
    var list = $("settingsList");
    var rows = SETTINGS.rows || [];
    if (!rows.length) {
      list.innerHTML = "";
      $("settingsActions").hidden = true;
      return;
    }
    $("settingsState").textContent = rows.length + " setting" + (rows.length === 1 ? "" : "s") +
      " from " + SETTINGS.table + ".";
    list.innerHTML = rows.map(function (r, i) {
      var val = r[SETTINGS.valueCol];
      var desc = SETTINGS.descCol ? r[SETTINGS.descCol] : null;
      return '<div class="setting-row"><div class="setting-meta"><h4>' +
        esc(labelize(String(r[SETTINGS.keyCol]))) + "</h4>" +
        (desc ? "<p>" + esc(String(desc)) + "</p>" : "") + "</div>" +
        '<div class="field"><label for="st_' + i + '" class="sr-label">Value</label>' +
        '<input id="st_' + i + '" data-setting="' + i + '" type="text" maxlength="240"' +
        (isAdmin() ? "" : " disabled") +
        ' value="' + esc(val === null || val === undefined ? "" : (typeof val === "object" ? JSON.stringify(val) : String(val))) +
        '" /></div></div>';
    }).join("");
    $("settingsActions").hidden = !isAdmin();
  }

  async function loadSettings() {
    $("settingsState").textContent = "Loading application settings…";
    var ok = await detectSettings();
    if (!ok) {
      SETTINGS.rows = [];
      $("settingsList").innerHTML = "";
      $("settingsActions").hidden = true;
      $("settingsState").textContent =
        "No application settings table is readable by your account, so there is nothing to manage here yet.";
      return;
    }
    var res = await sb.from(SETTINGS.table).select("*").limit(200);
    if (res.error) {
      $("settingsState").textContent = "Settings could not be loaded: " + res.error.message;
      return;
    }
    SETTINGS.rows = (res.data || []).sort(function (a, b) {
      return String(a[SETTINGS.keyCol]).localeCompare(String(b[SETTINGS.keyCol]));
    });
    SETTINGS.loaded = true;
    renderSettings();
  }

  async function writeSetting(key, value) {
    var res = await sb.rpc("admin_update_setting", { p_key: key, p_value: value });
    if (res.error && missingFunction(res.error)) {
      var patch = {};
      patch[SETTINGS.valueCol] = value;
      res = await sb.from(SETTINGS.table).update(patch).eq(SETTINGS.keyCol, key);
    }
    return res;
  }

  function askSettingsSave() {
    if (!isAdmin()) return;
    var diffs = [], jobs = [];
    SETTINGS.rows.forEach(function (r, i) {
      var input = document.getElementById("st_" + i);
      if (!input) return;
      var cur = r[SETTINGS.valueCol];
      var curText = cur === null || cur === undefined ? "" : (typeof cur === "object" ? JSON.stringify(cur) : String(cur));
      var next = input.value.trim();
      if (next === curText.trim()) return;
      diffs.push([labelize(String(r[SETTINGS.keyCol])), curText, next]);
      jobs.push({ key: String(r[SETTINGS.keyCol]), value: next });
    });
    if (!diffs.length) { toast("No setting has been changed.", "bad"); return; }

    openChange({
      title: "Confirm setting changes",
      lede: "These application settings will be updated for everyone using the platform.",
      rows: diffs,
      needReason: false,
      onConfirm: async function () {
        for (var i = 0; i < jobs.length; i++) {
          var r = await writeSetting(jobs[i].key, jobs[i].value);
          if (r.error) return { error: r.error };
        }
        return {};
      },
      done: function () { toast("Settings saved.", "good"); loadSettings(); }
    });
  }

  /* ---------- system management tab ---------- */
  function initSystem() {
    initProfileTools();

    var root = $("tab-system");
    if (!root || root.getAttribute("data-ready") === "1") return;
    root.setAttribute("data-ready", "1");

    $("sysScope").textContent = isAdmin() ? "Administrator tools" : "IT Support view";
    $("sysNote").textContent = isAdmin()
      ? "Everything below writes to the data the main website already uses. Only the fields shown here can be changed — there is no raw table access, no SQL and no service key in the browser, and the database re-checks your role on every write."
      : "IT Support accounts can review staff records, roles and attendance. Account, profile, correction and settings changes are reserved for administrators and are refused by the database for other roles.";

    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]");
      if (!b) return;
      var target = document.querySelector('.nav button[data-tab="' + b.getAttribute("data-goto") + '"]');
      if (target) target.click();
    });

    $("settingsSave").addEventListener("click", askSettingsSave);
    $("settingsReload").addEventListener("click", function () { loadSettings(); });
    $("settingsNote").textContent = isAdmin()
      ? "Only settings the application already defines are listed. Adding or deleting settings, or editing other tables, is deliberately not possible from this portal."
      : "Settings are read-only for IT Support accounts.";

    loadSettings();
  }

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

    initUsers();
    initRoleUi();
    initAttendance();
    initSystem();
    loadUsers();

    only("portalView");
    var head = $("masthead");
    if (head) document.documentElement.style.setProperty("--header-h", head.offsetHeight + "px");
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
