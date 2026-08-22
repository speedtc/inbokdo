// life.js — 분야별 풀이 (10갈래 상세 리포트)
//
// 재물·애정·일운은 이미 만들어 둔 전용 엔진을 그대로 쓰고,
// 건강·문서·가정·대인·이동·말년 여섯 갈래를 여기서 낸다.
// 열 갈래 모두 점수와 등급, 본문, 실천 팁을 함께 낸다.

import {
  STEMS_HAN, BRANCHES_HAN, ELEMENTS, ELEMENT_HAN,
  sipsinTally, stemElem, branchElem, gen, ctl,
  CHEONEUL, CHUNG, YUKHAP, SAMHAP, HIDDEN, STEM_YANG,
} from './saju.js';
import { wealthScore } from './wealth.js';
import * as love from './love.js';
import * as work from './work.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;
const TIER_NAME = ['다지는 갈래', '무난한 갈래', '괜찮은 갈래', '타고난 갈래'];
const TIER_TONE = ['gray', 'blue', 'green', 'gold'];
const tierOf = (v) => (v >= 74 ? 3 : v >= 61 ? 2 : v >= 47 ? 1 : 0);

const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
const YEOKMA_OF = [2, 5, 8, 11];
function samGroup(b) { for (let i = 0; i < SAMHAP.length; i++) if (SAMHAP[i].includes(b)) return i; return -1; }

const BODY = [
  { organ: '간·담', part: '근육·힘줄·눈·신경', care: '늦은 술자리와 화를 참는 습관', fix: '스트레칭과 규칙적인 취침. 술을 줄이는 것이 가장 빠릅니다.' },
  { organ: '심장·소장', part: '혈압·순환·수면', care: '급한 성격과 과한 카페인', fix: '가벼운 유산소를 꾸준히. 카페인을 오후에 끊어보세요.' },
  { organ: '위·비장', part: '소화기·살·입', care: '불규칙한 식사와 단 음식', fix: '식사 시간을 고정하는 것만으로 절반이 잡힙니다.' },
  { organ: '폐·대장', part: '호흡기·피부·코', care: '건조한 공기와 미세먼지', fix: '가습과 호흡 운동. 환절기 앞뒤로 미리 관리하세요.' },
  { organ: '신장·방광', part: '허리·뼈·귀', care: '찬 것과 수면 부족', fix: '아랫배와 발을 따뜻하게. 수면 시간을 늘리는 것이 최우선입니다.' },
];

/* 갈래별 4단계 본문 */
const TXT = {
  health: [
    '몸이 한쪽으로 크게 기울어 있습니다. 무리하면 바로 티가 나는 구조라, 검진과 수면을 최우선에 두셔야 합니다. 한 해에 한 번은 반드시 점검하세요.',
    '평소에는 무난한데 과로가 겹치면 한 번에 무너지는 편입니다. 회복이 느려졌다고 느낄 때가 신호입니다.',
    '기본 체력이 있는 편입니다. 관리만 하면 크게 앓지 않습니다. 다만 자신을 과신해 몰아붙이는 것만 조심하세요.',
    '오행이 고르게 퍼져 있어 몸이 잘 버팁니다. 회복도 빠른 편입니다. 이 체력을 밑천 삼아 오래 가는 일을 잡으세요.',
  ],
  study: [
    '앉아서 파고드는 쪽보다 몸으로 부딪혀 배우는 쪽이 빠릅니다. 시험보다 실무 경력이 더 정직하게 값을 합니다.',
    '준비한 만큼 나옵니다. 요행은 없지만 손해도 없습니다. 기간을 넉넉히 잡고 한 가지씩 끝내는 방식이 맞습니다.',
    '배운 것이 잘 남는 편입니다. 자격증과 문서가 길을 열어줍니다. 시험 운도 나쁘지 않습니다.',
    '문서와 배움에서 크게 얻는 자리입니다. 자격·학위·계약처럼 종이로 남는 일이 인생을 바꿉니다. 가르치는 일도 잘 맞습니다.',
  ],
  family: [
    '일찍부터 스스로 챙기며 큰 쪽입니다. 기대기보다 내가 세운 것이 진짜 내 것이 됩니다. 지금 가정에서는 내가 뿌리가 되는 자리입니다.',
    '가족과의 거리가 적당합니다. 크게 기대지도, 멀지도 않습니다. 필요할 때 손을 내밀면 받아줍니다.',
    '가족 덕이 있는 편입니다. 어려울 때 기댈 곳이 있고, 그 힘으로 밖에서도 버팁니다.',
    '가족과 윗사람의 덕이 두텁습니다. 물려받는 것이 물질이든 배움이든 확실히 있습니다. 그만큼 갚아야 할 몫도 있습니다.',
  ],
  people: [
    '사람 때문에 마음 쓰는 일이 잦습니다. 다 받아주면 내가 빕니다. 좁고 깊게 가는 쪽이 훨씬 편합니다.',
    '두루 무난하게 지냅니다. 크게 싸우지도, 크게 붙지도 않습니다. 깊게 갈 관계를 몇 개 고르는 것이 과제입니다.',
    '사람이 잘 붙습니다. 부탁을 꺼내면 들어주는 사람이 있습니다. 모임에서 중심에 서는 편입니다.',
    '사람 복이 두터운 자리입니다. 결정적인 순간마다 누군가 나타납니다. 인맥이 그대로 자산이 되는 사주입니다.',
  ],
  move: [
    '한자리를 지키는 것이 유리한 구조입니다. 옮길수록 흩어집니다. 뿌리를 내리고 깊게 가세요.',
    '움직여도 좋고 머물러도 좋습니다. 조건이 확실할 때만 움직이면 손해가 없습니다.',
    '움직이면 풀리는 편입니다. 이사·출장·이직이 나쁘지 않게 작용합니다.',
    '움직여야 사는 자리입니다. 역마의 기운이 강해 한자리에 묶이면 답답해집니다. 해외·출장·현장처럼 이동이 있는 일이 맞습니다.',
  ],
  late: [
    '말년에도 손을 놓기 어려운 구조입니다. 대신 늦게까지 쓰임이 있다는 뜻이기도 합니다. 노후 준비는 일찍 시작하세요.',
    '말년이 크게 흔들리지 않습니다. 화려하진 않아도 부족하지 않게 갑니다.',
    '거두어들이는 자리가 있습니다. 중년에 쌓은 것이 말년에 값을 합니다.',
    '말년이 두터운 자리입니다. 자녀나 후배, 또는 오래 해온 일에서 보람이 크게 돌아옵니다.',
  ],
};
const TIPS = {
  health: '몸이 보내는 첫 신호를 무시하지 않는 것 하나면 충분합니다.',
  study: '한 해에 자격이나 문서 하나를 목표로 잡으세요. 그게 가장 확실한 투자입니다.',
  family: '가족에게 쓰는 시간은 계산하지 마세요. 이 갈래는 계산하는 순간 얇아집니다.',
  people: '연락처 수보다 나를 대신 말해줄 사람 세 명이 중요합니다.',
  move: '옮길 때마다 한 가지는 반드시 챙겨 나오세요. 그게 쌓이면 이동도 자산이 됩니다.',
  late: '지금 하는 일 중 하나는 예순에도 할 수 있는 형태로 만들어 두세요.',
};

export function lifeDeep(s, opt) {
  const o = opt || {};
  const me = s.dayStem, meE = stemElem(me), P = s.pillars, B = s.branches;
  const d = s.dist;
  const t = sipsinTally(s);
  const bi = t[0] + t[1], sik = t[2] + t[3], jae = t[4] + t[5], gwan = t[6] + t[7], iny = t[8] + t[9];
  const body = bi + iny;

  const weakest = d.indexOf(Math.min(...d));
  const strongest = d.indexOf(Math.max(...d));
  const mean = 20;
  const sd = Math.sqrt(d.reduce((a, v) => a + (v - mean) * (v - mean), 0) / 5);

  const chungCnt = (() => {
    let n = 0;
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) if (CHUNG[B[i]] === B[j]) n += 1;
    return n;
  })();
  let hapCnt = 0;
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    if (YUKHAP[B[i]] === B[j]) hapCnt += 1;
    const g = samGroup(B[i]);
    if (g >= 0 && g === samGroup(B[j]) && B[i] !== B[j]) hapCnt += 0.7;
  }
  const gwiinCnt = (CHEONEUL[me] || []).filter((b) => B.includes(b)).length;
  const munchang = B.includes(MUNCHANG[me]);
  const hakdang = B.includes(JANGSAENG[me]);
  const gy = samGroup(P.year.branch);
  const yeokma = gy >= 0 && B.includes(YEOKMA_OF[gy]);

  /* ── 점수 ── */
  const W = wealthScore(s);
  const L = love.score(s);
  const K = work.score(s);

  const health = clamp(Math.round(74 - sd * 1.5 - chungCnt * 5 + (body >= 30 && body <= 55 ? 6 : -4)), 12, 96);
  const study = clamp(Math.round(46 + iny * 0.75 + (munchang ? 9 : 0) + (hakdang ? 7 : 0) + (t[7] >= 10 ? 5 : 0) + (jae > 38 ? -7 : 0)), 12, 96);
  const family = clamp(Math.round(44 + iny * 0.6 + (branchElem(P.year.branch) === meE || branchElem(P.year.branch) === (meE + 4) % 5 ? 8 : 0)
    + (CHUNG[P.year.branch] === P.month.branch ? -9 : 0) + hapCnt * 3), 12, 96);
  const people = clamp(Math.round(45 + hapCnt * 5 + gwiinCnt * 8 + (bi > 42 ? -6 : bi > 14 ? 5 : 0) + iny * 0.2), 12, 96);
  const move = clamp(Math.round(52 + (yeokma ? 14 : -6) + chungCnt * 7 + (hapCnt >= 2 ? -5 : 0)), 12, 96);
  const late = clamp(Math.round(P.hour
    ? 46 + sik * 0.4 + jae * 0.35 + (branchElem(P.hour.branch) === gen(meE) || branchElem(P.hour.branch) === ctl(meE) ? 9 : 0)
      + (CHUNG[P.hour.branch] === P.day.branch ? -8 : 0)
    : 52), 12, 96);

  const mk = (key, icon, title, score, txt, lead) => ({
    key, icon, title, score,
    tier: tierOf(score), tierName: TIER_NAME[tierOf(score)], tone: TIER_TONE[tierOf(score)],
    lead, text: txt[tierOf(score)], tip: TIPS[key],
  });

  const areas = [
    mk('health', '❋', '건강', health, TXT.health,
      `${ELEMENT_HAN[weakest]}${ELEMENTS[weakest]}이 가장 얇고 ${ELEMENT_HAN[strongest]}${ELEMENTS[strongest]}이 가장 두텁습니다`),
    {
      key: 'wealth', icon: '財', title: '재물', score: W.score,
      tier: tierOf(W.score), tierName: TIER_NAME[tierOf(W.score)], tone: TIER_TONE[tierOf(W.score)],
      lead: W.bandLabel, text: W.bandLine + ' ' + (W.notes[0] ? W.notes[0].d : ''),
      tip: '재물은 버는 힘과 지키는 힘이 다릅니다. 둘 중 얇은 쪽에 사람을 붙이세요.',
      link: { path: '/wealth', label: '재물지도에서 순위로 보기' },
    },
    {
      key: 'work', icon: '業', title: '일과 성취', score: K.score,
      tier: tierOf(K.score), tierName: TIER_NAME[tierOf(K.score)], tone: TIER_TONE[tierOf(K.score)],
      lead: K.bandLabel, text: K.bandLine + ' ' + (K.notes[0] ? K.notes[0].d : ''),
      tip: '내가 잘하는 한 가지를 좁히는 것이 이 갈래에서 가장 빠른 길입니다.',
      link: { path: '/work', label: '일운지도에서 순위로 보기' },
    },
    {
      key: 'love', icon: '緣', title: '애정과 인연', score: L.score,
      tier: tierOf(L.score), tierName: TIER_NAME[tierOf(L.score)], tone: TIER_TONE[tierOf(L.score)],
      lead: L.bandLabel, text: L.bandLine + ' ' + (L.notes[0] ? L.notes[0].d : ''),
      tip: '마음이 있어도 말로 꺼내지 않으면 상대는 모르고 지나갑니다.',
      link: { path: '/love', label: '연애지도에서 순위로 보기' },
    },
    mk('study', '文', '학업과 문서', study, TXT.study,
      munchang ? '문창귀인이 있습니다' : hakdang ? '학당귀인이 있습니다' : `인성이 ${r1(iny)}%입니다`),
    mk('family', '家', '가정과 부모', family, TXT.family,
      `년주 ${STEMS_HAN[P.year.stem]}${BRANCHES_HAN[P.year.branch]}, 월주 ${STEMS_HAN[P.month.stem]}${BRANCHES_HAN[P.month.branch]}로 봅니다`),
    mk('people', '人', '사람과 귀인', people, TXT.people,
      gwiinCnt ? '천을귀인이 원국에 있습니다' : hapCnt >= 2 ? '지지의 합이 여럿입니다' : `비겁이 ${r1(bi)}%입니다`),
    mk('move', '移', '이동과 주거', move, TXT.move,
      yeokma ? '역마살이 있습니다' : chungCnt ? '지지에 충이 있습니다' : '자리가 안정된 편입니다'),
    mk('late', '晩', '말년과 노후', late, TXT.late,
      P.hour ? `시주 ${STEMS_HAN[P.hour.stem]}${BRANCHES_HAN[P.hour.branch]}로 봅니다` : '태어난 시각을 몰라 평균으로 봅니다'),
  ];

  const total = clamp(Math.round(areas.reduce((a, x) => a + x.score, 0) / areas.length), 12, 96);
  const best = areas.slice().sort((a, b) => b.score - a.score)[0];
  const worst = areas.slice().sort((a, b) => a.score - b.score)[0];

  return {
    areas, total,
    totalTier: TIER_NAME[tierOf(total)], totalTone: TIER_TONE[tierOf(total)],
    best: { key: best.key, title: best.title, score: best.score },
    worst: { key: worst.key, title: worst.title, score: worst.score },
    summary: `가장 두터운 갈래는 <b>${best.title}</b>(${best.score}점)이고, 가장 얇은 갈래는 <b>${worst.title}</b>(${worst.score}점)입니다. `
      + `사주는 잘하는 쪽을 더 밀어주는 편이 얇은 쪽을 억지로 채우는 것보다 훨씬 효율이 좋습니다. `
      + `${best.title}을 축으로 삼고, ${worst.title}은 무너지지 않을 만큼만 관리하세요.`,
    balance: {
      dist: d, strong: strongest, weak: weakest,
      sd: r1(sd),
      strength: body >= 55 ? '신강' : body <= 34 ? '신약' : '중화',
      organ: BODY[weakest],
      organText: `${BODY[weakest].organ}(${BODY[weakest].part}) 쪽이 먼저 신호를 보냅니다. ${BODY[weakest].care}이 겹치면 티가 납니다. ${BODY[weakest].fix}`,
      note: sd < 6 ? '오행이 아주 고르게 퍼져 있습니다. 어떤 환경에도 적응하는 대신 색이 흐려 보일 수 있습니다.'
        : sd < 12 ? '오행이 비교적 고른 편입니다. 큰 결함이 없는 구조입니다.'
          : `${ELEMENT_HAN[strongest]}${ELEMENTS[strongest]} 쪽으로 크게 쏠려 있습니다. 그 기운이 인생의 색을 정합니다. 대신 얇은 ${ELEMENT_HAN[weakest]}${ELEMENTS[weakest]}을 채우는 습관을 일부러 만들어야 합니다.`,
    },
    sipsin: { 비겁: r1(bi), 식상: r1(sik), 재성: r1(jae), 관성: r1(gwan), 인성: r1(iny) },
  };
}
