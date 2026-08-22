// index.js — 인연지도 Cloudflare Worker
import { computeSaju } from './saju.js';
import { analyze, TYPES, CHARACTERS, scoreBand, AXES, AXIS_ORDER } from './compat.js';
import { TOPICS, isTopic, topicsPayload } from './topics.js';
import { tojeong } from './tojeong.js';
import { leapMonthOf, lunarMonthLength } from './astro.js';
import APP_HTML from './app.html';
import OG_PNG from './og.png';
import AD1_PNG from './ad1.png';
import { handleAuth, currentUser, ensureAuthSchema, enabledProviders } from './auth.js';
import { privacyPage, termsPage } from './legal.js';
import { todayFortune, lifeAreas, todayKST } from './fortune.js';

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
function randCode(n = 7) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((x) => ALPHABET[x % ALPHABET.length]).join('');
}
function randToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const bad = (msg, status = 400) => json({ error: msg }, status);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function validBirth(b) {
  if (!b || typeof b !== 'object') return '생년월일이 필요합니다.';
  const { y, m, d } = b;
  if (!Number.isInteger(y) || y < 1900 || y > 2035) return '연도를 확인해 주세요.';
  if (!Number.isInteger(m) || m < 1 || m > 12) return '월을 확인해 주세요.';
  if (!Number.isInteger(d) || d < 1 || d > 31) return '일을 확인해 주세요.';
  if (!b.unknownTime) {
    if (!Number.isInteger(b.hour) || b.hour < 0 || b.hour > 23) return '시간을 확인해 주세요.';
  }
  return null;
}

function normBirth(b) {
  return {
    y: b.y | 0, m: b.m | 0, d: b.d | 0,
    hour: b.unknownTime ? null : (b.hour | 0),
    minute: b.unknownTime ? null : (b.minute | 0),
    unknownTime: !!b.unknownTime,
    lunar: !!b.lunar,
    leap: !!b.leap,
    trueSolar: !!b.trueSolar,
  };
}

function cleanName(n) {
  const s = String(n ?? '').trim().replace(/\s+/g, ' ').slice(0, 12);
  return s;
}

function charPayload(stem) {
  const c = CHARACTERS[stem];
  return { key: c.key, name: c.name, han: c.han, tag: c.tag, desc: c.desc, color: c.color, elem: c.elem, give: c.give, want: c.want };
}

function sajuPayload(s) {
  const P = s.pillars;
  return {
    pillars: {
      year: [P.year.stem, P.year.branch],
      month: [P.month.stem, P.month.branch],
      day: [P.day.stem, P.day.branch],
      hour: P.hour ? [P.hour.stem, P.hour.branch] : null,
    },
    dist: s.dist,
    zodiac: s.zodiac,
    solar: s.solar,
    lunar: s.lunar,
    unknownTime: s.unknownTime,
  };
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS maps (
      code TEXT PRIMARY KEY,
      owner_name TEXT NOT NULL,
      owner_token TEXT NOT NULL,
      birth_json TEXT NOT NULL,
      saju_json TEXT NOT NULL,
      day_stem INTEGER NOT NULL,
      views INTEGER DEFAULT 0,
      plan TEXT NOT NULL DEFAULT 'free',
      entry_limit INTEGER NOT NULL DEFAULT 5,
      unlocked_at INTEGER,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      birth_json TEXT NOT NULL,
      saju_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      score INTEGER NOT NULL,
      day_stem INTEGER NOT NULL,
      token TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_code ON entries(code, score DESC)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS checkins (
      code TEXT NOT NULL, day TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (code, day)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS referrals (
      child TEXT PRIMARY KEY, parent TEXT NOT NULL, created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ref_parent ON referrals(parent)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS shares (
      code TEXT NOT NULL, day TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (code, day)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS stats (
      day TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 0
    )`),
    // 분야별 방 (재물지도 등). 주인이 중앙에 서지 않고 주제가 중앙에 선다.
    db.prepare(`CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      topic TEXT NOT NULL DEFAULT 'wealth',
      title TEXT NOT NULL,
      owner_token TEXT NOT NULL,
      user_id INTEGER,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS room_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      birth_json TEXT NOT NULL,
      saju_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      score INTEGER NOT NULL,
      day_stem INTEGER NOT NULL,
      token TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_room_entries ON room_entries(code, score DESC)`),
  ]);
  // 기존 DB 대비 컬럼 보강 (이미 있으면 무시)
  for (const sql of [
    `ALTER TABLE maps ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'`,
    `ALTER TABLE maps ADD COLUMN entry_limit INTEGER NOT NULL DEFAULT 5`,
    `ALTER TABLE maps ADD COLUMN unlocked_at INTEGER`,
    `ALTER TABLE maps ADD COLUMN ref_code TEXT`,
    `ALTER TABLE maps ADD COLUMN streak INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE maps ADD COLUMN last_checkin TEXT`,
    `ALTER TABLE maps ADD COLUMN last_share TEXT`,
  ]) { try { await db.prepare(sql).run(); } catch (e) { /* 이미 존재 */ } }
}

// 정원 제한 없음. 한 지도가 받을 수 있는 절대 상한만 둔다.
const HARD_CAP = 300;       // 절대 상한

/** 한국 날짜 문자열 (YYYY-MM-DD) */
function kstDay(ts) {
  return new Date((ts ?? Date.now()) + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 옛 데이터에는 axis 가 없어 십신 이름에서 되살린다
const SIPSIN_KO_AXIS = {
  '비견': 'bi', '겁재': 'bi', '식신': 'sik', '상관': 'sik',
  '편재': 'jae', '정재': 'jae', '편관': 'gwan', '정관': 'gwan',
  '편인': 'in', '정인': 'in',
};
function axisOf(res, dir) {
  const direct = dir === 'in' ? res.axisIn : res.axisOut;
  if (direct) return direct;
  const ko = dir === 'in' ? res.sipsinIn : res.sipsinOut;
  return SIPSIN_KO_AXIS[ko] || 'bi';
}

function entryRow(r) {
  const res = JSON.parse(r.result_json);
  return {
    id: r.id,
    name: r.name,
    score: r.score,
    typeIn: res.typeIn,
    typeOut: res.typeOut,
    axisIn: axisOf(res, 'in'),
    axisOut: axisOf(res, 'out'),
    charKey: CHARACTERS[r.day_stem].key,
    elem: CHARACTERS[r.day_stem].elem,
    cheoneul: !!res.cheoneul,
    createdAt: r.created_at,
  };
}

/** 방문 카운트 (같은 사람이 여러 번 들어와도 계속 셈) */
async function bumpStats(env) {
  const day = kstDay();
  const sql = `INSERT INTO stats (day, hits) VALUES (?, 1)
               ON CONFLICT(day) DO UPDATE SET hits = hits + 1`;
  try {
    await env.DB.prepare(sql).bind(day).run();
  } catch (e) {
    // 테이블이 아직 없으면 만들고 한 번 더 (통계는 실패해도 서비스에 영향 없음)
    try {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS stats (day TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 0)`
      ).run();
      await env.DB.prepare(sql).bind(day).run();
    } catch (e2) { /* 무시 */ }
  }
}

async function handleApi(request, env, url) {
  const db = env.DB;
  const path = url.pathname;
  const me = await currentUser(request, env);

  // 내 정보 + 내 지도들
  if (path === '/api/me' && request.method === 'GET') {
    if (!me) return json({ user: null, providers: enabledProviders(env) });
    const { results } = await db.prepare(
      `SELECT m.code, m.owner_name, m.day_stem, m.entry_limit, m.created_at,
              (SELECT COUNT(*) FROM entries e WHERE e.code = m.code) AS n
         FROM maps m WHERE m.user_id = ? ORDER BY m.created_at DESC LIMIT 20`
    ).bind(me.id).all();
    return json({
      user: me,
      providers: enabledProviders(env),
      maps: results.map((r) => ({
        code: r.code, name: r.owner_name, char: charPayload(r.day_stem),
        count: r.n, limit: HARD_CAP, createdAt: r.created_at,
      })),
    });
  }

  // 브라우저에만 있던 지도를 계정에 붙이기
  const mClaim = path.match(/^\/api\/maps\/([0-9a-z]{4,12})\/claim$/);
  if (mClaim && request.method === 'POST') {
    if (!me) return bad('로그인이 필요합니다.', 401);
    const code = mClaim[1];
    const body = await request.json().catch(() => ({}));
    const row = await db.prepare(`SELECT owner_token, user_id FROM maps WHERE code = ?`).bind(code).first();
    if (!row) return bad('없는 지도입니다.', 404);
    if (row.user_id && row.user_id !== me.id) return bad('이미 다른 계정에 저장된 지도입니다.', 409);
    if (!row.user_id && body.token !== row.owner_token) return bad('이 지도의 주인만 저장할 수 있어요.', 403);
    await db.prepare(`UPDATE maps SET user_id = ? WHERE code = ?`).bind(me.id, code).run();
    return json({ ok: true });
  }

  // 지도 생성
  if (path === '/api/maps' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const name = cleanName(body.name);
    if (!name) return bad('이름 또는 닉네임을 입력해 주세요.');
    const err = validBirth(body.birth);
    if (err) return bad(err);
    const birth = normBirth(body.birth);
    let saju;
    try { saju = computeSaju(birth); } catch (e) { return bad(e.message || '사주를 계산할 수 없습니다.'); }

    const code = randCode();
    const token = randToken();
    const ref = typeof body.ref === 'string' && /^[0-9a-z]{4,12}$/.test(body.ref) ? body.ref : null;

    await db.prepare(
      `INSERT INTO maps (code, owner_name, owner_token, birth_json, saju_json, day_stem, ref_code, user_id, entry_limit, plan, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'free', ?)`
    ).bind(code, name, token, JSON.stringify(birth), JSON.stringify(saju), saju.dayStem, ref,
      me ? me.id : null, HARD_CAP, Date.now()).run();

    // 초대 기록 (통계용). 정원 제한이 없어져 보상은 더 이상 주지 않는다.
    let refRewarded = false;
    if (ref && ref !== code) {
      const parent = await db.prepare(`SELECT code FROM maps WHERE code = ?`).bind(ref).first();
      if (parent) {
        try {
          await db.prepare(`INSERT INTO referrals (child, parent, created_at) VALUES (?, ?, ?)`)
            .bind(code, ref, Date.now()).run();
        } catch (e) { /* 이미 기록됨 */ }
      }
    }

    return json({
      code, token, refRewarded, saved: !!me,
      owner: { name, char: charPayload(saju.dayStem), saju: sajuPayload(saju) },
    });
  }

  const mMap = path.match(/^\/api\/maps\/([0-9a-z]{4,12})$/);
  if (mMap && request.method === 'GET') {
    const code = mMap[1];
    const row = await db.prepare(`SELECT * FROM maps WHERE code = ?`).bind(code).first();
    if (!row) return bad('없는 지도입니다.', 404);
    const { results } = await db.prepare(
      `SELECT id, name, score, day_stem, result_json, created_at FROM entries WHERE code = ? ORDER BY score DESC, id ASC LIMIT 300`
    ).bind(code).all();
    const saju = JSON.parse(row.saju_json);
    const isOwner = (me && row.user_id && row.user_id === me.id)
      || url.searchParams.get('token') === row.owner_token;
    return json({
      code,
      ownerName: row.owner_name,
      ownerChar: charPayload(row.day_stem),
      ownerSaju: isOwner ? sajuPayload(saju) : { dist: saju.dist, zodiac: saju.zodiac },
      isOwner,
      count: results.length,
      limit: HARD_CAP,
      full: results.length >= HARD_CAP,
      saved: isOwner ? !!row.user_id : undefined,
      invites: isOwner ? (await db.prepare(`SELECT COUNT(*) AS n FROM referrals WHERE parent = ?`).bind(code).first()).n : undefined,
      entries: results.map((r, i) => ({ ...entryRow(r), rank: i + 1 })),
      createdAt: row.created_at,
    });
  }

  // 참여
  const mJoin = path.match(/^\/api\/maps\/([0-9a-z]{4,12})\/join$/);
  if (mJoin && request.method === 'POST') {
    const code = mJoin[1];
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const name = cleanName(body.name);
    if (!name) return bad('이름 또는 닉네임을 입력해 주세요.');
    const err = validBirth(body.birth);
    if (err) return bad(err);

    const row = await db.prepare(`SELECT * FROM maps WHERE code = ?`).bind(code).first();
    if (!row) return bad('없는 지도입니다.', 404);

    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM entries WHERE code = ?`).bind(code).first();
    if (cnt.n >= HARD_CAP) {
      return json({
        error: `이 지도는 최대 ${HARD_CAP}명까지 받을 수 있어요.`,
        reason: 'LIMIT', limit: HARD_CAP, count: cnt.n,
        ownerName: row.owner_name,
      }, 402);
    }

    const birth = normBirth(body.birth);
    let B;
    try { B = computeSaju(birth); } catch (e) { return bad(e.message || '사주를 계산할 수 없습니다.'); }
    const A = JSON.parse(row.saju_json);
    const res = analyze(A, B);

    const token = randToken();
    const ins = await db.prepare(
      `INSERT INTO entries (code, name, birth_json, saju_json, result_json, score, day_stem, token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(code, name, JSON.stringify(birth), JSON.stringify(B), JSON.stringify(res),
      res.score, B.dayStem, token, Date.now()).run();

    const id = ins.meta.last_row_id;
    const rank = await db.prepare(
      `SELECT COUNT(*) + 1 AS r FROM entries WHERE code = ? AND (score > ? OR (score = ? AND id < ?))`
    ).bind(code, res.score, res.score, id).first();
    const total = cnt.n + 1;

    return json({
      entryId: id, token,
      ownerName: row.owner_name,
      ownerChar: charPayload(row.day_stem),
      me: { name, char: charPayload(B.dayStem), saju: sajuPayload(B) },
      result: res,
      rank: rank.r, total,
    });
  }

  // 결과 다시 보기
  const mEntry = path.match(/^\/api\/maps\/([0-9a-z]{4,12})\/entries\/(\d+)$/);
  if (mEntry && request.method === 'GET') {
    const [, code, id] = mEntry;
    const token = url.searchParams.get('token') || '';
    const row = await db.prepare(`SELECT * FROM entries WHERE code = ? AND id = ?`).bind(code, id).first();
    if (!row || row.token !== token) return bad('결과를 찾을 수 없습니다.', 404);
    const map = await db.prepare(`SELECT owner_name, day_stem FROM maps WHERE code = ?`).bind(code).first();
    const rank = await db.prepare(
      `SELECT COUNT(*) + 1 AS r FROM entries WHERE code = ? AND (score > ? OR (score = ? AND id < ?))`
    ).bind(code, row.score, row.score, row.id).first();
    const total = await db.prepare(`SELECT COUNT(*) AS n FROM entries WHERE code = ?`).bind(code).first();
    return json({
      entryId: row.id, token,
      ownerName: map.owner_name,
      ownerChar: charPayload(map.day_stem),
      me: { name: row.name, char: charPayload(row.day_stem), saju: sajuPayload(JSON.parse(row.saju_json)) },
      result: JSON.parse(row.result_json),
      rank: rank.r, total: total.n,
    });
  }

  // 참여자 삭제 (지도 주인)
  const mDel = path.match(/^\/api\/maps\/([0-9a-z]{4,12})\/entries\/(\d+)$/);
  if (mDel && request.method === 'DELETE') {
    const [, code, id] = mDel;
    const token = url.searchParams.get('token') || '';
    const row = await db.prepare(`SELECT owner_token FROM maps WHERE code = ?`).bind(code).first();
    if (!row || row.owner_token !== token) return bad('권한이 없습니다.', 403);
    await db.prepare(`DELETE FROM entries WHERE code = ? AND id = ?`).bind(code, id).run();
    return json({ ok: true });
  }

  // 사주만 계산 (미리보기)
  if (path === '/api/saju' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const err = validBirth(body?.birth);
    if (err) return bad(err);
    try {
      const s = computeSaju(normBirth(body.birth));
      return json({ char: charPayload(s.dayStem), saju: sajuPayload(s) });
    } catch (e) { return bad(e.message || '계산 실패'); }
  }

  // 오늘의 운세 · 사주팔자 · 분야별 풀이
  if (path === '/api/fortune' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const err = validBirth(body.birth);
    if (err) return bad(err);
    try {
      const s = computeSaju(normBirth(body.birth));
      return json({
        char: charPayload(s.dayStem),
        saju: sajuPayload(s),
        today: todayFortune(s),
        areas: lifeAreas(s),
        serverDay: todayKST(),
      });
    } catch (e) { return bad(e.message || '계산 실패'); }
  }

  // 토정비결
  if (path === '/api/tojeong' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const err = validBirth(body.birth);
    if (err) return bad(err);
    const nowY = todayKST().y;
    let year = parseInt(body.year, 10);
    if (!Number.isFinite(year) || year < 1950 || year > nowY + 1) year = nowY;
    try {
      const s2 = computeSaju(normBirth(body.birth));
      return json({ char: charPayload(s2.dayStem), saju: sajuPayload(s2), result: tojeong(normBirth(body.birth), year), thisYear: nowY });
    } catch (e) { return bad(e.message || '계산 실패'); }
  }

  /* ══════════ 재물지도 (분야별 방) ══════════ */

  function roomEntryRow(r) {
    const res = JSON.parse(r.result_json);
    return {
      id: r.id,
      name: r.name,
      score: r.score,
      axis: res.axis,
      band: res.band,
      bandLabel: res.bandLabel,
      charKey: CHARACTERS[r.day_stem].key,
      elem: CHARACTERS[r.day_stem].elem,
      createdAt: r.created_at,
    };
  }

  // 방 만들기
  if (path === '/api/rooms' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const name = cleanName(body.name);
    if (!name) return bad('이름 또는 닉네임을 입력해 주세요.');
    const rawTopic = isTopic(body.topic) ? body.topic : 'wealth';
    const title = cleanName(body.title) || `${name}님의 ${TOPICS[rawTopic].label}`;
    const err = validBirth(body.birth);
    if (err) return bad(err);

    const topic = isTopic(body.topic) ? body.topic : 'wealth';
    let saju;
    try { saju = computeSaju(normBirth(body.birth)); } catch (e) { return bad(e.message || '사주를 계산할 수 없습니다.'); }
    const res = TOPICS[topic].score(saju);

    const me = await currentUser(request, env);
    const code = randCode();
    const token = randToken();
    const entryToken = randToken();
    const now = Date.now();

    await db.prepare(
      `INSERT INTO rooms (code, topic, title, owner_token, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(code, topic, title, token, me ? me.id : null, now).run();

    const ins = await db.prepare(
      `INSERT INTO room_entries (code, name, birth_json, saju_json, result_json, score, day_stem, token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(code, name, JSON.stringify(normBirth(body.birth)), JSON.stringify(saju),
      JSON.stringify(res), res.score, saju.dayStem, entryToken, now).run();

    return json({
      code, token, title, topic,
      entryId: ins.meta.last_row_id, entryToken,
      me: { name, char: charPayload(saju.dayStem), saju: sajuPayload(saju) },
      result: res, rank: 1, total: 1,
    });
  }

  // 방 보기
  const mRoom = path.match(/^\/api\/rooms\/([0-9a-z]{4,12})$/);
  if (mRoom && request.method === 'GET') {
    const code = mRoom[1];
    const row = await db.prepare(`SELECT * FROM rooms WHERE code = ?`).bind(code).first();
    if (!row) return bad('없는 방입니다.', 404);
    const rs = await db.prepare(
      `SELECT * FROM room_entries WHERE code = ? ORDER BY score DESC, id ASC`
    ).bind(code).all();
    const results = rs.results || [];
    const me = await currentUser(request, env);
    const isOwner = (me && row.user_id && row.user_id === me.id) ||
      url.searchParams.get('token') === row.owner_token;
    return json({
      code, topic: row.topic, title: row.title,
      isOwner,
      count: results.length,
      limit: HARD_CAP,
      full: results.length >= HARD_CAP,
      entries: results.map((r, i) => ({ ...roomEntryRow(r), rank: i + 1 })),
      createdAt: row.created_at,
    });
  }

  // 방 참여
  const mRoomJoin = path.match(/^\/api\/rooms\/([0-9a-z]{4,12})\/join$/);
  if (mRoomJoin && request.method === 'POST') {
    const code = mRoomJoin[1];
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const name = cleanName(body.name);
    if (!name) return bad('이름 또는 닉네임을 입력해 주세요.');
    const err = validBirth(body.birth);
    if (err) return bad(err);

    const row = await db.prepare(`SELECT * FROM rooms WHERE code = ?`).bind(code).first();
    if (!row) return bad('없는 방입니다.', 404);

    const cnt = await db.prepare(`SELECT COUNT(*) AS n FROM room_entries WHERE code = ?`).bind(code).first();
    if (cnt.n >= HARD_CAP) {
      return json({ error: `이 방은 최대 ${HARD_CAP}명까지 받을 수 있어요.`, reason: 'LIMIT' }, 402);
    }

    const birth = normBirth(body.birth);
    const topic = isTopic(row.topic) ? row.topic : 'wealth';
    let saju;
    try { saju = computeSaju(birth); } catch (e) { return bad(e.message || '사주를 계산할 수 없습니다.'); }
    const res = TOPICS[topic].score(saju);

    const token = randToken();
    const ins = await db.prepare(
      `INSERT INTO room_entries (code, name, birth_json, saju_json, result_json, score, day_stem, token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(code, name, JSON.stringify(birth), JSON.stringify(saju),
      JSON.stringify(res), res.score, saju.dayStem, token, Date.now()).run();

    const id = ins.meta.last_row_id;
    const rank = await db.prepare(
      `SELECT COUNT(*) + 1 AS r FROM room_entries WHERE code = ? AND (score > ? OR (score = ? AND id < ?))`
    ).bind(code, res.score, res.score, id).first();

    return json({
      code, title: row.title, topic,
      entryId: id, entryToken: token,
      me: { name, char: charPayload(saju.dayStem), saju: sajuPayload(saju) },
      result: res, rank: rank.r, total: cnt.n + 1,
    });
  }

  // 방 결과 다시 보기
  const mRoomEntry = path.match(/^\/api\/rooms\/([0-9a-z]{4,12})\/entries\/(\d+)$/);
  if (mRoomEntry && request.method === 'GET') {
    const [, code, id] = mRoomEntry;
    const token = url.searchParams.get('token') || '';
    const row = await db.prepare(`SELECT * FROM room_entries WHERE code = ? AND id = ?`).bind(code, id).first();
    if (!row || row.token !== token) return bad('결과를 찾을 수 없습니다.', 404);
    const room = await db.prepare(`SELECT title, topic FROM rooms WHERE code = ?`).bind(code).first();
    const rank = await db.prepare(
      `SELECT COUNT(*) + 1 AS r FROM room_entries WHERE code = ? AND (score > ? OR (score = ? AND id < ?))`
    ).bind(code, row.score, row.score, row.id).first();
    const total = await db.prepare(`SELECT COUNT(*) AS n FROM room_entries WHERE code = ?`).bind(code).first();
    return json({
      code, title: room ? room.title : '운세지도', topic: (room && isTopic(room.topic)) ? room.topic : 'wealth',
      entryId: row.id, entryToken: token,
      me: { name: row.name, char: charPayload(row.day_stem), saju: sajuPayload(JSON.parse(row.saju_json)) },
      result: JSON.parse(row.result_json), rank: rank.r, total: total.n,
    });
  }

  // 방 없이 내 점수만 (재물·연애·일)
  if (path === '/api/topic' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    if (!isTopic(body.topic)) return bad('없는 주제입니다.');
    const err = validBirth(body.birth);
    if (err) return bad(err);
    try {
      const s = computeSaju(normBirth(body.birth));
      return json({ char: charPayload(s.dayStem), saju: sajuPayload(s), result: TOPICS[body.topic].score(s) });
    } catch (e) { return bad(e.message || '계산 실패'); }
  }

  // 방문 통계
  if (path === '/api/stats' && request.method === 'GET') {
    const today = kstDay();
    const a = await db.prepare(`SELECT hits FROM stats WHERE day = ?`).bind(today).first();
    const b = await db.prepare(`SELECT SUM(hits) AS n FROM stats`).first();
    const c = await db.prepare(`SELECT COUNT(*) AS n FROM maps`).first();
    const e = await db.prepare(`SELECT COUNT(*) AS n FROM entries`).first();
    return json({ today: (a && a.hits) || 0, total: (b && b.n) || 0, maps: c.n, entries: e.n });
  }

  // 음력 윤달 정보
  if (path === '/api/lunar' && request.method === 'GET') {
    const y = parseInt(url.searchParams.get('y') || '0', 10);
    if (!y || y < 1900 || y > 2035) return bad('연도를 확인해 주세요.');
    try {
      return new Response(JSON.stringify({ y, leapMonth: leapMonthOf(y) }), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' },
      });
    } catch (e) { return bad('계산 실패'); }
  }

  // 메타데이터
  if (path === '/api/meta') {
    return new Response(JSON.stringify({ types: TYPES, characters: CHARACTERS, axes: AXES, axisOrder: AXIS_ORDER, topics: topicsPayload() }), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' },
    });
  }

  return bad('없는 경로입니다.', 404);
}

function renderPage(meta) {
  const t = esc(meta.title);
  const d = esc(meta.desc);
  const u = esc(meta.url);
  const head = `<title>${t}</title>
<meta name="description" content="${d}">
<meta name="robots" content="${meta.noindex ? 'noindex,nofollow' : 'index,follow'}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="스피드 운세지도">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${esc(meta.origin)}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="인연지도 - 사주로 그리는 사람 별자리 지도">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${esc(meta.origin)}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${u}">`;
  return APP_HTML.replace('<!--HEAD-->', head)
    .replace('<!--BOOT-->', `<script>window.__BOOT__=${JSON.stringify(meta.boot || {})};`
      + `window.__CONTACT__=${JSON.stringify(meta.contact || 'https://open.kakao.com/me/speedtc')}</script>`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;

    if (url.pathname.startsWith('/auth/')) {
      try {
        if (env.DB) { await ensureSchema(env.DB); await ensureAuthSchema(env.DB); }
        const r = await handleAuth(request, env, url);
        if (r) return r;
      } catch (e) {
        return new Response('로그인 처리 중 오류가 발생했습니다.', { status: 500 });
      }
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        if (env.DB) { await ensureSchema(env.DB); await ensureAuthSchema(env.DB); }
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: '서버 오류가 발생했습니다.', detail: String(e && e.message || e) }, 500);
      }
    }

    if (url.pathname === '/og.png') {
      return new Response(OG_PNG, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=604800' },
      });
    }

    if (url.pathname === '/ad1.png') {
      return new Response(AD1_PNG, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=604800' },
      });
    }

    if (url.pathname === '/privacy' || url.pathname === '/privacy/') {
      return new Response(privacyPage(env), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      });
    }
    if (url.pathname === '/terms' || url.pathname === '/terms/') {
      return new Response(termsPage(env), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      });
    }
    const PAGES = {
      '/today': { view: 'today', title: '오늘의 운세 · 스피드 운세지도', desc: '오늘 일진과 내 사주를 견줘 오늘 하루의 결을 풀어드립니다. 무료입니다.' },
      '/saju': { view: 'saju', title: '내 사주팔자 · 스피드 운세지도', desc: '생년월일시를 여덟 글자로 세우고 오행 분포까지 보여드립니다. 무료입니다.' },
      '/life': { view: 'life', title: '분야별 풀이 · 스피드 운세지도', desc: '건강·재물·일·사람. 내 원국을 네 갈래로 나눠 풀어드립니다. 무료입니다.' },
      '/about': { view: 'about', title: '어떻게 계산하나요 · 스피드 운세지도', desc: '스피드 운세지도가 쓰는 명리학 방법과 천문 계산을 그대로 공개합니다.' },
      '/tojeong': { view: 'tojeong', title: '토정비결 · 스피드 운세지도', desc: '올해 나의 토정비결을 무료로 봅니다. 괘는 전통 작괘법 그대로 뽑고, 풀이는 우리가 직접 썼습니다.' },
      '/my': { view: 'profile', title: '내 사주 · 스피드 운세지도', desc: '생년월일을 한 번만 넣으면 오늘의 운세·사주팔자·분야별 풀이가 바로 열립니다.' },
      '/wealth': { view: 'roomNew', topic: 'wealth', title: '재물지도 · 스피드 운세지도', desc: '단톡방 사람들의 재물 사주를 한 장의 지도에 모읍니다. 가운데가 財, 안쪽에 있을수록 재물 그릇이 큰 사람입니다. 무료입니다.' },
      '/love': { view: 'roomNew', topic: 'love', title: '연애지도 · 스피드 운세지도', desc: '단톡방에서 누구에게 인연이 먼저 오는지 사주로 봅니다. 애인 유무는 묻지 않습니다. 무료입니다.' },
      '/work': { view: 'roomNew', topic: 'work', title: '일운지도 · 스피드 운세지도', desc: '누가 크게 쓰일 사람인지 사주로 봅니다. 직업이나 연봉은 묻지 않습니다. 무료입니다.' },
    };
    if (PAGES[url.pathname]) {
      const pg = PAGES[url.pathname];
      if (env.DB) ctx.waitUntil(bumpStats(env));
      return new Response(renderPage({
        title: pg.title, desc: pg.desc, url: origin + url.pathname, origin,
        boot: { view: pg.view, topic: pg.topic, providers: enabledProviders(env), kakaoKey: env.KAKAO_JS_KEY || '' },
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (url.pathname === '/login' || url.pathname === '/me') {
      return new Response(renderPage({
        title: url.pathname === '/login' ? '스피드 운세지도 로그인' : '내 지도 · 스피드 운세지도',
        desc: '스피드 운세지도', url: origin + url.pathname, origin,
        boot: { view: url.pathname === '/login' ? 'login' : 'mine', providers: enabledProviders(env), kakaoKey: env.KAKAO_JS_KEY || '' },
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (url.pathname === '/robots.txt') {
      // 링크 미리보기 봇은 전부 통과시킨다. 검색 노출은 /m/ 페이지의 noindex 메타로 막는다.
      const previewBots = [
        'kakaotalk-scrap', 'Kakaotalk-scrap', 'Daumoa', 'Yeti', 'NaverBot',
        'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot',
        'Slackbot', 'Slackbot-LinkExpanding', 'Discordbot', 'TelegramBot',
        'WhatsApp', 'SkypeUriPreview', 'Line', 'Applebot',
      ];
      const body = previewBots.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n')
        + `\nUser-agent: *\nDisallow: /me\nDisallow: /auth/\nDisallow: /api/\n`;
      return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    const mPage = url.pathname.match(/^\/m\/([0-9a-z]{4,12})\/?$/);
    if (mPage) {
      const code = mPage[1];
      let ownerName = '', ownerChar = null;
      try {
        if (env.DB) {
          await ensureSchema(env.DB);
          const row = await env.DB.prepare(`SELECT owner_name, day_stem FROM maps WHERE code = ?`).bind(code).first();
          if (row) { ownerName = row.owner_name; ownerChar = CHARACTERS[row.day_stem]; }
        }
      } catch (e) { /* 무시 */ }
      const providers = enabledProviders(env);
      const title = ownerName ? `${ownerName}님의 인연지도 · 스피드 운세지도` : '스피드 운세지도';
      const desc = ownerName
        ? `생일만 넣으면 ${ownerName}님과 나 사이에 오가는 기운을 사주로 풀어드립니다. 가입도 결제도 없이 30초면 끝납니다.`
        : '내 사람 별자리를 그려보세요.';
      if (env.DB) ctx.waitUntil(bumpStats(env));
      return new Response(renderPage({ title, desc, url: `${origin}/m/${code}`, origin, boot: { view: 'map', code, ownerName, kakaoKey: env.KAKAO_JS_KEY || '', providers }, noindex: true }), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    const mRoomPage = url.pathname.match(/^\/w\/([0-9a-z]{4,12})\/?$/);
    if (mRoomPage) {
      const code = mRoomPage[1];
      let title2 = '', topic2 = 'wealth';
      try {
        if (env.DB) {
          await ensureSchema(env.DB);
          const row = await env.DB.prepare(`SELECT title, topic FROM rooms WHERE code = ?`).bind(code).first();
          if (row) { title2 = row.title; topic2 = isTopic(row.topic) ? row.topic : 'wealth'; }
        }
      } catch (e) { /* 무시 */ }
      const providers = enabledProviders(env);
      const TL = TOPICS[topic2].label;
      const title = title2 ? `${title2} · ${TL}` : `${TL} · 스피드 운세지도`;
      const desc = title2
        ? `생일만 넣으면 내 사주가 이 지도에 찍힙니다. ${TOPICS[topic2].lead} 무료입니다.`
        : `단톡방 사람들의 사주를 한 장의 지도에 모읍니다. ${TL}, 전부 무료입니다.`;
      if (env.DB) ctx.waitUntil(bumpStats(env));
      return new Response(renderPage({
        title, desc, url: `${origin}/w/${code}`, origin,
        boot: { view: 'room', code, roomTitle: title2, topic: topic2, kakaoKey: env.KAKAO_JS_KEY || '', providers },
        noindex: true,
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (url.pathname === '/' || url.pathname === '') {
      if (env.DB) ctx.waitUntil(bumpStats(env));
      return new Response(renderPage({
        title: '스피드 운세지도 · 사주 전부 무료',
        desc: '사주팔자·오늘의 운세·인연지도·재물지도, 모든 메뉴가 무료입니다. 생일만 넣으면 두 사람 사이에 오가는 기운을 별자리처럼 그려드립니다. 가입도 결제도 없이 30초면 끝납니다.',
        url: origin, origin, boot: { view: 'home', kakaoKey: env.KAKAO_JS_KEY || '', providers: enabledProviders(env) },
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    return new Response(renderPage({
      title: '인연지도 · 페이지를 찾을 수 없습니다',
      desc: '인연지도', url: origin, origin, boot: { view: 'notfound' },
    }), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
};
