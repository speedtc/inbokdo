// auth.js — 카카오 / 네이버 소셜 로그인 (OAuth 2.0 authorization code)
// 환경변수가 없으면 조용히 비활성화된다.

const SESSION_DAYS = 60;
const COOKIE = 'ibd_s';
const STATE_COOKIE = 'ibd_st';

export const PROVIDERS = {
  kakao: {
    label: '카카오',
    color: '#FEE500',
    fg: '#191600',
    idEnv: 'KAKAO_REST_KEY',
    secretEnv: 'KAKAO_CLIENT_SECRET',
    authorize: 'https://kauth.kakao.com/oauth/authorize',
    token: 'https://kauth.kakao.com/oauth/token',
    profile: 'https://kapi.kakao.com/v2/user/me',
    scope: 'profile_nickname',
    parse(j) {
      const p = (j.kakao_account && j.kakao_account.profile) || {};
      return { id: String(j.id), nickname: p.nickname || '', avatar: p.thumbnail_image_url || '' };
    },
  },
  naver: {
    label: '네이버',
    color: '#03C75A',
    fg: '#ffffff',
    idEnv: 'NAVER_CLIENT_ID',
    secretEnv: 'NAVER_CLIENT_SECRET',
    authorize: 'https://nid.naver.com/oauth2.0/authorize',
    token: 'https://nid.naver.com/oauth2.0/token',
    profile: 'https://openapi.naver.com/v1/nid/me',
    scope: '',
    parse(j) {
      const r = j.response || {};
      return { id: String(r.id), nickname: r.nickname || r.name || '', avatar: r.profile_image || '' };
    },
  },
};

export function enabledProviders(env) {
  return Object.keys(PROVIDERS).filter((k) => {
    const p = PROVIDERS[k];
    return !!env[p.idEnv] && !!env[p.secretEnv];
  }).map((k) => ({ key: k, label: PROVIDERS[k].label, color: PROVIDERS[k].color, fg: PROVIDERS[k].fg }));
}

// ---------- 서명 유틸 ----------
const enc = new TextEncoder();
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return b64url(new Uint8Array(sig));
}
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randId(n = 24) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return b64url(a);
}
function secretOf(env) {
  return env.SESSION_SECRET || env.KAKAO_CLIENT_SECRET || env.NAVER_CLIENT_SECRET || 'inbokdo-dev-secret';
}

function parseCookies(request) {
  const h = request.headers.get('cookie') || '';
  const out = {};
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function cookieHeader(name, value, opts = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (opts.secure !== false) bits.push('Secure');
  if (opts.maxAge != null) bits.push(`Max-Age=${opts.maxAge}`);
  return bits.join('; ');
}

export async function ensureAuthSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      created_at INTEGER NOT NULL,
      last_seen INTEGER
    )`),
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_prov ON users(provider, provider_id)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`),
  ]);
  try { await db.prepare(`ALTER TABLE maps ADD COLUMN user_id TEXT`).run(); } catch (e) { /* 이미 존재 */ }
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_maps_user ON maps(user_id)`).run(); } catch (e) { /* noop */ }
}

/** 현재 로그인 사용자 (없으면 null) */
export async function currentUser(request, env) {
  if (!env.DB) return null;
  const sid = parseCookies(request)[COOKIE];
  if (!sid) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.provider, u.nickname, u.avatar, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.sid = ?`
  ).bind(sid).first();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE sid = ?`).bind(sid).run();
    return null;
  }
  return { id: row.id, provider: row.provider, nickname: row.nickname, avatar: row.avatar };
}

function safeNext(next) {
  if (typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

/** /auth/... 라우팅. 처리하지 않으면 null */
export async function handleAuth(request, env, url) {
  const secure = url.protocol === 'https:';
  const m = url.pathname.match(/^\/auth\/([a-z]+)(\/callback)?$/);

  if (url.pathname === '/auth/logout' && request.method === 'POST') {
    const sid = parseCookies(request)[COOKIE];
    if (sid && env.DB) await env.DB.prepare(`DELETE FROM sessions WHERE sid = ?`).bind(sid).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'set-cookie': cookieHeader(COOKIE, '', { maxAge: 0, secure }),
      },
    });
  }

  if (!m) return null;
  const key = m[1];
  const p = PROVIDERS[key];
  if (!p) return null;

  const clientId = env[p.idEnv];
  const clientSecret = env[p.secretEnv];
  if (!clientId || !clientSecret) {
    return new Response('이 로그인 방식은 아직 준비 중입니다.', { status: 503 });
  }
  const redirectUri = `${url.origin}/auth/${key}/callback`;

  // 1) 인가 요청
  if (!m[2]) {
    const next = safeNext(url.searchParams.get('next') || '/');
    const nonce = randId(12);
    const payload = `${nonce}|${next}`;
    const sig = await hmac(secretOf(env), payload);
    const state = `${payload}|${sig}`;

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });
    if (p.scope) q.set('scope', p.scope);
    return new Response(null, {
      status: 302,
      headers: {
        location: `${p.authorize}?${q}`,
        'set-cookie': cookieHeader(STATE_COOKIE, state, { maxAge: 600, secure }),
      },
    });
  }

  // 2) 콜백
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const err = url.searchParams.get('error');
  if (err || !code) {
    return Response.redirect(`${url.origin}/?login=cancel`, 302);
  }
  const cookieState = parseCookies(request)[STATE_COOKIE];
  if (!cookieState || cookieState !== state) {
    return Response.redirect(`${url.origin}/?login=state`, 302);
  }
  const parts = state.split('|');
  if (parts.length !== 3) return Response.redirect(`${url.origin}/?login=state`, 302);
  const expect = await hmac(secretOf(env), `${parts[0]}|${parts[1]}`);
  if (expect !== parts[2]) return Response.redirect(`${url.origin}/?login=state`, 302);
  const next = safeNext(parts[1]);

  // 토큰 교환
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    state,
  });
  const tRes = await fetch(p.token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });
  const tJson = await tRes.json().catch(() => ({}));
  if (!tRes.ok || !tJson.access_token) {
    return Response.redirect(`${url.origin}/?login=token`, 302);
  }

  const pRes = await fetch(p.profile, { headers: { authorization: `Bearer ${tJson.access_token}` } });
  const pJson = await pRes.json().catch(() => ({}));
  const prof = p.parse(pJson);
  if (!prof.id) return Response.redirect(`${url.origin}/?login=profile`, 302);

  const uid = `${key}_${prof.id}`;
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO users (id, provider, provider_id, nickname, avatar, created_at, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname, avatar = excluded.avatar, last_seen = excluded.last_seen`
  ).bind(uid, key, prof.id, prof.nickname.slice(0, 20), prof.avatar.slice(0, 300), now, now).run();

  const sid = randId(32);
  const expires = now + SESSION_DAYS * 86400000;
  await env.DB.prepare(
    `INSERT INTO sessions (sid, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(sid, uid, now, expires).run();

  return new Response(null, {
    status: 302,
    headers: [
      ['location', `${url.origin}${next}${next.includes('?') ? '&' : '?'}login=ok`],
      ['set-cookie', cookieHeader(COOKIE, sid, { maxAge: SESSION_DAYS * 86400, secure })],
      ['set-cookie', cookieHeader(STATE_COOKIE, '', { maxAge: 0, secure })],
    ],
  });
}
