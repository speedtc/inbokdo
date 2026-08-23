// index.js — 인연지도 Cloudflare Worker
import { computeSaju } from './saju.js';
import { analyze, relDeep, TYPES, CHARACTERS, scoreBand, AXES, AXIS_ORDER } from './compat.js';
import { TOPICS, isTopic, topicsPayload, topicYear, topicActions } from './topics.js';
import { tojeong } from './tojeong.js';
import { deepSaju, extendDeep } from './deep.js';
import { leapMonthOf, lunarMonthLength } from './astro.js';
import APP_HTML from './app.html';
import OG_HOME from './og-home.png';
import OG_SAJU from './og-saju.png';
import OG_TODAY from './og-today.png';
import OG_TOJEONG from './og-tojeong.png';
import OG_LIFE from './og-life.png';
import OG_WEALTH from './og-wealth.png';
import OG_LOVE from './og-love.png';
import OG_WORK from './og-work.png';
import OG_MAP from './og-map.png';

/* 페이지별 썸네일 */
const OG_FILES = {
  'og-home.png': OG_HOME, 'og.png': OG_HOME, 'og-saju.png': OG_SAJU, 'og-today.png': OG_TODAY,
  'og-tojeong.png': OG_TOJEONG, 'og-life.png': OG_LIFE, 'og-wealth.png': OG_WEALTH,
  'og-love.png': OG_LOVE, 'og-work.png': OG_WORK, 'og-map.png': OG_MAP,
};
import AD1_PNG from './ad1.png';
import { handleAuth, currentUser, ensureAuthSchema, enabledProviders } from './auth.js';
import { privacyPage, termsPage } from './legal.js';
import { todayFortune, lifeAreas, todayKST, todayDeep } from './fortune.js';
import { lifeDeep } from './life.js';

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
  if (b.gender !== 'm' && b.gender !== 'f') return '성별을 선택해 주세요.';
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
    gender: b.gender === 'm' || b.gender === 'f' ? b.gender : null,
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
    gender: s.gender || null,
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
    // 광고 노출·클릭 집계 (광고주에게 보여줄 숫자)
    db.prepare(`CREATE TABLE IF NOT EXISTS ad_stats (
      day TEXT NOT NULL,
      ad TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, ad)
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
    // 메뉴별 페이지뷰 (어느 메뉴가 인기 있는지)
    db.prepare(`CREATE TABLE IF NOT EXISTS page_stats (
      day TEXT NOT NULL, path TEXT NOT NULL, hits INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, path)
    )`),
    // 사주 정보를 실제로 넣은 건수 (어느 메뉴에서 넣었는지)
    db.prepare(`CREATE TABLE IF NOT EXISTS saju_stats (
      day TEXT NOT NULL, src TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, src)
    )`),
    // 공유 집계 (무엇을 · 어떤 방법으로 공유했는지)
    db.prepare(`CREATE TABLE IF NOT EXISTS share_stats (
      day TEXT NOT NULL, kind TEXT NOT NULL, via TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, kind, via)
    )`),
    // 관리자 로그인 시도 (무차별 대입 방지)
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_tries (
      ip TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (ip, win)
    )`),
    // 기기 이동용 1회용 코드 (휴대폰 → PC). 15분 뒤 만료, 한 번 읽으면 삭제.
    db.prepare(`CREATE TABLE IF NOT EXISTS handoff (
      code TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
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

// 정원 제한 없음. (재배포 트리거: 관리자 통계 v1)
const HARD_CAP = 0;         // 0 = 인원 제한 없음 (entry_limit 컬럼 호환용으로만 남김)

/* 메뉴별 페이지뷰. 실패해도 서비스에 영향 없음 */
async function bumpPage(env, path) {
  if (!env.DB) return;
  const sql = `INSERT INTO page_stats (day, path, hits) VALUES (?, ?, 1)
               ON CONFLICT(day, path) DO UPDATE SET hits = hits + 1`;
  try { await env.DB.prepare(sql).bind(kstDay(), path).run(); } catch (e) { /* 무시 */ }
}
/* 사주 정보를 넣은 건수. src 예: map_new, map_join, room_new:wealth, today, deep ... */
async function bumpSaju(env, src) {
  if (!env.DB || !src) return;
  const sql = `INSERT INTO saju_stats (day, src, n) VALUES (?, ?, 1)
               ON CONFLICT(day, src) DO UPDATE SET n = n + 1`;
  try { await env.DB.prepare(sql).bind(kstDay(), String(src).slice(0, 40)).run(); } catch (e) { /* 무시 */ }
}
/* 클라이언트가 보낸 출처 문자열을 화이트리스트로 거른다 */
const SAJU_SRC = new Set(['today', 'deep', 'life', 'profile', 'tojeong', 'topic']);
function safeSrc(v, fallback) {
  return SAJU_SRC.has(v) ? v : fallback;
}

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

async function handleApi(request, env, url, ctx) {
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
        count: r.n, limit: null, createdAt: r.created_at,
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

    ctx.waitUntil(bumpSaju(env, 'map_new'));
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
      `SELECT id, name, score, day_stem, result_json, created_at FROM entries WHERE code = ? ORDER BY score DESC, id ASC LIMIT 2000`
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
      limit: null,
      full: false,
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

    // 참여 인원 제한 없음

    const birth = normBirth(body.birth);
    let B;
    try { B = computeSaju(birth); } catch (e) { return bad(e.message || '사주를 계산할 수 없습니다.'); }
    const A = JSON.parse(row.saju_json);
    const res = analyze(A, B);

    // 같은 이름 + 같은 생년월일이면 새로 넣지 않고 원래 것을 돌려준다.
    // (오류로 두 번 누르거나 뒤로가기 후 다시 제출해도 별이 두 개 찍히지 않게)
    const dup = await db.prepare(
      `SELECT id, token FROM entries WHERE code = ? AND name = ? AND birth_json = ? ORDER BY id ASC LIMIT 1`
    ).bind(code, name, JSON.stringify(birth)).first();
    if (dup) {
      const dRank = await db.prepare(
        `SELECT COUNT(*) + 1 AS r FROM entries WHERE code = ? AND (score > ? OR (score = ? AND id < ?))`
      ).bind(code, res.score, res.score, dup.id).first();
      const dTot = await db.prepare(`SELECT COUNT(*) AS n FROM entries WHERE code = ?`).bind(code).first();
      return json({
        entryId: dup.id, token: dup.token,
        ownerName: row.owner_name,
        ownerChar: charPayload(row.day_stem),
        me: { name, char: charPayload(B.dayStem), saju: sajuPayload(B) },
        result: res,
        deep: relDeep(A, B, res),
        rank: dRank.r, total: dTot.n,
        already: true,
      });
    }

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
    const tot = await db.prepare(`SELECT COUNT(*) AS n FROM entries WHERE code = ?`).bind(code).first();
    const total = tot.n;
    ctx.waitUntil(bumpSaju(env, 'map_join'));

    return json({
      entryId: id, token,
      ownerName: row.owner_name,
      ownerChar: charPayload(row.day_stem),
      me: { name, char: charPayload(B.dayStem), saju: sajuPayload(B) },
      result: res,
      deep: relDeep(A, B, res),
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
    const mapRow = await db.prepare(`SELECT saju_json FROM maps WHERE code = ?`).bind(code).first();
    const resJ = JSON.parse(row.result_json);
    let deep = null;
    try { deep = relDeep(JSON.parse(mapRow.saju_json), JSON.parse(row.saju_json), resJ); } catch (e) { deep = null; }
    return json({
      entryId: row.id, token,
      ownerName: map.owner_name,
      ownerChar: charPayload(map.day_stem),
      me: { name: row.name, char: charPayload(row.day_stem), saju: sajuPayload(JSON.parse(row.saju_json)) },
      result: resJ,
      deep,
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
    // 어느 메뉴에서 넣었는지는 클라이언트가 알려준다 (화이트리스트로 거름)
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const err = validBirth(body.birth);
    if (err) return bad(err);
    try {
      const nb = normBirth(body.birth);
      const s = computeSaju(nb);
      const base = deepSaju(s, { gender: nb.gender, year: todayKST().y });
      ctx.waitUntil(bumpSaju(env, safeSrc(body.src, 'today')));
      return json({
        char: charPayload(s.dayStem),
        saju: sajuPayload(s),
        today: todayFortune(s),
        todayDeep: todayDeep(s, base.yongsin.yong.i),
        areas: lifeAreas(s),
        life: lifeDeep(s, { gender: nb.gender }),
        yongsin: base.yongsin,
        strength: base.strength,
        ilju: base.ilju,
        serverDay: todayKST(),
      });
    } catch (e) { return bad(e.message || '계산 실패'); }
  }

  // ===================== 관리자 =====================
  // 비밀번호는 코드가 아니라 Cloudflare 시크릿(ADMIN_PW)에만 둔다.
  // 저장소가 공개라서 평문·해시 어느 쪽도 코드에 넣지 않는다.
  if (path.startsWith('/api/admin/')) {
    const PW = env.ADMIN_PW || '';
    if (!PW) return json({ error: '관리자 비밀번호가 설정되지 않았습니다.', reason: 'NO_PW' }, 503);

    const admToken = async () => {
      const buf = await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(PW + '|unsejido-admin-v1|' + PW.length));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    };
    const cookieOf = (nm) => {
      const c = request.headers.get('cookie') || '';
      const m = c.match(new RegExp('(?:^|;\\s*)' + nm + '=([^;]+)'));
      return m ? m[1] : '';
    };
    const isAdmin = async () => {
      const want = await admToken();
      const got = cookieOf('adm');
      if (got.length !== want.length) return false;
      let diff = 0;                                   // 길이가 같을 때만 상수시간 비교
      for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
      return diff === 0;
    };

    // 로그인
    if (path === '/api/admin/login' && request.method === 'POST') {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const win = Math.floor(Date.now() / 900000);    // 15분 창
      let tries = 0;
      try {
        const r = await db.prepare(`SELECT n FROM admin_tries WHERE ip = ? AND win = ?`).bind(ip, win).first();
        tries = (r && r.n) || 0;
      } catch (e) { /* 무시 */ }
      if (tries >= 8) return json({ error: '시도가 너무 많습니다. 15분 뒤에 다시 해주세요.' }, 429);

      const body = await request.json().catch(() => null);
      const pw = String(body?.pw || '');
      if (pw !== PW) {
        try {
          await db.prepare(`INSERT INTO admin_tries (ip, win, n) VALUES (?, ?, 1)
                            ON CONFLICT(ip, win) DO UPDATE SET n = n + 1`).bind(ip, win).run();
          await db.prepare(`DELETE FROM admin_tries WHERE win < ?`).bind(win - 4).run();
        } catch (e) { /* 무시 */ }
        return json({ error: '비밀번호가 맞지 않습니다.', left: Math.max(0, 7 - tries) }, 401);
      }
      const tok = await admToken();
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'set-cookie': `adm=${tok}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`,
        },
      });
    }

    if (path === '/api/admin/logout' && request.method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'set-cookie': 'adm=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
        },
      });
    }

    if (!(await isAdmin())) return json({ error: '로그인이 필요합니다.', reason: 'AUTH' }, 401);

    // 통계
    if (path === '/api/admin/stats' && request.method === 'GET') {
      let days = parseInt(url.searchParams.get('days') || '30', 10);
      if (!Number.isFinite(days) || days < 1) days = 30;
      if (days > 365) days = 365;
      const since = kstDay(Date.now() - (days - 1) * 86400000);
      const today = kstDay();
      const q = (sql, ...b) => db.prepare(sql).bind(...b).all().then((r) => r.results || []).catch(() => []);
      const q1 = (sql, ...b) => db.prepare(sql).bind(...b).first().catch(() => null);

      const [
        sumRow, todayRow, mapsRow, entriesRow, roomsRow, rEntRow,
        daily, pages, sajuSrc, ads, topMaps, topRooms, genders, ages, elems, joinDaily,
        shareKind, shareVia, shareDaily,
      ] = await Promise.all([
        q1(`SELECT SUM(hits) AS n FROM stats`),
        q1(`SELECT hits AS n FROM stats WHERE day = ?`, today),
        q1(`SELECT COUNT(*) AS n FROM maps`),
        q1(`SELECT COUNT(*) AS n FROM entries`),
        q1(`SELECT COUNT(*) AS n FROM rooms`),
        q1(`SELECT COUNT(*) AS n FROM room_entries`),
        q(`SELECT day, hits AS n FROM stats WHERE day >= ? ORDER BY day`, since),
        q(`SELECT path, SUM(hits) AS n FROM page_stats WHERE day >= ? GROUP BY path ORDER BY n DESC`, since),
        q(`SELECT src, SUM(n) AS n FROM saju_stats WHERE day >= ? GROUP BY src ORDER BY n DESC`, since),
        q(`SELECT ad, SUM(views) AS v, SUM(clicks) AS c FROM ad_stats WHERE day >= ? GROUP BY ad ORDER BY v DESC`, since),
        q(`SELECT m.code, m.owner_name, m.created_at,
                  (SELECT COUNT(*) FROM entries e WHERE e.code = m.code) AS n
             FROM maps m ORDER BY n DESC, m.created_at DESC LIMIT 20`),
        q(`SELECT r.code, r.topic, r.title, r.created_at,
                  (SELECT COUNT(*) FROM room_entries x WHERE x.code = r.code) AS n
             FROM rooms r ORDER BY n DESC, r.created_at DESC LIMIT 20`),
        q(`SELECT g AS k, COUNT(*) AS n FROM (
             SELECT json_extract(birth_json,'$.gender') AS g FROM entries
             UNION ALL
             SELECT json_extract(birth_json,'$.gender') AS g FROM room_entries
           ) GROUP BY g`),
        q(`SELECT (CAST(json_extract(birth_json,'$.y') AS INTEGER)/10)*10 AS k, COUNT(*) AS n FROM (
             SELECT birth_json FROM entries UNION ALL SELECT birth_json FROM room_entries
           ) GROUP BY k ORDER BY k`),
        q(`SELECT day_stem AS k, COUNT(*) AS n FROM (
             SELECT day_stem FROM entries UNION ALL SELECT day_stem FROM room_entries
           ) GROUP BY k ORDER BY k`),
        q(`SELECT day, SUM(n) AS n FROM saju_stats WHERE day >= ? GROUP BY day ORDER BY day`, since),
        q(`SELECT kind AS k, SUM(n) AS n FROM share_stats WHERE day >= ? GROUP BY kind ORDER BY n DESC`, since),
        q(`SELECT via AS k, SUM(n) AS n FROM share_stats WHERE day >= ? GROUP BY via ORDER BY n DESC`, since),
        q(`SELECT day, SUM(n) AS n FROM share_stats WHERE day >= ? GROUP BY day ORDER BY day`, since),
      ]);

      return json({
        days, since, today,
        summary: {
          visitsTotal: (sumRow && sumRow.n) || 0,
          visitsToday: (todayRow && todayRow.n) || 0,
          maps: (mapsRow && mapsRow.n) || 0,
          entries: (entriesRow && entriesRow.n) || 0,
          rooms: (roomsRow && roomsRow.n) || 0,
          roomEntries: (rEntRow && rEntRow.n) || 0,
          sajuTotal: ((entriesRow && entriesRow.n) || 0) + ((rEntRow && rEntRow.n) || 0)
            + ((mapsRow && mapsRow.n) || 0) + ((roomsRow && roomsRow.n) || 0),
        },
        daily, joinDaily, pages, sajuSrc, ads, topMaps, topRooms,
        share: { kinds: shareKind, vias: shareVia, daily: shareDaily,
                 total: shareKind.reduce((a, r) => a + (Number(r.n) || 0), 0) },
        people: { genders, ages, elems },
      });
    }

    // 지도/방 지우기 (관리자)
    const mAdmDel = path.match(/^\/api\/admin\/(map|room)\/([0-9a-z]{4,12})$/);
    if (mAdmDel && request.method === 'DELETE') {
      const [, kind, code] = mAdmDel;
      try {
        if (kind === 'map') {
          await db.prepare(`DELETE FROM entries WHERE code = ?`).bind(code).run();
          await db.prepare(`DELETE FROM maps WHERE code = ?`).bind(code).run();
        } else {
          await db.prepare(`DELETE FROM room_entries WHERE code = ?`).bind(code).run();
          await db.prepare(`DELETE FROM rooms WHERE code = ?`).bind(code).run();
        }
        return json({ ok: true });
      } catch (e) { return bad('삭제하지 못했습니다.'); }
    }

    return bad('없는 경로입니다.', 404);
  }

  // 공유 집계 (실패해도 화면에 영향 없음)
  if (path === '/api/share' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const kind = String(body?.kind || '').slice(0, 40);
    const via = String(body?.via || '').slice(0, 12);
    if (!/^[a-z0-9_:-]+$/i.test(kind)) return json({ ok: false });
    if (!['kakao', 'webshare', 'copy'].includes(via)) return json({ ok: false });
    const sql = `INSERT INTO share_stats (day, kind, via, n) VALUES (?, ?, ?, 1)
                 ON CONFLICT(day, kind, via) DO UPDATE SET n = n + 1`;
    try { await db.prepare(sql).bind(kstDay(), kind, via).run(); } catch (e) { /* 무시 */ }
    return json({ ok: true });
  }

  // 광고 노출·클릭 집계
  if (path === '/api/ad' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const ad = String(body?.ad || '').slice(0, 40);
    const kind = body?.kind === 'click' ? 'clicks' : 'views';
    if (!ad || !/^[a-z0-9_-]+$/i.test(ad)) return json({ ok: false });
    const day = kstDay();
    try {
      await db.prepare(
        `INSERT INTO ad_stats (day, ad, ${kind}) VALUES (?, ?, 1)
         ON CONFLICT(day, ad) DO UPDATE SET ${kind} = ${kind} + 1`
      ).bind(day, ad).run();
    } catch (e) { /* 집계 실패는 무시 */ }
    return json({ ok: true });
  }

  // 광고 성과 (광고주에게 보여줄 숫자)
  if (path === '/api/ad/stats' && request.method === 'GET') {
    const days = Math.min(120, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
    const from = kstDay(Date.now() - days * 86400000);
    try {
      const rs = await db.prepare(
        `SELECT ad, SUM(views) AS views, SUM(clicks) AS clicks
         FROM ad_stats WHERE day >= ? GROUP BY ad ORDER BY views DESC`
      ).bind(from).all();
      const daily = await db.prepare(
        `SELECT day, SUM(views) AS views, SUM(clicks) AS clicks
         FROM ad_stats WHERE day >= ? GROUP BY day ORDER BY day DESC`
      ).bind(from).all();
      return json({ from, days, ads: rs.results || [], daily: daily.results || [] });
    } catch (e) { return json({ from, days, ads: [], daily: [] }); }
  }

  // 사주 심화 풀이
  // ===== 기기 이동 (휴대폰에서 뽑은 코드를 PC에 넣으면 내 사주·내 지도가 그대로 넘어간다) =====
  const HANDOFF_TTL = 15 * 60 * 1000;
  const HANDOFF_ABC = 'abcdefghjkmnpqrstuvwxyz23456789'; // 헷갈리는 글자(i,l,o,0,1) 제외
  if (path === '/api/handoff' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.data !== 'string') return bad('보낼 내용이 없습니다.');
    if (body.data.length > 60000) return bad('내용이 너무 큽니다.');
    try { await db.prepare(`DELETE FROM handoff WHERE expires_at < ?`).bind(Date.now()).run(); } catch (e) {}
    let code = null;
    for (let t = 0; t < 6 && !code; t++) {
      const buf = crypto.getRandomValues(new Uint8Array(6));
      const c = Array.from(buf, (b) => HANDOFF_ABC[b % HANDOFF_ABC.length]).join('');
      const dup = await db.prepare(`SELECT code FROM handoff WHERE code = ?`).bind(c).first();
      if (!dup) code = c;
    }
    if (!code) return bad('잠시 후 다시 시도해 주세요.', 503);
    await db.prepare(`INSERT INTO handoff (code, data, expires_at) VALUES (?, ?, ?)`)
      .bind(code, body.data, Date.now() + HANDOFF_TTL).run();
    return json({ code, minutes: 15 });
  }
  const mHand = path.match(/^\/api\/handoff\/([a-z2-9]{6})$/);
  if (mHand && request.method === 'POST') {
    const code = mHand[1];
    const row = await db.prepare(`SELECT data, expires_at FROM handoff WHERE code = ?`).bind(code).first();
    if (!row) return bad('코드를 찾을 수 없어요. 다시 뽑아 주세요.', 404);
    // 한 번 쓰면 없앤다
    try { await db.prepare(`DELETE FROM handoff WHERE code = ?`).bind(code).run(); } catch (e) {}
    if (row.expires_at < Date.now()) return bad('코드가 만료됐어요. 다시 뽑아 주세요.', 410);
    return json({ data: row.data });
  }

  if (path === '/api/deep' && request.method === 'POST') {
    // 사주 정밀 풀이
    const body = await request.json().catch(() => null);
    if (!body) return bad('요청을 읽을 수 없습니다.');
    const err = validBirth(body.birth);
    if (err) return bad(err);
    const nowY = todayKST().y;
    let year = parseInt(body.year, 10);
    if (!Number.isFinite(year) || year < 1950 || year > nowY + 5) year = nowY;
    try {
      const nb = normBirth(body.birth);
      const s = computeSaju(nb);
      const opt = { gender: nb.gender, year };
      const base = deepSaju(s, opt);
      const ext = extendDeep(s, base, opt);
      ctx.waitUntil(bumpSaju(env, 'deep'));
      return json({
        char: charPayload(s.dayStem), saju: sajuPayload(s),
        deep: base, ext, today: todayFortune(s), areas: lifeAreas(s),
        thisYear: nowY, serverDay: todayKST(),
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
      ctx.waitUntil(bumpSaju(env, 'tojeong'));
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

    ctx.waitUntil(bumpSaju(env, 'room_new:' + topic));
    return json({
      code, token, title, topic,
      entryId: ins.meta.last_row_id, entryToken,
      me: { name, char: charPayload(saju.dayStem), saju: sajuPayload(saju) },
      result: res, rank: 1, total: 1,
      year: topicYear(saju, topic, todayKST().y),
      actions: topicActions(topic, res.band),
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
      limit: null,
      full: false,
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

    // 참여 인원 제한 없음

    const birth = normBirth(body.birth);
    const topic = isTopic(row.topic) ? row.topic : 'wealth';
    let saju;
    try { saju = computeSaju(birth); } catch (e) { return bad(e.message || '사주를 계산할 수 없습니다.'); }
    const res = TOPICS[topic].score(saju);

    const rdup = await db.prepare(
      `SELECT id, token FROM room_entries WHERE code = ? AND name = ? AND birth_json = ? ORDER BY id ASC LIMIT 1`
    ).bind(code, name, JSON.stringify(birth)).first();
    if (rdup) {
      const dRank = await db.prepare(
        `SELECT COUNT(*) + 1 AS r FROM room_entries WHERE code = ? AND (score > ? OR (score = ? AND id < ?))`
      ).bind(code, res.score, res.score, rdup.id).first();
      const dTot = await db.prepare(`SELECT COUNT(*) AS n FROM room_entries WHERE code = ?`).bind(code).first();
      return json({
        code, title: row.title, topic,
        entryId: rdup.id, entryToken: rdup.token,
        me: { name, char: charPayload(saju.dayStem), saju: sajuPayload(saju) },
        result: res, rank: dRank.r, total: dTot.n,
        year: topicYear(saju, topic, todayKST().y),
        actions: topicActions(topic, res.band),
        already: true,
      });
    }

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
    const rtot = await db.prepare(`SELECT COUNT(*) AS n FROM room_entries WHERE code = ?`).bind(code).first();
    ctx.waitUntil(bumpSaju(env, 'room_join:' + topic));

    return json({
      code, title: row.title, topic,
      entryId: id, entryToken: token,
      me: { name, char: charPayload(saju.dayStem), saju: sajuPayload(saju) },
      result: res, rank: rank.r, total: rtot.n,
      year: topicYear(saju, topic, todayKST().y),
      actions: topicActions(topic, res.band),
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
      year: topicYear(JSON.parse(row.saju_json), (room && isTopic(room.topic)) ? room.topic : 'wealth', todayKST().y),
      actions: topicActions((room && isTopic(room.topic)) ? room.topic : 'wealth', JSON.parse(row.result_json).band),
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
  const img = OG_FILES[meta.img] ? meta.img : 'og-home.png';
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
<meta property="og:image" content="${esc(meta.origin)}/${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="${t}">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${esc(meta.origin)}/${img}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${u}">`;
  return APP_HTML.replace('<!--HEAD-->', head)
    .replace('<!--BOOT-->', `<script>window.__BOOT__=${JSON.stringify(meta.boot || {})};`
      + `window.__CONTACT__=${JSON.stringify(meta.contact || 'https://open.kakao.com/me/speedtc')}</script>`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 옛 주소 → 새 주소 자동 이동.
    // 같은 코드가 옛 워커(inbokdo-app)와 새 워커(unsejido) 양쪽에 올라가므로
    // 호스트 이름으로 스스로 판단한다. REDIRECT_TO 환경변수로 덮어쓸 수 있다.
    const CANON_HOST = 'unsejido.koneup.workers.dev';
    const autoRedirect = !env.NO_REDIRECT
      && url.hostname.endsWith('.workers.dev')
      && url.hostname !== CANON_HOST;
    const REDIR = env.REDIRECT_TO || (autoRedirect ? 'https://' + CANON_HOST : '');
    if (REDIR) {
      const to = String(REDIR).replace(/\/+$/, '');
      if (!url.href.startsWith(to + '/') && url.origin !== to) {
        const dest = to + url.pathname + url.search;
        const keep = request.method === 'GET' || request.method === 'HEAD';
        return new Response(null, {
          status: keep ? 301 : 308,
          headers: { location: dest, 'cache-control': 'no-store' },
        });
      }
    }

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
        return await handleApi(request, env, url, ctx);
      } catch (e) {
        return json({ error: '서버 오류가 발생했습니다.', detail: String(e && e.message || e) }, 500);
      }
    }

    if (url.pathname.startsWith('/og') && url.pathname.endsWith('.png')) {
      const key = url.pathname.slice(1);
      const buf = OG_FILES[key];
      if (buf) {
        return new Response(buf, {
          headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=604800' },
        });
      }
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
      '/today': { view: 'today', img: 'og-today.png', title: '오늘의 운세 · 스피드 운세지도', desc: '오늘 일진과 내 사주를 견줘 하루의 결을 봅니다. 시간대별 12시진 흐름, 오늘 맞는 띠, 이번 주 7일 흐름까지 무료입니다.' },
      '/saju': { view: 'saju', img: 'og-saju.png', title: '사주 정밀 풀이 · 스피드 운세지도', desc: '원국 여덟 글자에 십신·지장간·십이운성·공망, 신강신약·격국·용신, 신살 20여 종, 궁과 육친, 대운 90년과 올해 12개월까지. 전부 무료입니다.' },
      '/life': { view: 'life', img: 'og-life.png', title: '분야별 풀이 · 스피드 운세지도', desc: '건강·재물·일·애정·문서·가정·사람·이동·말년. 내 원국을 아홉 갈래로 나눠 점수와 풀이를 따로 냅니다. 무료입니다.' },
      '/about': { view: 'about', img: 'og-home.png', title: '어떻게 계산하나요 · 스피드 운세지도', desc: '스피드 운세지도가 쓰는 명리학 방법과 천문 계산을 그대로 공개합니다.' },
      '/tojeong': { view: 'tojeong', img: 'og-tojeong.png', title: '토정비결 · 스피드 운세지도', desc: '올해 나의 토정비결을 무료로 봅니다. 144괘 작괘는 전통 그대로, 여기에 재물·직장·애정·건강·문서·이동·사람·구설 여덟 갈래와 12개월 월운까지 더했습니다.' },
      '/my': { view: 'profile', img: 'og-saju.png', title: '내 사주 · 스피드 운세지도', desc: '생년월일을 한 번만 넣으면 오늘의 운세·사주팔자·분야별 풀이가 바로 열립니다.' },
      '/wealth': { view: 'roomNew', topic: 'wealth', img: 'og-wealth.png', title: '재물지도 · 스피드 운세지도', desc: '단톡방 사람들의 재물 사주를 한 장의 지도에 모읍니다. 가운데가 財, 안쪽에 있을수록 재물 그릇이 큰 사람입니다. 무료입니다.' },
      '/love': { view: 'roomNew', topic: 'love', img: 'og-love.png', title: '연애지도 · 스피드 운세지도', desc: '단톡방에서 누구에게 인연이 먼저 오는지 사주로 봅니다. 애인 유무는 묻지 않습니다. 무료입니다.' },
      '/work': { view: 'roomNew', topic: 'work', img: 'og-work.png', title: '일운지도 · 스피드 운세지도', desc: '누가 크게 쓰일 사람인지 사주로 봅니다. 직업이나 연봉은 묻지 않습니다. 무료입니다.' },
    };
    if (PAGES[url.pathname]) {
      const pg = PAGES[url.pathname];
      if (env.DB) { ctx.waitUntil(bumpStats(env)); ctx.waitUntil(bumpPage(env, url.pathname)); }
      return new Response(renderPage({
        title: pg.title, desc: pg.desc, url: origin + url.pathname, origin, img: pg.img,
        boot: { view: pg.view, topic: pg.topic, providers: enabledProviders(env), kakaoKey: env.KAKAO_JS_KEY || '' },
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    // 관리자 화면 (검색 노출 안 함)
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return new Response(renderPage({
        title: '관리자 · 스피드 운세지도', desc: '관리자 전용', url: origin + '/admin', origin,
        img: 'og-home.png', noindex: true,
        boot: { view: 'admin', kakaoKey: '', providers: [] },
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (url.pathname === '/login' || url.pathname === '/me') {
      return new Response(renderPage({
        title: url.pathname === '/login' ? '스피드 운세지도 로그인' : '내 지도 · 스피드 운세지도',
        desc: '스피드 운세지도', url: origin + url.pathname, origin, img: 'og-home.png',
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
        + `\nUser-agent: *\nDisallow: /me\nDisallow: /admin\nDisallow: /auth/\nDisallow: /api/\n`;
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
      if (env.DB) { ctx.waitUntil(bumpStats(env)); ctx.waitUntil(bumpPage(env, '/m')); }
      return new Response(renderPage({ title, desc, url: `${origin}/m/${code}`, origin, img: 'og-map.png', boot: { view: 'map', code, ownerName, kakaoKey: env.KAKAO_JS_KEY || '', providers }, noindex: true }), {
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
      if (env.DB) { ctx.waitUntil(bumpStats(env)); ctx.waitUntil(bumpPage(env, '/w:' + topic2)); }
      return new Response(renderPage({
        title, desc, url: `${origin}/w/${code}`, origin, img: 'og-' + topic2 + '.png',
        boot: { view: 'room', code, roomTitle: title2, topic: topic2, kakaoKey: env.KAKAO_JS_KEY || '', providers },
        noindex: true,
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (url.pathname === '/' || url.pathname === '') {
      if (env.DB) { ctx.waitUntil(bumpStats(env)); ctx.waitUntil(bumpPage(env, '/')); }
      return new Response(renderPage({
        title: '스피드 운세지도 · 사주 전부 무료',
        desc: '사주팔자·오늘의 운세·인연지도·재물지도, 모든 메뉴가 무료입니다. 생일만 넣으면 두 사람 사이에 오가는 기운을 별자리처럼 그려드립니다. 가입도 결제도 없이 30초면 끝납니다.',
        url: origin, origin, boot: { view: 'home', kakaoKey: env.KAKAO_JS_KEY || '', providers: enabledProviders(env) },
      }), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    return new Response(renderPage({
      title: '스피드 운세지도 · 페이지를 찾을 수 없습니다',
      desc: '스피드 운세지도', url: origin, origin, boot: { view: 'notfound' },
    }), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
};
