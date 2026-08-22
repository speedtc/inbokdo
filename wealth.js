// wealth.js — 재물지도. 개인의 재물 흐름을 명리로 점수화한다.
//
// 인연지도는 두 사람 사이의 '관계' 점수라 방향이 있지만,
// 재물지도는 한 사람의 원국만 보는 '개인' 점수다.
// 그래서 지도 중앙에는 사람이 아니라 財가 놓이고, 참여자 전원이 같은 기준으로 줄을 선다.
//
// ⚠️ 금액(연봉·자산)은 절대 입력받지 않는다. 거리는 오직 사주 점수로만 정한다.

import {
  BRANCHES_HAN, ELEMENTS, ELEMENT_HAN,
  stemElem, branchElem, gen, ctl, sipsinTally, CHEONEUL,
} from './saju.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── 버는 방식 다섯 자리 ────────────────────────────────
   각도는 화면 기준(0 = 위, 시계방향).
   위쪽이 안정, 아래로 갈수록 확장. */
export const WAXES = {
  moeum: {
    key: 'moeum', angle: 0, sipsin: '정재',
    name: '모으는 자리', short: '모으기',
    col: '#7ec9a2', lcol: '#2f855f',
    desc: '큰 걸 노리기보다 새는 곳을 막아서 쌓는 쪽입니다. 들어오는 액수는 정해져 있어도 남는 게 있는 사람입니다.',
    how: '월급·임대료처럼 날짜가 정해진 수입이 잘 맞습니다. 목돈을 한 번에 굴리는 일에는 손이 늦습니다.',
  },
  wolgeup: {
    key: 'wolgeup', angle: 70, sipsin: '관성',
    name: '월급 자리', short: '월급',
    col: '#8fa8c9', lcol: '#3c6ca6',
    desc: '조직과 직함에서 돈이 나옵니다. 자리가 곧 돈이라, 자리를 지키면 돈도 따라옵니다.',
    how: '승진·자격증·직책이 그대로 수입입니다. 반대로 조직을 나오면 수입 구조를 새로 짜야 합니다.',
  },
  jangsa: {
    key: 'jangsa', angle: 145, sipsin: '식상',
    name: '장사 자리', short: '장사',
    col: '#e29a68', lcol: '#bd6c31',
    desc: '내가 만들어서 파는 쪽입니다. 손에서 나온 것이 돈이 되는 회로라, 움직인 만큼 벌립니다.',
    how: '기술·콘텐츠·영업처럼 결과물이 눈에 보이는 일이 맞습니다. 쉬면 바로 수입이 끊기는 게 약점입니다.',
  },
  gulligi: {
    key: 'gulligi', angle: 215, sipsin: '편재',
    name: '굴리는 자리', short: '굴리기',
    col: '#d9b45b', lcol: '#a07c1c',
    desc: '판을 키워서 버는 쪽입니다. 기회를 보는 눈이 빠르고, 남의 돈까지 움직여 일을 만듭니다.',
    how: '사업·투자·중개처럼 규모가 곧 수익인 일이 맞습니다. 크게 벌고 크게 나가니 브레이크를 남이 잡아줘야 합니다.',
  },
  hamkke: {
    key: 'hamkke', angle: 288, sipsin: '비겁',
    name: '함께 버는 자리', short: '함께',
    col: '#9aa3b8', lcol: '#5c6579',
    desc: '혼자보다 사람을 끼고 벌립니다. 사람이 재산인 대신, 같은 돈을 두고 겹치는 일도 생깁니다.',
    how: '동업·팀·조직 영업이 맞습니다. 시작할 때 지분과 역할을 문서로 못 박아두면 오래갑니다.',
  },
};
export const WAXIS_ORDER = ['moeum', 'wolgeup', 'jangsa', 'gulligi', 'hamkke'];

/* ── 거리(동심원) 이름 ──────────────────────────────── */
export const WRINGS = [
  { r: 74, name: '곳간' },
  { r: 108, name: '살림' },
  { r: 138, name: '벌이' },
  { r: 162, name: '씨앗' },
];

/* ── 점수대 이름 ────────────────────────────────────── */
const BANDS = [
  { min: 77, key: 'gotgan', label: '곳간이 든든한 사주', tone: 'gold',
    line: '벌리는 힘과 지키는 힘이 같이 있습니다. 재물 쪽으로는 타고난 축에 듭니다.' },
  { min: 69, key: 'doneun', label: '벌이가 도는 사주', tone: 'green',
    line: '돈이 들어오고 나가는 회로가 제대로 돕니다. 구조를 만들면 쌓입니다.' },
  { min: 57, key: 'ssuneun', label: '쓰는 만큼 들어오는 사주', tone: 'blue',
    line: '큰 손실도 큰 대박도 드뭅니다. 정기적으로 들어오는 줄기를 늘리는 게 과제입니다.' },
  { min: 38, key: 'saram', label: '돈보다 사람이 먼저 붙는 사주', tone: 'gray',
    line: '돈을 직접 좇으면 늦고, 사람과 실력을 쌓아두면 그게 나중에 돈이 됩니다.' },
  { min: 0, key: 'ssiat', label: '지금은 씨를 뿌리는 자리', tone: 'amber',
    line: '아직 거둘 때가 아닙니다. 이 시기에 배워둔 것이 나중에 값을 합니다. 무리한 투자만 피하세요.' },
];
export function wealthBand(score) {
  return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
}

/* 재성 오행의 창고(財庫) = 십이운성의 墓. 木未 火戌 土戌(火土同宮) 金丑 水辰 */
const GO_OF = { 0: [7], 1: [10], 2: [10], 3: [1], 4: [4] };

/**
 * 재물 점수
 * @param {object} s computeSaju() 결과
 */
export function wealthScore(s) {
  const me = stemElem(s.dayStem);
  const d = s.dist;
  const t = sipsinTally(s);

  const bi = d[me];              // 비겁
  const sik = d[gen(me)];        // 식상
  const jae = d[ctl(me)];        // 재성
  const gwan = d[(me + 3) % 5];  // 관성
  const iny = d[(me + 4) % 5];   // 인성
  const body = bi + iny;         // 나를 밀어주는 힘 (신강도)
  const jaeElem = ctl(me);

  let v = 42;
  const notes = [];

  // 1) 재성이 있는가 (없으면 애초에 돈 그릇이 안 보인다)
  const jaeTerm = jae <= 6 ? -12 + jae
    : jae <= 30 ? -6 + (jae - 6) * 0.75
      : 12 - (jae - 30) * 0.20;
  v += clamp(jaeTerm, -12, 12);
  if (jae <= 8) {
    notes.push({ t: '재성이 얇습니다', w: 5, d: `사주에 ${ELEMENT_HAN[jaeElem]}${ELEMENTS[jaeElem]} 재성이 ${jae}%뿐입니다. 돈을 직접 좇기보다 실력과 사람을 먼저 쌓는 구조입니다.` });
  } else if (jae >= 30) {
    notes.push({ t: '재성이 두텁습니다', w: 5, d: `재성이 ${jae}%로 몰려 있습니다. 돈이 흘러드는 자리는 분명한데, 감당할 힘이 같이 있어야 남습니다.` });
  }

  // 2) 감당력 — 재다신약이면 돈에 눌린다
  const afford = body - jae;
  let cap;
  if (afford < 0) cap = Math.max(-18, afford * 0.5 - 4);
  else if (afford <= 32) cap = -3 + afford * 0.55;
  else cap = 14.6 - (afford - 32) * 0.30;
  v += clamp(cap, -18, 15);

  if (afford < 0 && jae >= 22) {
    notes.push({ t: '재다신약', w: 6, d: '재물은 두터운데 그걸 감당할 힘이 얇습니다. 혼자 다 쥐려 하면 오히려 돈이 나를 부립니다. 사람을 끼고 나눠 지는 쪽이 유리합니다.' });
  } else if (body >= 42 && jae >= 18) {
    notes.push({ t: '신강재왕', w: 6, d: '밀어붙일 힘과 벌 자리가 같이 있습니다. 재물 쪽에서는 가장 좋은 배치 중 하나입니다.' });
  }

  // 3) 식상생재 — 만들어서 파는 회로
  const flow = Math.sqrt(Math.max(0, sik) * Math.max(0, jae));
  const flowTerm = Math.min(12, flow * 0.55);
  v += flowTerm;
  if (flowTerm >= 8) {
    notes.push({ t: '식상생재', w: 5, d: '내가 만들어낸 것이 그대로 돈으로 이어지는 회로가 있습니다. 시키는 일보다 벌이는 일에서 수입이 큽니다.' });
  }

  // 4) 군겁쟁재 — 같은 돈을 두고 겹친다
  const rob = bi - jae;
  if (rob > 18) {
    const raw = Math.min(14, (rob - 18) * 0.45);
    const softened = gwan >= 15 ? raw * 0.4 : raw;
    v -= softened;
    if (softened >= 3) {
      notes.push({
        t: '군겁쟁재', w: 3,
        d: gwan >= 15
          ? '같은 것을 두고 겹치는 기운이 있지만, 관성이 그 사이를 눌러줘서 크게 새지는 않습니다.'
          : '내 몫을 나눠 갖는 기운이 강합니다. 동업과 보증에서 특히 새기 쉬우니 시작할 때 문서로 못 박으세요.',
      });
    }
  }

  // 5) 재생관 — 돈이 자리를 만들고 자리가 돈을 지킨다
  if (gwan >= 16 && jae >= 16) {
    v += 5;
    notes.push({ t: '재생관', w: 2, d: '돈과 자리가 서로를 받쳐줍니다. 직함이 생기면 수입도 같이 올라가는 구조입니다.' });
  }

  // 6) 재고(財庫) — 재물 창고를 깔고 있는가
  const go = (GO_OF[jaeElem] || []).filter((b) => s.branches.includes(b));
  if (go.length) {
    v += Math.min(8, go.length * 4.5);
    notes.push({
      t: '재고', w: jae >= 12 ? 4 : 1,
      d: jae >= 12
        ? `${go.map((b) => BRANCHES_HAN[b]).join('·')}에 재물 창고를 깔고 있습니다. 버는 것보다 담아두는 쪽에 강합니다.`
        : `${go.map((b) => BRANCHES_HAN[b]).join('·')}에 재물 창고는 있는데 아직 담을 것이 적습니다. 그릇은 준비된 셈이라, 벌이만 붙으면 잘 쌓입니다.`,
    });
  }

  // 7) 월지 득령 — 태어난 달이 재성이면 재가 힘을 얻는다
  const wolji = s.pillars.month.branch;
  if (branchElem(wolji) === jaeElem) {
    v += 6;
    notes.push({ t: '월지 재성', w: 4, d: `태어난 달(${BRANCHES_HAN[wolji]})이 그대로 재성입니다. 때를 얻은 재라 힘이 실려 있습니다.` });
  }

  // 8) 천을귀인 — 결정적일 때 사람이 붙는다
  const gwiin = (CHEONEUL[s.dayStem] || []).filter((b) => s.branches.includes(b));
  if (gwiin.length) v += 3;

  const score = Math.round(clamp(v, 8, 99));

  // ── 버는 방식 판정 ──
  // 먼저 네 갈래(재성/식상/관성/비겁)를 같은 크기끼리 견준다.
  // 재성이 이기면 그때 편재(굴리기) / 정재(모으기)로 나눈다.
  const W = {
    moeum: t[5],           // 정재
    gulligi: t[4],         // 편재
    jangsa: t[2] + t[3],   // 식신 + 상관
    wolgeup: t[6] + t[7],  // 편관 + 정관
    hamkke: t[0] + t[1],   // 비견 + 겁재
  };
  const group = {
    jae: W.moeum + W.gulligi,
    jangsa: W.jangsa,
    wolgeup: W.wolgeup,
    hamkke: W.hamkke,
  };
  let top = 'jae', bestG = -1;
  for (const k of Object.keys(group)) if (group[k] > bestG) { bestG = group[k]; top = k; }
  const axis = top === 'jae' ? (W.gulligi > W.moeum ? 'gulligi' : 'moeum') : top;

  const band = wealthBand(score);

  return {
    score,
    axis,
    band: band.key,
    bandLabel: band.label,
    bandLine: band.line,
    tone: band.tone,
    mix: {
      moeum: Math.round(W.moeum * 10) / 10,
      wolgeup: Math.round(W.wolgeup * 10) / 10,
      jangsa: Math.round(W.jangsa * 10) / 10,
      gulligi: Math.round(W.gulligi * 10) / 10,
      hamkke: Math.round(W.hamkke * 10) / 10,
    },
    parts: {
      jae: Math.round(jae * 10) / 10,
      body: Math.round(body * 10) / 10,
      sik: Math.round(sik * 10) / 10,
      gwan: Math.round(gwan * 10) / 10,
      strength: body >= 45 ? '신강' : body <= 30 ? '신약' : '중화',
    },
    notes: notes.slice().sort((a, b) => (b.w || 0) - (a.w || 0)).slice(0, 3).map(({ t, d }) => ({ t, d })),
  };
}
