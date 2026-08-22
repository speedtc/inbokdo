// tojeong.js — 토정비결
//
// 괘를 뽑는 방법은 전통 작괘법 그대로다. 다만 **괘사 문장은 우리가 직접 썼다.**
// 시중에 도는 번역문을 가져다 쓰지 않았다. 어느 책의 문장도 옮기지 않았다.
// 계산 방법과 이 사실은 /about 페이지에 그대로 공개한다.
//
// 작괘 (8 × 6 × 3 = 144괘)
//   나이   = 세는나이 = 대상연도 − 태어난 해 + 1
//   태세수 = 대상연도 간지의 (천간 순번 + 지지 순번)
//   월건수 = 태어난 달 월주 간지의 (천간 순번 + 지지 순번)
//   일진수 = 태어난 날 일주 간지의 (천간 순번 + 지지 순번)
//   월대소 = 태어난 음력 달의 일수 (29 또는 30)
//
//   상괘 = (태세수 + 나이)   mod 8 → 0이면 8
//   중괘 = (월건수 + 월대소) mod 6 → 0이면 6
//   하괘 = (일진수 + 음력 생일) mod 3 → 0이면 3

import {
  computeSaju, STEMS_HAN, BRANCHES_HAN, sipsin, SIPSIN, sipsinTally,
  stemElem, branchElem, gen, ctl, CHEONEUL, CHUNG, YUKHAP, SAMHAP,
  ELEMENTS, ELEMENT_HAN, ZODIAC, BRANCHES,
} from './saju.js';
import { solarToLunar, lunarMonthLength } from './astro.js';

/* ── 상괘: 팔괘의 물상 ── */
const SANG = [
  null,
  { n: '건', han: '乾', img: '하늘', tone: 'gold',
    head: '하늘이 열리는 해',
    body: '위에서 길이 먼저 열립니다. 내가 밀지 않아도 자리가 만들어지는 흐름이라, 올해는 크게 잡아도 됩니다. 다만 다 가지려 들면 그 자리가 도로 무거워집니다.' },
  { n: '태', han: '兌', img: '못', tone: 'green',
    head: '물이 고이는 해',
    body: '말과 사람으로 풀리는 해입니다. 웃으며 건넨 한마디가 일을 만듭니다. 대신 입에서 새는 것도 이 해라, 하지 않아도 될 말은 삼키는 편이 낫습니다.' },
  { n: '리', han: '離', img: '불', tone: 'red',
    head: '불이 밝은 해',
    body: '드러나는 해입니다. 그동안 안 보이던 것이 눈에 띄고, 이름이 알려집니다. 밝은 만큼 그늘도 선명해지니 감추던 일은 미리 정리해 두세요.' },
  { n: '진', han: '震', img: '우레', tone: 'amber',
    head: '우레가 치는 해',
    body: '움직이는 해입니다. 자리를 옮기거나 새로 시작할 일이 생깁니다. 소리는 큰데 비는 적을 수 있으니, 벌인 뒤에 수습할 사람을 먼저 정해두세요.' },
  { n: '손', han: '巽', img: '바람', tone: 'blue',
    head: '바람이 드는 해',
    body: '스며드는 해입니다. 한 번에 되는 일은 없지만 꾸준히 밀면 어느새 자리가 잡힙니다. 방향만 자주 바꾸지 않으면 됩니다.' },
  { n: '감', han: '坎', img: '물', tone: 'gray',
    head: '물을 건너는 해',
    body: '한 고비가 있는 해입니다. 얕아 보여도 발을 담그면 깊습니다. 서두르지 말고 돌아가는 길을 택하면 큰 손해는 없습니다.' },
  { n: '간', han: '艮', img: '산', tone: 'blue',
    head: '산에 머무는 해',
    body: '멈춰야 이기는 해입니다. 답답해도 지금은 자리를 지키는 게 이득입니다. 이 해에 참은 것이 다음 해에 값을 합니다.' },
  { n: '곤', han: '坤', img: '땅', tone: 'green',
    head: '땅이 두터운 해',
    body: '받아주는 해입니다. 내가 나서기보다 남을 도우면 그게 돌아옵니다. 크게 벌기보다 넓게 쌓아두는 쪽이 맞습니다.' },
];

/* ── 중괘: 때의 마디 ── */
const JUNG = [
  null,
  { n: '이른 봄', line: '언 땅 밑에서 싹이 먼저 움직인다', when: '기미는 이미 보이는데 아직 눈에 띄지 않습니다. 봄이 오기 전에 준비를 마치세요.' },
  { n: '늦봄', line: '꽃이 피니 벌이 절로 찾아온다', when: '사람이 먼저 붙습니다. 이때 만난 인연이 한 해를 끌고 갑니다.' },
  { n: '한여름', line: '해가 높으니 그림자가 짧다', when: '가장 바쁜 때입니다. 힘을 몰아 쓰되 몸을 상하지 않게 하세요.' },
  { n: '초가을', line: '이삭이 여물어 고개를 숙인다', when: '거두는 때입니다. 벌이던 것을 접고 매듭을 지으면 남는 게 생깁니다.' },
  { n: '늦가을', line: '서리가 내려 남을 것만 남는다', when: '가려지는 때입니다. 붙잡고 있던 것 중 하나는 놓아야 합니다.' },
  { n: '한겨울', line: '눈 아래 뿌리가 조용히 자란다', when: '겉으로는 멈춘 듯한 때입니다. 이 시기에 쌓아둔 것은 밖에서 안 보일 뿐 사라지지 않습니다.' },
];

/* ── 하괘: 맺음 ── */
const HA = [
  null,
  { n: '이룸', tone: 1, close: '뜻한 바가 손에 닿는다', adv: '망설이지 말고 한 발 먼저 내디디세요. 올해는 움직인 쪽이 가져갑니다.' },
  { n: '기다림', tone: 0, close: '때가 아직 이르니 서두르지 말라', adv: '조급함이 가장 큰 손해입니다. 한 계절만 늦춰도 결과가 달라집니다.' },
  { n: '조심', tone: -1, close: '문단속을 하고 말을 아껴라', adv: '돈과 말, 이 둘만 단속하면 큰일은 없습니다. 보증과 즉답을 피하세요.' },
];

/* 상괘 × 하괘 = 24가지 한 해의 결 */
const CROSS = {
  '1-1': '큰 자리가 열립니다. 미루던 일을 올해 결정하세요.',
  '1-2': '자리는 보이는데 아직 내 것이 아닙니다. 준비된 사람에게 갑니다.',
  '1-3': '높이 오를수록 발밑이 위태롭습니다. 교만이 유일한 적입니다.',
  '2-1': '말이 곧 재산이 됩니다. 사람을 만나는 자리에 나가세요.',
  '2-2': '좋은 말이 오가지만 아직 문서로는 이르지 않습니다.',
  '2-3': '구설이 따릅니다. 남의 일에 편들지 마세요.',
  '3-1': '이름이 밝혀집니다. 내놓을 것이 있다면 올해 내놓으세요.',
  '3-2': '드러나기 전에 다듬을 시간이 조금 더 필요합니다.',
  '3-3': '드러난 만큼 시비도 따라옵니다. 문서를 두 번 읽으세요.',
  '4-1': '움직이면 열립니다. 이사나 이직이 좋게 작용합니다.',
  '4-2': '움직일 마음은 굴뚝같으나 아직 발을 떼지 마세요.',
  '4-3': '급하게 벌인 일이 탈이 됩니다. 계약과 운전을 조심하세요.',
  '5-1': '꾸준히 밀던 일이 자리를 잡습니다. 방향을 바꾸지 마세요.',
  '5-2': '바람은 부는데 아직 방향이 잡히지 않았습니다. 지켜보세요.',
  '5-3': '이 말 저 말에 흔들립니다. 결정은 혼자 하세요.',
  '6-1': '한 고비를 넘기면 그 뒤가 편합니다. 도움을 청하세요.',
  '6-2': '물이 아직 깊습니다. 건널 때를 기다리는 게 상책입니다.',
  '6-3': '물가에 서지 마세요. 돈을 빌려주는 일을 특히 피하세요.',
  '7-1': '멈춘 자리에서 오히려 얻습니다. 지금 있는 곳을 지키세요.',
  '7-2': '산은 넘는 게 아니라 돌아가는 것입니다. 우회로를 찾으세요.',
  '7-3': '무리하게 넘으려다 다칩니다. 몸부터 챙기세요.',
  '8-1': '베푼 것이 그대로 돌아옵니다. 사람에게 쓰는 돈이 아깝지 않습니다.',
  '8-2': '땅은 넓은데 아직 씨를 뿌릴 때가 아닙니다.',
  '8-3': '다 받아주다 내가 빕니다. 거절하는 법을 배우세요.',
};

/* 월운 — 그 달의 월건과 내 일간의 십신으로 낸다 */
const MONTH_SIPSIN = [
  { k: '비견', tone: 'gray', s: '내 뜻대로 밀어붙이게 되는 달입니다. 고집을 조금만 덜면 무리가 없습니다.' },
  { k: '겁재', tone: 'amber', s: '나가는 돈이 늘어납니다. 빌려주는 일과 동업 이야기를 미루세요.' },
  { k: '식신', tone: 'green', s: '먹고 웃을 일이 생깁니다. 미뤄둔 일을 꺼내기 좋은 달입니다.' },
  { k: '상관', tone: 'blue', s: '아이디어가 터지지만 말이 세게 나갑니다. 윗사람 앞에서 한 박자 참으세요.' },
  { k: '편재', tone: 'gold', s: '기회가 여러 갈래로 옵니다. 하나만 골라 잡는 달입니다.' },
  { k: '정재', tone: 'gold', s: '계산이 맞아떨어집니다. 정산과 계약에 좋은 달입니다.' },
  { k: '편관', tone: 'red', s: '압박이 들어옵니다. 피하지 말고 짧게 정면으로 처리하세요.' },
  { k: '정관', tone: 'blue', s: '자세가 잡히는 달입니다. 서류와 공식 자리에 유리합니다.' },
  { k: '편인', tone: 'gray', s: '생각이 깊어집니다. 공부와 정리에 좋고 결정은 미루는 게 낫습니다.' },
  { k: '정인', tone: 'green', s: '도움이 들어옵니다. 부탁할 일이 있으면 이 달에 꺼내세요.' },
];


/* ══════════════ 분야별 한 해 운 ══════════════ */

/* 상괘 8 · 중괘 6 · 하괘 3 의 기본 점수 */
const SANG_SC = [0, 14, 8, 9, 2, 5, -8, -3, 7];
const JUNG_SC = [0, -2, 6, 4, 5, -1, -4];
const HA_SC = [0, 11, -1, -12];

const TIER = (v) => (v >= 74 ? 3 : v >= 60 ? 2 : v >= 46 ? 1 : 0);
const TIER_NAME = ['조심해야 하는 해', '무난한 해', '괜찮은 해', '아주 좋은 해'];
const TIER_TONE = ['gray', 'blue', 'green', 'gold'];

/* 분야별 4단계 문장 (0 나쁨 → 3 좋음) */
const AREA_DEF = [
  { key: 'money', icon: '財', title: '재물운',
    t: [
      '들어오는 것보다 나가는 것이 많은 해입니다. 새로 벌이기보다 새는 곳을 막는 데 힘을 쓰세요. 보증·대여·즉흥적인 투자는 올해 특히 손실로 돌아옵니다.',
      '크게 늘지도 크게 줄지도 않는 해입니다. 한 방을 노리면 오히려 깎입니다. 들어오는 주기를 하나 더 만들어 두는 정도가 딱 맞습니다.',
      '벌이가 살아나는 해입니다. 미뤄뒀던 계약이나 정산이 풀립니다. 다만 규모를 두 배로 키우기보다 한 단계씩 올리는 쪽이 남습니다.',
      '재물이 크게 붙는 해입니다. 미뤄둔 결정을 올해 하세요. 다만 들어온 만큼 관리할 사람이 없으면 그대로 새니, 버는 일과 지키는 일을 나누어 두세요.',
    ] },
  { key: 'work', icon: '職', title: '사업 · 직장운',
    t: [
      '자리가 흔들리는 해입니다. 옮기고 싶은 마음이 커지지만, 급하게 결정하면 다음 자리도 오래 못 갑니다. 한 계절은 두고 보세요.',
      '큰 변화 없이 굴러가는 해입니다. 눈에 띄는 성과는 적어도 쌓이는 것은 있습니다. 지금 자리에서 한 가지를 깊게 파세요.',
      '일이 풀리는 해입니다. 맡은 일이 커지고 인정이 따라옵니다. 승진·이직·확장 이야기가 나오면 받아도 좋습니다.',
      '크게 쓰이는 해입니다. 자리와 이름이 같이 올라갑니다. 미뤄둔 도전을 올해 시작하면 그대로 밀고 나갈 힘이 붙습니다.',
    ] },
  { key: 'love', icon: '愛', title: '애정 · 가정운',
    t: [
      '가까운 사람과 부딪히기 쉬운 해입니다. 사소한 말이 오래 갑니다. 말로 이기려 하지 말고 시간을 두면 저절로 가라앉습니다.',
      '큰 변화 없이 지나가는 해입니다. 새 인연을 기다리기보다 지금 곁에 있는 사람에게 시간을 쓰는 쪽이 남습니다.',
      '사람이 잘 붙는 해입니다. 소개나 모임에서 인연이 생깁니다. 이미 만나는 사람이 있다면 한 단계 나아갈 이야기가 오갑니다.',
      '인연이 크게 들어오는 해입니다. 혼담이나 중요한 약속이 오갈 수 있습니다. 가정에도 좋은 일이 겹칩니다.',
    ] },
  { key: 'health', icon: '健', title: '건강운',
    t: [
      '몸이 먼저 신호를 보내는 해입니다. 미루던 검진을 올해 받으세요. 과로와 술자리가 겹치면 한 번에 무너집니다.',
      '큰 병은 없지만 잔병이 붙는 해입니다. 수면과 식사 시간을 고정하는 것만으로 절반은 잡힙니다.',
      '몸이 가벼운 해입니다. 미뤄둔 운동을 시작하기 좋고, 시작하면 오래 갑니다.',
      '체력이 살아나는 해입니다. 무리해도 회복이 빠릅니다. 다만 그 믿음으로 과하게 밀어붙이는 것만 조심하세요.',
    ] },
  { key: 'study', icon: '文', title: '문서 · 시험운',
    t: [
      '문서가 어긋나는 해입니다. 계약서는 두 번 읽고, 도장은 하루 미뤘다 찍으세요. 시험은 준비 기간을 더 잡아야 합니다.',
      '준비한 만큼 나오는 해입니다. 요행은 없지만 손해도 없습니다. 자격증 하나를 목표로 잡기 좋습니다.',
      '문서 운이 좋은 해입니다. 계약·합격·등기처럼 종이로 남는 일이 잘 풀립니다.',
      '문서와 배움에서 크게 얻는 해입니다. 시험·합격·계약을 올해 안에 매듭짓는 것이 유리합니다.',
    ] },
  { key: 'move', icon: '移', title: '이동 · 이사운',
    t: [
      '움직임이 손해로 이어지기 쉬운 해입니다. 꼭 옮겨야 한다면 시기를 미루고, 계약 조건을 평소보다 깐깐하게 보세요.',
      '움직여도 좋고 머물러도 좋은 해입니다. 급할 것 없으니 조건이 맞을 때만 움직이세요.',
      '움직이면 풀리는 해입니다. 이사·출장·이직이 좋게 작용합니다.',
      '크게 자리를 옮기기 좋은 해입니다. 새 터에서 시작한 일이 오래 갑니다. 해외나 먼 곳과도 인연이 있습니다.',
    ] },
  { key: 'people', icon: '人', title: '사람 · 귀인운',
    t: [
      '사람 때문에 마음 쓰이는 해입니다. 부탁을 다 받아주면 내가 빕니다. 거절하는 연습이 필요합니다.',
      '오는 사람 가는 사람이 반반인 해입니다. 넓히기보다 있는 관계를 정리하는 쪽이 남습니다.',
      '도와주는 사람이 나타나는 해입니다. 어려운 부탁이 있으면 올해 꺼내세요.',
      '귀인이 크게 붙는 해입니다. 결정적인 순간에 사람이 나타나 길을 열어줍니다. 사람에게 쓰는 시간이 가장 남는 해입니다.',
    ] },
  { key: 'trouble', icon: '訟', title: '구설 · 관재',
    t: [
      '말과 문서로 걸리기 쉬운 해입니다. 남의 일에 편들지 말고, 보증과 즉답을 피하세요. 운전과 서명은 특히 조심하세요.',
      '자잘한 구설이 스치는 해입니다. 크게 번지지는 않으니 대응하지 않는 것이 가장 좋은 대응입니다.',
      '큰 시비 없이 지나가는 해입니다. 다만 술자리에서의 한마디만 조심하면 됩니다.',
      '깨끗하게 지나가는 해입니다. 묵은 시비가 있었다면 올해 정리됩니다.',
    ] },
];

function areaScores(s, year, sang, jung, ha) {
  const base = 52 + SANG_SC[sang] + JUNG_SC[jung] + HA_SC[ha];
  const me = s.dayStem, meE = stemElem(me);
  const t = sipsinTally(s);
  const bi = t[0] + t[1], sik = t[2] + t[3], jae = t[4] + t[5], gwan = t[6] + t[7], iny = t[8] + t[9];
  const body = bi + iny;

  const yStem = ((year - 4) % 10 + 10) % 10;
  const yBranch = ((year - 4) % 12 + 12) % 12;
  const ySin = sipsin(me, yStem);
  const yE = branchElem(yBranch);

  const chung = CHUNG[s.dayBranch] === yBranch;
  const hap = YUKHAP[s.dayBranch] === yBranch;
  let samhap = false;
  for (const g of SAMHAP) if (g.includes(s.dayBranch) && g.includes(yBranch)) samhap = true;
  const gwiin = (CHEONEUL[me] || []).includes(yBranch);
  const yeokma = [2, 5, 8, 11].includes(yBranch);
  const weakE = s.dist.indexOf(Math.min(...s.dist));

  const cl = (v) => Math.max(8, Math.min(97, Math.round(v)));
  const add = {};
  add.money = (jae >= 22 ? 7 : jae < 6 ? -6 : 0) + ([4, 5].includes(ySin) ? 9 : ySin === 1 ? -8 : 0) + (body < 28 && jae > 30 ? -6 : 0);
  add.work = (gwan >= 18 ? 6 : gwan < 6 ? -4 : 0) + ([6, 7].includes(ySin) ? 8 : ySin === 3 ? -5 : 0) + (chung ? -6 : 0);
  add.love = (hap ? 9 : 0) + (samhap ? 6 : 0) + (chung ? -10 : 0) + (jae + gwan >= 40 ? 5 : jae + gwan < 12 ? -6 : 0);
  add.health = (chung ? -8 : 0) + (yE === weakE ? 8 : 0) + (body < 26 ? -5 : 0) + ([6].includes(ySin) ? -6 : 0) + (sik >= 22 ? 4 : 0);
  add.study = (iny >= 20 ? 8 : iny < 5 ? -5 : 0) + ([8, 9].includes(ySin) ? 9 : 0) + (gwiin ? 5 : 0);
  add.move = (yeokma ? 8 : 0) + (chung ? 6 : 0) + (hap ? -3 : 0);
  add.people = (gwiin ? 12 : 0) + (hap ? 6 : 0) + (samhap ? 5 : 0) + (bi > 40 ? -5 : 0);
  add.trouble = (chung ? -9 : 0) + (t[3] >= 18 ? -6 : 0) + (t[6] >= 18 ? -5 : 0) + (gwiin ? 7 : 0) + (hap ? 4 : 0);

  const tags = [];
  if (chung) tags.push('일지충');
  if (hap) tags.push('일지 육합');
  if (samhap) tags.push('일지 삼합');
  if (gwiin) tags.push('천을귀인');
  if (yeokma) tags.push('역마');

  const areas = AREA_DEF.map((a) => {
    const sc = cl(base + (add[a.key] || 0));
    const tier = TIER(sc);
    return {
      key: a.key, icon: a.icon, title: a.title, score: sc,
      tier, tierName: TIER_NAME[tier], tone: TIER_TONE[tier], text: a.t[tier],
    };
  });

  return {
    areas, tags,
    seun: { gz: STEMS_HAN[yStem] + BRANCHES_HAN[yBranch], sipsin: SIPSIN[ySin] },
    total: cl(areas.reduce((x, a) => x + a.score, 0) / areas.length),
    lucky: {
      elem: ELEMENT_HAN[weakE] + ELEMENTS[weakE],
      color: ['초록·청록', '빨강·주황', '노랑·베이지', '흰색·은색', '검정·남색'][weakE],
      dir: ['동쪽', '남쪽', '중앙', '서쪽', '북쪽'][weakE],
      num: ['3·8', '2·7', '5·10', '4·9', '1·6'][weakE],
      gwiin: (CHEONEUL[me] || []).map((b) => ZODIAC[b] + '띠').join(' · '),
    },
  };
}

/**
 * 토정비결
 * @param {object} birth 사용자가 입력한 생년월일 (normBirth 결과)
 * @param {number} year 볼 연도
 */
export function tojeong(birth, year) {
  const s = computeSaju(birth);
  const sol = s.solar;

  // 음력 생일
  const lun = s.lunar || solarToLunar(sol.y, sol.m, sol.d);
  if (!lun) throw new Error('음력을 계산할 수 없습니다.');

  // 세는나이 (음력 해 기준)
  const age = year - lun.y + 1;
  if (age < 1) throw new Error('태어나기 전 해는 볼 수 없습니다.');

  // 대상 연도의 간지 = 그 해 6월의 년주 (입춘 지난 시점)
  const taese = computeSaju({ y: year, m: 6, d: 15, unknownTime: true }).pillars.year;
  const taeseNum = (taese.stem + 1) + (taese.branch + 1);

  const wolju = s.pillars.month;
  const woljuNum = (wolju.stem + 1) + (wolju.branch + 1);
  const ilju = s.pillars.day;
  const iljuNum = (ilju.stem + 1) + (ilju.branch + 1);

  const monLen = lunarMonthLength(lun.y, lun.m, lun.leap) || 30;

  const sang = ((taeseNum + age) % 8) || 8;
  const jung = ((woljuNum + monLen) % 6) || 6;
  const ha = ((iljuNum + lun.d) % 3) || 3;

  const S = SANG[sang], J = JUNG[jung], H = HA[ha];
  const cross = CROSS[sang + '-' + ha];

  // 괘사 4행
  const verse = [
    `${S.img}의 기운이 한 해를 이끈다`,
    J.line,
    cross,
    H.close,
  ];

  // 월운 12개월 — 그 해 각 달의 월주와 내 일간
  const MSC = [4, -6, 9, 2, 6, 9, -7, 6, 0, 10];
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mp = computeSaju({ y: year, m, d: 16, unknownTime: true }).pillars.month;
    const sin = sipsin(s.dayStem, mp.stem);
    const info = MONTH_SIPSIN[sin];
    let sc = 54 + MSC[sin];
    const tags = [];
    if (CHUNG[s.dayBranch] === mp.branch) { sc -= 9; tags.push('일지충'); }
    if (YUKHAP[s.dayBranch] === mp.branch) { sc += 7; tags.push('육합'); }
    for (const g of SAMHAP) if (g.includes(s.dayBranch) && g.includes(mp.branch)) { sc += 5; tags.push('삼합'); break; }
    if ((CHEONEUL[s.dayStem] || []).includes(mp.branch)) { sc += 9; tags.push('천을귀인'); }
    sc = Math.max(15, Math.min(96, Math.round(sc)));
    months.push({
      m,
      gz: STEMS_HAN[mp.stem] + BRANCHES_HAN[mp.branch],
      sipsin: SIPSIN[sin],
      tone: info.tone,
      text: info.s,
      score: sc,
      tags,
    });
  }
  const ranked = months.slice().sort((a, b) => b.score - a.score);
  const bestMonths = ranked.slice(0, 3).map((x) => x.m).sort((a, b) => a - b);
  const worstMonths = ranked.slice(-2).map((x) => x.m).sort((a, b) => a - b);

  const AR = areaScores(s, year, sang, jung, ha);

  return {
    year,
    age,
    lunar: { y: lun.y, m: lun.m, d: lun.d, leap: !!lun.leap },
    gwae: { sang, jung, ha, num: sang * 100 + jung * 10 + ha },
    name: `${S.han}${S.n} · ${J.n} · ${H.n}`,
    head: S.head,
    tone: H.tone > 0 ? S.tone : H.tone === 0 ? 'blue' : 'gray',
    verse,
    body: S.body,
    when: J.when,
    advice: H.adv,
    cross,
    taese: STEMS_HAN[taese.stem] + BRANCHES_HAN[taese.branch],
    months,
    bestMonths, worstMonths,
    areas: AR.areas,
    total: AR.total,
    totalTier: TIER_NAME[TIER(AR.total)],
    totalTone: TIER_TONE[TIER(AR.total)],
    seun: AR.seun,
    tags: AR.tags,
    lucky: AR.lucky,
    guide: {
      keep: H.adv,
      when: J.when,
      best: bestMonths,
      worst: worstMonths,
    },
    sajuNote: `이 풀이는 토정비결 144괘(${sang}·${jung}·${ha})에 더해, ${STEMS_HAN[s.dayStem]}${BRANCHES_HAN[s.dayBranch]}일주인 당신의 원국과 ${AR.seun.gz}년 세운의 관계까지 함께 본 것입니다.`,
  };
}
