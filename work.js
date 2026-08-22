// work.js — 일과 성취운 지도
//
// 관성(조직·직책), 식상(재능을 밖으로 내는 힘), 인성(자격·배움), 재성(결과·보상),
// 비겁(동료·경쟁)의 짜임을 보고, 그것을 밀고 나갈 일간의 힘이 있는지를 따진다.
// 월지(月支)는 사회궁이라 직업의 뿌리로 본다.

import {
  BRANCHES_HAN, CHUNG,
  stemElem, branchElem, gen, ctl, sipsinTally,
} from './saju.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── 일 다섯 자리 ─────────────────────────────── */
export const AXES = {
  jojik: {
    key: 'jojik', angle: 0, sipsin: '관성',
    name: '조직에서 크는 자리', short: '조직',
    col: '#8fa8c9', lcol: '#3c6ca6',
    desc: '규칙과 직함이 있는 곳에서 힘이 납니다. 자리가 올라가면 실력도 같이 올라가는 쪽입니다.',
    how: '큰 조직·공공·전문 자격처럼 체계가 잡힌 곳이 맞습니다. 절차를 지키는 것이 그대로 무기가 됩니다.',
  },
  silryeok: {
    key: 'silryeok', angle: 70, sipsin: '식상',
    name: '실력으로 크는 자리', short: '실력',
    col: '#e29a68', lcol: '#bd6c31',
    desc: '시키는 일보다 내가 만들어 낸 것에서 평가가 납니다. 결과물이 눈에 보여야 인정받습니다.',
    how: '기획·창작·기술·영업이 맞습니다. 포트폴리오가 곧 이력서입니다. 윗사람과 부딪히지 않게만 조심하세요.',
  },
  munseo: {
    key: 'munseo', angle: 145, sipsin: '인성',
    name: '자격으로 크는 자리', short: '자격',
    col: '#7ec9a2', lcol: '#2f855f',
    desc: '배우고 익힌 것이 그대로 자리가 됩니다. 문서·면허·학위가 길을 열어주는 쪽입니다.',
    how: '자격증과 공부에 들인 시간이 가장 정직하게 돌아옵니다. 다만 준비만 하다 때를 놓치기 쉽습니다.',
  },
  seonggwa: {
    key: 'seonggwa', angle: 215, sipsin: '재성',
    name: '성과로 크는 자리', short: '성과',
    col: '#d9b45b', lcol: '#a07c1c',
    desc: '숫자로 증명하는 쪽입니다. 매출·실적처럼 결과가 분명한 일에서 빛이 납니다.',
    how: '인센티브가 걸린 구조가 유리합니다. 과정보다 결과로 평가받는 자리를 고르세요.',
  },
  saram: {
    key: 'saram', angle: 288, sipsin: '비겁',
    name: '사람으로 크는 자리', short: '사람',
    col: '#9aa3b8', lcol: '#5c6579',
    desc: '혼자보다 팀에서 커집니다. 사람을 모으고 붙이는 데 힘이 있습니다.',
    how: '동업·팀 리드·현장 조율이 맞습니다. 대신 같은 자리를 두고 겹치는 일이 생기니 역할을 먼저 나누세요.',
  },
};
export const ORDER = ['jojik', 'silryeok', 'munseo', 'seonggwa', 'saram'];

export const RINGS = [
  { r: 74, name: '정상' },
  { r: 108, name: '오르는 중' },
  { r: 138, name: '다지는 중' },
  { r: 162, name: '준비 중' },
];

const BANDS = [
  { min: 72, key: 'jeongsang', label: '크게 쓰이는 사주', tone: 'gold',
    line: '밀고 나갈 힘과 쓰일 자리가 같이 있습니다. 자리를 맡으면 그만큼 해내는 사람입니다.' },
  { min: 64, key: 'oreum', label: '올라가는 사주', tone: 'green',
    line: '길이 막히지 않았습니다. 방향만 한 번 정하면 그대로 쌓입니다.' },
  { min: 56, key: 'dajim', label: '다지며 가는 사주', tone: 'blue',
    line: '한 번에 뛰는 쪽은 아닙니다. 대신 무너지지도 않습니다. 오래 붙어 있는 사람이 이깁니다.' },
  { min: 47, key: 'jaebae', label: '내 것을 찾아야 하는 사주', tone: 'gray',
    line: '남의 기준에 맞추면 힘이 안 납니다. 내가 잘하는 한 가지를 좁혀야 길이 열립니다.' },
  { min: 0, key: 'junbi', label: '지금은 준비하는 때', tone: 'amber',
    line: '아직 나설 때가 아닙니다. 지금 익혀둔 것이 다음 자리에서 값을 합니다.' },
];
export function band(s) { return BANDS.find((b) => s >= b.min) || BANDS[BANDS.length - 1]; }

export function score(s) {
  const me = stemElem(s.dayStem);
  const d = s.dist;
  const t = sipsinTally(s);

  const bi = d[me];
  const sik = d[gen(me)];
  const jae = d[ctl(me)];
  const gwan = d[(me + 3) % 5];
  const iny = d[(me + 4) % 5];
  const body = bi + iny;            // 밀고 나갈 힘
  const out = sik + jae + gwan;     // 밖으로 쓰이는 힘

  let v = 42;
  const notes = [];

  // 1) 밀고 나갈 힘과 쓰일 자리의 균형
  const gap = body - out;
  let bal;
  if (gap > 30) bal = 10 - (gap - 30) * 0.35;        // 힘만 세고 쓸 자리가 없다
  else if (gap >= -10) bal = 10 - Math.abs(gap) * 0.12;
  else bal = 8.8 + (gap + 10) * 0.42;                // 일은 많은데 감당할 힘이 없다
  v += clamp(bal, -14, 10);
  if (gap < -22) {
    notes.push({ t: '일이 나보다 큽니다', w: 6, d: '해야 할 일이 감당할 힘보다 큽니다. 혼자 다 쥐면 몸이 먼저 무너집니다. 나눠 지는 구조를 먼저 만드세요.' });
  } else if (gap > 34) {
    notes.push({ t: '힘은 있는데 쓸 자리가 좁습니다', w: 6, d: '역량은 충분한데 그걸 쏟을 판이 작습니다. 자리를 옮기거나 판을 키워야 힘이 삽니다.' });
  }

  // 2) 관성 — 조직에서 쓰이는 힘
  const gwanTerm = gwan <= 6 ? -8 + gwan : gwan <= 28 ? -2 + (gwan - 6) * 0.5 : 9 - (gwan - 28) * 0.3;
  v += clamp(gwanTerm, -9, 9);
  if (gwan <= 6) {
    notes.push({ t: '관성이 얇습니다', w: 5, d: '위에서 눌러주는 기운이 적어 조직 생활이 답답하게 느껴집니다. 직함보다 결과물로 증명하는 쪽이 맞습니다.' });
  }

  // 3) 식상생재 — 만들어서 성과로 잇는 회로
  const flow = Math.sqrt(Math.max(0, sik) * Math.max(0, jae));
  v += Math.min(10, flow * 0.46);
  if (flow >= 17) notes.push({ t: '식상생재', w: 5, d: '내가 만든 것이 그대로 성과로 이어지는 회로가 있습니다. 결과가 눈에 보이는 일에서 강합니다.' });

  // 4) 관인상생 — 자격이 자리를 만든다
  if (gwan >= 14 && iny >= 14) {
    v += 7;
    notes.push({ t: '관인상생', w: 5, d: '배운 것이 자리로 이어지는 배치입니다. 자격증·학위·공식 절차가 그대로 승진이 됩니다.' });
  }

  // 5) 월지 사회궁
  const wolji = s.pillars.month.branch;
  const we = branchElem(wolji);
  if (we === (me + 3) % 5) { v += 6; notes.push({ t: '월지 관성', w: 4, d: `태어난 달(${BRANCHES_HAN[wolji]})이 관성입니다. 사회에서 자리를 얻는 힘이 뿌리부터 있습니다.` }); }
  else if (we === gen(me)) { v += 5; notes.push({ t: '월지 식상', w: 4, d: `태어난 달(${BRANCHES_HAN[wolji]})이 식상입니다. 만들어 내는 일이 천직에 가깝습니다.` }); }
  else if (we === ctl(me)) { v += 5; }

  // 6) 월지 충 — 자리가 자주 바뀐다
  if (s.branches.some((b) => CHUNG[wolji] === b)) {
    v -= 6;
    notes.push({ t: '월지충', w: 4, d: '자리가 자주 바뀌는 배치입니다. 이직이 잦아도 이상한 게 아니니, 옮길 때마다 한 가지는 쌓아두세요.' });
  }

  // 7) 비겁 과다 — 경쟁에 치인다
  if (bi - out > 22) {
    v -= Math.min(9, (bi - out - 22) * 0.4);
    notes.push({ t: '경쟁이 잦습니다', w: 3, d: '비슷한 사람과 같은 자리를 두고 겹칩니다. 남과 같은 길로 가면 손해입니다. 좁고 뾰족하게 가세요.' });
  }

  const sc = Math.round(clamp(v, 8, 99));

  const W = {
    jojik: t[6] + t[7],
    silryeok: t[2] + t[3],
    munseo: t[8] + t[9],
    seonggwa: t[4] + t[5],
    saram: t[0] + t[1],
  };
  let axis = 'jojik', best = -1;
  for (const k of ORDER) if (W[k] > best) { best = W[k]; axis = k; }

  const b = band(sc);
  return {
    score: sc, axis, band: b.key, bandLabel: b.label, bandLine: b.line, tone: b.tone,
    mix: Object.fromEntries(ORDER.map((k) => [k, Math.round(W[k] * 10) / 10])),
    parts: {
      gwan: Math.round(gwan * 10) / 10,
      body: Math.round(body * 10) / 10,
      sik: Math.round(sik * 10) / 10,
      iny: Math.round(iny * 10) / 10,
      strength: body >= 45 ? '신강' : body <= 30 ? '신약' : '중화',
    },
    notes: notes.sort((a, c) => (c.w || 0) - (a.w || 0)).slice(0, 3).map(({ t: tt, d: dd }) => ({ t: tt, d: dd })),
  };
}
