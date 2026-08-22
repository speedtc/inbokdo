// love.js — 연애운 지도
//
// 배우자궁(일지)의 상태, 도화·홍염 같은 인연 신살, 지지의 합과 충,
// 그리고 배우자성(재성·관성)의 두께를 본다.
//
// 배우자성: 전통 명리대로 남자는 재성(財=처), 여자는 관성(官=남편)을 본다.
// 성별을 받지 못한 경우에만 재성+관성을 합친 성별 중립 방식으로 되돌린다.

import {
  BRANCHES_HAN, SAMHAP, YUKHAP, CHUNG,
  stemElem, branchElem, gen, ctl, sipsinTally,
} from './saju.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── 연애 다섯 자리 ─────────────────────────────── */
export const AXES = {
  kkeulim: {
    key: 'kkeulim', angle: 0, sipsin: '도화·식상',
    name: '끌리는 자리', short: '끌림',
    col: '#e58fb0', lcol: '#b8446e',
    desc: '가만히 있어도 사람이 먼저 다가옵니다. 표현이 자연스럽고 분위기를 만드는 힘이 있습니다.',
    how: '고백을 기다리기보다 먼저 자리를 만드는 쪽이 잘 풀립니다. 다만 관심이 여러 갈래로 흩어지기 쉬워요.',
  },
  oraegam: {
    key: 'oraegam', angle: 70, sipsin: '정재·정관',
    name: '오래가는 자리', short: '오래감',
    col: '#7ec9a2', lcol: '#2f855f',
    desc: '불붙는 속도는 느려도 한번 이어지면 길게 갑니다. 약속과 신뢰로 관계를 쌓는 쪽입니다.',
    how: '짧게 여러 번보다 한 사람에게 시간을 들이는 게 맞습니다. 소개나 정식 만남이 유리합니다.',
  },
  bulbutneun: {
    key: 'bulbutneun', angle: 145, sipsin: '편재·편관',
    name: '불붙는 자리', short: '불붙음',
    col: '#e2734a', lcol: '#bd4a26',
    desc: '만나면 단번에 뜨거워집니다. 밀고 당기는 긴장이 있어야 오히려 마음이 살아납니다.',
    how: '첫인상에서 승부가 납니다. 대신 식는 속도도 빠르니, 뜨거울 때 다음 약속을 잡아두세요.',
  },
  gamssaneun: {
    key: 'gamssaneun', angle: 215, sipsin: '인성',
    name: '감싸는 자리', short: '감쌈',
    col: '#8fa8c9', lcol: '#3c6ca6',
    desc: '보살피고 챙기면서 정이 듭니다. 상대의 사정을 먼저 헤아리는 쪽입니다.',
    how: '오래 곁에 있던 사람이 인연이 되는 경우가 많습니다. 다 받아주다 지치지 않게 선은 그으세요.',
  },
  chingu: {
    key: 'chingu', angle: 288, sipsin: '비겁',
    name: '친구 같은 자리', short: '친구',
    col: '#9aa3b8', lcol: '#5c6579',
    desc: '설렘보다 편안함이 먼저입니다. 오래 알던 사이가 자연스럽게 넘어가는 형태입니다.',
    how: '같이 하는 활동에서 인연이 생깁니다. 다만 친구로만 남기 쉬우니 한 번은 선을 넘어야 합니다.',
  },
};
export const ORDER = ['kkeulim', 'oraegam', 'bulbutneun', 'gamssaneun', 'chingu'];

export const RINGS = [
  { r: 74, name: '평생 인연' },
  { r: 108, name: '깊은 인연' },
  { r: 138, name: '짧은 인연' },
  { r: 162, name: '오는 중' },
];

const BANDS = [
  { min: 72, key: 'gipeun', label: '인연이 두터운 사주', tone: 'gold',
    line: '사람이 붙고, 붙은 사람이 오래 갑니다. 연애 쪽으로는 복이 있는 자리입니다.' },
  { min: 65, key: 'sunhwan', label: '인연이 잘 도는 사주', tone: 'green',
    line: '만나고 헤어지는 흐름이 막히지 않습니다. 기회는 오는데 고르는 눈이 관건입니다.' },
  { min: 57, key: 'bogotong', label: '천천히 익는 사주', tone: 'blue',
    line: '첫눈에 반하는 쪽은 아닙니다. 시간을 두고 알아갈수록 깊어지는 형태입니다.' },
  { min: 49, key: 'honja', label: '혼자가 편한 사주', tone: 'gray',
    line: '혼자 있는 시간이 필요한 사람입니다. 억지로 맞추기보다 결이 맞는 한 사람이면 충분합니다.' },
  { min: 0, key: 'jaram', label: '지금은 나를 키우는 때', tone: 'amber',
    line: '지금은 사람보다 나를 세우는 시기입니다. 여기서 쌓아둔 것이 나중에 사람을 데려옵니다.' },
];
export function band(score) { return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1]; }

/* 도화살 — 삼합국의 목욕지. SAMHAP = [[신자진],[해묘미],[인오술],[사유축]] */
const DOHWA_OF = [9, 0, 3, 6];
/* 홍염살 — 일간 기준 */
const HONGYEOM = { 0: 6, 1: 6, 2: 2, 3: 7, 4: 4, 5: 4, 6: 10, 7: 9, 8: 0, 9: 8 };

function samhapGroup(b) {
  for (let i = 0; i < SAMHAP.length; i++) if (SAMHAP[i].includes(b)) return i;
  return -1;
}

export function score(s) {
  const me = stemElem(s.dayStem);
  const d = s.dist;
  const t = sipsinTally(s);

  const bi = d[me];
  const sik = d[gen(me)];
  const jae = d[ctl(me)];
  const gwan = d[(me + 3) % 5];
  const iny = d[(me + 4) % 5];
  const g = s.gender;
  const spouse = g === 'm' ? jae * 1.7 + gwan * 0.3
    : g === 'f' ? gwan * 1.7 + jae * 0.3
      : jae + gwan;                    // 성별 미상이면 중립
  const body = bi + iny;

  let v = 44;
  const notes = [];

  // 1) 배우자성이 있는가
  const spTerm = spouse <= 10 ? -11 + spouse * 0.5
    : spouse <= 40 ? -6 + (spouse - 10) * 0.6
      : 12 - (spouse - 40) * 0.22;
  v += clamp(spTerm, -11, 12);
  if (spouse <= 12) {
    notes.push({ t: '배우자성이 얇습니다', w: 5,
      d: '인연을 끌어오는 기운이 옅습니다. 가만히 기다리면 잘 안 옵니다. 사람이 모이는 자리에 나를 놓아두는 게 방법입니다.' });
  } else if (spouse >= 42) {
    notes.push({ t: '배우자성이 두텁습니다', w: 5,
      d: '인연이 여럿 스칩니다. 기회가 많은 대신 고르는 일이 어려워집니다. 처음부터 조건을 좁혀두세요.' });
  }

  // 2) 배우자궁 = 일지의 상태
  const ilji = s.dayBranch;
  const ie = branchElem(ilji);
  if (gen(ie) === me) { v += 9; notes.push({ t: '배우자궁이 나를 살립니다', w: 6, d: `일지 ${BRANCHES_HAN[ilji]}가 내 일간을 생해줍니다. 곁에 둔 사람 덕을 보는 자리입니다.` }); }
  else if (ie === (g === 'm' ? ctl(me) : g === 'f' ? (me + 3) % 5 : ctl(me)) || ie === (me + 3) % 5) { v += 6; notes.push({ t: '배우자궁에 배우자성', w: 5, d: `일지 ${BRANCHES_HAN[ilji]}가 그대로 배우자 자리입니다. 인연이 제자리에 앉아 있는 배치입니다.` }); }
  else if (ctl(ie) === me) { v -= 6; notes.push({ t: '배우자궁이 나를 누릅니다', w: 4, d: `일지 ${BRANCHES_HAN[ilji]}가 내 기운을 눌러, 가까운 사람에게서 오히려 힘이 빠질 수 있습니다.` }); }

  // 3) 일지 충 — 배우자 자리가 흔들린다
  const chungCnt = s.branches.filter((b) => CHUNG[ilji] === b).length;
  if (chungCnt) {
    v -= Math.min(11, chungCnt * 7);
    notes.push({ t: '일지충', w: 6, d: '배우자 자리가 흔들리는 배치입니다. 마음이 급할 때 결정하면 오래 못 갑니다. 한 계절은 두고 보세요.' });
  }

  // 4) 육합·삼합 — 인연이 잘 맺힌다
  let hap = 0;
  for (let i = 0; i < s.branches.length; i++) {
    for (let j = i + 1; j < s.branches.length; j++) {
      if (YUKHAP[s.branches[i]] === s.branches[j]) hap += 1;
      const gi = samhapGroup(s.branches[i]);
      if (gi >= 0 && gi === samhapGroup(s.branches[j])) hap += 0.7;
    }
  }
  if (hap > 0) {
    v += Math.min(11, hap * 4.5);
    if (hap >= 1.4) notes.push({ t: '합이 많습니다', w: 4, d: '지지끼리 손을 잡는 글자가 여럿입니다. 사람과 엮이는 힘이 좋아 소개나 모임에서 인연이 잘 생깁니다.' });
  }

  // 5) 도화살 — 이성에게 끌리는 힘
  const sg = samhapGroup(ilji) >= 0 ? samhapGroup(ilji) : samhapGroup(s.pillars.year.branch);
  const dohwaB = sg >= 0 ? DOHWA_OF[sg] : -1;
  const dohwa = dohwaB >= 0 ? s.branches.filter((b) => b === dohwaB).length : 0;
  if (dohwa) {
    v += Math.min(9, dohwa * 5.5);
    notes.push({ t: '도화살', w: 5, d: `${BRANCHES_HAN[dohwaB]} 도화가 있습니다. 애써 꾸미지 않아도 눈길이 모이는 기운입니다.` });
  }

  // 6) 홍염살 — 은근한 매력
  const hy = HONGYEOM[s.dayStem];
  const hong = s.branches.filter((b) => b === hy).length;
  if (hong) {
    v += Math.min(7, hong * 4.5);
    notes.push({ t: '홍염살', w: 3, d: '드러내지 않아도 스며드는 매력이 있습니다. 오래 볼수록 좋아지는 쪽입니다.' });
  }

  // 7) 표현력 — 식상이 있어야 마음이 밖으로 나온다
  if (sik < 8) {
    v -= 5;
    notes.push({ t: '표현이 안으로 감깁니다', w: 4, d: '마음이 있어도 밖으로 잘 안 나옵니다. 상대는 모르고 지나갑니다. 말로 한 번은 꺼내야 합니다.' });
  } else if (sik >= 22) {
    v += 5;
  }

  // 8) 감당할 힘
  if (body < 26 && spouse > 45) {
    v -= 7;
    notes.push({ t: '끌려다니기 쉽습니다', w: 5, d: '상대의 기운이 나보다 센 배치입니다. 맞춰주다 나를 잃지 않게, 내 일정과 내 사람은 남겨두세요.' });
  }

  const sc = Math.round(clamp(v, 8, 99));

  // ── 연애 자리 판정 ──
  const W = {
    kkeulim: (t[2] + t[3]) * 0.75 + (dohwa + hong) * 9,
    oraegam: t[5] + t[7],
    bulbutneun: t[4] + t[6],
    gamssaneun: t[8] + t[9],
    chingu: t[0] + t[1],
  };
  let axis = 'oraegam', best = -1;
  for (const k of ORDER) if (W[k] > best) { best = W[k]; axis = k; }

  const b = band(sc);
  return {
    score: sc, axis, band: b.key, bandLabel: b.label, bandLine: b.line, tone: b.tone,
    mix: Object.fromEntries(ORDER.map((k) => [k, Math.round(W[k] * 10) / 10])),
    parts: {
      spouse: Math.round(spouse * 10) / 10,
      body: Math.round(body * 10) / 10,
      sik: Math.round(sik * 10) / 10,
      hap: Math.round(hap * 10) / 10,
      strength: dohwa || hong ? '도화 있음' : '도화 없음',
    },
    notes: notes.sort((a, c) => (c.w || 0) - (a.w || 0)).slice(0, 3).map(({ t: tt, d: dd }) => ({ t: tt, d: dd })),
  };
}
