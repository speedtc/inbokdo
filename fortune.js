// fortune.js — 오늘의 운세 / 분야별 풀이
import {
  STEMS, STEMS_HAN, BRANCHES, BRANCHES_HAN, ELEMENTS, ELEMENT_HAN, ZODIAC,
  SIPSIN, sipsin, branchRelation, stemElem, branchElem, CHEONEUL,
  GAN_HAP, GAN_CHUNG, gen, ctl, computeSaju,
} from './saju.js';

/** 오늘(한국 기준) 날짜 */
export function todayKST(ts) {
  const d = new Date((ts ?? Date.now()) + 9 * 3600 * 1000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

// 십신별 오늘의 결
const DAY_SIPSIN = {
  0: { key: '비견', tone: 'gray', head: '나와 같은 결의 날',
    body: '고집이 세지는 날입니다. 남 말이 잘 안 들어옵니다. 혼자 밀어붙이기보다 한 번 물어보고 가면 실수가 줄어요.' },
  1: { key: '겁재', tone: 'amber', head: '새는 곳이 생기는 날',
    body: '나가는 돈이 늘고, 누가 내 몫을 건드리는 느낌이 듭니다. 오늘은 지갑과 약속을 한 번 더 확인하세요.' },
  2: { key: '식신', tone: 'green', head: '잘 먹고 잘 풀리는 날',
    body: '몸도 마음도 편한 날입니다. 미뤄둔 일을 꺼내기 좋고, 사람을 만나면 분위기가 좋습니다.' },
  3: { key: '상관', tone: 'blue', head: '말이 앞서는 날',
    body: '아이디어가 잘 터지는데 그만큼 말이 세게 나갑니다. 발표나 기획엔 좋고, 윗사람 앞에서는 한 박자 참으세요.' },
  4: { key: '편재', tone: 'gold', head: '판이 커지는 날',
    body: '기회가 여러 갈래로 들어옵니다. 다만 다 잡으려다 하나도 못 잡을 수 있으니 오늘은 하나만 고르세요.' },
  5: { key: '정재', tone: 'gold', head: '차곡차곡 쌓이는 날',
    body: '계산이 맞아떨어지는 날입니다. 정산·계약·정리에 좋습니다. 큰 걸 벌이기보다 매듭을 지으세요.' },
  6: { key: '편관', tone: 'red', head: '누가 나를 미는 날',
    body: '압박이 들어옵니다. 피하면 더 커지니 정면으로 짧게 처리하는 편이 낫습니다. 무리한 운전과 다툼은 피하세요.' },
  7: { key: '정관', tone: 'blue', head: '자세를 고쳐 앉는 날',
    body: '규칙과 순서가 중요한 날입니다. 서류·보고·공식 자리에 유리합니다. 지각과 말실수만 조심하세요.' },
  8: { key: '편인', tone: 'gray', head: '생각이 깊어지는 날',
    body: '혼자 있는 시간이 필요합니다. 공부와 자료 정리엔 좋지만, 결정은 내일로 미루는 게 낫습니다.' },
  9: { key: '정인', tone: 'green', head: '도움이 들어오는 날',
    body: '누군가 손을 내밀어 줍니다. 부탁할 일이 있으면 오늘 말을 꺼내세요. 배우고 익히기에도 좋습니다.' },
};

const ELEM_COLOR = ['초록·청록', '빨강·주황', '노랑·베이지', '흰색·은색', '검정·남색'];
const ELEM_DIR = ['동쪽', '남쪽', '중앙', '서쪽', '북쪽'];

/**
 * 오늘의 운세
 */
export function todayFortune(mySaju, ts) {
  const t = todayKST(ts);
  const day = computeSaju({ y: t.y, m: t.m, d: t.d, unknownTime: true });
  const todayStem = day.pillars.day.stem;
  const todayBranch = day.pillars.day.branch;

  const sin = sipsin(mySaju.dayStem, todayStem);
  const info = DAY_SIPSIN[sin];

  let score = 52;
  const notes = [];

  score += [4, -6, 10, 2, 6, 9, -7, 6, 0, 11][sin];

  if (GAN_HAP[mySaju.dayStem] === todayStem) {
    score += 9;
    notes.push({ t: '천간합', d: '오늘 하늘의 기운이 내 일간과 손을 잡습니다. 사람 만나기 좋은 날입니다.' });
  }
  if (GAN_CHUNG[mySaju.dayStem] === todayStem) {
    score -= 8;
    notes.push({ t: '천간충', d: '정면으로 부딪히는 기운입니다. 오늘은 말수를 줄이는 편이 낫습니다.' });
  }

  for (const r of branchRelation(mySaju.dayBranch, todayBranch)) {
    score += r.w * 0.9;
    if (r.k === 'chung') notes.push({ t: '일지충', d: '자리가 흔들립니다. 이동·변동수가 있고 몸이 고단할 수 있어요.' });
    else if (r.k === 'yukhap') notes.push({ t: '일지 육합', d: '자리가 편안합니다. 미뤄둔 만남을 잡기 좋은 날입니다.' });
    else if (r.k === 'samhap') notes.push({ t: '일지 삼합', d: '일이 모여 하나로 굴러갑니다. 협업에 유리합니다.' });
  }

  const gwiin = (CHEONEUL[mySaju.dayStem] || []).includes(todayBranch);
  if (gwiin) {
    score += 10;
    notes.push({ t: '천을귀인일', d: '오늘 하루 자체가 귀인의 날입니다. 어려운 부탁을 꺼내기 좋습니다.' });
  }

  // 오늘 기운이 내 부족한 오행을 채워주는가
  const te = stemElem(todayStem);
  if (mySaju.dist[te] < 12) {
    score += 5;
    notes.push({ t: '부족한 기운 보충', d: `평소 모자란 ${ELEMENT_HAN[te]}${ELEMENTS[te]} 기운이 오늘 들어옵니다.` });
  }

  score = Math.max(12, Math.min(97, Math.round(score)));

  // 오늘 챙기면 좋은 색·방향 = 내 사주에서 가장 부족한 오행
  const weak = mySaju.dist.indexOf(Math.min(...mySaju.dist));

  return {
    date: t,
    dayGZ: { stem: todayStem, branch: todayBranch },
    dayGZText: STEMS_HAN[todayStem] + BRANCHES_HAN[todayBranch],
    dayGZKo: STEMS[todayStem] + BRANCHES[todayBranch],
    sipsin: SIPSIN[sin],
    headline: info.head,
    body: info.body,
    tone: info.tone,
    score,
    notes: notes.slice(0, 3),
    lucky: { color: ELEM_COLOR[weak], dir: ELEM_DIR[weak], elem: ELEMENT_HAN[weak] + ELEMENTS[weak] },
  };
}

// 오행 ↔ 몸
const BODY = [
  { part: '간·담, 근육과 눈', care: '늦게까지 술을 마시거나 화를 참는 습관' },
  { part: '심장·소장, 혈압과 순환', care: '급하게 서두르는 성격과 카페인' },
  { part: '위·비장, 소화기', care: '불규칙한 식사와 단 음식' },
  { part: '폐·대장, 호흡기와 피부', care: '건조한 공기와 미세먼지' },
  { part: '신장·방광, 허리와 뼈', care: '찬 것과 수면 부족' },
];

/**
 * 분야별 풀이 (내 원국 기반)
 */
export function lifeAreas(s) {
  const me = stemElem(s.dayStem);
  const d = s.dist;

  const acc = { bigyeop: 0, siksang: 0, jae: 0, gwan: 0, in: 0 };
  acc.bigyeop = d[me];
  acc.siksang = d[gen(me)];
  acc.jae = d[ctl(me)];
  acc.gwan = d[(me + 3) % 5];
  acc.in = d[(me + 4) % 5];

  const strong = acc.bigyeop + acc.in;
  const weakest = d.indexOf(Math.min(...d));
  const strongest = d.indexOf(Math.max(...d));

  const lv = (v) => (v >= 30 ? 'high' : v >= 18 ? 'mid' : 'low');

  const areas = [];

  // 건강
  areas.push({
    key: 'health', icon: '❋', title: '건강',
    lead: `${ELEMENT_HAN[weakest]}${ELEMENTS[weakest]} 기운이 가장 얇습니다`,
    text: `${BODY[weakest].part} 쪽이 먼저 신호를 보냅니다. ${BODY[weakest].care}이 겹치면 티가 납니다. ` +
      (d[strongest] > 38
        ? `반대로 ${ELEMENT_HAN[strongest]}${ELEMENTS[strongest]}이 지나치게 몰려 있어, 한쪽으로 쏠리는 생활습관이 몸에 그대로 나타납니다.`
        : '오행이 크게 치우치진 않아 관리만 하면 무난한 편입니다.'),
  });

  // 재물
  areas.push({
    key: 'wealth', icon: '◈', title: '재물',
    lead: lv(acc.jae) === 'high' ? '재물의 기운이 두텁습니다'
      : lv(acc.jae) === 'mid' ? '벌이는 만큼 들어오는 구조입니다' : '재물보다 사람이 먼저 붙는 사주입니다',
    text: lv(acc.jae) === 'high'
      ? '돈이 흘러 들어오는 자리가 있습니다. 다만 관리하는 힘(비겁)이 약하면 들어온 만큼 나가니, 버는 것보다 지키는 쪽에 사람을 두세요.'
      : lv(acc.jae) === 'mid'
        ? '한 방보다 꾸준한 쪽이 맞습니다. 재성이 극단적이지 않아 큰 손실도 큰 대박도 드뭅니다. 정기적으로 들어오는 구조를 만드는 게 유리합니다.'
        : '돈을 직접 좇기보다 실력이나 사람을 쌓아두면 나중에 그게 돈이 되는 형태입니다. 무리한 투자보다 본업을 두껍게 하세요.',
  });

  // 일
  areas.push({
    key: 'work', icon: '◆', title: '일과 성취',
    lead: acc.gwan >= 25 ? '조직 안에서 자리를 잡는 힘이 있습니다'
      : acc.siksang >= 25 ? '내가 만들어 내는 쪽이 맞습니다' : '균형형입니다',
    text: acc.gwan >= 25
      ? '규칙과 직함이 있는 자리에서 힘이 납니다. 상사·거래처 같은 위쪽 관계가 성패를 가릅니다. 절차를 지키는 게 무기입니다.'
      : acc.siksang >= 25
        ? '시키는 일보다 내가 벌이는 일에서 실력이 나옵니다. 기획·창작·영업처럼 결과물이 눈에 보이는 쪽이 맞습니다.'
        : '어느 한쪽으로 크게 쏠리지 않아, 환경에 따라 모양이 달라집니다. 같이 일하는 사람이 누구냐가 특히 중요합니다.',
  });

  // 인간관계
  areas.push({
    key: 'people', icon: '✿', title: '사람',
    lead: acc.in >= 25 ? '받는 복이 있습니다'
      : acc.bigyeop >= 32 ? '내가 이끄는 쪽입니다' : '주고받는 균형이 좋습니다',
    text: acc.in >= 25
      ? '도와주는 사람이 잘 붙습니다. 다만 기대는 게 익숙해지면 스스로 결정하는 힘이 무뎌질 수 있어요.'
      : acc.bigyeop >= 32
        ? '사람을 모으는 힘이 있는 대신, 같은 걸 두고 겹치는 일이 생깁니다. 역할을 처음에 나눠두면 오래갑니다.'
        : '한쪽으로 치우치지 않아 여러 부류와 무난하게 지냅니다. 깊게 가는 관계를 몇 개 고르는 게 과제입니다.',
  });

  return {
    areas,
    balance: { strong: strongest, weak: weakest, dist: d, strength: strong >= 45 ? '신강' : strong <= 30 ? '신약' : '중화' },
  };
}
