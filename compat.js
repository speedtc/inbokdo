// compat.js — 인복도 관계 판정
import {
  STEMS, STEMS_HAN, BRANCHES, BRANCHES_HAN, ELEMENTS, ELEMENT_HAN,
  ZODIAC, SIPSIN, sipsin, branchRelation, stemElem, branchElem,
  CHEONEUL, GAN_HAP, GAN_CHUNG, gen, ctl,
} from './saju.js';

// ---------- 천간 캐릭터 ----------
export const CHARACTERS = [
  { key: 'gap', stem: 0, name: '아름드리나무', han: '甲', elem: 0, color: '#2f7d5b',
    tag: '곧게 자라는 사람',
    desc: '한번 방향을 정하면 위로만 자랍니다. 굽히는 법을 잘 모르는 대신, 옆에 있으면 기댈 데가 생깁니다.',
    give: '방향과 기준', want: '흔들리지 않을 자리' },
  { key: 'eul', stem: 1, name: '덩굴꽃', han: '乙', elem: 0, color: '#63a375',
    tag: '휘어져도 꺾이지 않는 사람',
    desc: '벽이 있으면 타고 오르고 바람이 불면 눕습니다. 부드러워 보여도 끝까지 살아남는 쪽입니다.',
    give: '유연함과 눈치', want: '기대어 오를 지지대' },
  { key: 'byeong', stem: 2, name: '한낮의 해', han: '丙', elem: 1, color: '#e8743b',
    tag: '있으면 환해지는 사람',
    desc: '숨기는 게 없어 속을 알기 쉽습니다. 들어오는 순간 분위기가 바뀌는 쪽입니다.',
    give: '온기와 활력', want: '가려지지 않는 무대' },
  { key: 'jeong', stem: 3, name: '촛불', han: '丁', elem: 1, color: '#d9534f',
    tag: '곁을 데워주는 사람',
    desc: '넓게 비추진 못해도 가까운 사람은 확실히 따뜻합니다. 어두울수록 진가가 드러납니다.',
    give: '섬세한 배려', want: '오래 지켜봐 줄 사람' },
  { key: 'mu', stem: 4, name: '큰 산', han: '戊', elem: 2, color: '#a2803f',
    tag: '말없이 버텨주는 사람',
    desc: '표현이 느리고 반응도 느립니다. 대신 무너지지 않습니다. 급할수록 이 사람이 필요합니다.',
    give: '안정감과 신용', want: '재촉하지 않는 시간' },
  { key: 'gi', stem: 5, name: '텃밭', han: '己', elem: 2, color: '#c3a35a',
    tag: '품어서 길러내는 사람',
    desc: '누가 알아주지 않아도 뒤에서 챙깁니다. 사람이 자라는 자리를 만드는 쪽입니다.',
    give: '보살핌과 실속', want: '고마움을 아는 사람' },
  { key: 'gyeong', stem: 6, name: '무쇠', han: '庚', elem: 3, color: '#7d8a99',
    tag: '끊고 맺음이 분명한 사람',
    desc: '아닌 건 아니라고 합니다. 무례해 보일 때가 있지만 뒤끝이 없습니다.',
    give: '결단과 추진력', want: '쓸 데가 있는 판' },
  { key: 'sin', stem: 7, name: '보석', han: '辛', elem: 3, color: '#9aa7b8',
    tag: '날카롭게 빛나는 사람',
    desc: '기준이 높고 눈이 밝습니다. 대충 넘어가는 걸 못 견디는 대신, 완성도를 끌어올립니다.',
    give: '안목과 디테일', want: '알아봐 주는 시선' },
  { key: 'im', stem: 8, name: '큰 바다', han: '壬', elem: 4, color: '#2f6ea3',
    tag: '깊이를 알 수 없는 사람',
    desc: '어디까지 생각하는지 겉으로 안 보입니다. 판이 커질수록 편안해지는 쪽입니다.',
    give: '넓은 시야와 포용', want: '가두지 않는 자유' },
  { key: 'gye', stem: 9, name: '이슬비', han: '癸', elem: 4, color: '#5b93c4',
    tag: '스며들어 적시는 사람',
    desc: '소리 없이 다가와 어느새 자리를 차지합니다. 눈치가 빠르고 마음을 잘 읽습니다.',
    give: '공감과 통찰', want: '조용히 머물 틈' },
];

// ---------- 관계 유형 ----------
// dir: 'in'  = 상대가 나에게 (내가 받는 것)
// 각 유형은 십신 키에 대응
export const TYPES = {
  cheoneul: {
    name: '하늘이 보낸 사람', short: '천을귀인', grade: 'S', color: '#c9a227',
    why: '살면서 몇 번 만나기 어려운 자리라서',
    in: '이런 사람은 억지로 찾아지지 않습니다. 이 사람이 있는 방향에서 일이 풀립니다.',
    out: '당신이 이 사람에게 그런 자리입니다. 별일 안 해도 이 사람의 일이 풀립니다.',
    how: '급할 때 제일 먼저 연락할 사람으로 저장해 두세요.',
  },
  jeongin: {
    name: '비빌 언덕', short: '정인', grade: 'A', color: '#3d8b6d',
    why: '기댈 곳이 되어주는 사람이라서',
    in: '힘들 때 슬쩍 기대게 되는 쪽입니다. 받기만 하기 쉬워서 미안해지는 관계입니다.',
    out: '이 사람이 당신에게 기댑니다. 당신 앞에서 긴장이 풀리는 쪽입니다.',
    how: '조언을 구하면 아깝지 않게 내어줍니다. 물어보는 걸 아끼지 마세요.',
  },
  pyeonin: {
    name: '숨은 스승', short: '편인', grade: 'B', color: '#5a8f7b',
    why: '안 나서다가 결정적일 때 한마디를 보태서',
    in: '평소엔 조용한데 막힌 순간에 한마디를 던집니다. 그 한마디가 방향을 바꿉니다.',
    out: '당신의 한마디가 이 사람의 판단을 바꿉니다. 말을 아껴서 더 무겁게 쓰세요.',
    how: '자주 볼 필요는 없습니다. 막힐 때만 찾아도 되는 사이입니다.',
  },
  jeonggwan: {
    name: '호랑이 선생', short: '정관', grade: 'A', color: '#4a6fa5',
    why: '무섭지만 이 사람 앞에서 사람 구실을 하게 돼서',
    in: '느슨해질 때 자세를 고쳐 앉게 만듭니다. 편하진 않아도 이 사람 앞에서는 흐트러지지 않습니다.',
    out: '당신이 이 사람의 기준입니다. 당신이 흐트러지면 이 사람도 흐트러집니다.',
    how: '약속을 잘 지키는 걸로 신뢰가 쌓이는 관계입니다.',
  },
  pyeongwan: {
    name: '스파링 상대', short: '편관', grade: 'C', color: '#6b5b95',
    why: '맞으면 아픈데 실력은 늘어서',
    in: '같이 있으면 긴장됩니다. 피곤한데 이상하게 이 사람 앞에서 실력이 나옵니다.',
    out: '당신이 이 사람을 긴장시킵니다. 세게 말하면 진짜로 아파하니 수위를 보세요.',
    how: '길게 붙어 있기보다 짧고 굵게 만나는 게 서로에게 낫습니다.',
  },
  jeongjae: {
    name: '짝꿍', short: '정재', grade: 'A', color: '#b5793a',
    why: '말 안 해도 다음 순서를 알아서',
    in: '설명이 필요 없습니다. 같이 뭘 벌이면 실제로 굴러가는 조합입니다.',
    out: '당신이 판을 깔면 이 사람이 채웁니다. 역할만 나눠주면 알아서 합니다.',
    how: '같이 일 벌이기 좋은 사이. 다만 돈 얘기는 처음에 명확히.',
  },
  pyeonjae: {
    name: '판 벌이는 사람', short: '편재', grade: 'B', color: '#c98b3a',
    why: '작게 갈 일을 크게 만들어서',
    in: '조용히 끝날 일을 판으로 만듭니다. 재미있지만 뒷정리는 각오해야 합니다.',
    out: '당신이 이 사람의 판을 키웁니다. 신나게 만들되 마무리는 챙겨주세요.',
    how: '새로운 걸 시작할 때 부르면 좋은 사람입니다.',
  },
  siksin: {
    name: '밥친구', short: '식신', grade: 'A', color: '#d98b8b',
    why: '같이 있으면 잘 먹고 잘 웃어서',
    in: '용건 없이 만나도 어색하지 않습니다. 특별한 이유 없이 기분이 나아지는 쪽입니다.',
    out: '당신이 이 사람을 편하게 만듭니다. 이 사람은 당신 앞에서 잘 웃습니다.',
    how: '용건 없이 만나는 게 제일 잘 맞는 사이입니다.',
  },
  sanggwan: {
    name: '불쏘시개', short: '상관', grade: 'B', color: '#d96b9c',
    why: '가만있던 나를 타오르게 해서',
    in: '조용히 있던 사람을 끌어냅니다. 덕분에 판이 커지지만 가끔 수습이 필요합니다.',
    out: '당신이 이 사람의 스위치입니다. 부추기면 진짜로 저지릅니다.',
    how: '아이디어 회의에 부르면 최고, 마무리는 다른 사람에게.',
  },
  bigyeon: {
    name: '쌍둥이', short: '비견', grade: 'B', color: '#7a8b99',
    why: '똑같아서 편하고, 똑같아서 답답해서',
    in: '설명이 필요 없습니다. 닮아서 편한 만큼 닮아서 답답할 때도 있습니다.',
    out: '당신을 보는 것 같다고 느낍니다. 그래서 숨기기가 어렵습니다.',
    how: '고민 상담에 최적. 단, 둘 다 같은 함정에 빠질 수 있으니 조심.',
  },
  geopjae: {
    name: '맞수', short: '겁재', grade: 'C', color: '#8b7a99',
    why: '비슷한데 같은 걸 두고 겹쳐서',
    in: '비슷한데 미묘하게 다릅니다. 자극이 되지만 같은 걸 노릴 때가 있습니다.',
    out: '이 사람은 당신을 의식합니다. 챙겨주면 든든한 편이 됩니다.',
    how: '경쟁 구도만 피하면 가장 오래 가는 사이가 됩니다.',
  },
  chungdol: {
    name: '태풍', short: '충', grade: 'C', color: '#c05353',
    why: '조용할 틈이 없어서',
    in: '잔잔할 날이 없습니다. 좋을 땐 아주 좋고 틀어질 땐 확실히 틀어집니다.',
    out: '당신이 이 사람의 일상을 흔듭니다. 나쁜 뜻이 없어도 파장이 큽니다.',
    how: '중요한 결정을 같이 급하게 내리지 마세요. 하루 자고 정하면 됩니다.',
  },
};

const SIPSIN_TO_TYPE = ['bigyeon', 'geopjae', 'siksin', 'sanggwan', 'pyeonjae', 'jeongjae',
  'pyeongwan', 'jeonggwan', 'pyeonin', 'jeongin'];

// 십신 → 지도 축(다섯 자리). 위로 갈수록 나에게 주는 쪽, 아래로 갈수록 내가 주는 쪽
// 비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인
const SIPSIN_TO_AXIS = ['bi', 'bi', 'sik', 'sik', 'jae', 'jae', 'gwan', 'gwan', 'in', 'in'];

export const AXES = {
  in:   { key: 'in',   name: '나를 채워주는 자리', short: '나를 채워줌', sipsin: '인성',
          desc: '나를 살려주는 기운입니다. 받는 쪽이라 편하지만, 익숙해지면 기대게 됩니다.', angle: 0 },
  gwan: { key: 'gwan', name: '나를 세우는 자리',   short: '나를 세움',   sipsin: '관성',
          desc: '나를 누르고 다잡는 기운입니다. 편하진 않아도 이 사람 앞에서 자세가 잡힙니다.', angle: 65 },
  sik:  { key: 'sik',  name: '내가 채워주는 자리', short: '내가 채워줌', sipsin: '식상',
          desc: '내가 내어주는 기운입니다. 주는 만큼 내가 풀리는 관계이기도 합니다.', angle: 150 },
  jae:  { key: 'jae',  name: '내가 이끄는 자리',   short: '내가 이끎',   sipsin: '재성',
          desc: '내가 다스리고 굴리는 기운입니다. 같이 일을 벌이기 좋은 자리입니다.', angle: 215 },
  bi:   { key: 'bi',   name: '나란한 자리',       short: '나란함',     sipsin: '비겁',
          desc: '나와 같은 결입니다. 주고받는 것 없이 옆에 서 있는 사이입니다.', angle: 275 },
};
export const AXIS_ORDER = ['in', 'gwan', 'bi', 'sik', 'jae'];

const SIPSIN_SCORE = [6, 2, 9, 3, 6, 9, 2, 8, 7, 12];

function branchPairs(A, B) {
  // [a지지, b지지, 가중치]
  const out = [];
  const wa = { day: 1.0, month: 0.6, year: 0.4 };
  out.push([A.pillars.day.branch, B.pillars.day.branch, 1.0]);
  out.push([A.pillars.month.branch, B.pillars.month.branch, 0.55]);
  out.push([A.pillars.year.branch, B.pillars.year.branch, 0.35]);
  out.push([A.pillars.day.branch, B.pillars.month.branch, 0.3]);
  out.push([A.pillars.month.branch, B.pillars.day.branch, 0.3]);
  if (A.pillars.hour && B.pillars.hour) out.push([A.pillars.hour.branch, B.pillars.hour.branch, 0.35]);
  return out;
}

function elementFill(A, B) {
  // B가 A의 부족한 오행을 얼마나 채워주는가 (0~15)
  let fill = 0;
  const detail = [];
  for (let e = 0; e < 5; e++) {
    const deficit = Math.max(0, 17 - A.dist[e]);
    const supply = Math.max(0, B.dist[e] - 17);
    const got = Math.min(deficit, supply);
    if (got > 3) detail.push({ elem: e, amount: Math.round(got * 10) / 10 });
    fill += got;
  }
  return { score: Math.min(15, fill * 0.55), detail };
}

/**
 * A(지도 주인) 관점 + B(참여자) 관점 관계 산출
 */
export function analyze(A, B) {
  const notes = [];
  let s = 50;

  // 1) 일간 십신 (양방향)
  const sinAB = sipsin(A.dayStem, B.dayStem); // B가 A에게
  const sinBA = sipsin(B.dayStem, A.dayStem); // A가 B에게
  s += SIPSIN_SCORE[sinAB] * 0.55 + SIPSIN_SCORE[sinBA] * 0.35;

  // 2) 천간합 / 천간충
  let ganHap = false, ganChung = false;
  if (GAN_HAP[A.dayStem] === B.dayStem) { s += 11; ganHap = true; notes.push({ k: 'ganhap', t: '일간 천간합', d: '두 사람의 기운이 서로 손을 잡는 배치입니다.' }); }
  if (GAN_CHUNG[A.dayStem] === B.dayStem) { s -= 7; ganChung = true; notes.push({ k: 'ganchung', t: '일간 천간충', d: '정면으로 부딪히는 기운입니다. 말이 세게 나갈 수 있습니다.' }); }

  // 3) 지지 관계
  let bScore = 0; let hasChung = false, chungWeight = 0;
  const bNotes = new Map();
  for (const [a, b, w] of branchPairs(A, B)) {
    for (const r of branchRelation(a, b)) {
      bScore += r.w * w;
      if (r.k === 'chung') { hasChung = true; chungWeight += w; }
      const key = r.k;
      const cur = bNotes.get(key) || { k: key, label: r.label, w: 0, pairs: [] };
      cur.w += w;
      cur.pairs.push(BRANCHES_HAN[a] + BRANCHES_HAN[b]);
      bNotes.set(key, cur);
    }
  }
  s += Math.max(-22, Math.min(24, bScore));

  // 4) 천을귀인
  const chA = (CHEONEUL[A.dayStem] || []).filter((x) => B.branches.includes(x));
  const chB = (CHEONEUL[B.dayStem] || []).filter((x) => A.branches.includes(x));
  if (chA.length) { s += Math.min(12, chA.length * 7); notes.push({ k: 'cheoneul', t: '천을귀인', d: `상대의 사주에 내 천을귀인(${chA.map((x) => BRANCHES_HAN[x]).join('·')})이 있습니다.` }); }
  if (chB.length) { s += Math.min(8, chB.length * 4); }

  // 5) 오행 보완
  const fA = elementFill(A, B); // B가 A를 채움
  const fB = elementFill(B, A);
  s += fA.score * 0.75 + fB.score * 0.45;
  if (fA.detail.length) {
    notes.push({ k: 'fill', t: '부족한 기운을 채워줌', d: `내게 모자란 ${fA.detail.map((x) => ELEMENT_HAN[x.elem] + ELEMENTS[x.elem]).join('·')} 기운을 상대가 가지고 있습니다.` });
  }

  // 6) 일지 상생 (부부·인연궁)
  const ea = branchElem(A.pillars.day.branch), eb = branchElem(B.pillars.day.branch);
  if (gen(eb) === ea) { s += 5; notes.push({ k: 'saengin', t: '일지 상생', d: '상대의 자리가 내 자리를 살려주는 배치입니다.' }); }
  else if (gen(ea) === eb) { s += 3; }
  else if (ctl(eb) === ea) { s -= 4; }

  const score = Math.max(8, Math.min(99, Math.round(s)));

  // ---- 유형 결정 ----
  const pick = (sin, dir) => {
    if (dir === 'in' && chA.length && score >= 68) return 'cheoneul';
    if (dir === 'out' && chB.length && score >= 68) return 'cheoneul';
    if (hasChung && chungWeight >= 1.0 && score < 55) return 'chungdol';
    return SIPSIN_TO_TYPE[sin];
  };
  const typeIn = pick(sinAB, 'in');   // 상대가 나에게
  const typeOut = pick(sinBA, 'out'); // 내가 상대에게

  const rel = [...bNotes.values()]
    .sort((x, y) => Math.abs(y.w) - Math.abs(x.w))
    .slice(0, 4)
    .map((x) => ({ label: x.label, pairs: [...new Set(x.pairs)].slice(0, 2) }));

  return {
    score,
    typeIn, typeOut,
    axisIn: SIPSIN_TO_AXIS[sinAB], axisOut: SIPSIN_TO_AXIS[sinBA],
    sipsinIn: SIPSIN[sinAB], sipsinOut: SIPSIN[sinBA],
    charA: CHARACTERS[A.dayStem].key,
    charB: CHARACTERS[B.dayStem].key,
    elemA: stemElem(A.dayStem), elemB: stemElem(B.dayStem),
    cheoneul: chA.length > 0,
    ganHap, ganChung, hasChung,
    branchRels: rel,
    notes: notes.slice(0, 4),
  };
}

export function scoreBand(n) {
  // 실제 점수 분포(중앙값 70, p90 85)에 맞춰 구간을 잡음
  if (n >= 86) return { label: '인생급 인복', tone: 'gold' };
  if (n >= 78) return { label: '확실한 내 편', tone: 'green' };
  if (n >= 70) return { label: '있으면 좋은 사이', tone: 'blue' };
  if (n >= 61) return { label: '무난한 사이', tone: 'gray' };
  if (n >= 52) return { label: '거리 조절이 필요', tone: 'amber' };
  return { label: '조심스러운 사이', tone: 'red' };
}

export function charOf(stem) { return CHARACTERS[stem]; }
