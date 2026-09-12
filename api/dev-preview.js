"use strict";

import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wdrgcavxwamwqgxkdscn.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_XlL1WvosmoBvl3vttrT-xw_nVvtMrQo";
const SECRET = process.env.DEV_PREVIEW_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE = "eattendance_dev_preview";
const TTL_SECONDS = 60 * 60 * 4;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}
function allowedDeveloper(user) {
  const emails = String(process.env.DEVELOPER_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const ids = String(process.env.DEVELOPER_USER_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
  return !!user && ((user.email && emails.includes(String(user.email).toLowerCase())) || (user.id && ids.includes(String(user.id))));
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}
function parseCookie(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null;
}
function verify(value) {
  if (!SECRET || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(parts[0]).digest("base64url");
  const provided = Buffer.from(parts[1]);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_) { return null; }
}
async function getUser(accessToken) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + accessToken }
  });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  if (!SECRET) return json(res, 503, { error: "Developer preview is not configured." });

  if (req.method === "GET") {
    const session = verify(parseCookie(req));
    return session ? json(res, 200, { ok: true, user_id: session.sub }) : json(res, 401, { ok: false });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json(res, 401, { error: "Authentication required." });

  const user = await getUser(token);
  if (!allowedDeveloper(user)) return json(res, 403, { error: "Developer authorization failed." });

  const now = Math.floor(Date.now() / 1000);
  const value = sign({ sub: user.id, iat: now, exp: now + TTL_SECONDS });
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(value)}; Max-Age=${TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return json(res, 200, { ok: true });
};
