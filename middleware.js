import { next, rewrite } from '@vercel/functions';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wdrgcavxwamwqgxkdscn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XlL1WvosmoBvl3vttrT-xw_nVvtMrQo';
const SECRET = process.env.DEV_PREVIEW_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
const COOKIE = 'eattendance_dev_preview';
const MAINTENANCE = '/maintenance.html';

function b64(bytes) { let s=''; bytes.forEach(b=>s+=String.fromCharCode(b)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
async function hmac(value) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))));
}
async function validCookie(value) {
  if(!SECRET||!value)return false;
  const p=value.split('.'); if(p.length!==2)return false;
  const expected=await hmac(p[0]); if(expected!==p[1])return false;
  try { const payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p[0].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))); return payload.exp&&payload.exp>Math.floor(Date.now()/1000); } catch(_) { return false; }
}
async function maintenanceOn() {
  try { const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/is_maintenance_mode',{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},cache:'no-store'}); if(!r.ok)return false; const v=await r.json(); return v===true||String(v).toLowerCase()==='true'; } catch(_) { return false; }
}

export default async function middleware(request) {
  const path=new URL(request.url).pathname.replace(/\/$/,'')||'/';
  // Static assets required by the existing maintenance page and developer preview
  // must remain reachable while Maintenance Mode is ON. Only document/application
  // routes are gated below.
  const staticAsset = path.startsWith('/assets/') || path.startsWith('/fonts/') ||
    path.startsWith('/support/') || path.startsWith('/learn/') ||
    /\.(?:css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|webmanifest|json|wav|mp3)$/i.test(path);
  if(path.startsWith('/api/') || path===MAINTENANCE || path==='/dev-preview.html' || staticAsset) return next();
  const active=await maintenanceOn();
  const previewCookie=request.headers.get('cookie')||'';
  const match=previewCookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  const authorized=await validCookie(match?match.slice(COOKIE.length+1):null);
  if(path==='/dev-preview') return rewrite(new URL(authorized?'/index.html':'/dev-preview.html',request.url));
  if(!active||authorized) return next();
  return Response.redirect(new URL(MAINTENANCE,request.url));
}

export const config={matcher:'/(.*)'};
